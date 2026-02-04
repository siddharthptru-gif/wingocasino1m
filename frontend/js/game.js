// Game functionality
class GameManager {
    constructor() {
        this.selectedBet = null;
        this.betAmount = 10;
        this.countdown = 60;
        this.currentPeriod = 1;
        this.lastResults = [];
        this.socket = null;
        this.gameActive = false;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.generateNumberGrid();
        this.startCountdown();
        this.setupSocket();
    }

    setupEventListeners() {
        // Betting options
        document.querySelectorAll('.color-option').forEach(option => {
            option.addEventListener('click', (e) => this.selectColor(e));
        });

        document.querySelectorAll('.big-small-option').forEach(option => {
            option.addEventListener('click', (e) => this.selectBigSmall(e));
        });

        document.querySelectorAll('.number-option').forEach(option => {
            option.addEventListener('click', (e) => this.selectNumber(e));
        });

        // Bet amount
        document.getElementById('betAmount').addEventListener('change', (e) => {
            this.betAmount = parseInt(e.target.value) || 10;
        });

        // Place bet button
        document.getElementById('placeBetBtn').addEventListener('click', () => this.placeBet());

        // Navigation
        document.getElementById('gameNav').addEventListener('click', () => this.showGameView());
        document.getElementById('depositNav').addEventListener('click', () => this.showFinancialView());
    }

    generateNumberGrid() {
        const grid = document.querySelector('.number-grid');
        grid.innerHTML = '';
        
        for (let i = 0; i <= 99; i++) {
            const numberElement = document.createElement('div');
            numberElement.className = 'number-option';
            numberElement.textContent = i.toString().padStart(2, '0');
            numberElement.dataset.type = 'number';
            numberElement.dataset.value = i;
            
            numberElement.addEventListener('click', (e) => this.selectNumber(e));
            grid.appendChild(numberElement);
        }
    }

    selectColor(e) {
        // Deselect all color options
        document.querySelectorAll('.color-option').forEach(opt => {
            opt.classList.remove('selected');
        });

        // Select clicked option
        e.currentTarget.classList.add('selected');
        
        this.selectedBet = {
            type: 'color',
            value: e.currentTarget.dataset.value
        };
        
        this.updateSelectedBetDisplay();
    }

    selectBigSmall(e) {
        // Deselect all big/small options
        document.querySelectorAll('.big-small-option').forEach(opt => {
            opt.classList.remove('selected');
        });

        // Select clicked option
        e.currentTarget.classList.add('selected');
        
        this.selectedBet = {
            type: 'big_small',
            value: e.currentTarget.dataset.value
        };
        
        this.updateSelectedBetDisplay();
    }

    selectNumber(e) {
        // Deselect all number options
        document.querySelectorAll('.number-option').forEach(opt => {
            opt.classList.remove('selected');
        });

        // Select clicked option
        e.currentTarget.classList.add('selected');
        
        this.selectedBet = {
            type: 'number',
            value: e.currentTarget.dataset.value
        };
        
        this.updateSelectedBetDisplay();
    }

    updateSelectedBetDisplay() {
        const display = document.getElementById('selectedBetDisplay');
        if (this.selectedBet) {
            display.textContent = `${this.selectedBet.type}: ${this.selectedBet.value}`;
        } else {
            display.textContent = 'None';
        }
    }

    placeBet() {
        if (!this.selectedBet) {
            alert('Please select a bet option first');
            return;
        }

        if (this.betAmount < 10) {
            alert('Minimum bet amount is ₹10');
            return;
        }

        // In a real implementation, this would send the bet to the server
        // For demo purposes, we'll just show a confirmation
        const token = localStorage.getItem('token');
        if (!token) {
            alert('Please log in first');
            return;
        }

        // Send bet to server
        this.sendBetToServer();
    }

    async sendBetToServer() {
        try {
            const response = await fetch('/api/game/place-bet', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    betType: this.selectedBet.type,
                    betOption: this.selectedBet.value,
                    betAmount: this.betAmount
                })
            });

            const data = await response.json();

            if (response.ok) {
                alert(`Bet placed successfully! Type: ${this.selectedBet.type}, Option: ${this.selectedBet.value}, Amount: ₹${this.betAmount}`);
                
                // Reset selection
                this.resetSelection();
            } else {
                alert(data.message || 'Failed to place bet');
            }
        } catch (error) {
            console.error('Bet placement error:', error);
            alert('An error occurred while placing bet');
        }
    }

    resetSelection() {
        // Deselect all options
        document.querySelectorAll('.color-option, .big-small-option, .number-option').forEach(opt => {
            opt.classList.remove('selected');
        });

        this.selectedBet = null;
        this.updateSelectedBetDisplay();
    }

    startCountdown() {
        setInterval(() => {
            if (this.countdown > 0) {
                this.countdown--;
                document.getElementById('countdown').textContent = this.countdown;
            } else {
                // Countdown reached 0, start new round
                this.startNewRound();
            }
        }, 1000);
    }

    startNewRound() {
        // Update period number
        this.currentPeriod++;
        document.getElementById('currentPeriod').textContent = this.currentPeriod;
        
        // Reset countdown
        this.countdown = 60;
        document.getElementById('countdown').textContent = this.countdown;
        
        // In a real implementation, this would trigger the game result generation
        // For demo, we'll just simulate a result
        this.simulateGameResult();
    }

    simulateGameResult() {
        // Simulate a random result
        const colors = ['red', 'blue', 'green', 'yellow', 'purple', 'orange'];
        const winningColor = colors[Math.floor(Math.random() * colors.length)];
        const winningNumber = Math.floor(Math.random() * 100);
        const bigSmallResult = winningNumber >= 50 ? 'big' : 'small';
        
        const result = {
            period: this.currentPeriod,
            number: winningNumber,
            color: winningColor,
            bigSmall: bigSmallResult
        };
        
        this.lastResults.unshift(result);
        if (this.lastResults.length > 10) {
            this.lastResults.pop();
        }
        
        document.getElementById('lastResult').textContent = 
            `#${winningNumber} ${winningColor} ${bigSmallResult}`;
    }

    setupSocket() {
        // Initialize socket connection
        this.socket = io();
        
        this.socket.on('connect', () => {
            console.log('Connected to game server');
            this.socket.emit('join-game', { userId: localStorage.getItem('userId') });
        });

        this.socket.on('bet-placed', (data) => {
            // Handle incoming bet notifications
            console.log('New bet placed:', data);
        });

        this.socket.on('game-result', (result) => {
            // Handle game result
            this.handleGameResult(result);
        });
    }

    handleGameResult(result) {
        // Update UI with game result
        document.getElementById('lastResult').textContent = 
            `#${result.number} ${result.color} ${result.bigSmall}`;
    }

    showGameView() {
        document.getElementById('gameSection').classList.remove('hidden');
        document.getElementById('financialSection').classList.add('hidden');
        
        // Update navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.getElementById('gameNav').classList.add('active');
    }

    showFinancialView() {
        document.getElementById('gameSection').classList.add('hidden');
        document.getElementById('financialSection').classList.remove('hidden');
        
        // Update navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.getElementById('depositNav').classList.add('active');
    }
}

// Initialize game manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    if (typeof io !== 'undefined') {
        window.gameManager = new GameManager();
    }
});