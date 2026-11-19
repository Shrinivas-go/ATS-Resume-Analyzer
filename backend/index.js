require('dotenv').config();
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { rateLimit } = require('express-rate-limit');
const { z } = require('zod');
const { OAuth2Client } = require('google-auth-library');

// Import our database models and ATS checker utilities
const { User, ScanHistory } = require('./models');
const { extractTextFromPdf } = require('./ats_checker');
const { analyze, reviewWork } = require('./analysis');
const reviewJobs = require('./review_jobs');
const ml = require('./ml_client');

const app = express();
const PORT = process.env.PORT || 5000;
const IS_PROD = process.env.NODE_ENV === 'production';

// Refuse to start in production with missing or weak secrets
if (IS_PROD) {
    const missing = ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET', 'MONGODB_URI', 'FRONTEND_URL']
        .filter((k) => !process.env[k] || (k.startsWith('JWT') && process.env[k].length < 32));
    if (missing.length) {
        console.error(`Missing or too-short production settings: ${missing.join(', ')}`);
        process.exit(1);
    }
}

// Configuration options
const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'dev-only-access-secret-not-for-production-use';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev-only-refresh-secret-not-for-production-use';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';

// Render (and most hosts) sit behind one proxy; needed for correct client IPs in rate limits
app.set('trust proxy', 1);

// Treat request values as literals in queries, so {"$gt": ""} in an email field can't match every user
mongoose.set('sanitizeFilter', true);

// Connect to database
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ats-resume-checker');
        console.log('MongoDB connected successfully!');
    } catch (err) {
        console.error('MongoDB connection error:', err.message);
    }
};
if (process.env.NODE_ENV !== 'test') connectDB();

// Express middleware configuration
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
    origin: FRONTEND_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));
app.use(cookieParser());

// Rate limits (per client IP)
const limiterMessage = (what) => ({ success: false, message: `Too many ${what}. Please wait a few minutes and try again.` });
const analyzeLimiter = rateLimit({ windowMs: 10 * 60 * 1000, limit: Number(process.env.ANALYZE_LIMIT || 15), standardHeaders: 'draft-8', legacyHeaders: false, message: limiterMessage('scans') });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: Number(process.env.AUTH_LIMIT || 30), standardHeaders: 'draft-8', legacyHeaders: false, message: limiterMessage('sign-in attempts') });
const pollLimiter = rateLimit({ windowMs: 60 * 1000, limit: 120, standardHeaders: 'draft-8', legacyHeaders: false, message: limiterMessage('requests') });
app.use('/auth', authLimiter);

// Uploads stay in memory and are never written to disk
const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'application/pdf' || /\.pdf$/i.test(file.originalname)) {
        cb(null, true);
    } else {
        cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'resume'), false);
    }
};
const upload = multer({ storage: multer.memoryStorage(), fileFilter, limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 5 } });

const analyzeInput = z.object({
    jobDescription: z.string().trim().min(80, 'Paste the full job posting (at least a few lines).').max(20000, 'That posting is too long (20,000 characters max).'),
    jobTitle: z.string().trim().max(120).optional().default('General Scan'),
});

// JWT helper functions
const ACCESS_COOKIE_MAX_AGE = 15 * 60 * 1000;       // 15 minutes
const REFRESH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

const getCookieOptions = (maxAge) => ({
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge,
    path: '/',
});

// Generate both access and refresh tokens
function generateTokens(userId, role) {
    const accessToken = jwt.sign({ userId, role }, JWT_ACCESS_SECRET, { expiresIn: '15m' });
    const refreshToken = jwt.sign({ userId }, JWT_REFRESH_SECRET, { expiresIn: '7d' });
    return { accessToken, refreshToken };
}

// Auth middlewares
// Checks if the user is logged in using JWT access tokens.
// If the access token is missing or expired, it tries to silently refresh it using the refresh token.
async function authMiddleware(req, res, next) {
    let accessToken = req.cookies?.accessToken;
    
    // Also allow bearer token in Authorization header
    if (!accessToken && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        accessToken = req.headers.authorization.split(' ')[1];
    }

    if (!accessToken) {
        // No access token: try to refresh using refresh token
        return handleSilentRefresh(req, res, next);
    }

    try {
        const decoded = jwt.verify(accessToken, JWT_ACCESS_SECRET);
        req.user = { id: decoded.userId, role: decoded.role };
        return next();
    } catch (err) {
        // Access token is invalid or expired, try silent refresh
        return handleSilentRefresh(req, res, next);
    }
}

