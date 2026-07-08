<?php

namespace App\Casts;

use Illuminate\Contracts\Database\Eloquent\CastsAttributes;
use Illuminate\Database\Eloquent\Model;

class PgArray implements CastsAttributes
{
    public function get(Model $model, string $key, mixed $value, array $attributes): mixed
    {
        if ($value === null) {
            return [];
        }

        $value = trim($value, '{}');
        if ($value === '') {
            return [];
        }

        // Extremely naive CSV split. Good enough for simple strings.
        // More robust parsing would use str_getcsv if strings contain commas.
        return str_getcsv($value, ',', '"');
    }

    public function set(Model $model, string $key, mixed $value, array $attributes): mixed
    {
        if ($value === null) {
            return null;
        }

        if (!is_array($value)) {
            $value = [];
        }

        // Format as Postgres array: {a,b,"c,d"}
        $formatted = array_map(function ($item) {
            // Escape quotes and wrap in quotes if needed
            return '"' . str_replace('"', '\"', $item) . '"';
        }, $value);

        return '{' . implode(',', $formatted) . '}';
    }
}
