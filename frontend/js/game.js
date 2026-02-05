// Game functionality for Neon Wingo
class GameManager {
    constructor() {
        this.socket = io();
        this.token = localStorage.getItem('token');
        this.currentBet = { type: '', option: '' };
        this.balance = 0;
        this.paymentTimer = null;
        this.currentRequestId = null;
        this.init();
    }

    init() {
        if (!this.token) return;
        this.setupEventListeners();
        this.setupSocket();
        this.fetchProfile();
        this.fetchGameHistory();
    }

    setupEventListeners() {
        // Navigation
        document.getElementById('navGame').addEventListener('click', () => this.showView('game'));
        document.getElementById('navFinancial').addEventListener('click', () => this.showView('financial'));

        // Tabs - Game
        document.getElementById('gameHistoryTab').addEventListener('click', () => this.switchTab('game', 'gameHistory'));
        document.getElementById('myBetsTab').addEventListener('click', () => {
            this.switchTab('game', 'myBets');
            this.fetchMyBets();
        });

        // Tabs - Financial
        document.getElementById('depTab').addEventListener('click', () => this.switchTab('financial', 'dep'));
        document.getElementById('wdTab').addEventListener('click', () => this.switchTab('financial', 'wd'));

        // Bet Popup
        document.getElementById('confirmBetBtn').addEventListener('click', () => this.confirmBet());

        // Financial Forms
        document.getElementById('submitDeposit').addEventListener('click', () => this.handleDeposit());
        document.getElementById('submitWithdraw').addEventListener('click', () => this.handleWithdraw());

        // Payment Screen
        document.getElementById('screenshotInput').addEventListener('change', (e) => this.handleFileSelect(e));
        document.getElementById('submitProofBtn').addEventListener('click', () => this.submitProof());
    }

    setupSocket() {
        this.socket.on('game-status', (data) => {
            const timer = document.getElementById('timer');
            if (timer) timer.textContent = data.timeLeft < 10 ? `0${data.timeLeft}` : data.timeLeft;
            
            const period = document.getElementById('periodDisplay');
            if (period) period.textContent = `Period: ${data.currentPeriod}`;

            // Handle Betting Lock (Last 5 seconds)
            const lockOverlay = document.getElementById('betLockOverlay');
            const lockTimer = document.getElementById('lockTimer');
            if (data.timeLeft <= 5 && data.timeLeft > 0) {
                if (lockOverlay) lockOverlay.style.display = 'flex';
                if (lockTimer) lockTimer.textContent = data.timeLeft;
                this.closeBetPopup();
            } else {
                if (lockOverlay) lockOverlay.style.display = 'none';
            }
        });

        this.socket.on('game-result', (result) => {
            const lastResText = document.getElementById('lastResultText');
            if (lastResText) {
                lastResText.textContent = `${result.number} (${result.bigSmall.toUpperCase()})`;
                lastResText.style.color = result.color === 'violet' ? '#8a2be2' : (result.color === 'red' ? '#ff3131' : '#39ff14');
            }
            this.fetchGameHistory();
            this.fetchProfile();
            this.fetchMyBets();
        });

        this.socket.on('bet-result', (data) => {
            if (data.userId === this.token) {
                if (data.isWinning) {
                    this.showResultPopup('WIN', `Congratulations! You won ₹${data.payout.toFixed(2)}`, true);
                } else {
                    this.showResultPopup('LOSS', 'Better luck next time!', false);
                }
                this.fetchProfile();
                this.fetchMyBets();
            }
        });

        this.socket.on('balance-update', (data) => {
            this.fetchProfile();
        });
    }

