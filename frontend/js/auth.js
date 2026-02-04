// Authentication functionality
class AuthManager {
    constructor() {
        this.token = localStorage.getItem('token');
        this.currentUser = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.checkAuthStatus();
    }

    setupEventListeners() {
        // Tab switching
        document.getElementById('loginTab')?.addEventListener('click', () => this.switchTab('login'));
        document.getElementById('registerTab')?.addEventListener('click', () => this.switchTab('register'));

        // Form submissions
        document.getElementById('login')?.addEventListener('submit', (e) => this.handleLogin(e));
        document.getElementById('register')?.addEventListener('submit', (e) => this.handleRegister(e));

        // Logout
        document.getElementById('logoutBtn')?.addEventListener('click', () => this.logout());
        document.getElementById('logoutNav')?.addEventListener('click', () => this.logout());
    }

    switchTab(activeTab) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.getElementById(`${activeTab}Tab`).classList.add('active');

        // Show/hide forms
        document.querySelectorAll('.auth-form').forEach(form => {
            form.classList.add('hidden');
        });
        document.getElementById(`${activeTab}Form`).classList.remove('hidden');
    }

    async handleLogin(e) {
        e.preventDefault();
        
        const username = document.getElementById('loginUsername').value;
        const password = document.getElementById('loginPassword').value;

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (response.ok) {
                this.token = data.token;
                localStorage.setItem('token', data.token);
                this.currentUser = data.user;
                
                alert('Login successful!');
                this.showGameView();
            } else {
                alert(data.message || 'Login failed');
            }
        } catch (error) {
            console.error('Login error:', error);
            alert('An error occurred during login');
        }
    }

    async handleRegister(e) {
        e.preventDefault();
        
        const username = document.getElementById('regUsername').value;
        const email = document.getElementById('regEmail').value;
        const password = document.getElementById('regPassword').value;

        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, email, password })
            });

            const data = await response.json();

            if (response.ok) {
                alert('Registration successful! Please log in.');
                this.switchTab('login');
            } else {
                alert(data.message || 'Registration failed');
            }
        } catch (error) {
            console.error('Registration error:', error);
            alert('An error occurred during registration');
        }
    }

    logout() {
        this.token = null;
        this.currentUser = null;
        localStorage.removeItem('token');
        this.showAuthView();
        alert('Logged out successfully');
    }

    checkAuthStatus() {
        if (this.token) {
            // Token exists, try to get user info
            this.validateToken();
        } else {
            // No token, show auth view
            this.showAuthView();
        }
    }

    async validateToken() {
        // In a real implementation, you would verify the token with the server
        // For now, we'll just assume the stored token is valid
        try {
            // You could make a request to get user profile here
            // For demo purposes, we'll simulate showing the game view
            this.showGameView();
        } catch (error) {
            console.error('Token validation error:', error);
            this.logout();
        }
    }

    showAuthView() {
        document.getElementById('authSection').classList.remove('hidden');
        document.getElementById('gameSection').classList.add('hidden');
        document.getElementById('financialSection').classList.add('hidden');
    }

    showGameView() {
        document.getElementById('authSection').classList.add('hidden');
        document.getElementById('gameSection').classList.remove('hidden');
        document.getElementById('financialSection').classList.add('hidden');
        
        // Update balance display
        if (this.currentUser) {
            document.getElementById('balance').textContent = `Balance: ₹${this.currentUser.balance.toFixed(2)}`;
        }
    }
}

// Initialize auth manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.authManager = new AuthManager();
});