import axios, { AxiosInstance, isAxiosError } from 'axios';
import { config } from '../config';
import { withRetry } from '../utils/retry';
import { ServiceUnavailableError } from '../utils/errors';
import { logService } from '../services/log.service';
import { LogCategory } from '@prisma/client';

interface GeminiPart {
  text?: string;
}

interface GeminiCandidate {
  content?: { parts?: GeminiPart[] };
}

interface GeminiResponse {
  candidates?: GeminiCandidate[];
}

export interface GenerateOptions {
  prompt: string;
  systemInstruction?: string;
  temperature?: number;
  expectJson?: boolean;
}

class GeminiClient {
  private readonly http: AxiosInstance;

  constructor() {
    this.http = axios.create({
      baseURL: config.gemini.baseUrl,
      timeout: 60000,
    });
  }

  isConfigured(): boolean {
    return Boolean(config.gemini.apiKey);
  }

  async generateText(options: GenerateOptions): Promise<string> {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableError('Gemini API key is not configured');
    }

    const url = `/models/${config.gemini.model}:generateContent`;
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

    return withRetry(
      async () => {
        try {
          const { data } = await this.http.post<GeminiResponse>(url, body, {
            params: { key: config.gemini.apiKey },
          });
          const text = data.candidates?.[0]?.content?.parts
            ?.map((part) => part.text ?? '')
            .join('')
            .trim();
          if (!text) {
            throw new ServiceUnavailableError('Gemini returned an empty response');
          }
          return text;
        } catch (error) {
          if (isAxiosError(error)) {
            await logService.error(LogCategory.AI, 'Gemini request failed', {
              status: error.response?.status,
              data: error.response?.data,
            });
          }
          throw error;
        }
      },
      {
        retries: config.gemini.maxRetries,
        delayMs: config.gemini.retryDelayMs,
        label: 'gemini-generate',
      },
    );
  }

  async generateJson<T>(options: GenerateOptions): Promise<T> {
    const raw = await this.generateText({ ...options, expectJson: true });
    return parseJsonResponse<T>(raw);
  }
}

export const parseJsonResponse = <T>(raw: string): T => {
  const cleaned = raw
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/i, '')
    .trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  const candidate =
    start >= 0 && end >= start ? cleaned.slice(start, end + 1) : cleaned;
  return JSON.parse(candidate) as T;
};

export const geminiClient = new GeminiClient();
