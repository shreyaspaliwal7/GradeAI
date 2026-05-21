import { GoogleGenAI, Type } from '@google/genai';

const DEFAULT_MODELS = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-2.5-flash'];
const MAX_TEXT_CHARS = 120000;

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    totalScore: {
      type: Type.INTEGER,
      description: 'Total grade out of 100.',
    },
    overallFeedback: {
      type: Type.STRING,
      description: 'Summary critique of the submission.',
    },
    breakdown: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          criterion: { type: Type.STRING },
          score: { type: Type.INTEGER },
          maxScore: { type: Type.INTEGER },
          critique: { type: Type.STRING },
        },
        required: ['criterion', 'score', 'maxScore', 'critique'],
      },
    },
  },
  required: ['totalScore', 'overallFeedback', 'breakdown'],
};

const truncate = (text, max = MAX_TEXT_CHARS) => {
  if (!text || text.length <= max) return text || '';
  return `${text.slice(0, max)}\n\n[Truncated for API limits]`;
};

const buildPrompt = (studentText, answerKeyText) => {
  if (answerKeyText) {
    return `You are an expert academic evaluator grading a student assignment against an answer key.

Evaluate rigorously. Grade out of 100. Ensure totalScore equals the sum of breakdown scores.

--- ANSWER KEY ---
${answerKeyText}

--- STUDENT SUBMISSION ---
${studentText}`;
  }

  return `You are an expert academic evaluator. No answer key was provided.

Grade using appropriate criteria (Content, Organization, Critical Thinking, Clarity) totaling 100 points.

--- STUDENT SUBMISSION ---
${studentText}`;
};

export const gradeWithGemini = async (studentText, answerKeyText = '') => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY' || !apiKey.trim()) {
    throw new Error('GEMINI_API_KEY is not configured on the server.');
  }

  const trimmedStudent = truncate(studentText.trim());
  if (trimmedStudent.length < 20) {
    throw new Error(
      'Could not extract enough text from the file. Use a text-based PDF or upload .txt/.md.'
    );
  }

  const prompt = buildPrompt(trimmedStudent, truncate(answerKeyText.trim()));
  const ai = new GoogleGenAI({ apiKey });
  const models = process.env.GEMINI_MODEL
    ? [process.env.GEMINI_MODEL]
    : DEFAULT_MODELS;

  let lastError;
  for (const model of models) {
    try {
      console.log(`[Gemini] Grading with model: ${model}`);
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema,
        },
      });

      const rawText = response.text;
      if (!rawText) {
        throw new Error('Empty response from Gemini API');
      }

      return JSON.parse(rawText);
    } catch (err) {
      lastError = err;
      console.warn(`[Gemini] Model ${model} failed:`, err.message);
    }
  }

  throw new Error(lastError?.message || 'All Gemini models failed');
};
