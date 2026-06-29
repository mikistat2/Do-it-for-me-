"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.jobIngestionRepository = void 0;
const client_1 = require("@prisma/client");
const prisma_1 = require("../database/prisma");
exports.jobIngestionRepository = {
    createJob(data) {
        return prisma_1.prisma.job.create({
            data: {
                userId: data.userId,
                messageId: data.messageId,
                title: data.title,
                company: data.company,
                contactEmail: data.contactEmail,
                contactPhone: data.contactPhone,
                experience: data.experience,
                salary: data.salary,
                remoteType: data.remoteType,
                deadline: data.deadline,
                description: data.description,
                rawText: data.rawText,
                contentHash: data.contentHash,
                status: client_1.JobStatus.DETECTED,
                skills: {
                    create: data.skills.map((name) => ({ name })),
                },
                locations: {
                    create: data.locations.map((name) => ({ name })),
                },
            },
        });
    },
    saveMatch(jobId, userId, match) {
        return prisma_1.prisma.jobMatch.upsert({
            where: { jobId },
            create: { jobId, userId, ...match },
            update: match,
        });
    },
};
//# sourceMappingURL=jobIngestion.repository.js.map