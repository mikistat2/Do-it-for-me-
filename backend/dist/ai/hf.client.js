"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hfClient = exports.parseJsonResponse = void 0;
const inference_1 = require("@huggingface/inference");
const config_1 = require("../config");
const errors_1 = require("../utils/errors");
const log_service_1 = require("../services/log.service");
const client_1 = require("@prisma/client");
class HfClient {
    constructor() {
        this.client = config_1.config.hf.token ? new inference_1.InferenceClient(config_1.config.hf.token) : null;
    }
    isConfigured() {
        return Boolean(this.client);
    }
    async generateText(options) {
        if (!this.client) {
            throw new errors_1.ServiceUnavailableError('Hugging Face API token is not configured');
        }
        try {
            const messages = [];
            if (options.systemInstruction) {
                messages.push({ role: 'system', content: options.systemInstruction });
            }
            messages.push({ role: 'user', content: options.prompt });
            const chatCompletion = await this.client.chatCompletion({
                model: 'meta-llama/Llama-3.1-8B-Instruct',
                messages: messages,
                provider: 'auto',
            });
            const text = chatCompletion.choices[0]?.message?.content || '';
            if (!text) {
                throw new errors_1.ServiceUnavailableError('Hugging Face returned an empty response');
            }
            return text;
        }
        catch (error) {
            await log_service_1.logService.error(client_1.LogCategory.AI, 'Hugging Face request failed', {
                message: error.message,
            });
            throw error;
        }
    }
    async generateJson(options) {
        const raw = await this.generateText(options);
        return (0, exports.parseJsonResponse)(raw);
    }
}
const parseJsonResponse = (raw) => {
    const cleaned = raw
        .replace(/^```(?:json)?/i, '')
        .replace(/```$/i, '')
        .trim();
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    const candidate = start >= 0 && end >= start ? cleaned.slice(start, end + 1) : cleaned;
    try {
        return JSON.parse(candidate);
    }
    catch (error) {
        // If JSON.parse fails, it is often due to unescaped literal newlines in the generated strings.
        // We attempt to sanitize it by replacing literal newlines with escaped \n, 
        // but only when they are not already escaped.
        const sanitized = candidate
            .replace(/\n/g, '\\n')
            .replace(/\r/g, '');
        try {
            return JSON.parse(sanitized);
        }
        catch (fallbackError) {
            // If it STILL fails, it might be that replacing ALL newlines broke the JSON structure.
            throw error;
        }
    }
};
exports.parseJsonResponse = parseJsonResponse;
exports.hfClient = new HfClient();
//# sourceMappingURL=hf.client.js.map