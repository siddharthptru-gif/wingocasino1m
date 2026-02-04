const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('frontend'));

// Simple file-based database
const DB_PATH = path.join(__dirname, 'database/data');
if (!fs.existsSync(DB_PATH)) {
    fs.mkdirSync(DB_PATH, { recursive: true });
}

function readDB(collection) {
    const filePath = path.join(DB_PATH, `${collection}.json`);
    if (!fs.existsSync(filePath)) {
        return [];
    }
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeDB(collection, data) {
    const filePath = path.join(DB_PATH, `${collection}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  jwt.verify(token, 'your-secret-key', (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// AUTH ROUTES
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const users = readDB('users');

    if (users.find(u => u.username === username || u.email === email)) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
      _id: Date.now().toString(),
      username,
      email,
      password: hashedPassword,
      balance: 1000,
      isAdmin: false,
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    writeDB('users', users);

    const token = jwt.sign({ userId: newUser._id, username: newUser.username }, 'your-secret-key', { expiresIn: '24h' });

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        balance: newUser.balance
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error during registration' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const users = readDB('users');
    const user = users.find(u => u.username === username);

    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user._id, username: user.username, isAdmin: user.isAdmin }, 'your-secret-key', { expiresIn: '24h' });

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        balance: user.balance,
        isAdmin: user.isAdmin
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error during login' });
  }
});

// Helper to check daily limits
function checkDailyLimit(collection, userId, limit, type = 'createdAt') {
  const data = readDB(collection);
  const today = new Date().toISOString().split('T')[0];
  const count = data.filter(item => 
    item.userId === userId && 
    item[type].startsWith(today) &&
    item.status !== 'rejected'
  ).length;
  return count < limit;
}

// GAME ROUTES
app.post('/api/game/place-bet', authenticateToken, (req, res) => {
  try {
    if (timeLeft <= 5) {
      return res.status(400).json({ message: 'Betting is locked for the last 5 seconds' });
    }
    const { betType, betOption, betAmount } = req.body;
    const users = readDB('users');
    const userIndex = users.findIndex(u => u._id === req.user.userId);

    if (userIndex === -1) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (users[userIndex].balance < betAmount) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }

    users[userIndex].balance -= betAmount;
    writeDB('users', users);

    const bet = {
      _id: Date.now().toString(),
      userId: req.user.userId,
      username: users[userIndex].username,
      gameId: `game_${currentPeriod}`,
      betType,
      betOption,
      betAmount,
      placedAt: new Date().toISOString()
    };

    const bets = readDB('bets');
    bets.push(bet);
    writeDB('bets', bets);

    // Emit bet to admin panel in real-time
    io.emit('new-bet', bet);

    res.json({
      message: 'Bet placed successfully',
      betId: bet._id,
      remainingBalance: users[userIndex].balance
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error while placing bet' });
  }
});

app.post('/api/game/deposit-request', authenticateToken, (req, res) => {
  try {
    const { amount } = req.body;
    
    if (!checkDailyLimit('deposits', req.user.userId, 3)) {
      return res.status(400).json({ message: 'Daily limit of 3 deposits reached' });
    }

    const users = readDB('users');
    const user = users.find(u => u._id === req.user.userId);

    const orderNumber = `ORD${Date.now()}`;
    const depositRequest = {
      _id: `DEP_${Date.now()}`,
      orderNumber,
      userId: req.user.userId,
      username: user.username,
      amount: parseFloat(amount),
      status: 'pending_payment',
      screenshot: null,
      createdAt: new Date().toISOString()
    };

    const deposits = readDB('deposits');
    deposits.push(depositRequest);
    writeDB('deposits', deposits);

    res.json({
      message: 'Deposit order created',
      orderNumber,
      requestId: depositRequest._id
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error while processing deposit request' });
  }
});

app.put('/api/game/deposit-request/:requestId/proof', authenticateToken, (req, res) => {
  try {
    const { screenshot } = req.body; // base64 string
    const deposits = readDB('deposits');
    const depositIndex = deposits.findIndex(d => d._id === req.params.requestId && d.userId === req.user.userId);

    if (depositIndex === -1) {
      return res.status(404).json({ message: 'Request not found' });
    }

    deposits[depositIndex].screenshot = screenshot;
    deposits[depositIndex].status = 'pending'; // Change to pending for admin verification
    writeDB('deposits', deposits);

    // Notify admin
    io.emit('new-deposit-request', deposits[depositIndex]);

    res.json({ message: 'Proof submitted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error while submitting proof' });
  }
});

app.post('/api/game/withdrawal-request', authenticateToken, (req, res) => {
  try {
    const { amount, upiId } = req.body;
    
    if (!checkDailyLimit('withdrawals', req.user.userId, 1)) {
      return res.status(400).json({ message: 'Daily limit of 1 withdrawal reached' });
    }

    const users = readDB('users');
    const userIndex = users.findIndex(u => u._id === req.user.userId);

    if (userIndex === -1) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (users[userIndex].balance < parseFloat(amount)) {
      return res.status(400).json({ message: 'Insufficient balance for withdrawal' });
    }

    // Deduct balance immediately when withdrawal request is submitted
    users[userIndex].balance -= parseFloat(amount);
    writeDB('users', users);

    const withdrawalRequest = {
      _id: `WD_${Date.now()}`,
      userId: req.user.userId,
      username: users[userIndex].username,
      amount: parseFloat(amount),
      upiId,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    const withdrawals = readDB('withdrawals');
    withdrawals.push(withdrawalRequest);
    writeDB('withdrawals', withdrawals);

    // Notify admin in real-time
    io.emit('new-withdrawal-request', withdrawalRequest);

    res.json({
      message: 'Withdrawal request submitted successfully. Amount deducted from balance.',
      requestId: withdrawalRequest._id,
      newBalance: users[userIndex].balance
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error while processing withdrawal request' });
  }
});

app.get('/api/auth/profile', authenticateToken, (req, res) => {
  try {
    const users = readDB('users');
    const user = users.find(u => u._id === req.user.userId);

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
    res.status(500).json({ message: 'Server error' });
  }
});

// Get game history
app.get('/api/game/history', (req, res) => {
  try {
    const results = readDB('results');
    res.json(results.slice(-10).reverse());
  } catch (error) {
    res.status(500).json({ message: 'Server error while fetching game history' });
  }
});

// Get user's deposit history
app.get('/api/game/my-deposits', authenticateToken, (req, res) => {
  try {
    const deposits = readDB('deposits');
    const myDeposits = deposits.filter(d => d.userId === req.user.userId).reverse();
    res.json(myDeposits);
  } catch (error) {
    res.status(500).json({ message: 'Server error while fetching deposits' });
  }
});

// Get user's withdrawal history
app.get('/api/game/my-withdrawals', authenticateToken, (req, res) => {
  try {
    const withdrawals = readDB('withdrawals');
    const myWithdrawals = withdrawals.filter(w => w.userId === req.user.userId).reverse();
    res.json(myWithdrawals);
  } catch (error) {
    res.status(500).json({ message: 'Server error while fetching withdrawals' });
  }
});

// ADMIN ROUTES
app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (username === 'admin' && password === 'admin123') {
      const token = jwt.sign({ userId: 'admin', username: 'admin', isAdmin: true }, 'your-secret-key', { expiresIn: '24h' });

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
    res.status(500).json({ message: 'Server error during admin login' });
  }
});

app.get('/api/admin/users', authenticateToken, (req, res) => {
  try {
    const users = readDB('users');
    res.json(users.map(u => ({ ...u, password: undefined })));
  } catch (error) {
    res.status(500).json({ message: 'Server error while fetching users' });
  }
});

app.put('/api/admin/users/:userId/balance', authenticateToken, (req, res) => {
  try {
    const { balance } = req.body;
    const users = readDB('users');
    const userIndex = users.findIndex(u => u._id === req.params.userId);

    if (userIndex !== -1) {
      users[userIndex].balance = parseFloat(balance);
      writeDB('users', users);
      res.json({
        message: 'User balance updated successfully',
        user: { ...users[userIndex], password: undefined }
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error while updating user balance' });
  }
});

app.get('/api/admin/deposit-requests', authenticateToken, (req, res) => {
  try {
    const deposits = readDB('deposits');
    res.json(deposits);
  } catch (error) {
    res.status(500).json({ message: 'Server error while fetching deposit requests' });
  }
});

app.put('/api/admin/deposit-requests/:requestId/verify', authenticateToken, (req, res) => {
  try {
    const deposits = readDB('deposits');
    const depositIndex = deposits.findIndex(d => d._id === req.params.requestId);

    if (depositIndex === -1) {
      return res.status(404).json({ message: 'Deposit request not found' });
    }

    if (deposits[depositIndex].status !== 'pending') {
      return res.status(400).json({ message: 'Request is not pending' });
    }

    // Update user balance
    const users = readDB('users');
    const userIndex = users.findIndex(u => u._id === deposits[depositIndex].userId);

    if (userIndex !== -1) {
      users[userIndex].balance += deposits[depositIndex].amount;
      writeDB('users', users);

      // Update deposit status
      deposits[depositIndex].status = 'verified';
      deposits[depositIndex].processedAt = new Date().toISOString();
      writeDB('deposits', deposits);

      // Notify user in real-time
      io.emit('deposit-verified', {
        userId: deposits[depositIndex].userId,
        amount: deposits[depositIndex].amount,
        newBalance: users[userIndex].balance
      });

      res.json({
        message: 'Deposit request verified successfully',
        request: deposits[depositIndex]
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error while verifying deposit request' });
  }
});

app.put('/api/admin/deposit-requests/:requestId/reject', authenticateToken, (req, res) => {
  try {
    const deposits = readDB('deposits');
    const depositIndex = deposits.findIndex(d => d._id === req.params.requestId);

    if (depositIndex !== -1) {
      deposits[depositIndex].status = 'rejected';
      deposits[depositIndex].processedAt = new Date().toISOString();
      writeDB('deposits', deposits);
      res.json({
        message: 'Deposit request rejected successfully',
        request: deposits[depositIndex]
      });
    } else {
      res.status(404).json({ message: 'Deposit request not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error while rejecting deposit request' });
  }
});

app.get('/api/admin/withdrawal-requests', authenticateToken, (req, res) => {
  try {
    const withdrawals = readDB('withdrawals');
    res.json(withdrawals);
  } catch (error) {
    res.status(500).json({ message: 'Server error while fetching withdrawal requests' });
  }
});

app.put('/api/admin/withdrawal-requests/:requestId/approve', authenticateToken, (req, res) => {
  try {
    const withdrawals = readDB('withdrawals');
    const withdrawalIndex = withdrawals.findIndex(w => w._id === req.params.requestId);

    if (withdrawalIndex !== -1) {
      withdrawals[withdrawalIndex].status = 'approved';
      withdrawals[withdrawalIndex].processedAt = new Date().toISOString();
      writeDB('withdrawals', withdrawals);
      res.json({
        message: 'Withdrawal request approved successfully',
        request: withdrawals[withdrawalIndex]
      });
    } else {
      res.status(404).json({ message: 'Withdrawal request not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error while approving withdrawal request' });
  }
});

app.put('/api/admin/withdrawal-requests/:requestId/process', authenticateToken, (req, res) => {
  try {
    const withdrawals = readDB('withdrawals');
    const withdrawalIndex = withdrawals.findIndex(w => w._id === req.params.requestId);

    if (withdrawalIndex === -1) {
      return res.status(404).json({ message: 'Withdrawal request not found' });
    }

    if (withdrawals[withdrawalIndex].status !== 'approved') {
      return res.status(400).json({ message: 'Request must be approved first' });
    }

    // Update withdrawal status (balance already deducted when request was submitted)
    withdrawals[withdrawalIndex].status = 'processed';
    withdrawals[withdrawalIndex].processedAt = new Date().toISOString();
    writeDB('withdrawals', withdrawals);

    // Notify user in real-time
    io.emit('withdrawal-processed', {
      userId: withdrawals[withdrawalIndex].userId,
      amount: withdrawals[withdrawalIndex].amount
    });

    res.json({
      message: 'Withdrawal request processed successfully',
      request: withdrawals[withdrawalIndex]
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error while processing withdrawal request' });
  }
});

app.put('/api/admin/withdrawal-requests/:requestId/reject', authenticateToken, (req, res) => {
  try {
    const withdrawals = readDB('withdrawals');
    const withdrawalIndex = withdrawals.findIndex(w => w._id === req.params.requestId);

    if (withdrawalIndex === -1) {
      return res.status(404).json({ message: 'Withdrawal request not found' });
    }

    // Return money to user balance when rejected
    const users = readDB('users');
    const userIndex = users.findIndex(u => u._id === withdrawals[withdrawalIndex].userId);

    if (userIndex !== -1) {
      users[userIndex].balance += withdrawals[withdrawalIndex].amount;
      writeDB('users', users);

      // Notify user
      io.emit('withdrawal-rejected', {
        userId: withdrawals[withdrawalIndex].userId,
        amount: withdrawals[withdrawalIndex].amount,
        newBalance: users[userIndex].balance
      });
    }

    withdrawals[withdrawalIndex].status = 'rejected';
    withdrawals[withdrawalIndex].processedAt = new Date().toISOString();
    writeDB('withdrawals', withdrawals);

    res.json({
      message: 'Withdrawal request rejected successfully. Amount returned to user.',
      request: withdrawals[withdrawalIndex]
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error while rejecting withdrawal request' });
  }
});

app.get('/api/admin/bets', authenticateToken, (req, res) => {
  try {
    const bets = readDB('bets');
    const users = readDB('users');
    
    // Filter for current period
    const currentBets = bets.filter(b => b.gameId === `game_${currentPeriod}`);
    
    const detailedBets = currentBets.map(bet => {
      const user = users.find(u => u._id === bet.userId);
      return {
        ...bet,
        userBalance: user ? user.balance : 0
      };
    });

    const uniqueUsersCount = new Set(currentBets.map(b => b.userId)).size;

    res.json({
      bets: detailedBets,
      totalUsers: uniqueUsersCount,
      currentPeriod
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error while fetching bets' });
  }
});

app.get('/api/admin/game-status', (req, res) => {
  res.json({
    currentPeriod,
    timeLeft,
    currentTime: new Date().toISOString()
  });
});

app.post('/api/admin/force-result', authenticateToken, (req, res) => {
  try {
    const { winningNumber } = req.body;
    
    if (winningNumber !== undefined) {
      if (winningNumber < 0 || winningNumber > 9) {
        return res.status(400).json({ message: 'Number must be between 0 and 9' });
      }
      forcedNextResult = parseInt(winningNumber);
    }

    res.json({
      message: 'Next game result forced successfully'
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error while forcing game result' });
  }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });

  socket.on('join-game', (data) => {
    socket.join('wingo-room');
  });
});

// Game mechanics - Real-time 1-minute game (CORRECT WINGO RULES)
let currentPeriod = Math.floor(Date.now() / 60000);
let timeLeft = 60 - new Date().getSeconds();
let lastResult = null;
let forcedNextResult = null;

function calculateWingoResult(num) {
  const size = num >= 5 ? 'big' : 'small';
  let col;
  if ([1, 3, 7, 9].includes(num)) {
    col = 'green';
  } else if ([2, 4, 6, 8].includes(num)) {
    col = 'red';
  } else {
    col = 'violet'; // 0 or 5
  }
  return {
    period: currentPeriod,
    number: num,
    color: col,
    bigSmall: size,
    timestamp: new Date().toISOString()
  };
}

// Game timer - runs every second, synced to clock time
setInterval(() => {
  const now = new Date();
  const period = Math.floor(now.getTime() / 60000);
  
  if (period !== currentPeriod) {
    // New minute, generate result for previous period
    let winningNumber;
    if (forcedNextResult !== null) {
      winningNumber = forcedNextResult;
      forcedNextResult = null; // Clear after use
    } else {
      winningNumber = Math.floor(Math.random() * 10);
    }
    
    const result = calculateWingoResult(winningNumber);
    lastResult = result;
    
    // Save result to database
    const results = readDB('results');
    results.push(result);
    writeDB('results', results);
    
    // Process all pending bets for this period
    processBets(result);
    
    // Emit result to all connected clients
    io.emit('game-result', result);
    
    currentPeriod = period;
  }
  
  timeLeft = 60 - now.getSeconds();
  
  // Emit current game status
  io.emit('game-status', {
    currentPeriod,
    timeLeft,
    lastResult
  });
}, 1000);

// Function to process bets when game ends
function processBets(result) {
  try {
    const bets = readDB('bets');
    const users = readDB('users');
    
    // Find all bets for current period that haven't been processed
    const periodBets = bets.filter(b => b.gameId === `game_${result.period}` && !b.processed);
    
    periodBets.forEach(bet => {
      let isWinning = false;
      let payout = 0;
      
      // Check if bet wins
      if (bet.betType === 'big_small' && bet.betOption === result.bigSmall) {
        isWinning = true;
        payout = bet.betAmount * 2; // 2x for big/small
      } else if (bet.betType === 'color' && bet.betOption === result.color) {
        isWinning = true;
        payout = bet.betAmount * 2; // 2x for color
      } else if (bet.betType === 'number' && parseInt(bet.betOption) === result.number) {
        isWinning = true;
        payout = bet.betAmount * 9; // 9x for exact number
      }
      
      // Update bet
      const betIndex = bets.findIndex(b => b._id === bet._id);
      if (betIndex !== -1) {
        bets[betIndex].processed = true;
        bets[betIndex].isWinning = isWinning;
        bets[betIndex].payout = payout;
      }
      
      // Update user balance if won
      if (isWinning) {
        const userIndex = users.findIndex(u => u._id === bet.userId);
        if (userIndex !== -1) {
          users[userIndex].balance += payout;
          
          // Notify user
          io.emit('bet-result', {
            userId: bet.userId,
            betId: bet._id,
            isWinning: true,
            payout,
            newBalance: users[userIndex].balance
          });
        }
      } else {
        // Notify user of loss
        io.emit('bet-result', {
          userId: bet.userId,
          betId: bet._id,
          isWinning: false,
          payout: 0
        });
      }
    });
    
    writeDB('bets', bets);
    writeDB('users', users);
  } catch (error) {
    console.error('Error processing bets:', error);
  }
}

// Serve static files
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/index.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/admin/index.html'));
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`\n=================================`);
  console.log(`Wingo Casino Server is running!`);
  console.log(`=================================`);
  console.log(`Game URL: http://localhost:${PORT}`);
  console.log(`Admin Panel: http://localhost:${PORT}/admin`);
  console.log(`\nAdmin Credentials:`);
  console.log(`  Username: admin`);
  console.log(`  Password: admin123`);
  console.log(`=================================\n`);
});