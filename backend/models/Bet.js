const mongoose = require('mongoose');

const betSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  gameId: {
    type: String,
    required: true
  },
  betType: {
    type: String,
    required: true,
    enum: ['color', 'number', 'big_small']
  },
  betOption: {
    type: String, // specific color, number, or 'big'/'small'
    required: true
  },
  betAmount: {
    type: Number,
    required: true,
    min: 0
  },
  payout: {
    type: Number,
    default: 0
  },
  isWinning: {
    type: Boolean,
    default: false
  },
  placedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Bet', betSchema);