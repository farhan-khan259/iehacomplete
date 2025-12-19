const express = require('express');
const router = express.Router();
const {
    getEvents,
    getEvent,
    createEvent,
    updateEvent,
    deleteEvent,
    registerForEvent,
    getEventStats,
    debugEvents,
} = require('../controllers/eventController');
const { protect, admin } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// All authenticated users can access
router.route('/')
    .get(protect, getEvents);

router.route('/:id')
    .get(protect, getEvent);

router.route('/:id/register')
    .post(protect, registerForEvent);

// Admin only routes
router.route('/')
    .post(protect, admin, upload.single('featuredImage'), createEvent);

router.route('/stats')
    .get(protect, admin, getEventStats);

// Admin diagnostic route: GET /api/events/debug
router.route('/debug')
    .get(protect, admin, debugEvents);

router.route('/:id')
    .put(protect, admin, upload.single('featuredImage'), updateEvent)
    .delete(protect, admin, deleteEvent);

module.exports = router;