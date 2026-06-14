const router = require('express').Router();
const {
  getCategories,
  getCategoriesAdmin,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  createSubcategory,
  updateSubcategory,
  deleteSubcategory,
} = require('../controllers/categoryController');
const { protect, authorize } = require('../middleware/auth');
const { categoryImageUpload } = require('../config/cloudinary');
const { pickSingleUploadedFile } = require('../middleware/multerMultipartNormalize');

router.get('/', getCategories);
router.get('/admin/all', protect, authorize('admin'), getCategoriesAdmin);
router.get('/:slug', getCategory);
router.post('/', protect, authorize('admin'), categoryImageUpload, pickSingleUploadedFile('image'), createCategory);
router.put('/:id', protect, authorize('admin'), categoryImageUpload, pickSingleUploadedFile('image'), updateCategory);
router.delete('/:id', protect, authorize('admin'), deleteCategory);
router.post('/subcategories', protect, authorize('admin'), createSubcategory);
router.put('/subcategories/:id', protect, authorize('admin'), updateSubcategory);
router.delete('/subcategories/:id', protect, authorize('admin'), deleteSubcategory);

module.exports = router;
