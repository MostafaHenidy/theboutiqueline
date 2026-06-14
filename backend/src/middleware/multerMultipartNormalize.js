/**
 * Multer .any() leaves req.files as an array; legacy controllers use req.file or req.files.
 */

exports.pickSingleUploadedFile = (fieldName) => (req, res, next) => {
  const arr = Array.isArray(req.files) ? req.files : [];
  const found = arr.filter((f) => f.fieldname === fieldName);
  if (found.length > 1) {
    return res.status(400).json({ success: false, message: `Too many files for field ${fieldName}` });
  }
  req.file = found[0];
  req.files = undefined;
  next();
};

exports.pickUploadedArray = (fieldName, maxCount) => (req, res, next) => {
  const arr = Array.isArray(req.files) ? req.files : [];
  const found = arr.filter((f) => f.fieldname === fieldName);
  if (found.length > maxCount) {
    return res.status(400).json({ success: false, message: `Too many files for field ${fieldName}` });
  }
  req.files = found;
  next();
};
