<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class Log extends Model
{
    use HasUuids;

    protected $table = 'logs';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'level',
        'category',
        'message',
        'context',
    ];

    protected function casts(): array
    {
        return [
            'context' => 'array',
        ];
    }
}
