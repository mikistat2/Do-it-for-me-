import { Profile, Setting } from '@prisma/client';

export interface DecisionContext {
  score: number;
  contactEmail: string | null;
  isDuplicateApplication: boolean;
  profile: Profile;
  settings: Setting;
}

export type DecisionAction = 'SKIP' | 'DRAFT_ONLY' | 'AUTO_APPLY';

export interface Decision {
  action: DecisionAction;
  reason: string;
}

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export const isValidEmail = (email: string | null): email is string =>
  Boolean(email && EMAIL_REGEX.test(email));

/**
 * Pure decision function that determines what the application engine should
 * do with a scored job, based on profile and automation settings.
 */
export const decideApplicationAction = (ctx: DecisionContext): Decision => {
  const threshold = Math.max(ctx.settings.matchThreshold, ctx.profile.minMatchScore);

  if (ctx.isDuplicateApplication) {
    return { action: 'SKIP', reason: 'An application already exists for this job' };
  }
  if (!isValidEmail(ctx.contactEmail)) {
    return { action: 'SKIP', reason: 'No valid contact email was found' };
  }
  if (ctx.score < threshold) {
    return {
      action: 'SKIP',
      reason: `Match score ${ctx.score} is below threshold ${threshold}`,
    };
  }

  if (ctx.settings.autoApply && !ctx.settings.automationPaused) {
    return { action: 'AUTO_APPLY', reason: 'Score meets threshold and automation is active' };
  }

  return {
    action: 'DRAFT_ONLY',
    reason: 'Score meets threshold; awaiting manual approval',
  };
};
