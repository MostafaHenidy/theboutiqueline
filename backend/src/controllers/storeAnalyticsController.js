const { collectEvent } = require('../services/storeAnalyticsService');

exports.collect = async (req, res, next) => {
  try {
    await collectEvent(req, req.body || {});
    res.json({ success: true });
  } catch (err) {
    if (err.status === 400) {
      return res.status(400).json({ success: false, message: err.message });
    }
    next(err);
  }
};
