const User = require('../models/User');

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
const getUsers = async (req, res) => {
    try {
        const { role, search, page = 1, limit = 10 } = req.query;
        const query = {};

        // Filter by role
        if (role) {
            query.role = role;
        }

        // Search functionality
        if (search) {
            query.$or = [
                { fullName: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } },
            ];
        }

        const users = await User.find(query)
            .select('-password')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await User.countDocuments(query);

        res.json({
            users,
            totalPages: Math.ceil(total / limit),
            currentPage: parseInt(page),
            totalUsers: total,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Private/Admin
const getUserById = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json(user);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Update user role
// @route   PUT /api/users/:id/role
// @access  Private/Admin
const updateUserRole = async (req, res) => {
    try {
        const { role } = req.body;

        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.role = role;
        const updatedUser = await user.save();

        res.json({
            message: 'User role updated successfully',
            user: {
                _id: updatedUser._id,
                fullName: updatedUser.fullName,
                email: updatedUser.email,
                role: updatedUser.role,
            },
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Update user status
// @route   PUT /api/users/:id/status
// @access  Private/Admin
const updateUserStatus = async (req, res) => {
    try {
        const { membershipStatus } = req.body;

        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.membershipStatus = membershipStatus;
        const updatedUser = await user.save();

        res.json({
            message: 'User status updated successfully',
            user: {
                _id: updatedUser._id,
                fullName: updatedUser.fullName,
                email: updatedUser.email,
                membershipStatus: updatedUser.membershipStatus,
            },
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
const deleteUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Prevent deleting own account
        if (user._id.toString() === req.user.id) {
            return res.status(400).json({ message: 'Cannot delete your own account' });
        }

        await user.deleteOne();

        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get user statistics
// @route   GET /api/users/stats
// @access  Private/Admin
// @desc    Get user statistics
// @route   GET /api/users/stats
// @access  Private/Admin
const getUserStats = async (req, res) => {
    try {
        console.log('GET /api/users/stats called by:', req.user ? `${req.user.email || req.user.fullName || req.user.id} (role=${req.user.role})` : 'unauthenticated');
        const totalUsers = await User.countDocuments();
        const adminCount = await User.countDocuments({ role: 'admin' });
        const memberCount = await User.countDocuments({ role: 'member' });

        const activeUsers = await User.countDocuments({ membershipStatus: 'active' });
        const inactiveUsers = await User.countDocuments({ membershipStatus: 'inactive' });
        const pendingUsers = await User.countDocuments({ membershipStatus: 'pending' });

        // Get new users in last 30 days
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const newUsers = await User.countDocuments({
            createdAt: { $gte: thirtyDaysAgo }
        });

        // IMPORTANT: Make sure you're returning totalUsers in the response
        res.json({
            success: true,  // Add success flag
            totalUsers,     // This should be 6 if you have 6 users
            adminCount,
            memberCount,
            activeUsers,
            inactiveUsers,
            pendingUsers,
            newUsers,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

module.exports = {
    getUsers,
    getUserById,
    updateUserRole,
    updateUserStatus,
    deleteUser,
    getUserStats,
};