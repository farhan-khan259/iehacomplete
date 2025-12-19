const express = require("express");
const router = express.Router();

// Admin login route
const jwt = require('jsonwebtoken');

router.post('/login', (req, res) => {
    try {
        const { email, password } = req.body;

        console.log('Admin login attempt for:', email);

        // Check credentials
        if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
            // Create a signed JWT for admin with email and role
            const payload = {
                role: 'admin',
                email: email,
            };

            const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });

            return res.json({
                success: true,
                message: 'Admin login successful',
                token,
                data: {
                    role: 'admin',
                    email: email,
                    fullName: 'Administrator'
                }
            });
        }

        return res.status(401).json({
            success: false,
            message: 'Invalid admin credentials'
        });

    } catch (error) {
        console.error('Admin login error:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// Test route to verify admin routes are working
router.get("/test", (req, res) => {
    res.json({ message: "Admin routes are working!" });
});

module.exports = router;