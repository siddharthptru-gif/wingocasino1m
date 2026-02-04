# Wingo Casino Application

A complete online casino application with Wingo 1-minute games (0-9 numbers), color trading, and admin panel.

## Quick Deploy to Free Hosting (24/7 Online)

### Option 1: Deploy to Render.com (Recommended - FREE)

1. Create account at [https://render.com](https://render.com)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository OR use "Deploy from Git URL"
4. Settings:
   - Name: `wingo-casino`
   - Environment: `Node`
   - Build Command: `npm install`
   - Start Command: `npm start`
5. Click "Create Web Service"
6. Your app will be live at: `https://wingo-casino.onrender.com`

### Option 2: Deploy to Railway.app (FREE)

1. Go to [https://railway.app](https://railway.app)
2. Click "Start a New Project" → "Deploy from GitHub repo"
3. Select your repository
4. Railway will auto-detect Node.js and deploy
5. Your app will be live automatically!

### Option 3: Deploy to Cyclic.sh (FREE)

1. Go to [https://www.cyclic.sh](https://www.cyclic.sh)
2. Sign up with GitHub
3. Click "Link Your Own" and select your repository
4. Deploy automatically

## Features

### Player Features:
- **User Registration & Login** - Create account with username, email, and password
- **Wingo 1-Minute Game** - Real-time betting game with 60-second rounds
- **Multiple Betting Options**:
  - Color Trading (Red, Blue, Green, Yellow, Purple, Orange)
  - Big/Small betting
  - Number betting (0-99)
- **Financial System**:
  - Deposit funds via UPI ID: 9304511727@ybl
  - Withdraw funds (minimum ₹100)
  - Real-time balance tracking
- **Responsive Design** - Works on mobile and desktop

### Admin Features:
- **Admin Panel** - Separate login with special credentials
- **User Management** - View and edit user balances
- **Deposit Processing** - Verify and approve deposit requests
- **Withdrawal Processing** - Approve and process withdrawal requests
- **Real-time Monitoring** - View all bets as they happen
- **Game Control** - Force game results and control periods

## How to Use

### For Players:
1. Open `simple-index.html` in your web browser
2. Register a new account or login with existing credentials
3. Start playing Wingo games and place bets
4. Use the Deposit/Withdraw section for financial transactions

### For Admin:
1. Open `admin-panel.html` in your web browser
2. Login with:
   - Username: `admin`
   - Password: `admin123`
3. Manage users, deposits, withdrawals, and monitor bets
4. Use the Game Control panel to force results

## How It Works

### Data Storage:
- All data is stored in your browser's localStorage
- No server required - everything runs client-side
- Data persists between browser sessions

### Communication:
- The player app sends messages to the admin panel using `postMessage`
- Admin panel receives and processes deposit/withdrawal requests
- Real-time bet monitoring through message passing

### Game Mechanics:
- 60-second rounds with automatic period switching
- Random result generation for colors, numbers, and big/small
- 50% win probability for demo purposes
- 2x payout on winning bets

## Files Included:

1. **simple-index.html** - Main player application
2. **admin-panel.html** - Admin control panel
3. **README.md** - This documentation

## Security Notes:

⚠️ **Important**: This is a demonstration application for educational purposes only.
- Uses localStorage for data storage (not secure for production)
- No real money transactions
- Passwords are stored in plain text in localStorage
- For production use, you would need a proper backend server with database

## Customization:

You can easily modify:
- Starting balance amounts
- Payout multipliers
- Win probabilities
- Game timing
- Color schemes in the CSS

## Browser Compatibility:

Works in all modern browsers that support:
- localStorage
- ES6 JavaScript features
- CSS Grid and Flexbox

## Support:

For any questions or issues, please refer to the source code comments for detailed explanations of how each feature works.