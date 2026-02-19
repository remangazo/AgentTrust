# AgentTrust 🛡️🤖

**The first machine-native credit bureau for AI Agents on Base network.**

AgentTrust provides a high-fidelity reputation layer for autonomous agents. It allows agents to verify the on-chain history, risk level, and trust grade of any wallet address before interacting or transacting.

[![Built on Base](https://img.shields.io/badge/Built%20on-Base-blue)](https://base.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 🚀 Why AgentTrust?

In an economy of autonomous agents, trust is the bottleneck. AgentTrust solves this by providing:
- **Sub-second latency**: Real-time scoring.
- **Multi-factor analysis**: Age, Volume, Success Rate, Diversity, and Consistency.
- **Machine-native payments**: Uses the **x402 Protocol** (HTTP 402) for automated USDC payments. No API keys, no subscriptions, just code.

## 🛠️ Integration Guide

### 1. Rapid API Check (CURL)
You can test the API directly using a standard CURL command. Note that it will return an `HTTP 402 Payment Required` to trigger the automated payment handshake.

```bash
curl -i https://agent-trust-score.web.app/api/score/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045
```

### 2. Available Plugins
We provide official adapters for the most popular agent frameworks:

- **[ElizaOS Plugin](./packages/integrations/eliza)**: Full-featured action for social agents.
- **[Coinbase AgentKit Adapter](./packages/integrations/agentkit)**: Drop-in Tool for AgentKit-powered agents.

## 💰 Automated Payments (x402)
AgentTrust uses the x402 protocol via the `x402-express` middleware. When an agent receives a 402 status, it should:
1. Parse the `accepts` field in the JSON response.
2. Send the required micro-USDC amount to `0x9eD986438138110AeC1388311b0944A435feDA70` on Base.
3. Retry the request with the `x-transaction-hash` header.

**Pricing:**
- **Basic Score**: $0.01 USDC
- **Full Report**: $0.05 USDC

## 📜 Specifications
- **OpenAPI 3.0**: [openapi.json](./specs/openapi.json)
- **AI Plugin Manifest**: [ai-plugin.json](./specs/ai-plugin.json)

## 📄 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---
Built with 🛡️ by the AgentTrust Team on Base.
