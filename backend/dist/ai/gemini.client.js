"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.geminiClient = exports.parseJsonResponse = void 0;
const axios_1 = __importStar(require("axios"));
const config_1 = require("../config");
const retry_1 = require("../utils/retry");
const errors_1 = require("../utils/errors");
const log_service_1 = require("../services/log.service");
const client_1 = require("@prisma/client");
class GeminiClient {
    constructor() {
        this.http = axios_1.default.create({
            baseURL: config_1.config.gemini.baseUrl,
            timeout: 60000,
        });
    }
    isConfigured() {
        return Boolean(config_1.config.gemini.apiKey);
    }
    async generateText(options) {
        if (!this.isConfigured()) {
            throw new errors_1.ServiceUnavailableError('Gemini API key is not configured');
        }
        const url = `/models/${config_1.config.gemini.model}:generateContent`;
        const body = {
            contents: [{ role: 'user', parts: [{ text: options.prompt }] }],
            ...(options.systemInstruction
                ? {
                    systemInstruction: {
                        parts: [{ text: options.systemInstruction }],
                    },
                }
                : {}),
            generationConfig: {
                temperature: options.temperature ?? 0.4,
                ...(options.expectJson
                    ? { responseMimeType: 'application/json' }
                    : {}),
            },
        };
        return (0, retry_1.withRetry)(async () => {
            try {
                const { data } = await this.http.post(url, body, {
                    params: { key: config_1.config.gemini.apiKey },
                });
                const text = data.candidates?.[0]?.content?.parts
                    ?.map((part) => part.text ?? '')
                    .join('')
                    .trim();
                if (!text) {
                    throw new errors_1.ServiceUnavailableError('Gemini returned an empty response');
                }
                return text;
            }
            catch (error) {
                if ((0, axios_1.isAxiosError)(error)) {
                    await log_service_1.logService.error(client_1.LogCategory.AI, 'Gemini request failed', {
                        status: error.response?.status,
                        data: error.response?.data,
                    });
                }
                throw error;
            }
        }, {
            retries: config_1.config.gemini.maxRetries,
            delayMs: config_1.config.gemini.retryDelayMs,
            label: 'gemini-generate',
        });
    }
    async generateJson(options) {
        const raw = await this.generateText({ ...options, expectJson: true });
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
    return JSON.parse(candidate);
};
exports.parseJsonResponse = parseJsonResponse;
exports.geminiClient = new GeminiClient();
//# sourceMappingURL=gemini.client.js.map