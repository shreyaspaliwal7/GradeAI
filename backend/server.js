import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB } from './config/db.js';
import uploadRoutes from './routes/uploads.js';
import evaluationRoutes from './routes/evaluations.js';
import { startQueueWorker } from './services/queueProcessor.js';

// ES Module __dirname workaround
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:3000',
].filter(Boolean);

connectDB();

// middlewares
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
app.use('/api/uploads', uploadRoutes);
app.use('/api/evaluations', evaluationRoutes);

// health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'UP',
    message: 'GradeAi Backend API is running smoothly.',
    timestamp: new Date()
  });
});

// start Background Worker Loop
startQueueWorker();

// start server listening
app.listen(PORT, () => {
  console.log(`Uploads served at http://localhost:${PORT}/uploads`);
  console.log(`Server check: http://localhost:${PORT}/api/health`);
});
