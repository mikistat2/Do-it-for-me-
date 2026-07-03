"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.decideApplicationAction = exports.isValidEmail = void 0;
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const isValidEmail = (email) => Boolean(email && EMAIL_REGEX.test(email));
exports.isValidEmail = isValidEmail;
/**
 * Pure decision function that determines what the application engine should
 * do with a scored job, based on profile and automation settings.
 */
const decideApplicationAction = (ctx) => {
    const threshold = Math.max(ctx.settings.matchThreshold, ctx.profile.minMatchScore);
    if (ctx.isDuplicateApplication) {
        return { action: 'SKIP', reason: 'An application already exists for this job' };
    }
    if (ctx.score < threshold) {
        return {
            action: 'SKIP',
            reason: `Match score ${ctx.score} is below threshold ${threshold}`,
        };
    }
    if (ctx.settings.autoApply && !ctx.settings.automationPaused) {
        if (!(0, exports.isValidEmail)(ctx.contactEmail)) {
            return { action: 'DRAFT_ONLY', reason: 'Score meets threshold but no valid email found for auto-apply' };
        }
        return { action: 'AUTO_APPLY', reason: 'Score meets threshold and automation is active' };
    }
    return {
        action: 'DRAFT_ONLY',
        reason: 'Score meets threshold; awaiting manual approval',
    };
};
exports.decideApplicationAction = decideApplicationAction;
//# sourceMappingURL=decisionRules.js.map