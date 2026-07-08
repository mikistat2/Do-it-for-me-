<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class TelegramMessage extends Model
{
    use HasUuids;

    protected $table = 'telegram_messages';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'channel_id',
        'telegram_msg_id',
        'raw_text',
        'sender_id',
        'is_job_post',
        'message_date',
    ];

    protected function casts(): array
    {
        return [
            'is_job_post'  => 'boolean',
            'message_date' => 'datetime',
        ];
    }

    public function channel()
    {
        return $this->belongsTo(TelegramChannel::class, 'channel_id');
    }

    public function job()
    {
        return $this->hasOne(Job::class, 'message_id');
    }
}
