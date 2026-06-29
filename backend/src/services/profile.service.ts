import { Profile } from '@prisma/client';
import { profileRepository } from '../repositories/profile.repository';
import { NotFoundError } from '../utils/errors';
import { UpdateProfileInput } from '../validators/profile.validator';

export const profileService = {
  async get(userId: string): Promise<Profile> {
    const profile = await profileRepository.findByUserId(userId);
    if (!profile) {
      throw new NotFoundError('Profile not found');
    }
    return profile;
  },

  async update(userId: string, input: UpdateProfileInput): Promise<Profile> {
    await this.get(userId);
    return profileRepository.update(userId, input);
  },
};
