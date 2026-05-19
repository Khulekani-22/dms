import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  getShareLinks,
  createShareLink,
  updateShareLink,
  deleteShareLink,
  validatePin,
} from '../controllers/share.controller';
import {
  getDocumentsByPin,
  downloadDocumentByPin,
} from '../controllers/document.controller';
import { authMiddleware } from '../middleware/authMiddleware';
import { pinMiddleware } from '../middleware/pinMiddleware';

const pinLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many PIN attempts, please try again in 15 minutes.' },
});

const router = Router();

// ── Admin routes (require auth) ──────────────────────────────
router.get('/', authMiddleware, getShareLinks);
router.post('/', authMiddleware, createShareLink);
router.patch('/:id', authMiddleware, updateShareLink);
router.delete('/:id', authMiddleware, deleteShareLink);

// ── Public PIN routes ────────────────────────────────────────
router.post('/access/validate', pinLimiter, validatePin);
router.get('/access/:pin/documents', pinMiddleware, getDocumentsByPin);
router.get('/access/:pin/download/:docId', pinMiddleware, downloadDocumentByPin);

export default router;
