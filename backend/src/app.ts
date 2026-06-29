import express, { Application, Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import pinoHttp from 'pino-http';
import apiRoutes from './routes';
import { config } from './config';
import { logger } from './utils/logger';
import { notFoundHandler } from './middleware/notFound';
import { errorHandler } from './middleware/errorHandler';
import { globalRateLimiter } from './middleware/rateLimiter';
import { sanitizeRequest } from './middleware/sanitize';

export const createApp = (): Application => {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(
    cors({
      origin:
        config.server.corsOrigins.length > 0 ? config.server.corsOrigins : true,
      credentials: true,
    }),
  );
  app.use(compression());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(sanitizeRequest);
  app.use(pinoHttp({ logger }));

  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok', uptime: process.uptime() });
  });

  app.use(config.server.apiPrefix, globalRateLimiter, apiRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
