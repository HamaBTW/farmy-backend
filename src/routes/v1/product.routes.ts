import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { upload } from '../../middlewares/upload.middleware.js';
import {
    createProduct,
    getAllProducts,
    getProductById,
    updateProduct,
    deleteProduct,
    buyProduct
} from '../../controllers/v1/product.controller.js';

const router = Router();

// Public routes
router.get('/', getAllProducts);
router.get('/:id', getProductById);

// Protected routes
router.use(authenticate);
router.post(
    '/',
    upload.array('images', 5),
    createProduct
);
router.patch('/:id', upload.array('images', 5), updateProduct);
router.delete('/:id', deleteProduct);
router.post('/:id/buy', buyProduct);

export default router;
