import { Router } from 'express';
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  adjustStock,
  getStockMovements
} from '../controllers/product.controller';
import { authenticateJWT, authorizeRoles } from '../middleware/auth';

const router = Router();

// Everyone authenticated can query products list and movements log
router.get('/', authenticateJWT, getProducts);
router.get('/movements', authenticateJWT, getStockMovements);
router.get('/:id', authenticateJWT, getProductById);

// Only Admin and Warehouse can create, update, or manually adjust stock levels
router.post('/', authenticateJWT, authorizeRoles('ADMIN', 'WAREHOUSE'), createProduct);
router.put('/:id', authenticateJWT, authorizeRoles('ADMIN', 'WAREHOUSE'), updateProduct);
router.post('/:id/stock', authenticateJWT, authorizeRoles('ADMIN', 'WAREHOUSE'), adjustStock);

export default router;