    async fetchProfile() {
        try {
            const res = await fetch('/api/auth/profile', {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            const data = await res.json();
            if (res.ok) {
                this.balance = data.balance;
                document.getElementById('balanceDisplay').textContent = `₹${this.balance.toFixed(2)}`;
                document.getElementById('usernameDisplay').textContent = data.username;
            }
        } catch (e) {}
    }

    async fetchGameHistory() {
        try {
            const res = await fetch('/api/game/history');
            const data = await res.json();
            const body = document.getElementById('historyBody');
            if (body) {
                body.innerHTML = data.map(r => `
                    <tr>
                        <td>${r.period}</td>
                        <td style="color: ${r.color === 'violet' ? '#8a2be2' : (r.color === 'red' ? '#ff3131' : '#39ff14')}">${r.number}</td>
                        <td>${r.bigSmall.toUpperCase()}</td>
                        <td><div style="width:12px; height:12px; border-radius:50%; background:${r.color}; margin:0 auto; box-shadow: 0 0 5px ${r.color};"></div></td>
                    </tr>
                `).join('');
            }
        } catch (e) {}
    }

    async fetchMyBets() {
        try {
            const res = await fetch('/api/game/my-bets', { headers: { 'Authorization': `Bearer ${this.token}` } });
            const data = await res.json();
            const body = document.getElementById('myBetsBody');
            if (body) {
                body.innerHTML = data.map(b => `
                    <tr>
                        <td>${b.period}</td>
                        <td>${b.betOption.toUpperCase()}</td>
                        <td>₹${b.originalAmount || b.betAmount}<br><span style="font-size:0.7rem; color:#ff3131;">Tax: ₹${b.taxAmount ? b.taxAmount.toFixed(2) : '0'}</span></td>
                        <td style="color: ${b.status === 'won' ? 'var(--neon-green)' : (b.status === 'lost' ? 'var(--neon-red)' : 'var(--neon-blue)')}">
                            ${b.status === 'won' ? `WON ₹${b.payout.toFixed(2)}` : (b.status === 'lost' ? 'LOST' : 'PENDING')}
                        </td>
                    </tr>
                `).join('');
            }
        } catch (e) {}
    }

    async fetchFinancialHistory() {
        try {
            const dRes = await fetch('/api/game/my-deposits', { headers: { 'Authorization': `Bearer ${this.token}` } });
            const dData = await dRes.json();
            document.getElementById('depositHistoryBody').innerHTML = dData.map(d => `
                <tr><td>₹${d.amount}</td><td class="status-${d.status}">${d.status}</td><td>${new Date(d.createdAt).toLocaleDateString()}</td></tr>
            `).join('');

            const wRes = await fetch('/api/game/my-withdrawals', { headers: { 'Authorization': `Bearer ${this.token}` } });
            const wData = await wRes.json();
            document.getElementById('withdrawHistoryBody').innerHTML = wData.map(w => `
                <tr><td>₹${w.amount}</td><td class="status-${w.status}">${w.status}</td><td>${new Date(w.createdAt).toLocaleDateString()}</td></tr>
            `).join('');
        } catch (e) {}
    }

    showView(view) {
        document.getElementById('gameSection').classList.toggle('hidden', view !== 'game');
        document.getElementById('financialSection').classList.toggle('hidden', view !== 'financial');
        document.getElementById('navGame').classList.toggle('active', view === 'game');
        document.getElementById('navFinancial').classList.toggle('active', view === 'financial');
        
        if (view === 'financial') this.fetchFinancialHistory();
    }

    switchTab(section, tab) {
        if (section === 'game') {
            document.getElementById('gameHistoryTab').classList.toggle('active', tab === 'gameHistory');
            document.getElementById('myBetsTab').classList.toggle('active', tab === 'myBets');
            document.getElementById('gameHistoryContent').classList.toggle('active', tab === 'gameHistory');
            document.getElementById('myBetsContent').classList.toggle('active', tab === 'myBets');
        } else {
            document.getElementById('depTab').classList.toggle('active', tab === 'dep');
            document.getElementById('wdTab').classList.toggle('active', tab === 'wd');
            document.getElementById('depHistory').classList.toggle('active', tab === 'dep');
            document.getElementById('wdHistory').classList.toggle('active', tab === 'wd');
        }
    }

    openBetPopup(type, option) {
        this.currentBet = { type, option };
        document.getElementById('popupTitle').textContent = `Bet on ${option.toUpperCase()}`;
        document.getElementById('betPopup').style.display = 'block';
    }

    closeBetPopup() {
        document.getElementById('betPopup').style.display = 'none';
    }

    async confirmBet() {
        const amount = parseFloat(document.getElementById('betInputAmount').value);
        if (isNaN(amount) || amount < 10) return alert('Minimum bet is ₹10');
        if (amount > this.balance) return alert('Insufficient balance');

        try {
            const res = await fetch('/api/game/place-bet', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify({
                    betType: this.currentBet.type,
                    betOption: this.currentBet.option,
                    betAmount: amount
                })
            });

            const data = await res.json();
            if (res.ok) {
                alert(`Bet placed! Tax: ₹${data.taxAmount.toFixed(2)}, Actual Bet: ₹${data.actualBetAmount.toFixed(2)}`);
                this.fetchProfile();
                this.fetchMyBets();
                this.closeBetPopup();
            } else {
                alert(data.message || 'Failed to place bet');
            }
        } catch (e) {
            alert('Error placing bet');
        }
    }

    showResultPopup(title, message, isWin) {
        const popup = document.createElement('div');
        popup.style.cssText = `
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            background: ${isWin ? 'linear-gradient(135deg, #39ff14, #00ff88)' : 'linear-gradient(135deg, #ff3131, #ff6b6b)'};
            padding: 30px 50px; border-radius: 15px; z-index: 3000;
            box-shadow: 0 0 50px ${isWin ? '#39ff14' : '#ff3131'};
            color: black; font-weight: bold; font-size: 1.5rem; text-align: center;
        `;
        popup.innerHTML = `
            <div style="font-size: 2.5rem; margin-bottom: 10px;">${title}</div>
            <div>${message}</div>
        `;
        document.body.appendChild(popup);
        setTimeout(() => popup.remove(), 3000);
    }

    async handleDeposit() {
        const amount = document.getElementById('depositAmount').value;
        if (!amount || parseFloat(amount) < 100) return alert('Minimum deposit is ₹100');

        try {
            const res = await fetch('/api/game/deposit-request', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify({ amount })
            });
            const data = await res.json();
            if (res.ok) {
                this.showPaymentScreen(data.orderNumber, amount, data.requestId);
            } else {
                alert(data.message);
            }
        } catch (e) {
            alert('Error creating deposit order');
        }
    }

