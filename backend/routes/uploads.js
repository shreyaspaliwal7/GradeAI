import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import Document from '../models/Document.js';
import { extractTextFromFile } from '../services/textExtractor.js';
import { triggerQueueProcessing } from '../services/queueProcessor.js';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.resolve(__dirname, '../uploads');

// Ensure uploads directory exists
try {
  await fs.mkdir(uploadsDir, { recursive: true });
} catch (err) {
  console.error("Failed to create uploads directory:", err);
}

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

//upload Answer Key
router.post('/answer-key', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { originalname, path: filePath } = req.file;
    console.log(`Processing answer key upload: ${originalname}`);

    const extractedText = await extractTextFromFile(filePath, originalname);
    if (!extractedText || extractedText.length < 10) {
      return res.status(400).json({
        error: 'Could not extract readable text from this file. Try .txt/.md or a text-based PDF.',
      });
    }

    const doc = new Document({
      fileName: originalname,
      fileUrl: `/uploads/${path.basename(filePath)}`,
      extractedText,
      type: 'ANSWER_KEY',
      status: 'COMPLETED' // Answer key is ready immediately
    });

    await doc.save();
    return res.status(201).json(doc);
  } catch (error) {
    console.error('Error uploading answer key:', error);
    return res.status(500).json({ error: error.message });
  }
});

//upload student submissions
router.post('/submissions', upload.array('files', 5), async (req, res) => {
  try {
    const files = req.files;
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    if (files.length > 5) {
      return res.status(400).json({ error: 'Maximum 5 files allowed per request' });
    }

    const { associatedAnswerKeyId } = req.body;
    console.log(`Processing ${files.length} student submissions. Answer key ID: ${associatedAnswerKeyId || 'None'}`);

    // verify answer key if provided
    if (associatedAnswerKeyId && associatedAnswerKeyId !== 'null' && associatedAnswerKeyId !== 'undefined') {
      const answerKeyExists = await Document.findById(associatedAnswerKeyId);
      if (!answerKeyExists || answerKeyExists.type !== 'ANSWER_KEY') {
        return res.status(400).json({ error: 'Invalid associated answer key ID' });
      }
    }

    const createdDocs = [];

    for (const file of files) {
      const { originalname, path: filePath } = file;
      
      const extractedText = await extractTextFromFile(filePath, originalname);
      if (!extractedText || extractedText.length < 10) {
        return res.status(400).json({
          error: `Could not extract text from "${originalname}". Use a text-based PDF or .txt/.md file.`,
        });
      }

      const doc = new Document({
        fileName: originalname,
        fileUrl: `/uploads/${path.basename(filePath)}`,
        extractedText,
        type: 'STUDENT_SUBMISSION',
        associatedAnswerKeyId: (associatedAnswerKeyId && associatedAnswerKeyId !== 'null' && associatedAnswerKeyId !== 'undefined') ? associatedAnswerKeyId : null,
        status: 'PENDING'
      });

      await doc.save();
      createdDocs.push(doc);
    }

    // trigger queue processor asynchronously so it processes files in the background
    triggerQueueProcessing();

    return res.status(201).json(createdDocs);
  } catch (error) {
    console.error('Error uploading submissions:', error);
    return res.status(500).json({ error: error.message });
  }
});
export default router;
