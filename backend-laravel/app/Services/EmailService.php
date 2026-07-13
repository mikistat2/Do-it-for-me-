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
        $fromDomain = explode('@', (string) config('mail.from.address', 'app@doitforme.app'))[1] ?? 'doitforme.app';
        $messageId = uniqid('app', true) . '@' . $fromDomain;

        Mail::html($this->toHtml($body), function ($message) use ($to, $subject, $body, $messageId) {
            $message->to($to)
                    ->subject($subject)
                    ->text($this->toPlain($body))
                    ->getHeaders()
                    ->addIdHeader('Message-ID', $messageId);
        });

        return '<' . $messageId . '>';
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