    showPaymentScreen(orderId, amount, requestId) {
        this.currentRequestId = requestId;
        document.getElementById('paymentOrderId').textContent = `Order: #${orderId}`;
        document.getElementById('payAmount').textContent = `₹${amount}`;
        document.getElementById('paymentScreen').style.display = 'block';
        document.getElementById('submitProofBtn').style.display = 'none';
        document.getElementById('fileName').textContent = '';
        document.getElementById('screenshotInput').value = '';
        
        this.startPaymentTimer(300); // 5 minutes
    }

    startPaymentTimer(duration) {
        if (this.paymentTimer) clearInterval(this.paymentTimer);
        let timer = duration;
        const display = document.getElementById('payTimer');
        
        this.paymentTimer = setInterval(() => {
            let minutes = Math.floor(timer / 60);
            let seconds = timer % 60;
            display.textContent = `${minutes < 10 ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

            if (--timer < 0) {
                clearInterval(this.paymentTimer);
                alert('Payment window expired. Please create a new order.');
                this.closePayment();
            }
        }, 1000);
    }

    closePayment() {
        if (this.paymentTimer) clearInterval(this.paymentTimer);
        document.getElementById('paymentScreen').style.display = 'none';
    }

    handleFileSelect(e) {
        const file = e.target.files[0];
        if (file) {
            document.getElementById('fileName').textContent = file.name;
            document.getElementById('submitProofBtn').style.display = 'block';
        }
    }

    async submitProof() {
        const fileInput = document.getElementById('screenshotInput');
        if (!fileInput.files[0]) return alert('Please select a screenshot first');

        const reader = new FileReader();
        reader.readAsDataURL(fileInput.files[0]);
        reader.onload = async () => {
            const base64 = reader.result;
            try {
                const res = await fetch(`/api/game/deposit-request/${this.currentRequestId}/proof`, {
                    method: 'PUT',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.token}`
                    },
                    body: JSON.stringify({ screenshot: base64 })
                });
                if (res.ok) {
                    alert('Proof submitted successfully! Admin will verify it.');
                    this.closePayment();
                    this.fetchFinancialHistory();
                } else {
                    const d = await res.json();
                    alert(d.message);
                }
            } catch (e) {
                alert('Error submitting proof');
            }
        };
    }

    async handleWithdraw() {
        const amount = document.getElementById('withdrawAmount').value;
        const upi = document.getElementById('withdrawUpi').value;
        if (!amount || !upi) return alert('Please fill all fields');
        if (parseFloat(amount) < 100) return alert('Minimum withdrawal is ₹100');

        try {
            const res = await fetch('/api/game/withdrawal-request', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify({ amount, upiId: upi })
            });
            if (res.ok) {
                alert('Withdrawal request submitted!');
                this.fetchProfile();
                this.fetchFinancialHistory();
            } else {
                const data = await res.json();
                alert(data.message);
            }
        } catch (e) {}
    }
}

// Global function for onclick handlers in HTML
window.openBetPopup = (type, option) => window.gameManager.openBetPopup(type, option);
window.closeBetPopup = () => window.gameManager.closeBetPopup();
window.closePayment = () => window.gameManager.closePayment();
window.copyUPI = () => {
    navigator.clipboard.writeText('9304511727@ybl');
    alert('UPI ID Copied!');
};

document.addEventListener('DOMContentLoaded', () => {
    window.gameManager = new GameManager();
});