<?php

namespace App\Services;

use Illuminate\Support\Facades\Mail;

class EmailService
{
    /**
     * Send an email and return the message ID.
     * Mirrors Node's emailService.send()
     */
    public function send(string $to, string $subject, string $body): string
    {
        $messageId = '<' . uniqid('app', true) . '@' . config('mail.from.address', 'doitforme.app') . '>';

        Mail::html($this->toHtml($body), function ($message) use ($to, $subject, $messageId) {
            $message->to($to)
                    ->subject($subject)
                    ->text($this->toPlain($subject))
                    ->getHeaders()
                    ->addTextHeader('Message-ID', $messageId);
        });

        return $messageId;
    }

    // ─── Private ───────────────────────────────────────────

    private function toHtml(string $body): string
    {
        $paragraphs = preg_split('/\n{2,}/', $body);
        return implode('', array_map(
            fn($p) => '<p>' . nl2br(htmlspecialchars($p)) . '</p>',
            $paragraphs
        ));
    }

    private function toPlain(string $body): string
    {
        return $body;
    }

    public function isConfigured(): bool
    {
        return !empty(config('mail.mailers.smtp.username'))
            && !empty(config('mail.mailers.smtp.password'));
    }
}
