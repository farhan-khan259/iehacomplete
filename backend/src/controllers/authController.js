const User = require('../models/User');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const sendEmail = require('../utils/emailService');
const bcrypt = require('bcryptjs'); // Add this

// Generate JWT Token
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE || '1d',
    });
};

// ========================
// Register
// ========================
const register = async (req, res) => {
    try {
        const { fullName, email, password, agreeTerms } = req.body;

        if (!fullName || !email || !password || agreeTerms === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Please fill all required fields',
            });
        }

        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({
                success: false,
                message: 'User already exists',
            });
        }

        const user = await User.create({
            fullName,
            email,
            password,
            agreeTerms,
        });

        const token = generateToken(user._id);

        res.status(201).json({
            success: true,
            _id: user._id,
            fullName: user.fullName,
            email: user.email,
            role: user.role,
            profilePicture: user.profilePicture,
            token,
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// ========================
// Login
// ========================
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide email and password',
            });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        if (user.membershipStatus !== 'active') {
            return res.status(401).json({
                success: false,
                message: 'Account is not active. Please contact administrator.',
            });
        }

        const isPasswordMatch = await user.comparePassword(password);
        if (!isPasswordMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        user.lastLogin = Date.now();
        await user.save();

        const token = generateToken(user._id);

        res.status(200).json({
            success: true,
            token,
            _id: user._id,
            fullName: user.fullName,
            email: user.email,
            role: user.role,
            profilePicture: user.profilePicture,
            phone: user.phone,
            address: user.address,
            membershipStatus: user.membershipStatus,
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during login',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// ========================
// Get Current User
// ========================
const getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            user: {
                _id: user._id,
                fullName: user.fullName,
                email: user.email,
                phone: user.phone,
                address: user.address,
                profilePicture: user.profilePicture,
                role: user.role,
                membershipStatus: user.membershipStatus,
                lastLogin: user.lastLogin,
                emailVerified: user.emailVerified,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
            }
        });
    } catch (error) {
        console.error('GetMe error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// ========================
const updateProfile = async (req, res) => {
    try {
        const userId = req.user._id;
        const { fullName, email, phone, address } = req.body;

        // Find user
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Check if email is being changed and already exists
        if (email && email !== user.email) {
            const emailExists = await User.findOne({ email, _id: { $ne: userId } });
            if (emailExists) {
                return res.status(400).json({ success: false, message: 'Email already in use' });
            }
        }

        // Update fields
        user.fullName = fullName || user.fullName;
        if (email) user.email = email;
        user.phone = phone || user.phone;
        user.address = address || user.address;

        // Handle profile picture
        if (req.file) {
            // Delete old picture if exists
            if (user.profilePicture && !user.profilePicture.includes('default')) {
                const oldPath = path.join(__dirname, '../..', user.profilePicture);
                if (fs.existsSync(oldPath)) {
                    try { fs.unlinkSync(oldPath); } catch (err) { console.error(err); }
                }
            }

            // Store relative path for frontend
            user.profilePicture = `/uploads/profiles/${req.file.filename}`;
        }

        const updatedUser = await user.save();

        res.json({
            success: true,
            message: 'Profile updated successfully',
            user: {
                _id: updatedUser._id,
                fullName: updatedUser.fullName,
                email: updatedUser.email,
                phone: updatedUser.phone,
                address: updatedUser.address,
                profilePicture: updatedUser.profilePicture,
                role: updatedUser.role,
                membershipStatus: updatedUser.membershipStatus,
            }
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error updating profile',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};


// ========================
// Change Password (FIXED VERSION)
// ========================
const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user._id;

        // Validate input
        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Please provide current and new password'
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters'
            });
        }

        // Find user
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Verify current password
        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) {
            return res.status(400).json({
                success: false,
                message: 'Current password is incorrect'
            });
        }

        // Update password
        user.password = newPassword;
        await user.save();

        res.json({
            success: true,
            message: 'Password updated successfully'
        });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error changing password',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// ========================
// Forgot Password
// ========================
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Please provide email'
            });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const resetToken = crypto.randomBytes(20).toString('hex');
        const resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');

        user.resetPasswordToken = resetPasswordToken;
        user.resetPasswordExpire = Date.now() + 3600000; // 1 hour
        await user.save();

        const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
        const message = `
            <h2>Password Reset Request</h2>
            <p>Click <a href="${resetUrl}">${resetUrl}</a> to reset your password (expires in 1 hour).</p>
            <p>If you didn't request this, please ignore this email.</p>
        `;

        await sendEmail({
            email: user.email,
            subject: 'Password Reset Request',
            message
        });

        res.json({
            success: true,
            message: 'Password reset email sent'
        });
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// ========================
// Reset Password
// ========================
const resetPassword = async (req, res) => {
    try {
        const { resetToken } = req.params;
        const { password } = req.body;

        if (!password || password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters'
            });
        }

        const resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
        const user = await User.findOne({
            resetPasswordToken,
            resetPasswordExpire: { $gt: Date.now() },
        });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired token'
            });
        }

        user.password = password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;

        await user.save();

        const token = generateToken(user._id);

        res.json({
            success: true,
            message: 'Password reset successful',
            token
        });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// ========================
// Logout
// ========================
const logout = (req, res) => {
    res.json({
        success: true,
        message: 'Logged out successfully'
    });
};

module.exports = {
    register,
    login,
    getMe,
    updateProfile,
    changePassword,
    forgotPassword,
    resetPassword,
    logout,
};