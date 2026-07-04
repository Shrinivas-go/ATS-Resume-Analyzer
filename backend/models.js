const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// ── USER SCHEMA ─────────────────────────────────────────────────────────────
// Stores credential and basic profile information for local and Google OAuth users.
const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },
    password: {
        type: String,
        // Password is only required if they register locally, not via Google OAuth
        required: function() { return this.authProvider === 'local'; },
        select: false, // Don't return the password field by default when query is run
    },
    authProvider: {
        type: String,
        enum: ['local', 'google'],
        default: 'local',
    },
    googleId: {
        type: String,
        sparse: true, // Allows multiple null or missing googleId values
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user',
    },
    refreshToken: {
        type: String,
        select: false,
    },
    totalScans: {
        type: Number,
        default: 0,
    }
}, {
    timestamps: true, // Automatically manages createdAt and updatedAt fields
});

// Encrypt password before saving if it has been changed
userSchema.pre('save', async function() {
    if (!this.isModified('password')) {
        return;
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Compare password helper for login
userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Remove sensitive fields before converting document to JSON
userSchema.methods.toJSON = function() {
    const obj = this.toObject();
    delete obj.password;
    delete obj.refreshToken;
    delete obj.__v;
    return obj;
};

const User = mongoose.model('User', userSchema);

// ── SCAN HISTORY SCHEMA ──────────────────────────────────────────────────────
// Tracks resume analysis events for candidate dashboards.
const scanHistorySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
        index: true,
    },
    ipAddress: {
        type: String,
        default: '',
    },
    filename: {
        type: String,
        required: true,
    },
    fileSize: {
        type: Number,
        default: 0,
    },
    score: {
        type: Number,
        default: 0,
    },
    coreSkillsMatch: {
        type: Number,
        default: 0,
    },
    optionalSkillsMatch: {
        type: Number,
        default: 0,
    },
    jobTitle: {
        type: String,
        default: 'General Resume Scan',
    },
    predictedCategory: {
        type: String,
        default: 'Unknown',
    },
    // We can store structural results in scan history as well
    matchedSkills: {
        type: [String],
        default: [],
    },
    missingSkills: {
        type: [String],
        default: [],
    },
    contactInfo: {
        email: String,
        phone: String,
        linkedin: String,
        github: String,
    }
}, {
    timestamps: true,
});

// Simple index to speed up history retrieval
scanHistorySchema.index({ userId: 1, createdAt: -1 });

const ScanHistory = mongoose.model('ScanHistory', scanHistorySchema);

// Export both models together for simple import
module.exports = { User, ScanHistory };
