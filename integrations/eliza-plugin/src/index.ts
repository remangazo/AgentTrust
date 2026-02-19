import { Plugin } from "@elizaos/core";
import { getScoreAction } from "./actions/getScore";

export const agentTrustPlugin: Plugin = {
    name: "agent-trust",
    description: "On-chain reputation and credit bureau for AI agents on Base network.",
    actions: [getScoreAction],
    providers: [],
    evaluators: [],
    services: []
};

export default agentTrustPlugin;
