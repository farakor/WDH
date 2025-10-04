import { Router } from 'express';
import { domainController } from '../controllers/domain.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// Все роуты требуют авторизации
router.use(authenticate);

// Получить все домены пользователя
router.get('/', domainController.getAllDomains.bind(domainController));

// Получить статистику доменов
router.get('/stats', domainController.getDomainStats.bind(domainController));

// Получить домен по ID
router.get('/:id', domainController.getDomainById.bind(domainController));

// Создать новый домен
router.post('/', domainController.createDomain.bind(domainController));

// Массовое удаление доменов
router.post('/delete-multiple', domainController.deleteMultipleDomains.bind(domainController));

// Проверить домен вручную
router.post('/:id/check', domainController.checkDomain.bind(domainController));

// Обновить домен
router.put('/:id', domainController.updateDomain.bind(domainController));

// Удалить домен
router.delete('/:id', domainController.deleteDomain.bind(domainController));

export default router;
