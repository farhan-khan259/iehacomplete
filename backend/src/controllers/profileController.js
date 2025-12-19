const path = require('path');
const fs = require('fs');
// bcrypt removed because we're storing plain text passwords per your request
const User = require('../models/User');

// GET /api/users/profile
const getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        if (user.profilePicture) {
            user.profilePicture = user.profilePicture.replace(/\\/g, '/');
            if (!user.profilePicture.startsWith('/')) user.profilePicture = '/' + user.profilePicture;
        }

        res.json({ success: true, user });
    } catch (err) {
        console.error('getProfile error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// PUT /api/users/profile
const updateProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        const { fullName, email, phone, address, removeProfile } = req.body;

        if (email && email !== user.email) {
            const exists = await User.findOne({ email: email.toLowerCase() });
            if (exists) return res.status(400).json({ success: false, message: 'Email already in use' });
            user.email = email.toLowerCase();
        }

        if (fullName) user.fullName = fullName;
        if (phone !== undefined) user.phone = phone;
        if (address !== undefined) user.address = address;

        if (req.file && req.file.filename) {
            if (user.profilePicture) {
                try {
                    const oldRel = user.profilePicture.replace(/^\//, '').replace(/\\/g, '/');
                    const old = path.join(process.cwd(), oldRel);
                    if (fs.existsSync(old)) fs.unlinkSync(old);
                } catch (err) {
                    console.warn('Failed to delete old profile pic:', err.message);
                }
            }

            user.profilePicture = `/uploads/profiles/${req.file.filename}`;
            console.log('Saved new profile picture path:', user.profilePicture);
            const savedPath = path.join(process.cwd(), 'uploads', 'profiles', req.file.filename);
            console.log('Filesystem file exists:', fs.existsSync(savedPath));
        } else if (removeProfile === 'true' || removeProfile === true || removeProfile === '1') {
            if (user.profilePicture) {
                try {
                    const oldRel = user.profilePicture.replace(/^\//, '').replace(/\\/g, '/');
                    const old = path.join(process.cwd(), oldRel);
                    if (fs.existsSync(old)) fs.unlinkSync(old);
                } catch (err) {
                    console.warn('Failed to delete profile pic:', err.message);
                }
            }
            user.profilePicture = '';
        }

        const updated = await user.save();
        const ret = updated.toObject();
        delete ret.password;

        const BASE_URL = process.env.CLIENT_URL || "http://localhost:5000";

        if (ret.profilePicture) {
            ret.profilePicture = ret.profilePicture.replace(/\\/g, '/');

            if (!ret.profilePicture.startsWith('http')) {
                ret.profilePicture = `${BASE_URL}${ret.profilePicture}`;
            }
        }


        res.json({ success: true, user: ret, message: 'Profile updated' });
    } catch (err) {
        console.error('updateProfile error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// PUT /api/users/profile/password — store plain text password (insecure)
const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) return res.status(400).json({ success: false, message: 'Both passwords required' });

        const user = await User.findById(req.user.id).select('+password');
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) return res.status(400).json({ success: false, message: 'Current password incorrect' });

        // Store new password as plain text (insecure)
        user.password = newPassword;
        await user.save();

        res.json({ success: true, message: 'Password changed' });
    } catch (err) {
        console.error('changePassword error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

module.exports = { getProfile, updateProfile, changePassword };