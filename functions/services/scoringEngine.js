/* ============================================
   AgentTrust — Scoring Engine
   Calculates Trust Score for agent wallets
   ============================================ */

/**
 * Calculate the complete Trust Score for a wallet
 * @param {Array} transactions - Normal transaction history
 * @param {Array} tokenTransfers - ERC-20 token transfers
 * @param {string} balanceWei - Current balance in Wei
 * @returns {Object} { score, grade, factors, metadata }
 */
function calculateTrustScore(transactions, tokenTransfers, balanceWei) {
    const allActivity = [...transactions, ...tokenTransfers];

    // If no activity at all, return minimal score
    if (allActivity.length === 0) {
        return {
            score: 0,
            grade: 'C',
            label: 'No History',
            factors: {
                age: { score: 0, detail: 'No transactions found' },
                volume: { score: 0, detail: '0 transactions' },
                successRate: { score: 0, detail: 'N/A' },
                diversity: { score: 0, detail: '0 unique counterparties' },
                consistency: { score: 0, detail: 'No activity pattern' }
            },
            metadata: {
                totalTransactions: 0,
                totalTokenTransfers: 0,
                balanceETH: '0',
                firstSeen: null,
                lastSeen: null
            }
        };
    }

    // --- Factor 1: Age (20%) ---
    const ageScore = calculateAgeScore(transactions);

    // --- Factor 2: Volume (20%) ---
    const volumeScore = calculateVolumeScore(transactions, tokenTransfers);

    // --- Factor 3: Success Rate (25%) ---
    const successScore = calculateSuccessRate(transactions);

    // --- Factor 4: Diversity (15%) ---
    const diversityScore = calculateDiversityScore(transactions, tokenTransfers);

    // --- Factor 5: Consistency (20%) ---
    const consistencyScore = calculateConsistencyScore(transactions);

    // --- Weighted Total ---
    const totalScore = Math.round(
        (ageScore.score * 0.20) +
        (volumeScore.score * 0.20) +
        (successScore.score * 0.25) +
        (diversityScore.score * 0.15) +
        (consistencyScore.score * 0.20)
    );

    const grade = getGrade(totalScore);
    const balanceETH = (parseInt(balanceWei) / 1e18).toFixed(6);

    // Timestamps
    const timestamps = transactions.map(tx => parseInt(tx.timeStamp));
    const firstSeen = timestamps.length > 0 ? new Date(Math.min(...timestamps) * 1000).toISOString() : null;
    const lastSeen = timestamps.length > 0 ? new Date(Math.max(...timestamps) * 1000).toISOString() : null;

    return {
        score: totalScore,
        grade: grade.letter,
        label: grade.label,
        factors: {
            age: ageScore,
            volume: volumeScore,
            successRate: successScore,
            diversity: diversityScore,
            consistency: consistencyScore
        },
        metadata: {
            totalTransactions: transactions.length,
            totalTokenTransfers: tokenTransfers.length,
            balanceETH,
            firstSeen,
            lastSeen,
            analyzedAt: new Date().toISOString()
        }
    };
}


/* ============================================
   Individual Factor Calculators
   ============================================ */

/**
 * Factor 1: Age Score (0-100)
 * How old is this wallet? Older = more trusted
 */
function calculateAgeScore(transactions) {
    if (transactions.length === 0) return { score: 0, detail: 'No transactions' };

    const timestamps = transactions.map(tx => parseInt(tx.timeStamp));
    const firstTx = Math.min(...timestamps);
    const now = Math.floor(Date.now() / 1000);
    const ageDays = (now - firstTx) / 86400;

    let score;
    if (ageDays >= 365) score = 100;        // 1+ years
    else if (ageDays >= 180) score = 85;    // 6+ months
    else if (ageDays >= 90) score = 70;     // 3+ months
    else if (ageDays >= 30) score = 50;     // 1+ month
    else if (ageDays >= 7) score = 30;      // 1+ week
    else score = 10;                         // < 1 week

    return {
        score,
        detail: `Wallet age: ${Math.floor(ageDays)} days`
    };
}

/**
 * Factor 2: Volume Score (0-100)
 * Total number of transactions. More activity = more trusted
 */
