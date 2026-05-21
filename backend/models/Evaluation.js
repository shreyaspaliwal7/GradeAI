import mongoose from 'mongoose';

const breakdownSchema = new mongoose.Schema({
  criterion: {
    type: String,
    required: true
  },
  score: {
    type: Number,
    required: true
  },
  maxScore: {
    type: Number,
    required: true
  },
  critique: {
    type: String,
    required: true
  }
});

const evaluationSchema = new mongoose.Schema(
  {
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      required: true,
      unique: true
    },
    totalScore: {
      type: Number,
      required: true
    },
    overallFeedback: {
      type: String,
      required: true
    },
    breakdown: {
      type: [breakdownSchema],
      required: true,
      default: []
    }
  },
  {
    timestamps: true
  }
);

const Evaluation = mongoose.model('Evaluation', evaluationSchema);
export default Evaluation;
