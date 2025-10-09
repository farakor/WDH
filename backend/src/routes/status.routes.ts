import { Router } from 'express';
import {
  getStatusHistory,
  forceCheck,
  sendStatusReport,
  sendDomainReport,
} from '../controllers/status.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// Все маршруты требуют аутентификации
router.use(authenticate);

router.get('/:websiteId', getStatusHistory);
router.post('/check', forceCheck);
router.post('/report', sendStatusReport);
router.post('/domain-report', sendDomainReport);

export default router;
