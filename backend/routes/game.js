const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Bet = require('../models/Bet');
const GameResult = require('../models/GameResult');
const DepositRequest = require('../models/DepositRequest');
const WithdrawalRequest = require('../models/WithdrawalRequest');
const router = express.Router();

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your-jwt-secret', (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Place a bet
router.post('/place-bet', authenticateToken, async (req, res) => {
  try {
    const { betType, betOption, betAmount } = req.body;
    const userId = req.user.userId;

    // Validate input
    if (!betType || !betOption || !betAmount || betAmount < 10) {
      return res.status(400).json({ message: 'Invalid bet data. Minimum bet is ₹10.' });
    }

    // Check if user has sufficient balance
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.balance < betAmount) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }

    // Deduct bet amount from user balance
    user.balance -= betAmount;
    await user.save();

    // Create transaction record
    const transaction = new Transaction({
      userId: user._id,
      type: 'bet',
      amount: betAmount,
      status: 'completed',
      description: `Bet placed on ${betType}: ${betOption}`
    });
    await transaction.save();

    // Create bet record
    const bet = new Bet({
      userId: user._id,
      gameId: `game_${Date.now()}`, // This would be the current game session ID in production
      betType,
      betOption,
      betAmount
    });
    await bet.save();

    res.json({
      message: 'Bet placed successfully',
      betId: bet._id,
      remainingBalance: user.balance
    });
  } catch (error) {
    console.error('Place bet error:', error);
    res.status(500).json({ message: 'Server error while placing bet' });
  }
});

// Submit deposit request
router.post('/deposit-request', authenticateToken, async (req, res) => {
  try {
    const { amount, upiId } = req.body;
    const userId = req.user.userId;

    // Validate input
    if (!amount || !upiId || amount < 10) {
      return res.status(400).json({ message: 'Amount and UPI ID are required. Minimum deposit is ₹10.' });
    }

    // Create deposit request record for admin verification
    const depositRequest = new DepositRequest({
      userId: userId,
      amount: parseFloat(amount),
      upiId: upiId,
      referenceId: `DEP_${Date.now()}`
    });
    await depositRequest.save();

    res.json({
      message: 'Deposit request submitted successfully. Please wait for admin verification.',
      requestId: depositRequest._id
    });
  } catch (error) {
    console.error('Deposit request error:', error);
    res.status(500).json({ message: 'Server error while processing deposit request' });
  }
});

// Submit withdrawal request
router.post('/withdrawal-request', authenticateToken, async (req, res) => {
  try {
    const { amount, upiId } = req.body;
    const userId = req.user.userId;

    // Validate input
    if (!amount || !upiId || amount < 100) {
      return res.status(400).json({ message: 'Amount and UPI ID are required. Minimum withdrawal is ₹100.' });
    }

    // Check if user has sufficient balance
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.balance < parseFloat(amount)) {
      return res.status(400).json({ message: 'Insufficient balance for withdrawal' });
    }

    // Create withdrawal request record for admin processing
    const withdrawalRequest = new WithdrawalRequest({
      userId: userId,
      amount: parseFloat(amount),
      upiId: upiId,
      referenceId: `WD_${Date.now()}`
    });
    await withdrawalRequest.save();

    res.json({
      message: 'Withdrawal request submitted successfully. Please wait for admin processing.',
      requestId: withdrawalRequest._id
    });
  } catch (error) {
    console.error('Withdrawal request error:', error);
    res.status(500).json({ message: 'Server error while processing withdrawal request' });
  }
});

// Get user profile/balance
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      id: user._id,
      username: user.username,
      email: user.email,
      balance: user.balance,
      isAdmin: user.isAdmin
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error while fetching profile' });
  }
});

// Get game results (last 10)
router.get('/results', async (req, res) => {
  try {
    const results = await GameResult.find()
      .sort({ timestamp: -1 })
      .limit(10);

    res.json(results);
  } catch (error) {
    console.error('Get results error:', error);
    res.status(500).json({ message: 'Server error while fetching results' });
  }
});

// Get current game status
router.get('/status', async (req, res) => {
  try {
    // In a real implementation, this would return current game session info
    // For demo purposes, we'll return mock data
    const currentTime = new Date();
    const secondsLeft = 60 - currentTime.getSeconds();
    
    res.json({
      currentTime: currentTime.toISOString(),
      secondsLeft: secondsLeft > 0 ? secondsLeft : 60, // Reset to 60 if negative
      currentPeriod: Math.floor(Date.now() / 60000), // Period based on minutes
      lastResult: null // Would return the last completed game result
    });
  } catch (error) {
    console.error('Get status error:', error);
    res.status(500).json({ message: 'Server error while fetching game status' });
  }
});

module.exports = router;