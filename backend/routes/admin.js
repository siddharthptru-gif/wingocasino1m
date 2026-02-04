const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Bet = require('../models/Bet');
const GameResult = require('../models/GameResult');
const DepositRequest = require('../models/DepositRequest');
const WithdrawalRequest = require('../models/WithdrawalRequest');
const router = express.Router();

// Middleware to verify JWT token and check admin rights
const authenticateAdmin = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your-jwt-secret', async (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }

    // Check if user is admin
    const dbUser = await User.findById(user.userId);
    if (!dbUser || !dbUser.isAdmin) {
      return res.status(403).json({ message: 'Admin access required' });
    }

    req.user = user;
    next();
  });
};

// Admin login route (for separate admin authentication)
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Check if admin credentials match hardcoded values
    // In a real application, you would store admin credentials securely
    if (username === 'admin' && password === 'admin123') { // Default admin credentials
      const token = jwt.sign(
        { userId: 'admin', username: 'admin', isAdmin: true },
        process.env.JWT_SECRET || 'your-jwt-secret',
        { expiresIn: '24h' }
      );

      res.json({
        message: 'Admin login successful',
        token,
        user: {
          id: 'admin',
          username: 'admin',
          isAdmin: true
        }
      });
    } else {
      res.status(401).json({ message: 'Invalid admin credentials' });
    }
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ message: 'Server error during admin login' });
  }
});

// Get all users
router.get('/users', authenticateAdmin, async (req, res) => {
  try {
    const users = await User.find({}).select('-password');
    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error while fetching users' });
  }
});

// Get user by ID
router.get('/users/:userId', authenticateAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error while fetching user' });
  }
});

// Update user balance
router.put('/users/:userId/balance', authenticateAdmin, async (req, res) => {
  try {
    const { balance } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { balance: parseFloat(balance) },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      message: 'User balance updated successfully',
      user
    });
  } catch (error) {
    console.error('Update user balance error:', error);
    res.status(500).json({ message: 'Server error while updating user balance' });
  }
});

// Get all deposit requests
router.get('/deposit-requests', authenticateAdmin, async (req, res) => {
  try {
    const requests = await DepositRequest.find({})
      .populate('userId', 'username email')
      .sort({ createdAt: -1 });
    res.json(requests);
  } catch (error) {
    console.error('Get deposit requests error:', error);
    res.status(500).json({ message: 'Server error while fetching deposit requests' });
  }
});

// Verify deposit request
router.put('/deposit-requests/:requestId/verify', authenticateAdmin, async (req, res) => {
  try {
    const { requestId } = req.params;
    const adminUserId = req.user.userId;

    // Find the deposit request
    const request = await DepositRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ message: 'Deposit request not found' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ message: 'Request is not pending' });
    }

    // Update user balance
    const user = await User.findById(request.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Add the deposit amount to user balance
    user.balance += request.amount;
    await user.save();

    // Update the deposit request status
    request.status = 'verified';
    request.processedBy = adminUserId;
    request.processedAt = new Date();
    await request.save();

    // Update deposit request status
    request.status = 'verified';
    request.processedBy = adminUserId;
    request.processedAt = new Date();
    await request.save();

    // Create transaction record
    const transaction = new Transaction({
      userId: user._id,
      type: 'deposit',
      amount: request.amount,
      status: 'completed',
      referenceId: request.referenceId,
      description: 'Deposit verified by admin'
    });
    await transaction.save();

    res.json({
      message: 'Deposit request verified successfully',
      request
    });
  } catch (error) {
    console.error('Verify deposit request error:', error);
    res.status(500).json({ message: 'Server error while verifying deposit request' });
  }
});

// Reject deposit request
router.put('/deposit-requests/:requestId/reject', authenticateAdmin, async (req, res) => {
  try {
    const { requestId } = req.params;
    const adminUserId = req.user.userId;

    // Find the deposit request
    const request = await DepositRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ message: 'Deposit request not found' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ message: 'Request is not pending' });
    }

    // Update deposit request status
    request.status = 'rejected';
    request.processedBy = adminUserId;
    request.processedAt = new Date();
    await request.save();

    res.json({
      message: 'Deposit request rejected successfully',
      request
    });
  } catch (error) {
    console.error('Reject deposit request error:', error);
    res.status(500).json({ message: 'Server error while rejecting deposit request' });
  }
});

// Get all withdrawal requests
router.get('/withdrawal-requests', authenticateAdmin, async (req, res) => {
  try {
    const requests = await WithdrawalRequest.find({})
      .populate('userId', 'username email')
      .sort({ createdAt: -1 });
    res.json(requests);
  } catch (error) {
    console.error('Get withdrawal requests error:', error);
    res.status(500).json({ message: 'Server error while fetching withdrawal requests' });
  }
});

