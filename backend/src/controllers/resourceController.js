const Resource = require('../models/Resource');
const path = require('path');

// @desc    Get all resources
// @route   GET /api/resources
// @access  Private
const getResources = async (req, res) => {
    try {
        const { type, category, search, page = 1, limit = 10 } = req.query;
        const query = {};

        // Filter by type
        if (type) {
            query.type = type;
        }

        // Filter by category
        if (category) {
            query.category = category;
        }

        // Search functionality
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { tags: { $regex: search, $options: 'i' } },
            ];
        }

        // Check user role for access
        if (req.user.role === 'member') {
            query.accessLevel = { $in: ['public', 'members'] };
        }

        const resources = await Resource.find(query)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .populate('author', 'fullName email');

        const total = await Resource.countDocuments(query);

        res.json({
            resources,
            totalPages: Math.ceil(total / limit),
            currentPage: parseInt(page),
            totalResources: total,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get single resource
// @route   GET /api/resources/:id
// @access  Private
const getResource = async (req, res) => {
    try {
        const resource = await Resource.findById(req.params.id)
            .populate('author', 'fullName email');

        if (!resource) {
            return res.status(404).json({ message: 'Resource not found' });
        }

        // Increment view count
        resource.views += 1;
        await resource.save();

        res.json(resource);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Create resource
// @route   POST /api/resources
// @access  Private/Admin
const createResource = async (req, res) => {
    try {
        const {
            title,
            description,
            type,
            category,
            tags,
            accessLevel,
            isFeatured,
            isPremium,
            duration,
        } = req.body;

        // Handle file upload
        let fileUrl = '';
        let fileName = '';
        let fileSize = 0;
        let thumbnail = '';

        if (req.file) {
            // Use uploaded file as both thumbnail (for display) and fileUrl
            const fileUrlPath = `/uploads/resources/${req.file.filename}`;
            fileUrl = fileUrlPath;
            thumbnail = fileUrlPath;
            fileName = req.file.originalname;
            fileSize = req.file.size;
            console.log('File uploaded:', { filename: req.file.filename, originalname: req.file.originalname, path: req.file.path });
        } else {
            console.log('No file in request');
        }

        // For admin users, don't set author to a non-ObjectId string
        // Only set author if req.user.id is a valid MongoDB ObjectId (from DB users)
        const isValidObjectId = req.user.id && typeof req.user.id === 'string' && req.user.id.length === 24;
        const authorId = isValidObjectId ? req.user.id : null;

        const resource = await Resource.create({
            title,
            description,
            type: type ? type.toLowerCase() : 'article',
            category: 'energy-healing', // Always use default category, ignore frontend input
            fileUrl,
            fileName,
            fileSize,
            thumbnail,
            author: authorId,
            tags: tags ? tags.split(',').map(t => t.trim()) : [],
            accessLevel: accessLevel || 'members',
            isFeatured: isFeatured === 'true',
            isPremium: isPremium === 'true',
            duration,
        });

        res.status(201).json(resource);
    } catch (error) {
        console.error('Create resource error:', error.message || error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Update resource
// @route   PUT /api/resources/:id
// @access  Private/Admin
const updateResource = async (req, res) => {
    try {
        let resource = await Resource.findById(req.params.id);

        if (!resource) {
            return res.status(404).json({ message: 'Resource not found' });
        }

        const {
            title,
            description,
            type,
            category,
            tags,
            accessLevel,
            isFeatured,
            isPremium,
            duration,
        } = req.body;

        // Update fields
        resource.title = title || resource.title;
        resource.description = description || resource.description;
        resource.type = type || resource.type;
        resource.category = category || resource.category;
        resource.accessLevel = accessLevel || resource.accessLevel;
        resource.isFeatured = isFeatured === 'true' || resource.isFeatured;
        resource.isPremium = isPremium === 'true' || resource.isPremium;
        resource.duration = duration || resource.duration;

        if (tags) {
            resource.tags = tags.split(',');
        }

        // Handle file update
        if (req.file) {
            resource.fileUrl = `/uploads/resources/${req.file.filename}`;
            resource.fileName = req.file.originalname;
            resource.fileSize = req.file.size;
        }

        const updatedResource = await resource.save();

        res.json(updatedResource);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Delete resource
// @route   DELETE /api/resources/:id
// @access  Private/Admin
const deleteResource = async (req, res) => {
    try {
        const resource = await Resource.findById(req.params.id);

        if (!resource) {
            return res.status(404).json({ message: 'Resource not found' });
        }

        await resource.deleteOne();

        res.json({ message: 'Resource deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Download resource
// @route   GET /api/resources/:id/download
// @access  Private
const downloadResource = async (req, res) => {
    try {
        const resource = await Resource.findById(req.params.id);

        if (!resource) {
            return res.status(404).json({ message: 'Resource not found' });
        }

        // Check access
        if (resource.accessLevel === 'premium' && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied' });
        }

        // Increment download count
        resource.downloads += 1;
        await resource.save();

        // Get file path
        const filePath = path.join(__dirname, '..', '..', resource.fileUrl);

        // Send file
        res.download(filePath, resource.fileName || 'resource');
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get resource statistics
// @route   GET /api/resources/stats
// @access  Private/Admin
// @desc    Get resource statistics
// @route   GET /api/resources/stats
// @access  Private/Admin
const getResourceStats = async (req, res) => {
    try {
        console.log('GET /api/resources/stats called by:', req.user ? `${req.user.email || req.user.fullName || req.user.id} (role=${req.user.role})` : 'unauthenticated');
        const stats = await Resource.aggregate([
            {
                $group: {
                    _id: '$type',
                    count: { $sum: 1 },
                    totalDownloads: { $sum: '$downloads' },
                    totalViews: { $sum: '$views' },
                },
            },
            {
                $sort: { count: -1 },
            },
        ]);

        const totalResources = await Resource.countDocuments();
        const totalDownloads = await Resource.aggregate([
            { $group: { _id: null, total: { $sum: '$downloads' } } },
        ]);
        const totalViews = await Resource.aggregate([
            { $group: { _id: null, total: { $sum: '$views' } } },
        ]);

        // Count by access level
        const publicResources = await Resource.countDocuments({ accessLevel: 'public' });
        const memberResources = await Resource.countDocuments({ accessLevel: 'members' });
        const premiumResources = await Resource.countDocuments({ accessLevel: 'premium' });

        res.json({
            success: true,
            totalResources,
            totalDownloads: totalDownloads[0]?.total || 0,
            totalViews: totalViews[0]?.total || 0,
            stats,
            byAccessLevel: {
                public: publicResources,
                members: memberResources,
                premium: premiumResources
            }
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
    getResources,
    getResource,
    createResource,
    updateResource,
    deleteResource,
    downloadResource,
    getResourceStats,
};