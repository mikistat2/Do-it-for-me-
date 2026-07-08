<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class Notification extends Model
{
    use HasUuids;

    protected $table = 'notifications';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'user_id',
        'type',
        'title',
        'message',
        'metadata',
        'is_read',
    ];

    protected function casts(): array
    {
        return [
            'metadata' => 'array',
            'is_read'  => 'boolean',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
