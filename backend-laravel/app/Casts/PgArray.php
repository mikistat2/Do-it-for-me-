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

        // Manual Postgres array parser — avoids str_getcsv() which is
        // deprecated without an explicit $escape param in PHP 8.4.
        $results = [];
        $current = '';
        $inQuote = false;
        $len = strlen($value);

        for ($i = 0; $i < $len; $i++) {
            $char = $value[$i];

            if ($char === '\\' && $inQuote) {
                // Handle escaped characters (like \")
                if ($i + 1 < $len) {
                    $current .= $value[$i + 1];
                    $i++; // skip the escaped character
                }
                continue;
            }
            if ($char === '"' && !$inQuote) {
                $inQuote = true;
                continue;
            }
            if ($char === '"' && $inQuote) {
                $inQuote = false;
                continue;
            }
            if ($char === ',' && !$inQuote) {
                $results[] = $current;
                $current = '';
                continue;
            }
            $current .= $char;
        }
        $results[] = $current;

        return $results;
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
