const express = require('express');
const router = express.Router();
const {
    getResources,
    getResource,
    createResource,
    updateResource,
    deleteResource,
    downloadResource,
    getResourceStats,
} = require('../controllers/resourceController');
const { protect, admin } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// All authenticated users can access
router.route('/')
    .get(protect, getResources);

router.route('/stats')
    .get(protect, admin, getResourceStats);

router.route('/:id')
    .get(protect, getResource);

router.route('/:id/download')
    .get(protect, downloadResource);

// Admin only routes
router.route('/')
    .post(protect, admin, upload.single('file'), createResource);

router.route('/:id')
    .put(protect, admin, upload.single('file'), updateResource)
    .delete(protect, admin, deleteResource);

module.exports = router;