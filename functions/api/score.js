/* ============================================
   AgentTrust — Score API Router
   Main endpoint for querying wallet trust scores
   ============================================ */

const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const db = admin.firestore();

const { getTransactionHistory, getTokenTransfers, getBalance } = require('../services/basescanService');
const { calculateTrustScore } = require('../services/scoringEngine');

/**
 * GET / - API Root
 */
router.get(['/', '/api'], (req, res) => {
    res.json({
        service: 'AgentTrust Score API',
        message: 'Welcome to the AgentTrust API. Visit /docs for documentation.',
        docs: 'https://agent-trust-score.web.app/api/docs',
        status: 'operational'
    });
});

// Cache duration: 1 hour (in seconds)
const CACHE_TTL = 3600;

/**
 * GET /health - Free health check
 */
router.get(['/health', '/api/health'], (req, res) => {
    res.json({
        status: 'operational',
        service: 'AgentTrust Score API',
        version: '1.0.0',
        network: 'Base (L2)',
        timestamp: new Date().toISOString(),
        endpoints: {
            score: 'GET /score/:address',
            docs: 'GET /docs',
            health: 'GET /health'
        }
    });
});

/**
 * GET /docs - API documentation for agents
 */
router.get(['/docs', '/api/docs'], (req, res) => {
    res.json({
        service: 'AgentTrust - Credit Bureau for AI Agents',
        description: 'Trust scoring API for agent wallets on Base network. Returns a 0-100 score with letter grades (AAA to C).',
        baseURL: 'https://agent-trust-score.web.app/api',
        authentication: {
            type: 'Agent-to-Agent Payment (x402)',
            protocol: 'x402',
            pricing: {
                basic_score: '$0.01 USDC (10,000 micro-USDC)',
                full_report: '$0.05 USDC (50,000 micro-USDC)'
            },
            payment_address: '0x9eD986438138110AeC1388311b0944A435feDA70',
            network: 'Base (L2)'
        },
        endpoints: [
            {
                method: 'GET',
                path: '/score/:address',
                description: 'Get trust score for a wallet address',
                params: {
                    address: 'Ethereum/Base wallet address (0x...)'
                },
                query: {
                    full: 'Set to "true" for detailed factor breakdown (default: false)'
                },
                headers_required_on_retry: [
                    'x-transaction-hash (if retrying after 402 error)'
                ]
            }
        ],
        scoring: {
            factors: [
                { name: 'Age', weight: '20%', description: 'Wallet age based on first transaction' },
                { name: 'Volume', weight: '20%', description: 'Total transaction count' },
                { name: 'Success Rate', weight: '25%', description: 'Percentage of successful transactions' },
                { name: 'Diversity', weight: '15%', description: 'Unique counterparties count' },
                { name: 'Consistency', weight: '20%', description: 'Regularity of activity pattern' }
            ],
            grades: {
                'AAA': '90-100 (Ultra Reliable)',
                'AA': '75-89 (Very Reliable)',
                'A': '60-74 (Reliable)',
                'BBB': '40-59 (Moderate)',
                'BB': '20-39 (Risky)',
                'C': '0-19 (No History / Dangerous)'
            }
        },
        examples: {
            basic: 'GET /score/0x1234...abcd',
            full: 'GET /score/0x1234...abcd?full=true'
        },
        contact: 'https://agent-trust-score.web.app'
    });
});

/**
 * GET /score/:address - Main scoring endpoint
 * Protected by API key middleware
 */
router.get(['/score/:address', '/api/score/:address'], async (req, res) => {
    const { address } = req.params;
    const fullReport = req.query.full === 'true';

    // Validate address format
    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
        return res.status(400).json({
            error: 'Invalid Address',
            message: 'Please provide a valid Ethereum/Base wallet address (0x + 40 hex chars)',
            example: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18'
        });
    }

    const normalizedAddress = address.toLowerCase();

    try {
        // Check cache first
        const cached = await getCachedScore(normalizedAddress);
        if (cached) {
            const response = fullReport ? cached : {
                address: normalizedAddress,
                score: cached.score,
                grade: cached.grade,
                label: cached.label,
                cached: true,
                metadata: cached.metadata
            };
            return res.json(response);
        }

        // Fetch on-chain data from BaseScan
        const [transactions, tokenTransfers, balanceWei] = await Promise.all([
            getTransactionHistory(normalizedAddress),
            getTokenTransfers(normalizedAddress),
            getBalance(normalizedAddress)
        ]);

        // Calculate trust score
        const result = calculateTrustScore(transactions, tokenTransfers, balanceWei);

        // Add address to result
        const scoreResult = {
            address: normalizedAddress,
            ...result,
            cached: false
        };

        // Cache the result
        await cacheScore(normalizedAddress, scoreResult);

        // Return based on report type
        if (fullReport) {
            return res.json(scoreResult);
        }

        // Basic response (no factor details)
        return res.json({
            address: normalizedAddress,
            score: scoreResult.score,
            grade: scoreResult.grade,
            label: scoreResult.label,
            cached: false,
            metadata: scoreResult.metadata
        });

    } catch (error) {
        console.error('Score calculation error:', error);
        return res.status(500).json({
            error: 'Scoring Engine Error',
            message: 'Failed to calculate trust score. Please try again.',
            address: normalizedAddress
        });
    }
});


/* ============================================
   Cache Functions (Firestore)
   ============================================ */

async function getCachedScore(address) {
    try {
        const doc = await db.collection('scores').doc(address).get();
        if (doc.exists) {
            const data = doc.data();
            const cachedAt = data.cachedAt?.toDate?.() || new Date(data.cachedAt);
            const ageSeconds = (Date.now() - cachedAt.getTime()) / 1000;

            if (ageSeconds < CACHE_TTL) {
                return data;
            }
        }
    } catch (err) {
        console.error('Cache read error:', err);
    }
    return null;
}

async function cacheScore(address, scoreResult) {
    try {
        await db.collection('scores').doc(address).set({
            ...scoreResult,
            cachedAt: admin.firestore.FieldValue.serverTimestamp()
        });
    } catch (err) {
        console.error('Cache write error:', err);
    }
}

module.exports = router;
