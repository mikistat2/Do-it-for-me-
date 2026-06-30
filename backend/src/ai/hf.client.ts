import { InferenceClient } from '@huggingface/inference';
import { config } from '../config';
import { ServiceUnavailableError } from '../utils/errors';
import { logService } from '../services/log.service';
import { LogCategory } from '@prisma/client';

export interface GenerateOptions {
  prompt: string;
  systemInstruction?: string;
}

class HfClient {
  private readonly client: InferenceClient | null;

  constructor() {
    this.client = config.hf.token ? new InferenceClient(config.hf.token) : null;
  }

  isConfigured(): boolean {
    return Boolean(this.client);
  }

  async generateText(options: GenerateOptions): Promise<string> {
    if (!this.client) {
      throw new ServiceUnavailableError('Hugging Face API token is not configured');
    }

    try {
      const messages = [];
      if (options.systemInstruction) {
        messages.push({ role: 'system', content: options.systemInstruction });
      }
      messages.push({ role: 'user', content: options.prompt });

      const chatCompletion = await this.client.chatCompletion({
        model: 'meta-llama/Llama-3.1-8B-Instruct',
        messages: messages as any,
        provider: 'auto',
      });

      const text = chatCompletion.choices[0]?.message?.content || '';

      if (!text) {
        throw new ServiceUnavailableError('Hugging Face returned an empty response');
      }

      return text;
    } catch (error: any) {
      await logService.error(LogCategory.AI, 'Hugging Face request failed', {
        message: error.message,
      });
      throw error;
    }
  }

  async generateJson<T>(options: GenerateOptions): Promise<T> {
    const raw = await this.generateText(options);
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

export const hfClient = new HfClient();
