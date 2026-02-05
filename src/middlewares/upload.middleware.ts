import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { Request, Response, NextFunction } from 'express';
import { AppError } from './error.middleware.js';

// Get the directory of this file (ESM compatible)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Upload directory relative to the script location (will be in dist/uploads/kyc when built)
const uploadDir = path.join(__dirname, '../uploads/kyc');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        console.log(`[MULTER] Saving file to: ${uploadDir}`);
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // file name: userId-timestamp-fieldname.ext
        const userId = (req as any).user?.id || 'unknown';
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        const filename = `${userId}-${uniqueSuffix}-${file.fieldname}${ext}`;
        console.log(`[MULTER] Generated filename: ${filename}`);
        cb(null, filename);
    }
});

const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    console.log(`[MULTER] Checking file: ${file.originalname}, mimetype: ${file.mimetype}`);
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new AppError(400, 'Only image files are allowed!'));
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    }
}).fields([
    { name: 'front_image', maxCount: 1 },
    { name: 'back_image', maxCount: 1 },
    { name: 'selfie_image', maxCount: 1 }
]);

// Wrapper middleware to catch multer errors
export const uploadKycImages = (req: Request, res: Response, next: NextFunction) => {
    console.log('[MULTER] Starting file upload for KYC...');
    console.log('[MULTER] Content-Type:', req.headers['content-type']);

    upload(req, res, (err: any) => {
        if (err instanceof multer.MulterError) {
            console.error('[MULTER ERROR] MulterError:', err.message, err.code);
            return next(new AppError(400, `Upload error: ${err.message}`));
        } else if (err) {
            console.error('[MULTER ERROR] Unknown error:', err);
            return next(err);
        }

        console.log('[MULTER] Upload complete. Files received:', req.files ? Object.keys(req.files as any) : 'None');
        next();
    });
};