// Optional Auth: doesn't block if not logged in, but sets req.user if token is present
async function optionalAuthMiddleware(req, res, next) {
    let accessToken = req.cookies?.accessToken;
    if (!accessToken && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        accessToken = req.headers.authorization.split(' ')[1];
    }

    if (!accessToken) {
        const refreshToken = req.cookies?.refreshToken;
        if (refreshToken) {
            try {
                const decodedRef = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
                const user = await User.findById(decodedRef.userId);
                if (user) {
                    const tokens = generateTokens(user._id, user.role);
                    res.cookie('accessToken', tokens.accessToken, getCookieOptions(ACCESS_COOKIE_MAX_AGE));
                    res.cookie('refreshToken', tokens.refreshToken, getCookieOptions(REFRESH_COOKIE_MAX_AGE));
                    req.user = { id: user._id.toString(), role: user.role };
                }
            } catch (e) { /* ignore */ }
        }
        return next();
    }

    try {
        const decoded = jwt.verify(accessToken, JWT_ACCESS_SECRET);
        req.user = { id: decoded.userId, role: decoded.role };
    } catch (err) {
        // Expired access token, try refresh
        const refreshToken = req.cookies?.refreshToken;
        if (refreshToken) {
            try {
                const decodedRef = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
                const user = await User.findById(decodedRef.userId);
                if (user) {
                    const tokens = generateTokens(user._id, user.role);
                    res.cookie('accessToken', tokens.accessToken, getCookieOptions(ACCESS_COOKIE_MAX_AGE));
                    res.cookie('refreshToken', tokens.refreshToken, getCookieOptions(REFRESH_COOKIE_MAX_AGE));
                    req.user = { id: user._id.toString(), role: user.role };
                }
            } catch (e) { /* ignore */ }
        }
    }
    next();
}

async function handleSilentRefresh(req, res, next) {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) {
        req.user = null;
        return next(); // Proceed without user auth (will fail on protected routes)
    }

    try {
        const decodedRef = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
        const user = await User.findById(decodedRef.userId);
        if (!user) {
            req.user = null;
            return next();
        }

        // Issue new tokens
        const tokens = generateTokens(user._id, user.role);
        res.cookie('accessToken', tokens.accessToken, getCookieOptions(ACCESS_COOKIE_MAX_AGE));
        res.cookie('refreshToken', tokens.refreshToken, getCookieOptions(REFRESH_COOKIE_MAX_AGE));
        
        req.user = { id: user._id.toString(), role: user.role };
        next();
    } catch (err) {
        // Refresh token expired or corrupt: clear cookies
        res.clearCookie('accessToken', { path: '/' });
        res.clearCookie('refreshToken', { path: '/' });
        req.user = null;
        next();
    }
}

// Require auth helper
function requireAuth(req, res, next) {
    if (!req.user) {
        return res.status(401).json({ success: false, message: 'Authentication required. Please log in.' });
    }
    next();
}

// Authentication endpoints

// User registration
app.post('/auth/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ success: false, message: 'All fields are required' });
        }
        if (typeof password !== 'string' || password.length < 8 || password.length > 128) {
            return res.status(400).json({ success: false, message: 'Use a password of at least 8 characters.' });
        }
        if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || String(name).length > 80) {
            return res.status(400).json({ success: false, message: 'Check your name and email address.' });
        }

        const existing = await User.findOne({ email });
        if (existing) {
            return res.status(400).json({ success: false, message: 'User with this email already exists' });
        }

        const user = await User.create({ name, email, password });
        const tokens = generateTokens(user._id, user.role);

        res.cookie('accessToken', tokens.accessToken, getCookieOptions(ACCESS_COOKIE_MAX_AGE));
        res.cookie('refreshToken', tokens.refreshToken, getCookieOptions(REFRESH_COOKIE_MAX_AGE));

        return res.status(201).json({
            success: true,
            message: 'Registration successful',
            user: user.toJSON(),
            tokens
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});

