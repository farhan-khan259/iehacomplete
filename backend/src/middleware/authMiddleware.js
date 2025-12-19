const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ message: 'Not authorized, no token' });
        }

        // Support 'Bearer' case-insensitively and tolerate extra whitespace
        if (!authHeader.toLowerCase().startsWith('bearer ')) {
            return res.status(401).json({ message: 'Not authorized, invalid token format' });
        }

        const token = authHeader.split(' ')[1];
        if (!token || typeof token !== 'string') {
            return res.status(401).json({ message: 'Not authorized, no token' });
        }

        // Quick sanity check: JWTs have three parts separated by dots
        if (token.split('.').length !== 3) {
            return res.status(401).json({ message: 'Not authorized, token malformed' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Try to load user from DB if an id is present
        let user = null;
        if (decoded.id) {
            user = await User.findById(decoded.id).select('-password');
        }

        // If no user found but token indicates an admin (signed from admin login),
        // allow access by creating a temporary user object based on env admin config.
        if (!user && decoded.role === 'admin' && decoded.email === process.env.ADMIN_EMAIL) {
            req.user = {
                id: 'admin',
                role: 'admin',
                fullName: 'Administrator',
                email: process.env.ADMIN_EMAIL,
            };
            return next();
        }

        if (user) {
            req.user = user;
            return next();
        }

        // No user and not an admin token
        return res.status(401).json({ message: 'Not authorized, user not found' });
    } catch (error) {
        console.error('Auth protect error:', error && error.message ? error.message : error);
        return res.status(401).json({ message: 'Not authorized, token failed' });
    }
};

const admin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ message: 'Not authorized as admin' });
    }
};

module.exports = { protect, admin };