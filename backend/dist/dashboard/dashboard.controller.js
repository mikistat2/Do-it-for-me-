"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dashboardController = void 0;
const statistics_service_1 = require("./statistics.service");
const http_1 = require("../utils/http");
const errors_1 = require("../utils/errors");
const requireUserId = (req) => {
    if (!req.user) {
        throw new errors_1.UnauthorizedError('Authentication required');
    }
    return req.user.id;
};
exports.dashboardController = {
    async overview(req, res) {
        const userId = requireUserId(req);
        const [summary, jobsByStatus, recentApplications, pendingDrafts] = await Promise.all([
            statistics_service_1.statisticsService.summary(userId),
            statistics_service_1.statisticsService.jobsByStatus(userId),
            statistics_service_1.statisticsService.recentApplications(userId),
            statistics_service_1.statisticsService.pendingDrafts(userId),
        ]);
        (0, http_1.sendSuccess)(res, {
            summary,
            jobsByStatus,
            recentApplications,
            pendingDrafts,
        });
    },
    async statistics(req, res) {
        const userId = requireUserId(req);
        const [summary, jobsByStatus, applicationsTrend] = await Promise.all([
            statistics_service_1.statisticsService.summary(userId),
            statistics_service_1.statisticsService.jobsByStatus(userId),
            statistics_service_1.statisticsService.applicationsTrend(userId),
        ]);
        (0, http_1.sendSuccess)(res, { summary, jobsByStatus, applicationsTrend });
    },
};
//# sourceMappingURL=dashboard.controller.js.map