<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class Job extends Model
{
    use HasUuids;

    protected $table = 'jobs';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'user_id',
        'message_id',
        'title',
        'company',
        'contact_email',
        'contact_phone',
        'experience',
        'salary',
        'remote_type',
        'deadline',
        'description',
        'raw_text',
        'content_hash',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'deadline' => 'datetime',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function message()
    {
        return $this->belongsTo(TelegramMessage::class, 'message_id');
    }

    public function skills()
    {
        return $this->hasMany(JobSkill::class, 'job_id');
    }

    public function locations()
    {
        return $this->hasMany(JobLocation::class, 'job_id');
    }

    public function match()
    {
        return $this->hasOne(JobMatch::class, 'job_id');
    }

    public function drafts()
    {
        return $this->hasMany(ApplicationDraft::class, 'job_id');
    }

    public function applications()
    {
        return $this->hasMany(Application::class, 'job_id');
    }
}
