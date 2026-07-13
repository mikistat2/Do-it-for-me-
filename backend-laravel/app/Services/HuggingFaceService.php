<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Centralized wrapper for the HuggingFace Inference API.
 *
 * Every AI call in the app (matching, email generation, etc.) goes through
 * this service so we have one place to configure the model, handle retries,
 * and extract structured JSON.
 *
 * Uses the OpenAI-compatible chat completions endpoint on
 * router.huggingface.co — the old api-inference.huggingface.co endpoint
 * was shut down and always fails.
 */
class HuggingFaceService
{
    private string $token;
    private string $model;
    private string $endpoint = 'https://router.huggingface.co/v1/chat/completions';

    public function __construct()
    {
        $this->token = (string) config('app.hf_token', '');
        $this->model = (string) config('app.hf_model', 'meta-llama/Llama-3.1-8B-Instruct');
    }

    /**
     * Check whether the HuggingFace API is configured with a token.
     */
    public function isConfigured(): bool
    {
        return !empty($this->token);
    }

    /**
     * Send a chat completion request.
     *
     * @param  string  $systemPrompt  The system instruction (role context)
     * @param  string  $userPrompt    The user-provided data/question
     * @param  int     $maxTokens     Max new tokens to generate
     * @param  float   $temperature   Sampling temperature (lower = more deterministic)
     * @return string|null  The generated text, or null on failure
     */
    public function complete(
        string $systemPrompt,
        string $userPrompt,
        int $maxTokens = 500,
        float $temperature = 0.3,
    ): ?string {
        if (!$this->isConfigured()) {
            return null;
        }

        $payload = [
            'model' => $this->model,
            'messages' => [
                ['role' => 'system', 'content' => $systemPrompt],
                ['role' => 'user', 'content' => $userPrompt],
            ],
            'max_tokens' => $maxTokens,
            'temperature' => $temperature,
        ];

        $maxAttempts = 3;

        for ($attempt = 1; $attempt <= $maxAttempts; $attempt++) {
            try {
                $response = Http::withToken($this->token)
                    ->timeout(90)
                    ->post($this->endpoint, $payload);

                // Model loading or rate limited — wait and retry
                if (in_array($response->status(), [429, 503])) {
                    Log::warning("HuggingFace: status {$response->status()}, retrying (attempt {$attempt}/{$maxAttempts})");
                    if ($attempt < $maxAttempts) {
                        sleep(5 * $attempt);
                        continue;
                    }
                    return null;
                }

                if (!$response->successful()) {
                    Log::warning('HuggingFace: API error', [
                        'status' => $response->status(),
                        'body'   => substr($response->body(), 0, 500),
                    ]);

                    // Retry on server errors (5xx)
                    if ($response->status() >= 500 && $attempt < $maxAttempts) {
                        sleep(3 * $attempt);
                        continue;
                    }

                    return null;
                }

                $text = $response->json('choices.0.message.content');

                if (!is_string($text) || $text === '') {
                    Log::warning('HuggingFace: empty completion', [
                        'body' => substr($response->body(), 0, 500),
                    ]);
                    return null;
                }

                return trim($text);
            } catch (\Throwable $e) {
                Log::warning('HuggingFace: request failed', [
                    'attempt' => $attempt,
                    'error'   => $e->getMessage(),
                ]);

                if ($attempt < $maxAttempts) {
                    sleep(2 * $attempt);
                    continue;
                }
            }
        }

        return null;
    }

    /**
     * Send a completion and attempt to extract a JSON object from the response.
     *
     * @return array|null  Parsed JSON array, or null if extraction fails
     */
    public function completeJson(
        string $systemPrompt,
        string $userPrompt,
        int $maxTokens = 500,
        float $temperature = 0.2,
    ): ?array {
        $text = $this->complete($systemPrompt, $userPrompt, $maxTokens, $temperature);

        if (!$text) {
            return null;
        }

        $result = $this->extractJson($text);

        // If JSON extraction failed, try once more with a lower temperature for more deterministic output
        if (!$result) {
            Log::info('HuggingFace: JSON extraction failed, retrying with lower temperature');
            $text = $this->complete($systemPrompt, $userPrompt, $maxTokens, max(0.05, $temperature - 0.10));
            if ($text) {
                $result = $this->extractJson($text);
            }
        }

        return $result;
    }

    /**
     * Extract the first valid JSON object from a text response.
     */
    public function extractJson(string $text): ?array
    {
        // Strip any leading/trailing whitespace and control characters
        $text = trim($text);

        // Try to find a JSON block delimited by ```json ... ```
        if (preg_match('/```(?:json)?\s*(\{.*?\})\s*```/s', $text, $codeBlock)) {
            $data = json_decode($codeBlock[1], true);
            if (is_array($data)) {
                return $data;
            }
        }

        // Try to find any JSON object (handles nested braces)
        if (preg_match('/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/s', $text, $matches)) {
            $data = json_decode($matches[0], true);
            if (is_array($data)) {
                return $data;
            }
        }

        // Try to find JSON with nested arrays too (more permissive pattern)
        if (preg_match('/\{.*\}/s', $text, $matches)) {
            // Clean up common issues: trailing commas, etc.
            $cleaned = preg_replace('/,\s*([\]}])/', '$1', $matches[0]);
            $data = json_decode($cleaned, true);
            if (is_array($data)) {
                return $data;
            }
        }

        // Last resort — try the whole text
        $data = json_decode($text, true);
        if (is_array($data)) {
            return $data;
        }

        Log::debug('HuggingFace: failed to extract JSON from response', [
            'text' => substr($text, 0, 500),
        ]);

        return null;
    }
}
