"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildPaginatedResult = exports.resolvePagination = void 0;
const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;
const resolvePagination = (page, pageSize) => {
    const resolvedPage = page && page > 0 ? page : DEFAULT_PAGE;
    const resolvedSize = Math.min(pageSize && pageSize > 0 ? pageSize : DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
    return {
        page: resolvedPage,
        pageSize: resolvedSize,
        skip: (resolvedPage - 1) * resolvedSize,
        take: resolvedSize,
    };
};
exports.resolvePagination = resolvePagination;
const buildPaginatedResult = (items, total, pagination) => ({
    items,
    page: pagination.page,
    pageSize: pagination.pageSize,
    total,
    totalPages: Math.ceil(total / pagination.pageSize) || 0,
});
exports.buildPaginatedResult = buildPaginatedResult;
//# sourceMappingURL=pagination.js.map