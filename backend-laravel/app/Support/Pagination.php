<?php

namespace App\Support;

class Pagination
{
    public const DEFAULT_PAGE      = 1;
    public const DEFAULT_PAGE_SIZE = 20;
    public const MAX_PAGE_SIZE     = 100;

    /**
     * Resolve pagination params (skip/take) from page and pageSize.
     * Mirrors Node's resolvePagination() utility.
     */
    public static function resolve(?int $page, ?int $pageSize): array
    {
        $page     = max(1, (int) ($page ?? self::DEFAULT_PAGE));
        $pageSize = min(
            self::MAX_PAGE_SIZE,
            max(1, (int) ($pageSize ?? self::DEFAULT_PAGE_SIZE))
        );

        return [
            'page'     => $page,
            'pageSize' => $pageSize,
            'skip'     => ($page - 1) * $pageSize,
            'take'     => $pageSize,
        ];
    }
}
