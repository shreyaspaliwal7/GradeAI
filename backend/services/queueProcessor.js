import { GoogleGenAI, Type } from '@google/genai';
import Document from '../models/Document.js';
import Evaluation from '../models/Evaluation.js';

let isProcessing = false;

// sleep utility
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const processQueue = async () => {
  if (isProcessing) return;
  isProcessing = true;

  try {
    while (true) {
      // find the oldest pending student submission
      const studentDoc = await Document.findOne({
        type: 'STUDENT_SUBMISSION',
        status: 'PENDING'
      }).sort({ createdAt: 1 });

      if (!studentDoc) {
        break;
      }

      studentDoc.status = 'PROCESSING';
      await studentDoc.save();
      console.log(`[QueueWorker] Started grading: "${studentDoc.fileName}"`);

      try {
        // retrieve optional answer key text
        let answerKeyText = '';
        if (studentDoc.associatedAnswerKeyId) {
          const answerKeyDoc = await Document.findById(studentDoc.associatedAnswerKeyId);
          if (answerKeyDoc) {
            answerKeyText = answerKeyDoc.extractedText;
            console.log(`[QueueWorker] Found associated answer key: "${answerKeyDoc.fileName}"`);
          }
        }

        const studentText = studentDoc.extractedText;
        const apiKey = process.env.GEMINI_API_KEY;

        let evaluationData;

        const isRealApiKey = apiKey && apiKey !== 'YOUR_GEMINI_API_KEY' && apiKey.trim() !== '';

        if (isRealApiKey) {
          console.log(`[QueueWorker] Calling Gemini API for grading...`);
          const ai = new GoogleGenAI({ apiKey });

          let systemPrompt = '';
          if (answerKeyText) {
            systemPrompt = `You are an expert academic evaluator. You are grading a student assignment against a provided Answer Key.

Evaluate the student's submission rigorously against the answer key. Grade out of 100 total. Ensure your overall score matches the sum of the breakdown criteria scores. Provide detailed constructive critiques for each criterion.

--- ANSWER KEY ---
${answerKeyText}

--- STUDENT SUBMISSION ---
${studentText}
`;
          } else {
            systemPrompt = `You are an expert academic evaluator. You are grading a student assignment. There is no answer key provided.

Evaluate the student's submission based on general academic principles for this subject/topic. Create appropriate grading criteria (e.g., Content Accuracy, Organization & Structure, Critical Thinking, Grammar & Clarity) totaling 100 points. Grade the submission out of 100 total. Ensure your overall score matches the sum of the breakdown criteria scores. Provide detailed constructive critiques for each criterion.

--- STUDENT SUBMISSION ---
${studentText}
`;
          }

          // strict responseSchema
          const responseSchema = {
            type: Type.OBJECT,
            properties: {
              totalScore: {
                type: Type.INTEGER,
                description: "Total grade calculated for the student submission, out of 100."
              },
              overallFeedback: {
                type: Type.STRING,
                description: "Comprehensive summary critique of the entire submission, noting key strengths and core improvement areas."
              },
              breakdown: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    criterion: {
                      type: Type.STRING,
                      description: "The name of the grading criterion (e.g., Accuracy, Content, Clarity, Structure, Grammar)."
                    },
                    score: {
                      type: Type.INTEGER,
                      description: "Score awarded for this specific criterion."
                    },
                    maxScore: {
                      type: Type.INTEGER,
                      description: "Maximum possible score for this specific criterion (e.g., 20 or 25)."
                    },
                    critique: {
                      type: Type.STRING,
                      description: "Targeted feedback and justification for this specific criterion's grade."
                    }
                  },
                  required: ["criterion", "score", "maxScore", "critique"]
                },
                description: "List of individual rubric criteria with detailed grading breakdown."
              }
            },
            required: ["totalScore", "overallFeedback", "breakdown"]
          };

          const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: systemPrompt,
            config: {
              responseMimeType: 'application/json',
              responseSchema: responseSchema
            }
          });

          const rawText = response.text;
          console.log(`[QueueWorker] Gemini returned raw output:`, rawText);
          evaluationData = JSON.parse(rawText);

        } else {
          console.warn(`[QueueWorker] WARNING: GEMINI_API_KEY is not configured. Simulating AI evaluation (Demo Mode)...`);
          await sleep(2500); // simulate processing delay for visual feedback

          // determine mock scores based on some variance
          const textLength = studentText.length;
          const randomFactor = Math.floor(Math.random() * 15); // 0-14
          let baseScore = 75;

          if (textLength > 300) baseScore += 10;
          if (textLength < 100) baseScore -= 15;
          
          let totalScore = Math.min(100, Math.max(40, baseScore + randomFactor - 5));

          const accuracyScore = Math.floor(totalScore * 0.35); // Max 35
          const clarityScore = Math.floor(totalScore * 0.25); // Max 25
          const structureScore = Math.floor(totalScore * 0.20); // Max 20
          const criticalScore = totalScore - (accuracyScore + clarityScore + structureScore); // Max 20

          let topic = "Assignment";
          if (studentText.toLowerCase().includes("math") || studentText.toLowerCase().includes("equation")) {
            topic = "Mathematics Quiz";
          } else if (studentText.toLowerCase().includes("science") || studentText.toLowerCase().includes("cell") || studentText.toLowerCase().includes("biology")) {
            topic = "Biology/Science Report";
          } else if (studentText.toLowerCase().includes("history") || studentText.toLowerCase().includes("war") || studentText.toLowerCase().includes("world")) {
            topic = "History Essay";
          }

          evaluationData = {
            totalScore: totalScore,
            overallFeedback: `[DEMO MODE EVALUATION] This assignment (${topic}) demonstrates a ${totalScore >= 80 ? 'very strong' : totalScore >= 60 ? 'fair' : 'weak'} grasp of the core concepts. The student followed instructions well, though there is room for improvement in deeper critical analysis and refinement of key arguments. Good effort overall.`,
            breakdown: [
              {
                criterion: "Content & Accuracy",
                score: accuracyScore,
                maxScore: 35,
                critique: `Demonstrated reasonable understanding. Answered ${accuracyScore > 28 ? 'almost all' : 'the majority of'} questions accurately relative to standard course principles.`
              },
              {
                criterion: "Clarity & Writing Quality",
                score: clarityScore,
                maxScore: 25,
                critique: `The prose is ${clarityScore > 20 ? 'articulate and highly readable' : 'mostly clear'}, although sentence flow and vocabulary can be polished in several spots.`
              },
              {
                criterion: "Organization & Structure",
                score: structureScore,
                maxScore: 20,
                critique: `Standard logical sections are present. Followed a clean introductory, body, and concluding flow.`
              },
              {
                criterion: "Critical Reasoning",
                score: criticalScore,
                maxScore: 20,
                critique: `Synthesized arguments ${criticalScore > 15 ? 'well' : 'moderately well'}, but should support key assertions with more comprehensive logic or citations.`
              }
            ]
          };
        }

        // save Evaluation Results
        const evaluation = new Evaluation({
          documentId: studentDoc._id,
          totalScore: evaluationData.totalScore,
          overallFeedback: evaluationData.overallFeedback,
          breakdown: evaluationData.breakdown
        });

        await evaluation.save();

        // update document status to COMPLETED
        studentDoc.status = 'COMPLETED';
        await studentDoc.save();
        console.log(`[QueueWorker] Successfully graded: "${studentDoc.fileName}" -> Score: ${evaluationData.totalScore}`);

      } catch (err) {
        console.error(`[QueueWorker] Failed to evaluate "${studentDoc.fileName}":`, err);
        studentDoc.status = 'FAILED';
        await studentDoc.save();
      }
    }
  } catch (error) {
    console.error('[QueueWorker] Fatal error in queue processor loop:', error);
  } finally {
    isProcessing = false;
  }
};

/**
 * triggers queue processing asynchronously without blocking the request-response cycle.
 */
export const triggerQueueProcessing = () => {
  processQueue().catch((err) => console.error('[QueueWorker] Error in triggered processing:', err));
};

/**
 * Starts a recurring background cron-like interval that polls for PENDING documents.
 * This guarantees documents get processed even if the trigger fails or files are in PENDING state during server restarts.
 */
export const startQueueWorker = () => {
  console.log('[QueueWorker] Starting background polling worker (runs every 4 seconds)...');
  setInterval(() => {
    processQueue();
  }, 4000);
};
