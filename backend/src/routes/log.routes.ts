import { Router } from 'express';
import { getLogs, exportLogs } from '../controllers/log.controller';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.use(authMiddleware);

router.get('/', getLogs);
router.get('/export', exportLogs);

export default router;
