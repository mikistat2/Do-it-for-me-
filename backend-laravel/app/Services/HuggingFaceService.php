<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Centralized wrapper for the HuggingFace Inference API.
 *
 * Every AI call in the app (matching, email generation, etc.) goes through
 * this service so we have one place to configure the model, handle retries
 * for the "model is loading" 503 responses, and extract structured JSON.
 */
class HuggingFaceService
{
    private string $token;
    private string $model;
    private string $baseUrl = 'https://api-inference.huggingface.co/models/';

    public function __construct()
    {
        $this->token = (string) config('app.hf_token', '');
        $this->model = (string) config('app.hf_model', 'mistralai/Mistral-7B-Instruct-v0.3');
    }

    /**
     * Check whether the HuggingFace API is configured with a token.
     */
    public function isConfigured(): bool
    {
        return !empty($this->token);
    }

    /**
     * Send a text-generation completion request.
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

        $input = "<s>[INST] {$systemPrompt}\n\n{$userPrompt} [/INST]";

        $maxAttempts = 3;

        for ($attempt = 1; $attempt <= $maxAttempts; $attempt++) {
            try {
                $response = Http::withToken($this->token)
                    ->timeout(60)
                    ->post($this->baseUrl . $this->model, [
                        'inputs'     => $input,
                        'parameters' => [
                            'max_new_tokens' => $maxTokens,
                            'temperature'    => $temperature,
                            'return_full_text' => false,
                        ],
                    ]);

                // Model is still loading — wait and retry
                if ($response->status() === 503) {
                    $wait = $response->json('estimated_time', 20);
                    $wait = min((int) ceil($wait), 30);

                    Log::info("HuggingFace: model loading, waiting {$wait}s (attempt {$attempt}/{$maxAttempts})");

                    if ($attempt < $maxAttempts) {
                        sleep($wait);
                        continue;
                    }
                    return null;
                }

                // Rate limited
                if ($response->status() === 429) {
                    Log::warning('HuggingFace: rate limited');
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
                    return null;
                }

                $text = $response->json('0.generated_text') ?? '';

                // Some models repeat the prompt — strip it if present
                if (str_contains($text, '[/INST]')) {
                    $text = preg_replace('/^.*?\[\/INST\]/s', '', $text);
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

        return $this->extractJson($text);
    }

    /**
     * Extract the first valid JSON object from a text response.
     */
    public function extractJson(string $text): ?array
    {
        // Try to find a JSON block delimited by ```json ... ```
        if (preg_match('/```json\s*(\{.*?\})\s*```/s', $text, $codeBlock)) {
            $data = json_decode($codeBlock[1], true);
            if (is_array($data)) {
                return $data;
            }
        }

        // Try to find any JSON object
        if (preg_match('/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/s', $text, $matches)) {
            $data = json_decode($matches[0], true);
            if (is_array($data)) {
                return $data;
            }
        }

        // Last resort — try the whole text
        $data = json_decode(trim($text), true);
        if (is_array($data)) {
            return $data;
        }

        Log::debug('HuggingFace: failed to extract JSON from response', [
            'text' => substr($text, 0, 500),
        ]);

        return null;
    }
}
