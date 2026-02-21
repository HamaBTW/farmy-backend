import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { Request, Response, NextFunction } from 'express';
import { AppError } from './error.middleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Base upload directory (relative to this file's location to shift between src and dist automatically)
const baseUploadDir = path.join(__dirname, '../uploads');

// Ensure directories exist
const productUploadDir = path.join(baseUploadDir, 'products');
const kycUploadDir = path.join(baseUploadDir, 'kyc');
const proofUploadDir = path.join(baseUploadDir, 'proofs');

[productUploadDir, kycUploadDir, proofUploadDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Generic storage engine
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Determine destination based on field name or route
        if (file.fieldname === 'images' || file.fieldname === 'image') {
            cb(null, productUploadDir);
        } else {
            cb(null, kycUploadDir);
        }
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed!'));
    }
};

// Generic upload instance (Disk Storage)
export const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB limit
    }
});

// Memory storage upload instance (useful for direct AI verification without saving to disk)
export const uploadMem = multer({
    storage: multer.memoryStorage(),
    fileFilter: fileFilter,
    limits: {
        fileSize: 15 * 1024 * 1024 // 15MB limit
    }
});

// Specific middleware for KYC (restoring previous functionality)
const kycUpload = upload.fields([
    { name: 'front_image', maxCount: 1 },
    { name: 'back_image', maxCount: 1 },
    { name: 'selfie_image', maxCount: 1 }
]);

export const uploadKycImages = (req: Request, res: Response, next: NextFunction) => {
    kycUpload(req, res, (err: any) => {
        if (err instanceof multer.MulterError) {
            return next(new AppError(400, `Upload error: ${err.message}`));
        } else if (err) {
            return next(err);
        }
        next();
    });
};
