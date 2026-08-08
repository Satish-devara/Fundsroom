import request from 'supertest';
import app from '../index';
import prisma from '../prisma';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';

describe('Sales Challan ERP Business Logic', () => {
  let token: string;
  let testCustomer: any;
  let testProduct: any;

  beforeAll(async () => {
    // 1. Create a clean test user
    const email = 'sales-test@fundsroom.com';
    const passwordHash = await bcrypt.hash('password123', 10);
    
    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        name: 'Sales Tester',
        passwordHash,
        role: 'SALES',
      },
    });

    const jwtSecret = process.env.JWT_SECRET || 'super-secret-key-for-jwt-mini-erp-1234';
    token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role },
      jwtSecret,
      { expiresIn: '1h' }
    );

    // 2. Create a test customer
    testCustomer = await prisma.customer.create({
      data: {
        name: 'Test Customer Corp',
        mobile: '1234567890',
        email: 'test@customer.com',
        businessName: 'Test Biz Ltd',
        type: 'WHOLESALE',
        address: '123 Test Lane',
        status: 'ACTIVE',
      },
    });
  });

  beforeEach(async () => {
    // 3. Reset product stock before each test
    // We create a fresh product with a specific SKU and stock
    const sku = `SKU-TEST-${Date.now()}`;
    testProduct = await prisma.product.create({
      data: {
        name: 'Test Widget',
        sku,
        category: 'Toys',
        unitPrice: 100.0,
        currentStock: 5,
        minStockAlert: 1,
        warehouseLocation: 'Warehouse X',
      },
    });
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.challan.deleteMany({
      where: { createdBy: 'Sales Tester' },
    });
    await prisma.stockMovement.deleteMany({
      where: { createdBy: 'Sales Tester' },
    });
    await prisma.product.deleteMany({
      where: { name: 'Test Widget' },
    });
    await prisma.customer.deleteMany({
      where: { name: 'Test Customer Corp' },
    });
    await prisma.user.deleteMany({
      where: { email: 'sales-test@fundsroom.com' },
    });
    await prisma.$disconnect();
  });

  test('1. Creating a confirmed challan with sufficient stock succeeds and decrements stock', async () => {
    const res = await request(app)
      .post('/api/challans')
      .set('Authorization', `Bearer ${token}`)
      .send({
        customerId: testCustomer.id,
        status: 'CONFIRMED',
        products: [{ id: testProduct.id, quantity: 3 }],
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('challanNumber');
    expect(res.body.status).toBe('CONFIRMED');

    // Verify stock is decremented in DB (5 - 3 = 2)
    const productInDb = await prisma.product.findUnique({
      where: { id: testProduct.id },
    });
    expect(productInDb?.currentStock).toBe(2);

    // Verify stock movement log is created
    const movement = await prisma.stockMovement.findFirst({
      where: { productId: testProduct.id, type: 'OUT' },
    });
    expect(movement).toBeDefined();
    expect(movement?.quantityChanged).toBe(-3);
  });

  test('2. Creating a confirmed challan with insufficient stock fails with 400 and does not change stock', async () => {
    const res = await request(app)
      .post('/api/challans')
      .set('Authorization', `Bearer ${token}`)
      .send({
        customerId: testCustomer.id,
        status: 'CONFIRMED',
        products: [{ id: testProduct.id, quantity: 10 }], // Requested 10, only 5 available
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Insufficient stock');

    // Verify stock is still 5 in DB
    const productInDb = await prisma.product.findUnique({
      where: { id: testProduct.id },
    });
    expect(productInDb?.currentStock).toBe(5);
  });

  test('3. Draft challan does not deduct stock, but transition to Confirmed deducts stock', async () => {
    // A. Create Draft Challan
    const draftRes = await request(app)
      .post('/api/challans')
      .set('Authorization', `Bearer ${token}`)
      .send({
        customerId: testCustomer.id,
        status: 'DRAFT',
        products: [{ id: testProduct.id, quantity: 2 }],
      });

    expect(draftRes.status).toBe(201);
    expect(draftRes.body.status).toBe('DRAFT');

    // Verify stock is still 5
    let productInDb = await prisma.product.findUnique({
      where: { id: testProduct.id },
    });
    expect(productInDb?.currentStock).toBe(5);

    // B. Confirm the Challan
    const confirmRes = await request(app)
      .put(`/api/challans/${draftRes.body.id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'CONFIRMED' });

    expect(confirmRes.status).toBe(200);
    expect(confirmRes.body.status).toBe('CONFIRMED');

    // Verify stock is now decremented (5 - 2 = 3)
    productInDb = await prisma.product.findUnique({
      where: { id: testProduct.id },
    });
    expect(productInDb?.currentStock).toBe(3);
  });

  test('4. Cancelling a confirmed challan restores the stock levels', async () => {
    // A. Create Confirmed Challan
    const confirmRes = await request(app)
      .post('/api/challans')
      .set('Authorization', `Bearer ${token}`)
      .send({
        customerId: testCustomer.id,
        status: 'CONFIRMED',
        products: [{ id: testProduct.id, quantity: 4 }],
      });

    expect(confirmRes.status).toBe(201);
    
    // Stock is now 1 (5 - 4 = 1)
    let productInDb = await prisma.product.findUnique({
      where: { id: testProduct.id },
    });
    expect(productInDb?.currentStock).toBe(1);

    // B. Cancel the Confirmed Challan
    const cancelRes = await request(app)
      .put(`/api/challans/${confirmRes.body.id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'CANCELLED' });

    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.status).toBe('CANCELLED');

    // Stock is now restored (1 + 4 = 5)
    productInDb = await prisma.product.findUnique({
      where: { id: testProduct.id },
    });
    expect(productInDb?.currentStock).toBe(5);
  });
});
