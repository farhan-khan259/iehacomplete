const express = require('express');
const router = express.Router();
const {
    register,
    login,
    getMe,
    updateProfile,
    changePassword,
    forgotPassword,
    resetPassword,
    logout,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.put('/reset-password/:resetToken', resetPassword);

// Protected routes
router.get('/me', protect, getMe);

// Add error handling for file upload
router.put('/update-profile', protect, (req, res, next) => {
    upload.single('profilePicture')(req, res, (err) => {
        if (err) {
            console.error('Multer error:', err);
            return res.status(400).json({
                success: false,
                message: err.message || 'File upload failed'
            });
        }
        next();
    });
}, updateProfile);

router.put('/change-password', protect, changePassword);
router.post('/logout', protect, logout);

module.exports = router;