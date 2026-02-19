/**
 * AgentTrust Lightweight SDK Snippet
 * Copy this into your agent's toolbelt to enable automated wallet reputation checks.
 */

async function getAgentTrustScore(address, { full = false, wallet = null } = {}) {
    const baseUrl = 'https://agent-trust-score.web.app/api';
    const url = `${baseUrl}/score/${address}${full ? '?full=true' : ''}`;

    let response = await fetch(url);

    // Initial check: if 402 Payment Required, attempt automated payment
    if (response.status === 402) {
        if (!wallet) {
            throw new Error("Payment Required (402). Please provider a 'wallet' instance to enable automated payment.");
        }

        const paymentReq = await response.json();
        const paymentInfo = paymentReq.accepts[0]; // Get the first payment option

        console.log(`[AgentTrust] Payment Required: ${paymentInfo.maxAmountRequired} micro-USDC to ${paymentInfo.payTo}`);

        // This is a generic call - adapt it to your specific wallet (Coinbase SDK, Ethers.js, etc.)
        // Example: const tx = await wallet.send({ to: paymentInfo.payTo, amount: paymentInfo.maxAmountRequired, token: 'USDC' });
        const txHash = await wallet.sendUSDC(paymentInfo.payTo, paymentInfo.maxAmountRequired);

        console.log(`[AgentTrust] Payment sent: ${txHash}. Retrying query...`);

        // Retry with proof of payment
        response = await fetch(url, {
            headers: { 'x-transaction-hash': txHash }
        });
    }

    if (!response.ok) {
        const err = await response.json();
        throw new Error(`AgentTrust API Error: ${err.error || response.statusText}`);
    }

    return await response.json();
}

// Example Usage:
/*
const trustData = await getAgentTrustScore('0xd8dA...6045', { 
    full: true, 
    wallet: myAutonomousWallet // Must implement .sendUSDC(to, amount)
});
console.log(`Score: ${trustData.score} (${trustData.grade})`);
*/
