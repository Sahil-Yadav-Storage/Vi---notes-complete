const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['keydown', 'backspace', 'paste'],
      required: true,
    },
    timestamp: {
      type: Number,
      required: true,
    },
    meta: {
      pause: { type: Number, default: 0 },
      charCount: { type: Number, default: 0 },
    },
  },
  { _id: false }
);

const sessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    events: {
      type: [eventSchema],
      default: [],
    },
    stats: {
      totalKeystrokes: { type: Number, default: 0 },
      totalBackspaces: { type: Number, default: 0 },
      totalPauses: { type: Number, default: 0 },
      avgTypingSpeed: { type: Number, default: 0 },
      pasteCount: { type: Number, default: 0 },
      totalPastedChars: { type: Number, default: 0 },
    },
    text: {
      type: String,
      default: '',
    },
    textLength: {
      type: Number,
      default: 0,
    },
    features: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    report: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Session', sessionSchema);
