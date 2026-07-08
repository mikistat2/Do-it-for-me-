<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class ApplicationDraft extends Model
{
    use HasUuids;

    protected $table = 'application_drafts';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'job_id',
        'user_id',
        'subject',
        'body',
        'to_email',
        'status',
    ];

    public function job()
    {
        return $this->belongsTo(Job::class, 'job_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function application()
    {
        return $this->hasOne(Application::class, 'draft_id');
    }
}
