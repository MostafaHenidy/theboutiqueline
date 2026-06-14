const router = require('express').Router();
const { getNotifications, markAsRead, deleteNotification } = require('../controllers/notificationController');
const { protect } = require('../middleware/auth');

router.get('/', protect, getNotifications);
router.put('/mark-read', protect, markAsRead);
router.delete('/:id', protect, deleteNotification);

module.exports = router;
