"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.channelIdSchema = exports.updateChannelSchema = exports.createChannelSchema = exports.listChannelsSchema = void 0;
const zod_1 = require("zod");
const client_1 = require("@prisma/client");
const common_validator_1 = require("./common.validator");
exports.listChannelsSchema = zod_1.z.object({
    query: common_validator_1.paginationQuery.extend({
        status: zod_1.z.nativeEnum(client_1.ChannelStatus).optional(),
    }),
});
exports.createChannelSchema = zod_1.z.object({
    body: zod_1.z.object({
        channelId: zod_1.z.string().trim().min(1).max(120),
        title: zod_1.z.string().trim().min(1).max(200),
        username: zod_1.z.string().trim().max(120).nullish(),
    }),
});
exports.updateChannelSchema = zod_1.z.object({
    params: common_validator_1.idParam,
    body: zod_1.z.object({
        title: zod_1.z.string().trim().min(1).max(200).optional(),
        status: zod_1.z.nativeEnum(client_1.ChannelStatus).optional(),
    }),
});
exports.channelIdSchema = zod_1.z.object({ params: common_validator_1.idParam });
//# sourceMappingURL=channel.validator.js.map