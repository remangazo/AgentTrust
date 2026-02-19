/**
 * AgentTrust - Coinbase AgentKit Adapter
 * 
 * This adapter allows any agent using the Coinbase AgentKit to perform
 * real-time reputation checks on-chain.
 */

const { ActionProvider, createAction } = require("@coinbase/agentkit");
const { z } = require("zod");

/**
 * AgentTrust Action Provider
 */
class AgentTrustActionProvider extends ActionProvider {
    constructor() {
        super("agent-trust", []);
    }

    /**
     * Get Trust Score Action
     * 
     * @param walletProvider - The wallet provider to use for x402 payments
     * @param args - The arguments for the action
     */
    @createAction({
        name: "get_trust_score",
        description: "Verify the trust score and reputation of a wallet address on Base network. Returns a score (0-100) and a letter grade (AAA-C).",
        schema: z.object({
            address: z.string().regex(/^0x[a-fA-F0-9]{40}$/).describe("The Ethereum/Base wallet address to check"),
            fullReport: z.boolean().optional().default(false).describe("Whether to include a detailed breakdown of factors")
        }),
    })
    async getTrustScore(walletProvider, args) {
        const baseUrl = 'https://agent-trust-score.web.app/api';
        const url = `${baseUrl}/score/${args.address}${args.fullReport ? '?full=true' : ''}`;

        try {
            let response = await fetch(url);

            // Handle x402 Payment Handshake
            if (response.status === 402) {
                const paymentReq = await response.json();
                const paymentInfo = paymentReq.accepts[0];

                console.log(`[AgentTrust] Payment Required: ${paymentInfo.maxAmountRequired} micro-USDC. Executing x402 handshake...`);

                // Send payment via Agent's wallet (USDC on Base)
                // Note: AgentKit uses standard transaction structure
                const txHash = await walletProvider.sendTransaction({
                    to: paymentInfo.payTo,
                    value: "0", // USDC is a token transfer
                    data: this.encodeUSDCTransfer(paymentInfo.payTo, paymentInfo.maxAmountRequired)
                });

                console.log(`[AgentTrust] Payment sent: ${txHash}. Retrying...`);

                // Retry with proof of payment
                response = await fetch(url, {
                    headers: { 'x-transaction-hash': txHash }
                });
            }

            if (!response.ok) {
                return `Error fetching trust score: ${response.statusText}`;
            }

            const data = await response.json();
            return `Trust Score for ${args.address}: ${data.score}/100 (Grade: ${data.grade}). ${data.label}.`;

        } catch (error) {
            return `AgentTrust Action Error: ${error.message}`;
        }
    }

    /**
     * Helper to encode USDC transfer (Standard ERC20)
     */
    encodeUSDCTransfer(to, amount) {
        // USDC Address on Base: 0x833589fCD6aDb6E08f4c7af08495567719621132
        // For simplicity in the adapter snippet, we assume the agent knows how to send USDC.
        // In a production plugin, we use an ERC20 interface wrapper.
        return ""; // Simplified for snippet
    }

    supportsNetwork(network) {
        return network.protocolFamily === "evm" && network.chainId === "8453"; // Base
    }
}

module.exports = { AgentTrustActionProvider };
