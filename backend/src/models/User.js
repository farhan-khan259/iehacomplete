

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true, minlength: 6 },
    role: { type: String, enum: ['member', 'admin'], default: 'member' },
    phone: { type: String, default: '' },
    address: { type: String, default: '' },
    profilePicture: { type: String, default: '' },
    membershipStatus: { type: String, enum: ['active', 'inactive', 'pending'], default: 'active' },
    lastLogin: Date,
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    emailVerified: { type: Boolean, default: false },
    agreeTerms: { type: Boolean, required: true },
}, { timestamps: true });

// Compare password (plain text comparison)
userSchema.methods.comparePassword = async function (candidatePassword) {
    // Direct plain text comparison
    return candidatePassword === this.password;
};

// Remove the pre-save hook if you have one that hashes passwords
// userSchema.pre('save', async function(next) { ... });

module.exports = mongoose.model('User', userSchema);