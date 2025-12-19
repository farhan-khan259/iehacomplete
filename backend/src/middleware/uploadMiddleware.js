


const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads folder exists
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// Configure storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        let folder = path.join(uploadDir, 'misc');
        if (file.fieldname === 'profilePicture') folder = path.join(uploadDir, 'profiles');
        if (file.fieldname === 'file') folder = path.join(uploadDir, 'resources');
        if (file.fieldname === 'featuredImage') folder = path.join(uploadDir, 'events');

        if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true });
        cb(null, folder);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// File filter - allow images and documents
const fileFilter = (req, file, cb) => {
    const allowedImageTypes = [
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/svg+xml', 'image/webp'
    ];
    const allowedDocTypes = [
        'application/pdf',
        'application/msword', // .doc
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
        'application/vnd.ms-excel', // .xls
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
        'application/vnd.ms-powerpoint', // .ppt
        'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
        'text/plain',
        'text/csv',
        'application/rtf',
        'video/mp4',
        'video/webm'
    ];

    const allowedTypes = [...allowedImageTypes, ...allowedDocTypes];

    if (!allowedTypes.includes(file.mimetype)) {
        // Log the rejected type to help debugging
        console.warn(`Rejected upload - invalid file type: ${file.mimetype} (field: ${file.fieldname})`);
        return cb(new Error('Invalid file type'), false);
    }
    cb(null, true);
};

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
    fileFilter
});

module.exports = upload;