const mongoose = require('mongoose');

const resourceSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Title is required'],
        trim: true,
    },
    description: {
        type: String,
        required: [true, 'Description is required'],
    },
    type: {
        type: String,
        enum: ['article', 'video', 'pdf', 'webinar', 'guide'],
        default: 'article',
    },
    category: {
        type: String,
        enum: ['energy-healing', 'meditation', 'crystals', 'reiki', 'yoga', 'nutrition'],
        default: 'energy-healing',
    },
    fileUrl: {
        type: String,
        default: '',
    },
    fileName: {
        type: String,
    },
    fileSize: {
        type: Number,
    },
    thumbnail: {
        type: String,
        default: '',
    },
    duration: {
        type: String,
        default: '',
    },
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    tags: [{
        type: String,
    }],
    downloads: {
        type: Number,
        default: 0,
    },
    views: {
        type: Number,
        default: 0,
    },
    isFeatured: {
        type: Boolean,
        default: false,
    },
    isPremium: {
        type: Boolean,
        default: false,
    },
    accessLevel: {
        type: String,
        enum: ['public', 'members', 'premium'],
        default: 'members',
    },
}, {
    timestamps: true,
});

module.exports = mongoose.model('Resource', resourceSchema);