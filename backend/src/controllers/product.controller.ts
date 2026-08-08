import { Response } from 'express';
import prisma from '../prisma';
import { AuthenticatedRequest } from '../middleware/auth';

// 1. Get Products (Search, Filter, Paginate)
export const getProducts = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const { search, category, lowStock } = req.query;

    const whereClause: any = {};

    if (search) {
      whereClause.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { sku: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    if (category) {
      whereClause.category = category as string;
    }

    if (lowStock === 'true') {
      whereClause.currentStock = {
        lte: prisma.product.fields.minStockAlert, // Current stock <= min stock alert
      };
      // Note: prisma.product.fields.minStockAlert might require raw queries in some database setups,
      // but in Prisma Client v5 we can do:
      // currentStock: { lte: ... } or run a raw query, or just fetch all and filter, or do a comparison.
      // Wait, let's write a database-compatible comparison or custom logic.
      // A safe way in Prisma is to run a raw query or just fetch with lte logic, or since we have few products,
      // we can do a comparison. But let's check:
      // Can we use Prisma's field references?
      // Yes, in Prisma 5, `currentStock: { lte: prisma.product.fields.minStockAlert }` is not supported directly in the where filter without standard syntax.
      // Wait! A standard raw SQL or fetching all is simple, or we can write a clean raw query:
      // Let's do a raw SQL check or write it database-independent.
      // Wait, is there a simpler way? Let's check:
      // We can query: `prisma.$queryRaw` or we can filter it. Let's do `prisma.$queryRaw` for low stock!
      // Or: we can load it. Let's use `prisma.$queryRaw` for low stock to avoid loading too many rows, or run a query:
      // `SELECT * FROM "Product" WHERE "currentStock" <= "minStockAlert"`
    }

    let products: any[] = [];
    let totalCount = 0;

    if (lowStock === 'true') {
      // Find products where currentStock <= minStockAlert
      const lowStockProducts = await prisma.$queryRaw<any[]>`
        SELECT * FROM "Product" 
        WHERE "currentStock" <= "minStockAlert"
        ORDER BY "updatedAt" DESC
        LIMIT ${limit} OFFSET ${skip}
      `;

      // Get count
      const countResult = await prisma.$queryRaw<any[]>`
        SELECT COUNT(*)::int as count FROM "Product" 
        WHERE "currentStock" <= "minStockAlert"
      `;
      products = lowStockProducts;
      totalCount = countResult[0]?.count || 0;
    } else {
      [products, totalCount] = await Promise.all([
        prisma.product.findMany({
          where: whereClause,
          orderBy: { updatedAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.product.count({ where: whereClause }),
      ]);
    }

    return res.status(200).json({
      products,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error: any) {
    console.error('GetProducts error:', error);
    return res.status(500).json({ message: 'Error retrieving products', error: error.message });
  }
};

// 2. Get Product by ID
export const getProductById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const productId = parseInt(id);

    if (isNaN(productId)) {
      return res.status(400).json({ message: 'Invalid product ID' });
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        stockMovements: {
          orderBy: { createdAt: 'desc' },
          take: 50 // Limit logs returned in detail view
        }
      }
    });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    return res.status(200).json(product);
  } catch (error: any) {
    console.error('GetProductById error:', error);
    return res.status(500).json({ message: 'Error retrieving product details', error: error.message });
  }
};

// 3. Create Product
export const createProduct = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      name,
      sku,
      category,
      unitPrice,
      currentStock,
      minStockAlert,
      warehouseLocation
    } = req.body;

    if (!name || !sku || !category || unitPrice === undefined || currentStock === undefined || minStockAlert === undefined || !warehouseLocation) {
      return res.status(400).json({ message: 'Missing required product fields' });
    }

    if (unitPrice < 0 || currentStock < 0 || minStockAlert < 0) {
      return res.status(400).json({ message: 'Prices and stock values must be positive' });
    }

    // Check SKU uniqueness
    const existing = await prisma.product.findUnique({
      where: { sku }
    });

    if (existing) {
      return res.status(400).json({ message: `Product with SKU '${sku}' already exists` });
    }

    // Run database transaction to create product and log initial stock
    const product = await prisma.$transaction(async (tx) => {
      const dbProd = await tx.product.create({
        data: {
          name,
          sku,
          category,
          unitPrice: parseFloat(unitPrice),
          currentStock: parseInt(currentStock),
          minStockAlert: parseInt(minStockAlert),
          warehouseLocation,
        }
      });

      if (parseInt(currentStock) > 0) {
        await tx.stockMovement.create({
          data: {
            productId: dbProd.id,
            quantityChanged: parseInt(currentStock),
            type: 'IN',
            reason: 'Initial stock creation',
            createdBy: req.user?.name || 'System',
          }
        });
      }

      return dbProd;
    });

    return res.status(201).json(product);
  } catch (error: any) {
    console.error('CreateProduct error:', error);
    return res.status(500).json({ message: 'Error creating product', error: error.message });
  }
};

