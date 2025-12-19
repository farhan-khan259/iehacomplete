


const express = require('express');
const router = express.Router();
const {
    getUsers,
    getUserById,
    updateUserRole,
    updateUserStatus,
    deleteUser,
    getUserStats,
} = require('../controllers/userController');

const { getProfile, updateProfile, changePassword } = require('../controllers/profileController');
const { protect, admin } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// Admin routes
router.route('/')
    .get(protect, admin, getUsers);

router.route('/stats')
    .get(protect, admin, getUserStats);

router.route('/:id')
    .get(protect, admin, getUserById)
    .delete(protect, admin, deleteUser);

router.route('/:id/role')
    .put(protect, admin, updateUserRole);

router.route('/:id/status')
    .put(protect, admin, updateUserStatus);

// Current user routes
router.route('/profile')
    .get(protect, getProfile)
    .put(protect, upload.single('profilePicture'), updateProfile);

router.route('/profile/password')
    .put(protect, changePassword);

module.exports = router;