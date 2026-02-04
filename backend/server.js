// Install dependencies with: npm install express mongoose bcryptjs jsonwebtoken cors dotenv socket.io

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const session = require('express-session');

dotenv.config();

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
app.use(express.static('../frontend'));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

// Import routes
const authRoutes = require('./routes/auth');
const gameRoutes = require('./routes/game');
const adminRoutes = require('./routes/admin');

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/game', gameRoutes);
app.use('/api/admin', adminRoutes);

// Serve main page
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/../frontend/index.html');
});

// Serve admin panel
app.get('/admin', (req, res) => {
  res.sendFile(__dirname + '/../frontend/admin/index.html');
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });

  // Handle game events
  socket.on('join-game', (data) => {
    socket.join('wingo-room');
    io.to('wingo-room').emit('player-joined', data);
  });

  socket.on('place-bet', (data) => {
    io.to('wingo-room').emit('bet-placed', data);
  });
});

// Game mechanics and periodic result generation
let currentPeriod = Math.floor(Date.now() / 60000); // Period based on minutes
let timeLeft = 60 - new Date().getSeconds();

// Function to generate random game result
function generateGameResult() {
  const colors = ['red', 'blue', 'green', 'yellow', 'purple', 'orange'];
  const winningNumber = Math.floor(Math.random() * 100);
  const winningColor = colors[Math.floor(Math.random() * colors.length)];
  const bigSmallResult = winningNumber >= 50 ? 'big' : 'small';
  
  return {
    period: currentPeriod,
    number: winningNumber,
    color: winningColor,
    bigSmall: bigSmallResult,
    timestamp: new Date()
  };
}

// Periodic game result generation
setInterval(async () => {
  if (timeLeft <= 0) {
    // Generate new result
    const result = generateGameResult();
    
    // Emit result to all connected clients
    io.emit('game-result', result);
    
    // Increment period and reset timer
    currentPeriod++;
    timeLeft = 60;
  } else {
    timeLeft--;
  }
  
  // Emit current game status periodically
  io.emit('game-status', {
    currentPeriod,
    timeLeft,
    lastResult: null // Would be the actual last result in production
  });
}, 1000);

// Connect to MongoDB
const PORT = process.env.PORT || 3000;
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/wingo_casino')
  .then(() => {
    console.log('Connected to MongoDB');
    server.listen(PORT, () => {
      console.log(`Wingo Casino Server running on port ${PORT}`);
      console.log('Access the game at: http://localhost:' + PORT);
      console.log('Access the admin panel at: http://localhost:' + PORT + '/admin');
    });
  })
  .catch((err) => {
    console.error('Database connection error:', err);
  });