// Approve withdrawal request
router.put('/withdrawal-requests/:requestId/approve', authenticateAdmin, async (req, res) => {
  try {
    const { requestId } = req.params;
    const adminUserId = req.user.userId;

    // Find the withdrawal request
    const request = await WithdrawalRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ message: 'Withdrawal request not found' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ message: 'Request is not pending' });
    }

    // Update withdrawal request status
    request.status = 'approved';
    request.processedBy = adminUserId;
    request.processedAt = new Date();
    await request.save();

    res.json({
      message: 'Withdrawal request approved successfully',
      request
    });
  } catch (error) {
    console.error('Approve withdrawal request error:', error);
    res.status(500).json({ message: 'Server error while approving withdrawal request' });
  }
});

// Process withdrawal request (mark as processed after payment)
router.put('/withdrawal-requests/:requestId/process', authenticateAdmin, async (req, res) => {
  try {
    const { requestId } = req.params;
    const adminUserId = req.user.userId;

    // Find the withdrawal request
    const request = await WithdrawalRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ message: 'Withdrawal request not found' });
    }

    if (request.status !== 'approved') {
      return res.status(400).json({ message: 'Request must be approved first' });
    }

    // Update user balance
    const user = await User.findById(request.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.balance -= request.amount;
    await user.save();

    // Update withdrawal request status
    request.status = 'processed';
    request.processedBy = adminUserId;
    request.processedAt = new Date();
    await request.save();

    // Create transaction record
    const transaction = new Transaction({
      userId: user._id,
      type: 'withdrawal',
      amount: request.amount,
      status: 'completed',
      referenceId: request.referenceId,
      description: 'Withdrawal processed by admin'
    });
    await transaction.save();

    res.json({
      message: 'Withdrawal request processed successfully',
      request
    });
  } catch (error) {
    console.error('Process withdrawal request error:', error);
    res.status(500).json({ message: 'Server error while processing withdrawal request' });
  }
});

// Reject withdrawal request
router.put('/withdrawal-requests/:requestId/reject', authenticateAdmin, async (req, res) => {
  try {
    const { requestId } = req.params;
    const adminUserId = req.user.userId;

    // Find the withdrawal request
    const request = await WithdrawalRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ message: 'Withdrawal request not found' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ message: 'Request is not pending' });
    }

    // Update withdrawal request status
    request.status = 'rejected';
    request.processedBy = adminUserId;
    request.processedAt = new Date();
    await request.save();

    res.json({
      message: 'Withdrawal request rejected successfully',
      request
    });
  } catch (error) {
    console.error('Reject withdrawal request error:', error);
    res.status(500).json({ message: 'Server error while rejecting withdrawal request' });
  }
});

// Get all transactions
router.get('/transactions', authenticateAdmin, async (req, res) => {
  try {
    const transactions = await Transaction.find({})
      .populate('userId', 'username email')
      .sort({ createdAt: -1 });
    res.json(transactions);
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ message: 'Server error while fetching transactions' });
  }
});

// Get current game status
router.get('/game-status', authenticateAdmin, async (req, res) => {
  try {
    // This would return current game session info in a real implementation
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
    console.error('Get game status error:', error);
    res.status(500).json({ message: 'Server error while fetching game status' });
  }
});

// Force generate new game result (one-click control)
router.post('/force-result', authenticateAdmin, async (req, res) => {
  try {
    const { winningNumber, winningColor, bigSmallResult } = req.body;

    // Validate inputs
    if (winningNumber === undefined || !winningColor || !bigSmallResult) {
      return res.status(400).json({ message: 'Missing required fields for game result' });
    }

    // Create a new game result
    const gameResult = new GameResult({
      gameId: `game_${Date.now()}`,
      winningNumber,
      winningColor,
      bigSmallResult,
      status: 'completed'
    });
    await gameResult.save();

    // In a real implementation, you would emit this result to all connected clients
    // For now, we'll just return the result
    res.json({
      message: 'Game result forced successfully',
      result: gameResult
    });
  } catch (error) {
    console.error('Force game result error:', error);
    res.status(500).json({ message: 'Server error while forcing game result' });
  }
});

// Get all bets for monitoring
router.get('/bets', authenticateAdmin, async (req, res) => {
  try {
    const bets = await Bet.find({})
      .populate('userId', 'username email')
      .sort({ placedAt: -1 })
      .limit(100); // Limit to last 100 bets for performance
    res.json(bets);
  } catch (error) {
    console.error('Get bets error:', error);
    res.status(500).json({ message: 'Server error while fetching bets' });
  }
});

module.exports = router;