function calculateVolumeScore(transactions, tokenTransfers) {
    const total = transactions.length + tokenTransfers.length;

    let score;
    if (total >= 1000) score = 100;
    else if (total >= 500) score = 90;
    else if (total >= 200) score = 80;
    else if (total >= 100) score = 70;
    else if (total >= 50) score = 55;
    else if (total >= 20) score = 40;
    else if (total >= 5) score = 25;
    else score = 10;

    return {
        score,
        detail: `${total} total transactions (${transactions.length} normal, ${tokenTransfers.length} token)`
    };
}

/**
 * Factor 3: Success Rate (0-100)
 * Percentage of successful transactions vs failed
 */
function calculateSuccessRate(transactions) {
    if (transactions.length === 0) return { score: 0, detail: 'No transactions' };

    const successful = transactions.filter(tx => tx.isError === '0' || tx.txreceipt_status === '1').length;
    const total = transactions.length;
    const rate = (successful / total) * 100;

    let score;
    if (rate >= 99) score = 100;
    else if (rate >= 95) score = 90;
    else if (rate >= 90) score = 75;
    else if (rate >= 80) score = 60;
    else if (rate >= 70) score = 40;
    else score = 20;

    return {
        score,
        detail: `${rate.toFixed(1)}% success rate (${successful}/${total})`
    };
}

/**
 * Factor 4: Diversity Score (0-100)
 * Number of unique counterparties. More diverse = less suspicious
 */
function calculateDiversityScore(transactions, tokenTransfers) {
    const counterparties = new Set();

    transactions.forEach(tx => {
        if (tx.to) counterparties.add(tx.to.toLowerCase());
        if (tx.from) counterparties.add(tx.from.toLowerCase());
    });

    tokenTransfers.forEach(tx => {
        if (tx.to) counterparties.add(tx.to.toLowerCase());
        if (tx.from) counterparties.add(tx.from.toLowerCase());
    });

    const count = counterparties.size;

    let score;
    if (count >= 100) score = 100;
    else if (count >= 50) score = 85;
    else if (count >= 20) score = 70;
    else if (count >= 10) score = 55;
    else if (count >= 5) score = 35;
    else score = 15;

    return {
        score,
        detail: `${count} unique counterparties`
    };
}

/**
 * Factor 5: Consistency Score (0-100)
 * Regular activity pattern vs burst-only usage
 */
function calculateConsistencyScore(transactions) {
    if (transactions.length < 2) return { score: 10, detail: 'Insufficient data' };

    const timestamps = transactions.map(tx => parseInt(tx.timeStamp)).sort((a, b) => a - b);
    const firstTx = timestamps[0];
    const lastTx = timestamps[timestamps.length - 1];
    const totalSpanDays = (lastTx - firstTx) / 86400;

    if (totalSpanDays < 1) return { score: 15, detail: 'All activity in a single day' };

    // Count distinct active weeks
    const activeWeeks = new Set();
    timestamps.forEach(ts => {
        const weekNumber = Math.floor((ts - firstTx) / (7 * 86400));
        activeWeeks.add(weekNumber);
    });

    const totalWeeks = Math.max(1, Math.ceil(totalSpanDays / 7));
    const activityRate = (activeWeeks.size / totalWeeks) * 100;

    let score;
    if (activityRate >= 80) score = 100;
    else if (activityRate >= 60) score = 80;
    else if (activityRate >= 40) score = 60;
    else if (activityRate >= 20) score = 40;
    else score = 20;

    return {
        score,
        detail: `Active ${activeWeeks.size}/${totalWeeks} weeks (${activityRate.toFixed(0)}% consistency)`
    };
}


/* ============================================
   Utility: Grade Assignment
   ============================================ */

function getGrade(score) {
    if (score >= 90) return { letter: 'AAA', label: 'Ultra Reliable' };
    if (score >= 75) return { letter: 'AA', label: 'Very Reliable' };
    if (score >= 60) return { letter: 'A', label: 'Reliable' };
    if (score >= 40) return { letter: 'BBB', label: 'Moderate' };
    if (score >= 20) return { letter: 'BB', label: 'Risky' };
    return { letter: 'C', label: 'No History / Dangerous' };
}

module.exports = {
    calculateTrustScore,
    getGrade
};
