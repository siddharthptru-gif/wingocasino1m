// Admin Panel functionality
class AdminPanel {
    constructor() {
        this.token = localStorage.getItem('admin_token');
        this.currentView = 'dashboard';
        this.socket = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.checkAdminAuth();
    }

    setupEventListeners() {
        // Admin login
        document.getElementById('adminLoginForm')?.addEventListener('submit', (e) => this.handleAdminLogin(e));

        // Navigation
        document.getElementById('dashboardNav')?.addEventListener('click', () => this.switchView('dashboard'));
        document.getElementById('usersNav')?.addEventListener('click', () => this.switchView('users'));
        document.getElementById('depositsNav')?.addEventListener('click', () => this.switchView('deposits'));
        document.getElementById('withdrawalsNav')?.addEventListener('click', () => this.switchView('withdrawals'));
        document.getElementById('betsNav')?.addEventListener('click', () => this.switchView('bets'));
        document.getElementById('gameControlNav')?.addEventListener('click', () => this.switchView('gameControl'));
        document.getElementById('logoutAdminBtn')?.addEventListener('click', () => this.adminLogout());

        // Game control
        document.getElementById('forceResultBtn')?.addEventListener('click', () => this.forceGameResult());
    }

    async handleAdminLogin(e) {
        e.preventDefault();
        
        const username = document.getElementById('adminUsername').value;
        const password = document.getElementById('adminPassword').value;

        try {
            const response = await fetch('/api/admin/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (response.ok) {
                this.token = data.token;
                localStorage.setItem('admin_token', data.token);
                
                // Hide login form and show dashboard
                document.getElementById('adminLogin').classList.add('hidden');
                document.getElementById('adminDashboard').classList.remove('hidden');
                
                // Load dashboard data
                this.loadDashboardData();
                this.setupSocket();
            } else {
                alert(data.message || 'Admin login failed');
            }
        } catch (error) {
            console.error('Admin login error:', error);
            alert('An error occurred during admin login');
        }
    }

    adminLogout() {
        this.token = null;
        localStorage.removeItem('admin_token');
        
        // Show login form and hide dashboard
        document.getElementById('adminLogin').classList.remove('hidden');
        document.getElementById('adminDashboard').classList.add('hidden');
        
        // Reset form
        document.getElementById('adminLoginForm').reset();
        
        if (this.socket) {
            this.socket.close();
        }
        
        alert('Logged out from admin panel');
    }

    checkAdminAuth() {
        if (this.token) {
            // Token exists, show dashboard
            document.getElementById('adminLogin').classList.add('hidden');
            document.getElementById('adminDashboard').classList.remove('hidden');
            
            // Load dashboard data
            this.loadDashboardData();
            this.setupSocket();
        } else {
            // No token, show login form
            document.getElementById('adminLogin').classList.remove('hidden');
            document.getElementById('adminDashboard').classList.add('hidden');
        }
    }

