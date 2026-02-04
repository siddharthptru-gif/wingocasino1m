// Authentication functionality for Neon Wingo
class AuthManager {
    constructor() {
        this.token = localStorage.getItem('token');
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
        document.getElementById('submitLogin')?.addEventListener('click', () => this.handleLogin());
        document.getElementById('submitRegister')?.addEventListener('click', () => this.handleRegister());

        // Logout
        document.getElementById('navLogout')?.addEventListener('click', () => this.logout());
    }

    switchTab(activeTab) {
        document.getElementById('loginTab').classList.toggle('active', activeTab === 'login');
        document.getElementById('registerTab').classList.toggle('active', activeTab === 'register');
        document.getElementById('loginForm').classList.toggle('hidden', activeTab !== 'login');
        document.getElementById('registerForm').classList.toggle('hidden', activeTab !== 'register');
    }

    async handleLogin() {
        const username = document.getElementById('loginUsername').value;
        const password = document.getElementById('loginPassword').value;

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();
            if (response.ok) {
                localStorage.setItem('token', data.token);
                this.token = data.token;
                alert('Login successful!');
                window.location.reload(); // Reload to refresh all managers
            } else {
                alert(data.message || 'Login failed');
            }
        } catch (error) {
            alert('An error occurred during login');
        }
    }

    async handleRegister() {
        const username = document.getElementById('regUsername').value;
        const email = document.getElementById('regEmail').value;
        const password = document.getElementById('regPassword').value;

        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
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
            alert('An error occurred during registration');
        }
    }

    logout() {
        localStorage.removeItem('token');
        window.location.reload();
    }

    checkAuthStatus() {
        const authSection = document.getElementById('authSection');
        const gameSection = document.getElementById('gameSection');
        const bottomNav = document.getElementById('bottomNav');

        if (this.token) {
            authSection.classList.add('hidden');
            gameSection.classList.remove('hidden');
            bottomNav.classList.remove('hidden');
        } else {
            authSection.classList.remove('hidden');
            gameSection.classList.add('hidden');
            bottomNav.classList.add('hidden');
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.authManager = new AuthManager();
});