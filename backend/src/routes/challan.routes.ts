import { Router } from 'express';
import {
  createChallan,
  getChallans,
  getChallanById,
  updateChallanStatus
} from '../controllers/challan.controller';
import { authenticateJWT, authorizeRoles } from '../middleware/auth';

const router = Router();

// All authenticated roles can search challans and read details
router.get('/', authenticateJWT, getChallans);
router.get('/:id', authenticateJWT, getChallanById);

// Admin and Sales can create challans (draft/confirmed)
router.post('/', authenticateJWT, authorizeRoles('ADMIN', 'SALES'), createChallan);

// Admin, Sales, and Warehouse roles can change challan status (confirming drops stock, cancelling restores it)
router.put('/:id/status', authenticateJWT, authorizeRoles('ADMIN', 'SALES', 'WAREHOUSE'), updateChallanStatus);

export default router;
