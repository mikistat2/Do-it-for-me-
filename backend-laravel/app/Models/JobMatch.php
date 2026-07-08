<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class JobMatch extends Model
{
    use HasUuids;

    protected $table = 'job_matches';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'job_id',
        'user_id',
        'score',
        'strengths',
        'weaknesses',
        'reason',
        'recommendation',
    ];

    protected function casts(): array
    {
        return [
            'score'      => 'integer',
            'strengths'  => \App\Casts\PgArray::class,
            'weaknesses' => \App\Casts\PgArray::class,
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
}
