<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Tymon\JWTAuth\Contracts\JWTSubject;

class User extends Authenticatable implements JWTSubject
{
    use HasFactory, Notifiable, HasUuids;

    protected $table = 'users';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'email',
        'password_hash',
        'role',
        'is_active',
        'telegram_user_id',
        'telegram_phone',
        'telegram_username',
        'telegram_session_path',
        'telegram_verified_at',
    ];

    protected $hidden = [
        'password_hash',
    ];

    protected function casts(): array
    {
        return [
            'is_active'            => 'boolean',
            'telegram_user_id'     => 'integer',
            'telegram_verified_at' => 'datetime',
            'created_at'           => 'datetime',
            'updated_at'           => 'datetime',
        ];
    }

    // ─── JWT ───────────────────────────────────────────────
    public function getJWTIdentifier(): mixed
    {
        return $this->getKey();
    }

    public function getJWTCustomClaims(): array
    {
        return [
            'email' => $this->email,
            'role'  => $this->role,
        ];
    }

    // ─── Relations ─────────────────────────────────────────
    public function profile()
    {
        return $this->hasOne(Profile::class, 'user_id');
    }

    public function channels()
    {
        return $this->hasMany(TelegramChannel::class, 'user_id');
    }

    public function jobs()
    {
        return $this->hasMany(Job::class, 'user_id');
    }

    public function drafts()
    {
        return $this->hasMany(ApplicationDraft::class, 'user_id');
    }

    public function applications()
    {
        return $this->hasMany(Application::class, 'user_id');
    }

    public function notifications()
    {
        return $this->hasMany(Notification::class, 'user_id');
    }

    public function setting()
    {
        return $this->hasOne(Setting::class, 'user_id');
    }

    public function refreshTokens()
    {
        return $this->hasMany(RefreshToken::class, 'user_id');
    }

    public function matches()
    {
        return $this->hasMany(JobMatch::class, 'user_id');
    }
}