// User login
app.post('/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email and password are required' });
        }

        const user = await User.findOne({ email }).select('+password');
        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }

        // Google-only accounts have no password — prevent bcrypt crash
        if (!user.password) {
            return res.status(401).json({
                success: false,
                message: 'This account was created with Google. Please use Google Login instead.'
            });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }

        const tokens = generateTokens(user._id, user.role);

        res.cookie('accessToken', tokens.accessToken, getCookieOptions(ACCESS_COOKIE_MAX_AGE));
        res.cookie('refreshToken', tokens.refreshToken, getCookieOptions(REFRESH_COOKIE_MAX_AGE));

        return res.json({
            success: true,
            message: 'Login successful',
            user: user.toJSON(),
            tokens
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});

// Google OAuth Login
app.post('/auth/google', async (req, res) => {
    try {
        const { credential } = req.body;
        if (!credential) {
            return res.status(400).json({ success: false, message: 'Google credential required' });
        }

        const client = new OAuth2Client(GOOGLE_CLIENT_ID);
        let ticket;
        try {
            ticket = await client.verifyIdToken({
                idToken: credential,
                audience: GOOGLE_CLIENT_ID,
            });
        } catch (err) {
            return res.status(401).json({ success: false, message: 'Google token verification failed' });
        }

        const payload = ticket.getPayload();
        const { sub: googleId, email, name } = payload;

        if (!googleId || !email) {
            return res.status(400).json({ success: false, message: 'Invalid Google token payload' });
        }

        // Find or create the user in MongoDB Atlas
        let user = await User.findOne({ $or: [{ googleId }, { email }] });

        if (user) {
            // Update googleId and provider if they logged in locally before
            if (!user.googleId) {
                user.googleId = googleId;
                user.authProvider = 'google';
                await user.save();
            }
        } else {
            // Create new Google OAuth user
            user = await User.create({
                name: name || 'Google User',
                email,
                googleId,
                authProvider: 'google',
            });
        }

        const tokens = generateTokens(user._id, user.role);

        res.cookie('accessToken', tokens.accessToken, getCookieOptions(ACCESS_COOKIE_MAX_AGE));
        res.cookie('refreshToken', tokens.refreshToken, getCookieOptions(REFRESH_COOKIE_MAX_AGE));

        return res.json({
            success: true,
            message: 'Google login successful',
            user: user.toJSON(),
            tokens
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});

// Refresh tokens
app.post('/auth/refresh', async (req, res) => {
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
    if (!refreshToken) {
        return res.status(401).json({ success: false, message: 'Refresh token required' });
    }
    try {
        const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
        const user = await User.findById(decoded.userId);
        if (!user) {
            return res.status(401).json({ success: false, message: 'User not found' });
        }
        const tokens = generateTokens(user._id, user.role);
        res.cookie('accessToken', tokens.accessToken, getCookieOptions(ACCESS_COOKIE_MAX_AGE));
        res.cookie('refreshToken', tokens.refreshToken, getCookieOptions(REFRESH_COOKIE_MAX_AGE));
        return res.json({ success: true, tokens });
    } catch (err) {
        res.clearCookie('accessToken', { path: '/' });
        res.clearCookie('refreshToken', { path: '/' });
        return res.status(401).json({ success: false, message: 'Invalid refresh token' });
    }
});

// User logout
app.post('/auth/logout', (req, res) => {
    res.clearCookie('accessToken', { path: '/' });
    res.clearCookie('refreshToken', { path: '/' });
    return res.json({ success: true, message: 'Logged out successfully' });
});

// Get current logged-in user profile
app.get('/auth/me', authMiddleware, requireAuth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        return res.json({ success: true, user: user.toJSON() });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});

// Core resume analyzer routes

// Processes uploaded PDF resume and target Job Description text
app.post('/api/analyze', analyzeLimiter, optionalAuthMiddleware, upload.single('resume'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'We couldn\'t find a file. Please select a resume PDF to upload.' });
    }
    const parsedInput = analyzeInput.safeParse(req.body);
    if (!parsedInput.success) {
        return res.status(400).json({ success: false, message: parsedInput.error.issues[0].message });
    }
    const { jobDescription, jobTitle } = parsedInput.data;

    try {
        const resumeText = await extractTextFromPdf(req.file.buffer);
        if (!resumeText || resumeText.trim().length < 50) {
            return res.status(422).json({
                success: false,
                message: 'We couldn\'t find any readable text in your resume. If this is a scanned image, please convert it to a text-based PDF (e.g., save directly from Word or Google Docs).'
            });
        }

        const result = await analyze({ resumeText, jobDescription, jobTitle });
        const comparison = result._comparison;
        delete result._comparison;

        let scan = null;
        if (req.user && mongoose.connection.readyState === 1) {
            scan = await ScanHistory.create({
                userId: req.user.id,
                filename: req.file.originalname.slice(0, 200),
                fileSize: req.file.size,
                score: result.score,
                engine: result.engine,
                dimensions: result.dimensions || [],
                coreSkillsMatch: comparison.coreMatchPercentage,
                optionalSkillsMatch: comparison.optionalMatchPercentage,
                jobTitle,
                predictedCategory: result.predictedCategory,
                matchedSkills: [...comparison.matchedCoreSkills, ...comparison.matchedOptionalSkills],
                missingSkills: [...comparison.missingCoreSkills, ...comparison.missingOptionalSkills],
                contactInfo: result.contactInfo,
            });
            result.scanId = scan._id;
            await User.findByIdAndUpdate(req.user.id, { $inc: { totalScans: 1 } });
        }

        // The written review comes from ats-lm in the background; the page polls for it
        if (result.dimensions && ml.enabled()) {
            const saveToScan = scan
                ? (out) => ScanHistory.updateOne({ _id: scan._id }, { $set: { review: out.review, profile: out.profile } })
                : null;
            result.reviewId = reviewJobs.start(
                reviewWork({ resumeText, jobDescription, jobTitle, dimensions: result.dimensions }),
                req.user?.id || null,
                saveToScan,
            );
        }

        return res.json(result);
    } catch (err) {
        console.error('Resume analysis error:', err.message);
        return res.status(500).json({ success: false, message: 'Something went wrong while analysing your resume. Please try again.' });
    }
});

