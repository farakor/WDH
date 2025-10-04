import express from 'express';
import cors from 'cors';
import config from './config';
import authRoutes from './routes/auth.routes';
import websiteRoutes from './routes/website.routes';
import statusRoutes from './routes/status.routes';
import importRoutes from './routes/import.routes';
import domainRoutes from './routes/domain.routes';
import { errorHandler } from './middleware/errorHandler';
import { cronService } from './services/cron.service';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/websites', websiteRoutes);
app.use('/api/status', statusRoutes);
app.use('/api/import', importRoutes);
app.use('/api/domains', domainRoutes);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handler (должен быть последним)
app.use(errorHandler);

// Start server
app.listen(config.port, () => {
  console.log(`🚀 Server is running on port ${config.port}`);
  console.log(`📊 Environment: ${config.nodeEnv}`);
  
  // Запуск cron задач
  cronService.start();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, stopping cron jobs...');
  cronService.stop();
  process.exit(0);
});