    switchView(viewName) {
        // Hide all views
        document.querySelectorAll('#dashboardView, #usersView, #depositsView, #withdrawalsView, #betsView, #gameControlView').forEach(view => {
            view.classList.add('hidden');
        });
        
        // Remove active class from all nav buttons
        document.querySelectorAll('.admin-nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Show selected view
        document.getElementById(`${viewName}View`).classList.remove('hidden');
        
        // Add active class to clicked button
        document.getElementById(`${viewName}Nav`).classList.add('active');
        
        this.currentView = viewName;
        
        // Load data for the selected view
        switch(viewName) {
            case 'dashboard':
                this.loadDashboardData();
                break;
            case 'users':
                this.loadUsers();
                break;
            case 'deposits':
                this.loadDepositRequests();
                break;
            case 'withdrawals':
                this.loadWithdrawalRequests();
                break;
            case 'bets':
                this.loadBets();
                break;
            case 'gameControl':
                this.loadGameControlData();
                break;
        }
    }

    async loadDashboardData() {
        try {
            const response = await fetch('/api/admin/users', {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            
            if (response.ok) {
                const users = await response.json();
                document.getElementById('totalUsers').textContent = users.length;
            }
        } catch (error) {
            console.error('Error loading users:', error);
        }

        try {
            const response = await fetch('/api/admin/deposit-requests', {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            
            if (response.ok) {
                const deposits = await response.json();
                const totalDeposits = deposits.reduce((sum, req) => sum + req.amount, 0);
                document.getElementById('totalDeposits').textContent = `₹${totalDeposits.toFixed(2)}`;
            }
        } catch (error) {
            console.error('Error loading deposits:', error);
        }

        try {
            const response = await fetch('/api/admin/withdrawal-requests', {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            
            if (response.ok) {
                const withdrawals = await response.json();
                const totalWithdrawals = withdrawals.reduce((sum, req) => sum + req.amount, 0);
                document.getElementById('totalWithdrawals').textContent = `₹${totalWithdrawals.toFixed(2)}`;
            }
        } catch (error) {
            console.error('Error loading withdrawals:', error);
        }

        try {
            const response = await fetch('/api/admin/game-status', {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            
            if (response.ok) {
                const status = await response.json();
                document.getElementById('currentPeriod').textContent = status.currentPeriod;
                document.getElementById('timeLeft').textContent = `${status.secondsLeft}s`;
                
                // Update control panel as well
                document.getElementById('controlCurrentPeriod').textContent = status.currentPeriod;
                document.getElementById('controlTimeLeft').textContent = `${status.secondsLeft}s`;
            }
        } catch (error) {
            console.error('Error loading game status:', error);
        }
    }

    async loadUsers() {
        try {
            const response = await fetch('/api/admin/users', {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            
            if (response.ok) {
                const users = await response.json();
                this.displayUsers(users);
            }
        } catch (error) {
            console.error('Error loading users:', error);
        }
    }

    displayUsers(users) {
        const tbody = document.getElementById('usersTableBody');
        tbody.innerHTML = '';

        users.forEach(user => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${user._id}</td>
                <td>${user.username}</td>
                <td>${user.email}</td>
                <td>₹${user.balance.toFixed(2)}</td>
                <td>${new Date(user.createdAt).toLocaleString()}</td>
                <td>
                    <button onclick="adminPanel.editUserBalance('${user._id}', ${user.balance})" class="btn btn-primary btn-action">Edit Balance</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    async editUserBalance(userId, currentBalance) {
        const newBalance = prompt(`Enter new balance for user (current: ₹${currentBalance}):`, currentBalance);
        
        if (newBalance !== null) {
            const parsedBalance = parseFloat(newBalance);
            if (isNaN(parsedBalance) || parsedBalance < 0) {
                alert('Please enter a valid positive number');
                return;
            }

            try {
                const response = await fetch(`/api/admin/users/${userId}/balance`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.token}`
                    },
                    body: JSON.stringify({ balance: parsedBalance })
                });

                const data = await response.json();

                if (response.ok) {
                    alert('User balance updated successfully');
                    this.loadUsers(); // Refresh the user list
                } else {
                    alert(data.message || 'Failed to update user balance');
                }
            } catch (error) {
                console.error('Error updating user balance:', error);
                alert('An error occurred while updating user balance');
            }
        }
    }

    async loadDepositRequests() {
        try {
            const response = await fetch('/api/admin/deposit-requests', {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            
            if (response.ok) {
                const requests = await response.json();
                this.displayDepositRequests(requests);
            }
        } catch (error) {
            console.error('Error loading deposit requests:', error);
        }
    }

    displayDepositRequests(requests) {
        const tbody = document.getElementById('depositsTableBody');
        tbody.innerHTML = '';

        requests.forEach(req => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${req._id}</td>
                <td>${req.userId ? req.userId.username : 'N/A'}</td>
                <td>₹${req.amount.toFixed(2)}</td>
                <td>${req.upiId}</td>
                <td class="status-${req.status}">${req.status}</td>
                <td>${new Date(req.createdAt).toLocaleString()}</td>
                <td class="action-buttons">
                    ${req.status === 'pending' ? 
                        `<button onclick="adminPanel.verifyDeposit('${req._id}')" class="btn btn-success btn-action">Verify</button>
                         <button onclick="adminPanel.rejectDeposit('${req._id}')" class="btn btn-warning btn-action">Reject</button>` : 
                        `<span>Completed</span>`
                    }
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    async verifyDeposit(requestId) {
        if (confirm('Are you sure you want to verify this deposit?')) {
            try {
                const response = await fetch(`/api/admin/deposit-requests/${requestId}/verify`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${this.token}`
                    }
                });

                const data = await response.json();

                if (response.ok) {
                    alert('Deposit verified successfully');
                    this.loadDepositRequests(); // Refresh the list
                } else {
                    alert(data.message || 'Failed to verify deposit');
                }
            } catch (error) {
                console.error('Error verifying deposit:', error);
                alert('An error occurred while verifying deposit');
            }
        }
    }

    async rejectDeposit(requestId) {
        if (confirm('Are you sure you want to reject this deposit?')) {
            try {
                const response = await fetch(`/api/admin/deposit-requests/${requestId}/reject`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${this.token}`
                    }
                });

                const data = await response.json();

                if (response.ok) {
                    alert('Deposit rejected successfully');
                    this.loadDepositRequests(); // Refresh the list
                } else {
                    alert(data.message || 'Failed to reject deposit');
                }
            } catch (error) {
                console.error('Error rejecting deposit:', error);
                alert('An error occurred while rejecting deposit');
            }
        }
    }

    async loadWithdrawalRequests() {
        try {
            const response = await fetch('/api/admin/withdrawal-requests', {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            
            if (response.ok) {
                const requests = await response.json();
                this.displayWithdrawalRequests(requests);
            }
        } catch (error) {
            console.error('Error loading withdrawal requests:', error);
        }
    }

    displayWithdrawalRequests(requests) {
        const tbody = document.getElementById('withdrawalsTableBody');
        tbody.innerHTML = '';

        requests.forEach(req => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${req._id}</td>
                <td>${req.userId ? req.userId.username : 'N/A'}</td>
                <td>₹${req.amount.toFixed(2)}</td>
                <td>${req.upiId}</td>
                <td class="status-${req.status}">${req.status}</td>
                <td>${new Date(req.createdAt).toLocaleString()}</td>
                <td class="action-buttons">
                    ${req.status === 'pending' ? 
                        `<button onclick="adminPanel.approveWithdrawal('${req._id}')" class="btn btn-success btn-action">Approve</button>
                         <button onclick="adminPanel.rejectWithdrawal('${req._id}')" class="btn btn-warning btn-action">Reject</button>` : 
                        req.status === 'approved' ?
                        `<button onclick="adminPanel.processWithdrawal('${req._id}')" class="btn btn-primary btn-action">Process</button>` :
                        `<span>Completed</span>`
                    }
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    async approveWithdrawal(requestId) {
        if (confirm('Are you sure you want to approve this withdrawal?')) {
            try {
                const response = await fetch(`/api/admin/withdrawal-requests/${requestId}/approve`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${this.token}`
                    }
                });

                const data = await response.json();

                if (response.ok) {
                    alert('Withdrawal approved successfully');
                    this.loadWithdrawalRequests(); // Refresh the list
                } else {
                    alert(data.message || 'Failed to approve withdrawal');
                }
            } catch (error) {
                console.error('Error approving withdrawal:', error);
                alert('An error occurred while approving withdrawal');
            }
        }
    }

    async rejectWithdrawal(requestId) {
        if (confirm('Are you sure you want to reject this withdrawal?')) {
            try {
                const response = await fetch(`/api/admin/withdrawal-requests/${requestId}/reject`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${this.token}`
                    }
                });

                const data = await response.json();

                if (response.ok) {
                    alert('Withdrawal rejected successfully');
                    this.loadWithdrawalRequests(); // Refresh the list
                } else {
                    alert(data.message || 'Failed to reject withdrawal');
                }
            } catch (error) {
                console.error('Error rejecting withdrawal:', error);
                alert('An error occurred while rejecting withdrawal');
            }
        }
    }

    async processWithdrawal(requestId) {
        if (confirm('Are you sure you want to process this withdrawal? This will deduct the amount from user balance.')) {
            try {
                const response = await fetch(`/api/admin/withdrawal-requests/${requestId}/process`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${this.token}`
                    }
                });

                const data = await response.json();

                if (response.ok) {
                    alert('Withdrawal processed successfully');
                    this.loadWithdrawalRequests(); // Refresh the list
                } else {
                    alert(data.message || 'Failed to process withdrawal');
                }
            } catch (error) {
                console.error('Error processing withdrawal:', error);
                alert('An error occurred while processing withdrawal');
            }
        }
    }

    async loadBets() {
        try {
            const response = await fetch('/api/admin/bets', {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            
            if (response.ok) {
                const bets = await response.json();
                this.displayBets(bets);
            }
        } catch (error) {
            console.error('Error loading bets:', error);
        }
    }

    displayBets(bets) {
        const container = document.getElementById('betsList');
        container.innerHTML = '';

        bets.slice(0, 50).forEach(bet => { // Show last 50 bets
            const betElement = document.createElement('div');
            betElement.className = 'bet-item';
            betElement.innerHTML = `
                <p><strong>User:</strong> ${bet.userId ? bet.userId.username : 'N/A'} | 
                   <strong>Type:</strong> ${bet.betType} | 
                   <strong>Option:</strong> ${bet.betOption} | 
                   <strong>Amount:</strong> ₹${bet.betAmount} | 
                   <strong>Time:</strong> ${new Date(bet.placedAt).toLocaleTimeString()}</p>
            `;
            container.appendChild(betElement);
        });
    }

    async loadGameControlData() {
        // Load current game status
        try {
            const response = await fetch('/api/admin/game-status', {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            
            if (response.ok) {
                const status = await response.json();
                document.getElementById('controlCurrentPeriod').textContent = status.currentPeriod;
                document.getElementById('controlTimeLeft').textContent = `${status.secondsLeft}s`;
            }
        } catch (error) {
            console.error('Error loading game status:', error);
        }
    }

    async forceGameResult() {
        const winningNumber = document.getElementById('winningNumber').value;
        const winningColor = document.getElementById('winningColor').value;
        const bigSmallResult = document.getElementById('bigSmallResult').value;

        if (!winningNumber || !winningColor || !bigSmallResult) {
            alert('Please fill in all game result fields');
            return;
        }

        if (confirm('Are you sure you want to force this game result? This will affect all ongoing games.')) {
            try {
                const response = await fetch('/api/admin/force-result', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.token}`
                    },
                    body: JSON.stringify({
                        winningNumber: parseInt(winningNumber),
                        winningColor,
                        bigSmallResult
                    })
                });

                const data = await response.json();

                if (response.ok) {
                    alert('Game result forced successfully');
                    
                    // Update the UI with the new values
                    this.loadGameControlData();
                    
                    // In a real implementation, you would broadcast this result to all players
                } else {
                    alert(data.message || 'Failed to force game result');
                }
            } catch (error) {
                console.error('Error forcing game result:', error);
                alert('An error occurred while forcing game result');
            }
        }
    }

    setupSocket() {
        // Initialize socket connection for real-time updates
        this.socket = io();
        
        this.socket.on('connect', () => {
            console.log('Admin panel connected to game server');
        });

        this.socket.on('new-bet', (data) => {
            // Add new bet to the bets view if it's currently active
            if (this.currentView === 'bets') {
                this.addBetToDisplay(data);
            }
        });

        this.socket.on('game-result', (result) => {
            // Update game status when a new result is generated
            if (this.currentView === 'gameControl' || this.currentView === 'dashboard') {
                document.getElementById('controlCurrentPeriod').textContent = result.period;
                document.getElementById('currentPeriod').textContent = result.period;
            }
        });
    }

    addBetToDisplay(betData) {
        const container = document.getElementById('betsList');
        const betElement = document.createElement('div');
        betElement.className = 'bet-item';
        betElement.innerHTML = `
            <p><strong>New Bet!</strong> User: ${betData.userId} | 
               Type: ${betData.betType} | 
               Option: ${betData.betOption} | 
               Amount: ₹${betData.betAmount} | 
               Time: ${new Date().toLocaleTimeString()}</p>
        `;
        
        // Add to the top of the list
        if (container.firstChild) {
            container.insertBefore(betElement, container.firstChild);
        } else {
            container.appendChild(betElement);
        }
        
        // Limit to 50 items
        if (container.children.length > 50) {
            container.removeChild(container.lastChild);
        }
    }
}

// Initialize admin panel when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.adminPanel = new AdminPanel();
});