// Poll for the ats-lm review of a scan
app.get('/api/review/:id', pollLimiter, optionalAuthMiddleware, (req, res) => {
    if (!/^[0-9a-f-]{36}$/i.test(req.params.id)) {
        return res.status(400).json({ success: false, message: 'Bad review id.' });
    }
    const job = reviewJobs.get(req.params.id, req.user?.id || null);
    if (!job) return res.status(404).json({ success: false, message: 'Review not found or expired.' });
    return res.json({ success: true, ...job });
});

// Fetch user's scan history list
app.get('/api/history', authMiddleware, requireAuth, async (req, res) => {
    try {
        const scans = await ScanHistory.find({ userId: req.user.id })
            .sort({ createdAt: -1 })
            .limit(20)
            .lean();

        return res.json({ success: true, scans });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Failed to fetch scan history.' });
    }
});

// Health check: Render and the frontend poll this. It never calls the model service:
// the models scale to zero when idle, and a ping every few seconds would keep them running.
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        models: ml.enabled() ? 'configured' : 'disabled',
        timestamp: new Date().toISOString()
    });
});

// On-demand model check (wakes the model service). Cached for a minute.
let mlHealth = { checkedAt: 0, value: null };
app.get('/health/models', pollLimiter, async (req, res) => {
    if (!ml.enabled()) return res.json({ models: 'disabled' });
    if (Date.now() - mlHealth.checkedAt > 60000) {
        mlHealth = { checkedAt: Date.now(), value: await ml.health() };
    }
    res.json({ models: mlHealth.value?.status || 'unreachable' });
});

// Catch-all route handler for 404
app.use((req, res) => {
    res.status(404).json({ success: false, message: 'Route not found' });
});

// Centralized error handling
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        const message = err.code === 'LIMIT_FILE_SIZE'
            ? 'That PDF is over 5 MB. Export a lighter version and try again.'
            : err.code === 'LIMIT_UNEXPECTED_FILE'
                ? 'Only PDF resumes are supported.'
                : `Upload error: ${err.message}`;
        return res.status(400).json({ success: false, message });
    }
    if (err.type === 'entity.too.large') {
        return res.status(413).json({ success: false, message: 'Request is too large.' });
    }
    console.error('Unhandled error:', err.message);
    res.status(500).json({ success: false, message: IS_PROD ? 'Internal server error' : err.message });
});

if (require.main === module) {
    const server = app.listen(PORT, () => {
        console.log(`Node Express backend running on port ${PORT} (models: ${ml.enabled() ? 'on' : 'off'})`);
    });
    // Long enough for a slow model call, short enough to drop stuck sockets
    server.requestTimeout = 150000;
    server.headersTimeout = 65000;
}

module.exports = app;
