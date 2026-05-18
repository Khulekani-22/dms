import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface PinRequest extends Request {
  pinSession?: {
    pin: string;
    folderId: string;
    shareLinkId: string;
  };
}

export const pinMiddleware = (
  req: PinRequest,
  res: Response,
  next: NextFunction
): void => {
  const token = req.headers['x-pin-token'] as string;

  if (!token) {
    res.status(401).json({ error: 'Missing PIN session token' });
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      pin: string;
      folderId: string;
      shareLinkId: string;
    };

    req.pinSession = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired PIN session' });
  }
};
