<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class Profile extends Model
{
    use HasUuids;

    protected $table = 'profiles';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'user_id',
        'full_name',
        'email',
        'phone',
        'portfolio',
        'linkedin',
        'github',
        'resume_text',
        'skills',
        'preferred_roles',
        'preferred_locations',
        'expected_salary',
        'min_match_score',
    ];

    protected function casts(): array
    {
        return [
            'skills'              => \App\Casts\PgArray::class,
            'preferred_roles'     => \App\Casts\PgArray::class,
            'preferred_locations' => \App\Casts\PgArray::class,
            'expected_salary'     => 'integer',
            'min_match_score'     => 'integer',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
