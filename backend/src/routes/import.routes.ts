import { Router } from 'express';
import multer from 'multer';
import { importWebsites, downloadTemplate } from '../controllers/import.controller';
import { authenticate } from '../middleware/auth';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Все маршруты требуют аутентификации
router.use(authenticate);

router.post('/', upload.single('file'), importWebsites);
router.get('/template', downloadTemplate);

export default router;
