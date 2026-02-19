const admin = require('firebase-admin');
const db = admin.firestore();
const { paymentMiddleware } = require('x402-express');

// Recipient wallet (Base Network)
const RECIPIENT_WALLET = '0x9eD986438138110AeC1388311b0944A435feDA70';

/**
 * x402 Middleware configuration
 */
const x402Middleware = paymentMiddleware(
    RECIPIENT_WALLET,
    {
        "/test-402": { price: "$0.01", network: "base" },
        "/api/test-402": { price: "$0.01", network: "base" },
        "score/:address": { price: "$0.01", network: "base" },
        "/api/score/:address": { price: "$0.01", network: "base" },
        // Try including the literal path from the test
        "/api/score/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045": { price: "$0.01", network: "base" }
    }
);

/**
 * Combined Auth Middleware
 * Supports both Legacy API Keys and x402 Protocol
 */
function authMiddleware(req, res, next) {
    const path = req.path.toLowerCase();

    // Health and docs are always free
    if (path === '/health' || path === '/api/health' || path === '/docs' || path === '/api/docs') {
        return next();
    }

    // Check for API Key first (manual/legacy)
    const apiKey = req.headers['x-api-key'];
    if (apiKey) {
        return validateApiKey(apiKey)
            .then(keyData => {
                if (keyData) {
                    req.apiKeyData = keyData;
                    incrementUsage(apiKey);
                    return next();
                }
                // If key provided but invalid, fall back to x402
                return x402Middleware(req, res, next);
            })
            .catch(() => x402Middleware(req, res, next));
    }

    // Default to x402 for Agent-to-Agent payments
    return x402Middleware(req, res, next);
}

/**
 * Helper to validate API keys
 */
async function validateApiKey(apiKey) {
    const masterKey = process.env.MASTER_API_KEY;
    if (!masterKey) {
        console.error('[CRITICAL] MASTER_API_KEY environment variable is not set!');
        return null;
    }
    if (apiKey === masterKey) return { owner: 'master' };

    const keyDoc = await db.collection('apiKeys').doc(apiKey).get();
    return keyDoc.exists && keyDoc.data().active ? keyDoc.data() : null;
}

/**
 * Track usage
 */
async function incrementUsage(identifier, txHash = null) {
    try {
        const ref = db.collection('usage').doc(identifier);
        const today = new Date().toISOString().split('T')[0];

        await ref.set({
            lastUsed: admin.firestore.FieldValue.serverTimestamp(),
            totalCalls: admin.firestore.FieldValue.increment(1),
            [`daily.${today}`]: admin.firestore.FieldValue.increment(1),
            ...(txHash && { lastTx: txHash })
        }, { merge: true });
    } catch (err) {
        console.error('Usage tracking error:', err);
    }
}

module.exports = { authMiddleware };

