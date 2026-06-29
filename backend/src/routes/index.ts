import { Router } from 'express';
import authRoutes from './auth.routes';
import profileRoutes from './profile.routes';
import settingsRoutes from './settings.routes';
import channelRoutes from './channel.routes';
import jobRoutes from './job.routes';
import draftRoutes from './draft.routes';
import applicationRoutes from './application.routes';
import notificationRoutes from './notification.routes';
import logRoutes from './log.routes';
import dashboardRoutes from './dashboard.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/profile', profileRoutes);
router.use('/settings', settingsRoutes);
router.use('/channels', channelRoutes);
router.use('/jobs', jobRoutes);
router.use('/drafts', draftRoutes);
router.use('/applications', applicationRoutes);
router.use('/notifications', notificationRoutes);
router.use('/logs', logRoutes);
router.use('/dashboard', dashboardRoutes);

export default router;
