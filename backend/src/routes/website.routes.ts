import { Router } from 'express';
import {
  getAllWebsites,
  getWebsiteById,
  createWebsite,
  updateWebsite,
  deleteWebsite,
  deleteMultipleWebsites,
  getWebsiteStats,
  createWebsiteValidation,
} from '../controllers/website.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// Все маршруты требуют аутентификации
router.use(authenticate);

router.get('/', getAllWebsites);
router.get('/stats', getWebsiteStats);
router.get('/:id', getWebsiteById);
router.post('/', createWebsiteValidation, createWebsite);
router.post('/delete-multiple', deleteMultipleWebsites);
router.put('/:id', updateWebsite);
router.delete('/:id', deleteWebsite);

export default router;
