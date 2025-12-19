const mongoose = require('mongoose');

const contentSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Title is required'],
        trim: true,
    },
    description: {
        type: String,
        required: [true, 'Description is required'],
    },
    content: {
        type: String,
        required: [true, 'Content is required'],
    },
    type: {
        type: String,
        enum: ['article', 'blog', 'news', 'announcement'],
        default: 'article',
    },
    category: {
        type: String,
        enum: ['healing', 'meditation', 'wellness', 'education', 'research'],
        default: 'wellness',
    },
    tags: [{
        type: String,
    }],
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    featuredImage: {
        type: String,
        default: '',
    },
    attachments: [{
        fileName: String,
        fileUrl: String,
        fileType: String,
    }],
    views: {
        type: Number,
        default: 0,
    },
    isPublished: {
        type: Boolean,
        default: true,
    },
    publishedAt: {
        type: Date,
        default: Date.now,
    },
}, {
    timestamps: true,
});

module.exports = mongoose.model('Content', contentSchema);