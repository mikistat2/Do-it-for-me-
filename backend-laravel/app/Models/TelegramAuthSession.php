<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class TelegramAuthSession extends Model
{
    use HasUuids;

    protected $table = 'telegram_auth_sessions';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'phone',
        'session_path',
        'status',
        'telegram_user_id',
        'telegram_username',
        'expires_at',
    ];
   
    protected function casts(): array
    {
        return [
            'telegram_user_id' => 'integer',
            'expires_at'       => 'datetime',
            'created_at'       => 'datetime',
            'updated_at'       => 'datetime',
        ];
    }

    public function isExpired(): bool
    {
        return $this->expires_at->isPast();
    }
}
