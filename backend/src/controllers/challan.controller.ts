import { Response } from 'express';
import prisma from '../prisma';
import { AuthenticatedRequest } from '../middleware/auth';

// Helper to generate a unique, sequential challan number
const generateChallanNumber = async (): Promise<string> => {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const dateStr = `${yyyy}${mm}${dd}`; // YYYYMMDD

  // Count existing challans generated today
  const count = await prisma.challan.count({
    where: {
      challanNumber: {
        startsWith: `CH-${dateStr}-`
      }
    }
  });

  const seq = String(count + 1).padStart(4, '0');
  return `CH-${dateStr}-${seq}`;
};

// 1. Create Challan (Draft or Confirmed)
export const createChallan = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { customerId, products, status } = req.body; // products: [{ id, quantity }]

    if (!customerId || !products || !Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ message: 'Customer ID and a non-empty array of products are required' });
    }

    const targetStatus = status || 'DRAFT';
    if (!['DRAFT', 'CONFIRMED'].includes(targetStatus)) {
      return res.status(400).json({ message: "Initial status must be either 'DRAFT' or 'CONFIRMED'" });
    }

    // Fetch Customer
    const customer = await prisma.customer.findUnique({
      where: { id: parseInt(customerId) }
    });

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    // Prepare Customer Snapshot
    const customerSnapshot = {
      id: customer.id,
      name: customer.name,
      businessName: customer.businessName,
      mobile: customer.mobile,
      email: customer.email,
      gstNumber: customer.gstNumber,
      address: customer.address,
      type: customer.type
    };

    const username = req.user?.name || 'System';

    // Execute the transaction for inventory checks and challan creation
    const result = await prisma.$transaction(async (tx) => {
      const productsSnapshot: any[] = [];
      let totalQuantity = 0;

      // 1. Fetch products and check stock if Confirmed
      for (const item of products) {
        const prodId = parseInt(item.id);
        const qty = parseInt(item.quantity);

        if (isNaN(prodId) || isNaN(qty) || qty <= 0) {
          throw new Error('INVALID_PRODUCT_DATA');
        }

        const product = await tx.product.findUnique({
          where: { id: prodId }
        });

        if (!product) {
          throw new Error(`PRODUCT_NOT_FOUND:${prodId}`);
        }

        if (targetStatus === 'CONFIRMED' && product.currentStock < qty) {
          throw new Error(`INSUFFICIENT_STOCK:Insufficient stock for ${product.name} (SKU: ${product.sku}). Available: ${product.currentStock}, Requested: ${qty}`);
        }

        totalQuantity += qty;
        productsSnapshot.push({
          id: product.id,
          name: product.name,
          sku: product.sku,
          category: product.category,
          unitPrice: product.unitPrice,
          warehouseLocation: product.warehouseLocation,
          quantity: qty
        });

        // 2. Reduce stock if Confirmed
        if (targetStatus === 'CONFIRMED') {
          await tx.product.update({
            where: { id: prodId },
            data: {
              currentStock: {
                decrement: qty
              }
            }
          });

          // Log stock movement
          await tx.stockMovement.create({
            data: {
              productId: prodId,
              quantityChanged: -qty,
              type: 'OUT',
              reason: `Sales Challan Confirmation (Immediate)`,
              createdBy: username
            }
          });
        }
      }

      // 3. Generate challan number
      const challanNumber = await generateChallanNumber();

      // 4. Create Challan in DB
      const challan = await tx.challan.create({
        data: {
          challanNumber,
          customerId: customer.id,
          totalQuantity,
          status: targetStatus,
          createdBy: username,
          customerSnapshot,
          productsSnapshot
        }
      });

      return challan;
    });

    return res.status(201).json(result);
  } catch (error: any) {
    console.error('CreateChallan error:', error);
    if (error.message === 'INVALID_PRODUCT_DATA') {
      return res.status(400).json({ message: 'Invalid product id or quantity specified' });
    }
    if (error.message.startsWith('PRODUCT_NOT_FOUND')) {
      const parts = error.message.split(':');
      return res.status(404).json({ message: `Product with ID ${parts[1]} not found` });
    }
    if (error.message.startsWith('INSUFFICIENT_STOCK')) {
      return res.status(400).json({ message: error.message.slice(19) });
    }
    return res.status(500).json({ message: 'Error creating sales challan', error: error.message });
  }
};

