"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logController = void 0;
const log_service_1 = require("../services/log.service");
const http_1 = require("../utils/http");
exports.logController = {
    async list(req, res) {
        const query = req.query;
        const result = await log_service_1.logService.list({ level: query.level, category: query.category, search: query.search }, query.page, query.pageSize);
        (0, http_1.sendSuccess)(res, result.items, 200, {
            page: result.page,
            pageSize: result.pageSize,
            total: result.total,
            totalPages: result.totalPages,
        });
    },
};
//# sourceMappingURL=log.controller.js.map