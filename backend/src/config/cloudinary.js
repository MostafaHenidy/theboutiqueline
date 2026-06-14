const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const useCloudinary =
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_KEY !== 'your_api_key';

const uploadLimits = { fileSize: 10 * 1024 * 1024 };

function imageMimeFilter(req, file, cb) {
  if (file.mimetype.startsWith('image/')) cb(null, true);
  else cb(new Error('Only image files are allowed'), false);
}

function allowOnlyFieldnames(fieldNames) {
  const allow = new Set(fieldNames);
  return (req, file, cb) => {
    if (!allow.has(file.fieldname)) return cb(null, false);
    return imageMimeFilter(req, file, cb);
  };
}

/** multipart .any() + ignore non-whitelisted file parts → no Multer LIMIT_UNEXPECTED_FILE from stray fields */
function buildImageAnyUpload(storage, fieldNames, maxFileParts) {
  return multer({
    storage,
    limits: { ...uploadLimits, files: maxFileParts },
    fileFilter: allowOnlyFieldnames(fieldNames),
  }).any();
}

let cloudinary = null;
let upload;
let bannerUpload;
let categoryImageUpload;
let landingImageUpload;
let avatarUpload;
let productImagesUpload;

if (useCloudinary) {
  const cloudinaryLib = require('cloudinary').v2;
  const { CloudinaryStorage } = require('multer-storage-cloudinary');

  cloudinaryLib.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  cloudinary = cloudinaryLib;

  const storage = new CloudinaryStorage({
    cloudinary: cloudinaryLib,
    params: {
      folder: 'miskwear',
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
      transformation: [{ width: 1200, height: 1200, crop: 'limit', quality: 'auto' }],
    },
  });

  upload = multer({
    storage,
    limits: uploadLimits,
    fileFilter: imageMimeFilter,
  });

  bannerUpload = buildImageAnyUpload(storage, ['image', 'mobile_image'], 2);
  categoryImageUpload = buildImageAnyUpload(storage, ['image'], 1);
  landingImageUpload = buildImageAnyUpload(storage, ['image'], 1);
  avatarUpload = buildImageAnyUpload(storage, ['avatar'], 1);
  productImagesUpload = buildImageAnyUpload(storage, ['images'], 10);
} else {
  // Local disk storage fallback
  const uploadsDir = path.join(__dirname, '../../uploads');
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, unique + path.extname(file.originalname));
    },
  });

  upload = multer({
    storage,
    limits: uploadLimits,
    fileFilter: imageMimeFilter,
  });

  // Attach local URL helper to req.files after upload
  const originalFields = upload.fields.bind(upload);
  const originalArray = upload.array.bind(upload);
  const originalSingle = upload.single.bind(upload);

  const attachLocalUrl = (req, res, next) => {
    const diskPath = (filename) => `/api/uploads/${filename}`;
    if (req.files) {
      if (Array.isArray(req.files)) {
        req.files = req.files.map((f) => ({ ...f, path: diskPath(f.filename) }));
      } else {
        Object.keys(req.files).forEach((key) => {
          req.files[key] = req.files[key].map((f) => ({ ...f, path: diskPath(f.filename) }));
        });
      }
    }
    if (req.file) req.file.path = diskPath(req.file.filename);
    next();
  };

  const wrapMiddleware = (middleware) => (req, res, next) => {
    middleware(req, res, (err) => {
      if (err) return next(err);
      attachLocalUrl(req, res, next);
    });
  };

  upload = {
    single: (field) => wrapMiddleware(originalSingle(field)),
    array: (field, max) => wrapMiddleware(originalArray(field, max)),
    fields: (fields) => wrapMiddleware(originalFields(fields)),
  };

  bannerUpload = wrapMiddleware(buildImageAnyUpload(storage, ['image', 'mobile_image'], 2));
  categoryImageUpload = wrapMiddleware(buildImageAnyUpload(storage, ['image'], 1));
  landingImageUpload = wrapMiddleware(buildImageAnyUpload(storage, ['image'], 1));
  avatarUpload = wrapMiddleware(buildImageAnyUpload(storage, ['avatar'], 1));
  productImagesUpload = wrapMiddleware(buildImageAnyUpload(storage, ['images'], 10));
}

module.exports = {
  cloudinary,
  upload,
  bannerUpload,
  categoryImageUpload,
  landingImageUpload,
  avatarUpload,
  productImagesUpload,
};
