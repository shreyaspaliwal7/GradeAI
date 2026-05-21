import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { connectDB } from './config/db.js';
import { corsOptions, getAllowedOrigins } from './config/cors.js';
import uploadRoutes from './routes/uploads.js';
import evaluationRoutes from './routes/evaluations.js';
import { startQueueWorker } from './services/queueProcessor.js';

// ES Module __dirname workaround
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const PORT = process.env.PORT || 5000;

// middlewares
app.use(cors(corsOptions));
app.use(express.json({ limit: '12mb' }));
app.use(express.urlencoded({ extended: true, limit: '12mb' }));

// serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
app.use('/api/uploads', uploadRoutes);
app.use('/api/evaluations', evaluationRoutes);

app.get('/', (req, res) => {
  res.json({
    name: 'GradeAI API',
    status: 'running',
    message: 'This is the backend only. Open your Vercel URL for the web app.',
    endpoints: {
      health: '/api/health',
      uploads: '/api/uploads',
      evaluations: '/api/evaluations',
    },
  });
});

// health check endpoint
app.get('/api/health', (req, res) => {
  const dbReady = mongoose.connection.readyState === 1;
  res.status(dbReady ? 200 : 503).json({
    status: dbReady ? 'UP' : 'DEGRADED',
    database: dbReady ? 'connected' : 'disconnected',
    message: dbReady
      ? 'GradeAi Backend API is running smoothly.'
      : 'API is up but MongoDB is not connected.',
    timestamp: new Date(),
  });
});

const startServer = async () => {
  await connectDB();
  startQueueWorker();
  app.listen(PORT, () => {
    console.log(`CORS allowed origins: ${getAllowedOrigins().join(', ')} (+ *.vercel.app)`);
    console.log(`Uploads served at http://localhost:${PORT}/uploads`);
    console.log(`Server check: http://localhost:${PORT}/api/health`);
  });
};

startServer();
