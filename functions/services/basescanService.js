/* ============================================
   AgentTrust — BaseScan API Service
   Reads on-chain data from Base Network
   ============================================ */

const fetch = require('node-fetch');

// BaseScan API (Etherscan-compatible for Base L2)
const BASESCAN_API_URL = 'https://api.basescan.org/api';

// Free tier: 5 calls/sec. We'll add a key later for production.
const BASESCAN_API_KEY = process.env.BASESCAN_API_KEY || 'YourApiKeyToken';

/**
 * Get normal transaction list for an address
 * @param {string} address - Wallet address (0x...)
 * @param {number} maxResults - Max transactions to fetch
 * @returns {Promise<Array>} List of transactions
 */
async function getTransactionHistory(address, maxResults = 500) {
    const url = `${BASESCAN_API_URL}?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=1&offset=${maxResults}&sort=asc&apikey=${BASESCAN_API_KEY}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status === '1' && Array.isArray(data.result)) {
        return data.result;
    }

    return [];
}

/**
 * Get ERC-20 token transfers for an address
 * @param {string} address - Wallet address
 * @returns {Promise<Array>} List of token transfers
 */
async function getTokenTransfers(address) {
    const url = `${BASESCAN_API_URL}?module=account&action=tokentx&address=${address}&startblock=0&endblock=99999999&page=1&offset=500&sort=asc&apikey=${BASESCAN_API_KEY}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status === '1' && Array.isArray(data.result)) {
        return data.result;
    }

    return [];
}

/**
 * Get internal transactions for an address
 * @param {string} address - Wallet address
 * @returns {Promise<Array>} List of internal transactions
 */
async function getInternalTransactions(address) {
    const url = `${BASESCAN_API_URL}?module=account&action=txlistinternal&address=${address}&startblock=0&endblock=99999999&page=1&offset=500&sort=asc&apikey=${BASESCAN_API_KEY}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status === '1' && Array.isArray(data.result)) {
        return data.result;
    }

    return [];
}

/**
 * Get ETH balance for an address
 * @param {string} address - Wallet address
 * @returns {Promise<string>} Balance in Wei
 */
async function getBalance(address) {
    const url = `${BASESCAN_API_URL}?module=account&action=balance&address=${address}&tag=latest&apikey=${BASESCAN_API_KEY}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status === '1') {
        return data.result;
    }

    return '0';
}

module.exports = {
    getTransactionHistory,
    getTokenTransfers,
    getInternalTransactions,
    getBalance
};
