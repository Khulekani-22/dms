import { Router } from 'express';
import {
  getDocuments,
  uploadDocument,
  downloadDocument,
  deleteDocument,
  upload,
} from '../controllers/document.controller';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.use(authMiddleware);

// List documents in a folder
router.get('/folder/:id', getDocuments);

// Upload one or more files
router.post('/upload', upload.array('files', 20), uploadDocument);

// Download / delete a specific document
router.get('/:id/download', downloadDocument);
router.delete('/:id', deleteDocument);

export default router;
