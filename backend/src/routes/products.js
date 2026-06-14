const router = require('express').Router();
const { getProducts, getProduct, createProduct, updateProduct, deleteProduct, uploadProductImages, deleteProductImage, getRelatedProducts } = require('../controllers/productController');
const { protect, authorize } = require('../middleware/auth');
const { productImagesUpload } = require('../config/cloudinary');
const { pickUploadedArray } = require('../middleware/multerMultipartNormalize');

router.get('/', getProducts);
router.get('/:slug', getProduct);
router.get('/:slug/related', getRelatedProducts);
router.post('/', protect, authorize('admin'), createProduct);
router.put('/:id', protect, authorize('admin'), updateProduct);
router.delete('/:id', protect, authorize('admin'), deleteProduct);
router.post('/:id/images', protect, authorize('admin'), productImagesUpload, pickUploadedArray('images', 10), uploadProductImages);
router.delete('/:id/images/:imageId', protect, authorize('admin'), deleteProductImage);

module.exports = router;
