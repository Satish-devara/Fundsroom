import { Response } from 'express';
import prisma from '../prisma';
import { AuthenticatedRequest } from '../middleware/auth';

// 1. Get Customers (Search, Filter, Paginate)
export const getCustomers = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const { search, type, status } = req.query;

    const whereClause: any = {};

    if (search) {
      whereClause.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } },
        { businessName: { contains: search as string, mode: 'insensitive' } },
        { mobile: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    if (type) {
      whereClause.type = type as string;
    }

    if (status) {
      whereClause.status = status as string;
    }

    const [customers, totalCount] = await Promise.all([
      prisma.customer.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.customer.count({ where: whereClause }),
    ]);

    return res.status(200).json({
      customers,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error: any) {
    console.error('GetCustomers error:', error);
    return res.status(500).json({ message: 'Error retrieving customers', error: error.message });
  }
};

// 2. Get Customer Detail (with notes)
export const getCustomerById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const customerId = parseInt(id);

    if (isNaN(customerId)) {
      return res.status(400).json({ message: 'Invalid customer ID' });
    }

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        followUpNotes: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    return res.status(200).json(customer);
  } catch (error: any) {
    console.error('GetCustomerById error:', error);
    return res.status(500).json({ message: 'Error retrieving customer details', error: error.message });
  }
};

// 3. Add Customer
export const createCustomer = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      name,
      mobile,
      email,
      businessName,
      gstNumber,
      type,
      address,
      status,
      followUpDate,
      notes
    } = req.body;

    // Validation
    if (!name || !mobile || !email || !businessName || !type || !address || !status) {
      return res.status(400).json({ message: 'Missing required customer fields' });
    }

    if (!['RETAIL', 'WHOLESALE', 'DISTRIBUTOR'].includes(type)) {
      return res.status(400).json({ message: 'Invalid customer type' });
    }

    if (!['LEAD', 'ACTIVE', 'INACTIVE'].includes(status)) {
      return res.status(400).json({ message: 'Invalid customer status' });
    }

    const customer = await prisma.customer.create({
      data: {
        name,
        mobile,
        email,
        businessName,
        gstNumber: gstNumber || null,
        type,
        address,
        status,
        followUpDate: followUpDate ? new Date(followUpDate) : null,
        notes: notes || null,
      }
    });

    // Create default follow-up note log
    await prisma.followUpNote.create({
      data: {
        customerId: customer.id,
        note: 'Customer record created in system.',
        createdBy: req.user?.name || 'System',
      }
    });

    return res.status(201).json(customer);
  } catch (error: any) {
    console.error('CreateCustomer error:', error);
    return res.status(500).json({ message: 'Error creating customer', error: error.message });
  }
};

// 4. Edit Customer
export const updateCustomer = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const customerId = parseInt(id);

    if (isNaN(customerId)) {
      return res.status(400).json({ message: 'Invalid customer ID' });
    }

    const {
      name,
      mobile,
      email,
      businessName,
      gstNumber,
      type,
      address,
      status,
      followUpDate,
      notes
    } = req.body;

    // Check if customer exists
    const existing = await prisma.customer.findUnique({
      where: { id: customerId }
    });

    if (!existing) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    const updated = await prisma.customer.update({
      where: { id: customerId },
      data: {
        name: name !== undefined ? name : existing.name,
        mobile: mobile !== undefined ? mobile : existing.mobile,
        email: email !== undefined ? email : existing.email,
        businessName: businessName !== undefined ? businessName : existing.businessName,
        gstNumber: gstNumber !== undefined ? gstNumber : existing.gstNumber,
        type: type !== undefined ? type : existing.type,
        address: address !== undefined ? address : existing.address,
        status: status !== undefined ? status : existing.status,
        followUpDate: followUpDate !== undefined ? (followUpDate ? new Date(followUpDate) : null) : existing.followUpDate,
        notes: notes !== undefined ? notes : existing.notes,
      }
    });

    // Create follow-up note log if status changed
    if (status !== undefined && status !== existing.status) {
      await prisma.followUpNote.create({
        data: {
          customerId: updated.id,
          note: `Customer status updated from ${existing.status} to ${status}.`,
          createdBy: req.user?.name || 'System',
        }
      });
    }

    return res.status(200).json(updated);
  } catch (error: any) {
    console.error('UpdateCustomer error:', error);
    return res.status(500).json({ message: 'Error updating customer', error: error.message });
  }
};

// 5. Add Follow-Up Note
export const addFollowUpNote = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const customerId = parseInt(id);

    if (isNaN(customerId)) {
      return res.status(400).json({ message: 'Invalid customer ID' });
    }

    const { note } = req.body;
    if (!note || note.trim() === '') {
      return res.status(400).json({ message: 'Note text cannot be empty' });
    }

    // Check if customer exists
    const existing = await prisma.customer.findUnique({
      where: { id: customerId }
    });

    if (!existing) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    const followUpNote = await prisma.followUpNote.create({
      data: {
        customerId,
        note,
        createdBy: req.user?.name || 'System',
      }
    });

    return res.status(201).json(followUpNote);
  } catch (error: any) {
    console.error('AddFollowUpNote error:', error);
    return res.status(500).json({ message: 'Error adding follow-up note', error: error.message });
  }
};
