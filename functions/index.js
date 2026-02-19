/* ============================================
   AgentTrust — Cloud Functions Entry Point
   ============================================ */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');

// Initialize Firebase Admin
admin.initializeApp();

// Create Express app
const app = express();

// Middleware
app.use(cors({ origin: true }));
app.use(express.json());

// Auth middleware (x402 + API Key)
const { authMiddleware } = require('./middleware/x402');
app.use(authMiddleware);

// Routes
const scoreRouter = require('./api/score');
app.use('/', scoreRouter);

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: 'Endpoint not found. Visit /docs for API documentation.',
        available: ['/health', '/docs', '/score/:address']
    });
});

// Export as Cloud Function
exports.api = functions.https.onRequest(app);
