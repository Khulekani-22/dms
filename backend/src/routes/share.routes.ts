import { Router } from 'express';
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

const router = Router();

// ── Admin routes (require auth) ──────────────────────────────
router.get('/', authMiddleware, getShareLinks);
router.post('/', authMiddleware, createShareLink);
router.patch('/:id', authMiddleware, updateShareLink);
router.delete('/:id', authMiddleware, deleteShareLink);

// ── Public PIN routes (no auth, require PIN session token) ───
router.post('/access/validate', validatePin);
router.get('/access/:pin/documents', pinMiddleware, getDocumentsByPin);
router.get('/access/:pin/download/:docId', pinMiddleware, downloadDocumentByPin);

export default router;
