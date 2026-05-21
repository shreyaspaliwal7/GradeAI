import express from 'express';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import Document from '../models/Document.js';
import Evaluation from '../models/Evaluation.js';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.resolve(__dirname, '../uploads');

// get all Student sumissions with jined evaluation data
router.get('/', async (req, res) => {
  try {
    const submissions = await Document.find({ type: 'STUDENT_SUBMISSION' }).sort({ createdAt: -1 });
    const evaluations = await Evaluation.find();

    const evalMap = {};
    evaluations.forEach((ev) => {
      evalMap[ev.documentId.toString()] = ev;
    });

    const data = submissions.map((sub) => ({
      ...sub.toObject(),
      evaluation: evalMap[sub._id.toString()] || null
    }));

    return res.json(data);
  } catch (error) {
    console.error('Error fetching submissions:', error);
    return res.status(500).json({ error: error.message });
  }
});

// get analytics & statistics aggregations
router.get('/stats', async (req, res) => {
  try {
    const totalCount = await Document.countDocuments({ type: 'STUDENT_SUBMISSION' });
    const pendingCount = await Document.countDocuments({ type: 'STUDENT_SUBMISSION', status: 'PENDING' });
    const processingCount = await Document.countDocuments({ type: 'STUDENT_SUBMISSION', status: 'PROCESSING' });
    const completedCount = await Document.countDocuments({ type: 'STUDENT_SUBMISSION', status: 'COMPLETED' });
    const failedCount = await Document.countDocuments({ type: 'STUDENT_SUBMISSION', status: 'FAILED' });

    const evaluations = await Evaluation.find();

    let classAverage = 0;
    let passingRate = 0;

    if (evaluations.length > 0) {
      const sumScores = evaluations.reduce((sum, ev) => sum + ev.totalScore, 0);
      classAverage = parseFloat((sumScores / evaluations.length).toFixed(1));

      const passingCount = evaluations.filter((ev) => ev.totalScore > 33).length;
      passingRate = parseFloat(((passingCount / evaluations.length) * 100).toFixed(1));
    }

    // get active answer key details if any
    const latestAnswerKey = await Document.findOne({ type: 'ANSWER_KEY' }).sort({ createdAt: -1 });

    return res.json({
      totalCount,
      pendingCount,
      processingCount,
      completedCount,
      failedCount,
      classAverage,
      passingRate,
      latestAnswerKey: latestAnswerKey
        ? { id: latestAnswerKey._id, fileName: latestAnswerKey.fileName, createdAt: latestAnswerKey.createdAt }
        : null
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return res.status(500).json({ error: error.message });
  }
});

// get details for a specific submission and evaluation
router.get('/:documentId', async (req, res) => {
  try {
    const doc = await Document.findById(req.params.documentId);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const evaluation = await Evaluation.findOne({ documentId: doc._id });

    return res.json({
      document: doc,
      evaluation: evaluation || null
    });
  } catch (error) {
    console.error('Error fetching submission details:', error);
    return res.status(500).json({ error: error.message });
  }
});

// reset system data (deletes all documents, evaluations, and uploaded files)
router.delete('/reset', async (req, res) => {
  try {
    // Delete documents & evaluations from DB
    await Document.deleteMany({});
    await Evaluation.deleteMany({});

    // Clean out uploads directory physical files
    try {
      const files = await fs.readdir(uploadsDir);
      for (const file of files) {
        if (file !== '.gitkeep') {
          await fs.unlink(path.join(uploadsDir, file));
        }
      }
      console.log('[API Reset] Cleared all uploaded files in backend/uploads/');
    } catch (fsErr) {
      console.warn('[API Reset] uploads directory clean warning:', fsErr.message);
    }

    return res.json({ message: 'All student submissions, evaluations, and uploaded files successfully cleared.' });
  } catch (error) {
    console.error('Error during database reset:', error);
    return res.status(500).json({ error: error.message });
  }
});

export default router;
