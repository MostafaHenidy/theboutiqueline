const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  if (err.name === 'SequelizeValidationError') {
    statusCode = 400;
    message = err.errors.map(e => e.message).join(', ');
  }
  if (err.name === 'SequelizeUniqueConstraintError') {
    /** sqlite3 maps some NOT NULL failures to UniqueConstraintError; surface real cause. */
    const parentSql = String(err.parent?.message || '');
    if (/NOT NULL constraint/i.test(parentSql)) {
      statusCode = 400;
      message =
        process.env.NODE_ENV === 'development'
          ? parentSql
          : 'Invalid order data — try again or update the database (run migrations)';
    } else {
      statusCode = 409;
      message = 'Resource already exists';
    }
  }
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  }
  if (err.name === 'MulterError') {
    statusCode = 413;
    message = err.code === 'LIMIT_FILE_SIZE'
      ? 'Image too large (max 10MB)'
      : (err.message || 'Upload failed');
  }

  if (process.env.NODE_ENV === 'development') {
    console.error(err.stack);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = errorHandler;
