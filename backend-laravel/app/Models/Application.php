<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class Application extends Model
{
    use HasUuids;

    protected $table = 'applications';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'job_id',
        'user_id',
        'draft_id',
        'to_email',
        'to_telegram',
        'subject',
        'body',
        'status',
        'attempts',
        'error',
        'message_id',
        'sent_at',
    ];

    protected function casts(): array
    {
        return [
            'attempts' => 'integer',
            'sent_at'  => 'datetime',
        ];
    }

    public function job()
    {
        return $this->belongsTo(Job::class, 'job_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function draft()
    {
        return $this->belongsTo(ApplicationDraft::class, 'draft_id');
    }
}
