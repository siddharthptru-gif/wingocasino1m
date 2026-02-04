// Main application functionality
class App {
    constructor() {
        this.init();
    }

    init() {
        this.setupFinancialHandlers();
        this.loadUserData();
    }

    setupFinancialHandlers() {
        // Deposit request handler
        document.getElementById('depositRequest')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const amount = document.getElementById('depositAmount').value;
            const upiId = document.getElementById('depositUpiId').value;

            try {
                const response = await fetch('/api/game/deposit-request', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify({ amount, upiId })
                });

                const data = await response.json();

                if (response.ok) {
                    alert('Deposit request submitted successfully. Please wait for admin verification.');
                    document.getElementById('depositRequest').reset();
                } else {
                    alert(data.message || 'Failed to submit deposit request');
                }
            } catch (error) {
                console.error('Deposit request error:', error);
                alert('An error occurred while submitting deposit request');
            }
        });

        // Withdrawal request handler
        document.getElementById('withdrawalRequest')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const amount = document.getElementById('withdrawalAmount').value;
            const upiId = document.getElementById('withdrawalUpiId').value;

            if (amount < 100) {
                alert('Minimum withdrawal amount is ₹100');
                return;
            }

            try {
                const response = await fetch('/api/game/withdrawal-request', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify({ amount, upiId })
                });

                const data = await response.json();

                if (response.ok) {
                    alert('Withdrawal request submitted successfully. Please wait for admin processing.');
                    document.getElementById('withdrawalRequest').reset();
                } else {
                    alert(data.message || 'Failed to submit withdrawal request');
                }
            } catch (error) {
                console.error('Withdrawal request error:', error);
                alert('An error occurred while submitting withdrawal request');
            }
        });
    }

    async loadUserData() {
        // Load user data if logged in
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const response = await fetch('/api/auth/profile', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (response.ok) {
                    const userData = await response.json();
                    document.getElementById('balance').textContent = `Balance: ₹${userData.balance.toFixed(2)}`;
                }
            } catch (error) {
                console.error('Error loading user data:', error);
            }
        }
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});