const mongoose = require('mongoose');

const gameResultSchema = new mongoose.Schema({
  gameId: {
    type: String,
    required: true,
    unique: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  winningNumber: {
    type: Number,
    min: 0,
    max: 99
  },
  winningColor: {
    type: String,
    enum: ['red', 'blue', 'green', 'yellow', 'purple', 'orange']
  },
  bigSmallResult: {
    type: String,
    enum: ['big', 'small', 'tie']
  },
  status: {
    type: String,
    default: 'completed',
    enum: ['active', 'completed']
  },
  resultGeneratedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('GameResult', gameResultSchema);