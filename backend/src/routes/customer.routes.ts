import { Router } from 'express';
import {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  addFollowUpNote
} from '../controllers/customer.controller';
import { authenticateJWT, authorizeRoles } from '../middleware/auth';

const router = Router();

// Everyone authenticated can list and view customer details
router.get('/', authenticateJWT, getCustomers);
router.get('/:id', authenticateJWT, getCustomerById);

// Admin and Sales can create and update customer profiles
router.post('/', authenticateJWT, authorizeRoles('ADMIN', 'SALES'), createCustomer);
router.put('/:id', authenticateJWT, authorizeRoles('ADMIN', 'SALES'), updateCustomer);

// Admin, Sales, and Accounts can add follow-up notes
router.post('/:id/notes', authenticateJWT, authorizeRoles('ADMIN', 'SALES', 'ACCOUNTS'), addFollowUpNote);

export default router;