// 4. Edit Product
export const updateProduct = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const productId = parseInt(id);

    if (isNaN(productId)) {
      return res.status(400).json({ message: 'Invalid product ID' });
    }

    const {
      name,
      sku,
      category,
      unitPrice,
      minStockAlert,
      warehouseLocation
    } = req.body;

    // Check if product exists
    const existing = await prisma.product.findUnique({
      where: { id: productId }
    });

    if (!existing) {
      return res.status(404).json({ message: 'Product not found' });
    }

    if (sku && sku !== existing.sku) {
      const otherSku = await prisma.product.findUnique({
        where: { sku }
      });
      if (otherSku) {
        return res.status(400).json({ message: `SKU '${sku}' is already taken by another product` });
      }
    }

    const updated = await prisma.product.update({
      where: { id: productId },
      data: {
        name: name !== undefined ? name : existing.name,
        sku: sku !== undefined ? sku : existing.sku,
        category: category !== undefined ? category : existing.category,
        unitPrice: unitPrice !== undefined ? parseFloat(unitPrice) : existing.unitPrice,
        minStockAlert: minStockAlert !== undefined ? parseInt(minStockAlert) : existing.minStockAlert,
        warehouseLocation: warehouseLocation !== undefined ? warehouseLocation : existing.warehouseLocation,
      }
    });

    return res.status(200).json(updated);
  } catch (error: any) {
    console.error('UpdateProduct error:', error);
    return res.status(500).json({ message: 'Error updating product', error: error.message });
  }
};

// 5. Adjust Stock Manually
export const adjustStock = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const productId = parseInt(id);

    if (isNaN(productId)) {
      return res.status(400).json({ message: 'Invalid product ID' });
    }

    const { quantityChanged, type, reason } = req.body;

    if (quantityChanged === undefined || !type || !reason) {
      return res.status(400).json({ message: 'Missing quantityChanged, type (IN/OUT), or reason' });
    }

    const qty = parseInt(quantityChanged);
    if (isNaN(qty) || qty <= 0) {
      return res.status(400).json({ message: 'quantityChanged must be a positive integer' });
    }

    if (!['IN', 'OUT'].includes(type)) {
      return res.status(400).json({ message: "type must be either 'IN' or 'OUT'" });
    }

    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({
        where: { id: productId }
      });

      if (!product) {
        throw new Error('PRODUCT_NOT_FOUND');
      }

      let newStock = product.currentStock;
      if (type === 'IN') {
        newStock += qty;
      } else {
        newStock -= qty;
      }

      if (newStock < 0) {
        throw new Error('INSUFFICIENT_STOCK');
      }

      // Update product current stock
      const updatedProduct = await tx.product.update({
        where: { id: productId },
        data: { currentStock: newStock }
      });

      // Create stock movement entry
      const movement = await tx.stockMovement.create({
        data: {
          productId,
          quantityChanged: type === 'IN' ? qty : -qty,
          type,
          reason,
          createdBy: req.user?.name || 'System',
        }
      });

      return { updatedProduct, movement };
    });

    return res.status(200).json({
      message: 'Stock adjusted successfully',
      currentStock: result.updatedProduct.currentStock,
      movement: result.movement
    });
  } catch (error: any) {
    console.error('AdjustStock error:', error);
    if (error.message === 'PRODUCT_NOT_FOUND') {
      return res.status(404).json({ message: 'Product not found' });
    }
    if (error.message === 'INSUFFICIENT_STOCK') {
      return res.status(400).json({ message: 'Insufficient stock. Transaction aborted.' });
    }
    return res.status(500).json({ message: 'Error adjusting stock', error: error.message });
  }
};

// 6. Get Stock Movement Log
export const getStockMovements = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 15;
    const skip = (page - 1) * limit;

    const { productId } = req.query;

    const whereClause: any = {};
    if (productId) {
      const parsedId = parseInt(productId as string);
      if (!isNaN(parsedId)) {
        whereClause.productId = parsedId;
      }
    }

    const [movements, totalCount] = await Promise.all([
      prisma.stockMovement.findMany({
        where: whereClause,
        include: {
          product: {
            select: { name: true, sku: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.stockMovement.count({ where: whereClause }),
    ]);

    return res.status(200).json({
      movements,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error: any) {
    console.error('GetStockMovements error:', error);
    return res.status(500).json({ message: 'Error retrieving stock movements', error: error.message });
  }
};
