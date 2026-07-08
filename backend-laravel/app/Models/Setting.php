<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class Setting extends Model
{
    use HasUuids;

    protected $table = 'settings';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'user_id',
        'automation_paused',
        'auto_apply',
        'match_threshold',
        'notify_on_high_score',
        'notify_on_sent',
        'notify_on_failed',
    ];

    protected function casts(): array
    {
        return [
            'automation_paused'    => 'boolean',
            'auto_apply'           => 'boolean',
            'match_threshold'      => 'integer',
            'notify_on_high_score' => 'boolean',
            'notify_on_sent'       => 'boolean',
            'notify_on_failed'     => 'boolean',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
