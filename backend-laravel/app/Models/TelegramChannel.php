<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class TelegramChannel extends Model
{
    use HasUuids;

    protected $table = 'telegram_channels';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'user_id',
        'channel_id',
        'title',
        'username',
        'status',
        'last_message_at',
    ];

    protected function casts(): array
    {
        return [
            'last_message_at' => 'datetime',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function messages()
    {
        return $this->hasMany(TelegramMessage::class, 'channel_id');
    }

    public function toArray()
    {
        $array = parent::toArray();
        
        return [
            'id'            => $array['id'] ?? null,
            'channelId'     => $array['channel_id'] ?? null,
            'title'         => $array['title'] ?? null,
            'username'      => $array['username'] ?? null,
            'status'        => $array['status'] ?? null,
            'lastMessageAt' => $array['last_message_at'] ?? null,
            'createdAt'     => $array['created_at'] ?? null,
            'updatedAt'     => $array['updated_at'] ?? null,
        ];
    }
}
