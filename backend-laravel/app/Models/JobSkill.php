<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class JobSkill extends Model
{
    use HasUuids;

    protected $table = 'job_skills';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = ['job_id', 'name'];

    public function job()
    {
        return $this->belongsTo(Job::class, 'job_id');
    }
}
