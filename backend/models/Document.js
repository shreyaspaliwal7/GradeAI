import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      default: 'professor_1'
    },
    fileName: {
      type: String,
      required: true
    },
    fileUrl: {
      type: String,
      required: true
    },
    extractedText: {
      type: String,
      default: ''
    },
    type: {
      type: String,
      enum: ['ANSWER_KEY', 'STUDENT_SUBMISSION'],
      required: true
    },
    associatedAnswerKeyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      default: null
    },
    status: {
      type: String,
      enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'],
      required: true,
      default: 'PENDING'
    },
    failureReason: {
      type: String,
      default: null
    }
  },
  {
    timestamps: true
  }
);

const Document = mongoose.model('Document', documentSchema);
export default Document;
