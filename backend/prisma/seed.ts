import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 0. Clear existing data to make seed script idempotent
  await prisma.followUpNote.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.challan.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.product.deleteMany();

  // 1. Create Users
  const roles = ['ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS'];
  for (const role of roles) {
    const email = `${role.toLowerCase()}@fundsroom.com`;
    const passwordHash = await bcrypt.hash(`${role.toLowerCase()}123`, 10);
    const name = `${role.charAt(0) + role.slice(1).toLowerCase()} User`;

    await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        name,
        passwordHash,
        role,
      },
    });
  }
  console.log('Users seeded successfully!');

  // 2. Create Customers
  const customers = [
    {
      name: 'Acme Corporates',
      mobile: '9876543210',
      email: 'contact@acme.com',
      businessName: 'Acme Corp Pvt Ltd',
      gstNumber: '27AAAAA1111A1Z1',
      type: 'DISTRIBUTOR',
      address: '101, Industrial Area, Phase II, Mumbai',
      status: 'ACTIVE',
      followUpDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
      notes: 'Interested in bulk electronics orders. Needs follow-up on pricing tier.',
    },
    {
      name: 'Rajesh Sharma',
      mobile: '9988776655',
      email: 'rajesh@sharmaretails.com',
      businessName: 'Sharma General Store',
      gstNumber: null,
      type: 'RETAIL',
      address: 'Shop No. 4, Market Complex, Pune',
      status: 'LEAD',
      followUpDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
      notes: 'Inquired about stationary products. Requesting brochure.',
    },
    {
      name: 'Apex Wholesale Hub',
      mobile: '9123456789',
      email: 'sales@apexwholesale.com',
      businessName: 'Apex Distributors Ltd',
      gstNumber: '27BBBBB2222B2Z2',
      type: 'WHOLESALE',
      address: 'Plot 45, MIDC, Nagpur',
      status: 'ACTIVE',
      followUpDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      notes: 'Existing client, very reliable. Regular monthly orders.',
    },
    {
      name: 'John Doe Enterprise',
      mobile: '8888877777',
      email: 'john@doe.com',
      businessName: 'JD Enterprises',
      gstNumber: '27CCCCC3333C3Z3',
      type: 'WHOLESALE',
      address: 'Sector 5, Salt Lake, Kolkata',
      status: 'INACTIVE',
      followUpDate: null,
      notes: 'No response from the client in the last 3 months.',
    }
  ];

  for (const cust of customers) {
    const dbCust = await prisma.customer.create({
      data: cust
    });

    // Create a follow-up note for active ones
    if (cust.status === 'ACTIVE' || cust.status === 'LEAD') {
      await prisma.followUpNote.create({
        data: {
          customerId: dbCust.id,
          note: 'Initial CRM profiling completed on database initialization.',
          createdBy: 'System Seed',
        }
      });
    }
  }
  console.log('Customers seeded successfully!');

  // 3. Create Products
  const products = [
    {
      name: 'ThinkPad L14 Laptop',
      sku: 'SKU-TP-L14',
      category: 'Electronics',
      unitPrice: 55000.0,
      currentStock: 45,
      minStockAlert: 10,
      warehouseLocation: 'Aisle 3, Rack A',
    },
    {
      name: 'Logitech Wireless Mouse',
      sku: 'SKU-LOGI-WM',
      category: 'Peripherals',
      unitPrice: 1200.0,
      currentStock: 120,
      minStockAlert: 20,
      warehouseLocation: 'Aisle 1, Rack C',
    },
    {
      name: 'Dell 24" IPS Monitor',
      sku: 'SKU-DELL-24',
      category: 'Electronics',
      unitPrice: 13500.0,
      currentStock: 8, // Low stock to trigger alert!
      minStockAlert: 15,
      warehouseLocation: 'Aisle 4, Rack B',
    },
    {
      name: 'Ergonomic Office Chair',
      sku: 'SKU-CHAIR-ERG',
      category: 'Furniture',
      unitPrice: 8500.0,
      currentStock: 25,
      minStockAlert: 5,
      warehouseLocation: 'Aisle 5, Rack D',
    },
    {
      name: 'CAT6 Ethernet Cable 10m',
      sku: 'SKU-CAT6-10M',
      category: 'Networking',
      unitPrice: 450.0,
      currentStock: 2, // Low stock!
      minStockAlert: 10,
      warehouseLocation: 'Aisle 2, Rack A',
    }
  ];

  for (const prod of products) {
    const dbProd = await prisma.product.create({
      data: prod
    });

    // Create an initial stock movement log
    await prisma.stockMovement.create({
      data: {
        productId: dbProd.id,
        quantityChanged: prod.currentStock,
        type: 'IN',
        reason: 'Initial stock seeding',
        createdBy: 'System Seed',
      }
    });
  }
  console.log('Products seeded successfully!');

  console.log('Database seeding finished successfully!');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
