import fs from 'fs/promises';
import path from 'path';
import pdf from 'pdf-parse';

/**
 * Extracts plain text from an uploaded file based on its extension.
 * Supports .txt, .md, .pdf, and falls back to utf-8 read.
 * 
 * @param {string} filePath - Absolute path to the saved file.
 * @param {string} originalName - Original filename to determine extension.
 * @returns {Promise<string>} - Extracted text.
 */
export const extractTextFromFile = async (filePath, originalName) => {
  const ext = path.extname(originalName).toLowerCase();
  
  try {
    if (ext === '.txt' || ext === '.md' || ext === '.json' || ext === '.csv') {
      const text = await fs.readFile(filePath, 'utf-8');
      return text.trim();
    } else if (ext === '.pdf') {
      const dataBuffer = await fs.readFile(filePath);
      const data = await pdf(dataBuffer);
      return data.text.trim();
    } else {
      // Fallback: try reading as UTF-8 text
      const text = await fs.readFile(filePath, 'utf-8');
      return text.trim();
    }
  } catch (error) {
    console.error(`Error extracting text from ${originalName}:`, error);
    throw new Error(`Failed to extract text from file: ${error.message}`);
  }
};
