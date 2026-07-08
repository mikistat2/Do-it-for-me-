<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class RefreshToken extends Model
{
    use HasUuids;

    protected $table = 'refresh_tokens';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'user_id',
        'token_hash',
        'expires_at',
        'revoked',
    ];

    protected function casts(): array
    {
        return [
            'revoked'    => 'boolean',
            'expires_at' => 'datetime',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