// 2. Get Challans (Search, Filter, Paginate)
export const getChallans = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const { search, status } = req.query;

    const whereClause: any = {};

    if (search) {
      whereClause.OR = [
        { challanNumber: { contains: search as string, mode: 'insensitive' } },
        { createdBy: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    if (status) {
      whereClause.status = status as string;
    }

    const [challans, totalCount] = await Promise.all([
      prisma.challan.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.challan.count({ where: whereClause }),
    ]);

    return res.status(200).json({
      challans,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error: any) {
    console.error('GetChallans error:', error);
    return res.status(500).json({ message: 'Error retrieving challans', error: error.message });
  }
};

// 3. Get Challan Details
export const getChallanById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const challanId = parseInt(id);

    if (isNaN(challanId)) {
      return res.status(400).json({ message: 'Invalid challan ID' });
    }

    const challan = await prisma.challan.findUnique({
      where: { id: challanId }
    });

    if (!challan) {
      return res.status(404).json({ message: 'Challan not found' });
    }

    return res.status(200).json(challan);
  } catch (error: any) {
    console.error('GetChallanById error:', error);
    return res.status(500).json({ message: 'Error retrieving challan details', error: error.message });
  }
};

// 4. Update Challan Status (Draft -> Confirmed / Cancelled)
export const updateChallanStatus = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const challanId = parseInt(id);

    if (isNaN(challanId)) {
      return res.status(400).json({ message: 'Invalid challan ID' });
    }

    const { status } = req.body;
    if (!['CONFIRMED', 'CANCELLED'].includes(status)) {
      return res.status(400).json({ message: "Status must be either 'CONFIRMED' or 'CANCELLED'" });
    }

    const username = req.user?.name || 'System';

    const result = await prisma.$transaction(async (tx) => {
      const challan = await tx.challan.findUnique({
        where: { id: challanId }
      });

      if (!challan) {
        throw new Error('CHALLAN_NOT_FOUND');
      }

      if (challan.status === status) {
        return challan; // No state change needed
      }

      // Rules of ERP transitions:
      // 1. DRAFT -> CONFIRMED (deduct stock)
      // 2. DRAFT -> CANCELLED (no stock change)
      // 3. CONFIRMED -> CANCELLED (restore stock)
      // 4. CANCELLED -> ANY (not allowed)
      // 5. CONFIRMED -> DRAFT (not allowed)

      if (challan.status === 'CANCELLED') {
        throw new Error('TRANSITION_DENIED: Cannot modify a cancelled challan.');
      }

      if (challan.status === 'CONFIRMED' && status === 'CONFIRMED') {
        return challan;
      }

      const productsList = challan.productsSnapshot as any[];

      // Transition 1: DRAFT -> CONFIRMED
      if (challan.status === 'DRAFT' && status === 'CONFIRMED') {
        // Check stock availability first and decrement
        for (const prod of productsList) {
          const product = await tx.product.findUnique({
            where: { id: prod.id }
          });

          if (!product) {
            throw new Error(`PRODUCT_NOT_FOUND:${prod.name}`);
          }

          if (product.currentStock < prod.quantity) {
            throw new Error(`INSUFFICIENT_STOCK:Insufficient stock for ${prod.name} (SKU: ${prod.sku}). Available: ${product.currentStock}, Requested: ${prod.quantity}`);
          }

          // Decrement stock
          await tx.product.update({
            where: { id: prod.id },
            data: {
              currentStock: {
                decrement: prod.quantity
              }
            }
          });

          // Log stock movement
          await tx.stockMovement.create({
            data: {
              productId: prod.id,
              quantityChanged: -prod.quantity,
              type: 'OUT',
              reason: `Sales Challan Confirmation (Challan #${challan.challanNumber})`,
              createdBy: username
            }
          });
        }
      }

      // Transition 2: CONFIRMED -> CANCELLED
      if (challan.status === 'CONFIRMED' && status === 'CANCELLED') {
        // Restore stock levels!
        for (const prod of productsList) {
          await tx.product.update({
            where: { id: prod.id },
            data: {
              currentStock: {
                increment: prod.quantity
              }
            }
          });

          // Log stock movement
          await tx.stockMovement.create({
            data: {
              productId: prod.id,
              quantityChanged: prod.quantity,
              type: 'IN',
              reason: `Sales Challan Cancellation (Challan #${challan.challanNumber})`,
              createdBy: username
            }
          });
        }
      }

      // Update status in db
      const updatedChallan = await tx.challan.update({
        where: { id: challanId },
        data: { status }
      });

      return updatedChallan;
    });

    return res.status(200).json(result);
  } catch (error: any) {
    console.error('UpdateChallanStatus error:', error);
    if (error.message === 'CHALLAN_NOT_FOUND') {
      return res.status(404).json({ message: 'Challan not found' });
    }
    if (error.message.startsWith('TRANSITION_DENIED')) {
      return res.status(400).json({ message: error.message });
    }
    if (error.message.startsWith('PRODUCT_NOT_FOUND')) {
      const parts = error.message.split(':');
      return res.status(404).json({ message: `Product ${parts[1]} no longer exists in DB` });
    }
    if (error.message.startsWith('INSUFFICIENT_STOCK')) {
      return res.status(400).json({ message: error.message.slice(19) });
    }
    return res.status(500).json({ message: 'Error updating challan status', error: error.message });
  }
};
