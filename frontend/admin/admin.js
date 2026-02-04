// Admin Panel Logic for Neon Wingo
class AdminManager {
    constructor() {
        this.socket = io();
        this.token = localStorage.getItem('admin_token');
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupSocket();
        if (this.token) {
            this.showDashboard();
        }
    }

    setupEventListeners() {
        // Login
        const loginBtn = document.getElementById('loginBtn');
        if (loginBtn) {
            loginBtn.addEventListener('click', () => this.handleLogin());
        }

        // Navigation
        document.getElementById('btnUsers').addEventListener('click', () => this.switchView('users'));
        document.getElementById('btnFinance').addEventListener('click', () => this.switchView('financial'));
        document.getElementById('btnControl').addEventListener('click', () => this.switchView('control'));
        document.getElementById('btnLogout').addEventListener('click', () => this.logout());

        // Game Control
        document.getElementById('applyForceBtn').addEventListener('click', () => this.applyForceResult());
    }

    setupSocket() {
        this.socket.on('game-status', (data) => {
            const lp = document.getElementById('livePeriod');
            const lt = document.getElementById('liveTimer');
            if (lp) lp.textContent = data.currentPeriod;
            if (lt) lt.textContent = data.timeLeft;
        });
    }

    async handleLogin() {
        const username = document.getElementById('adminUser').value;
        const password = document.getElementById('adminPass').value;

        try {
            const res = await fetch('/api/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();
            if (res.ok) {
                this.token = data.token;
                localStorage.setItem('admin_token', data.token);
                this.showDashboard();
            } else {
                alert(data.message || 'Login failed');
            }
        } catch (e) {
            alert('Server error');
        }
    }

    showDashboard() {
        document.getElementById('adminLogin').classList.add('hidden');
        document.getElementById('adminDashboard').classList.remove('hidden');
        this.switchView('users');
    }

    logout() {
        localStorage.removeItem('admin_token');
        location.reload();
    }

    switchView(view) {
        // Update nav buttons
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        if (view === 'users') document.getElementById('btnUsers').classList.add('active');
        if (view === 'financial') document.getElementById('btnFinance').classList.add('active');
        if (view === 'control') document.getElementById('btnControl').classList.add('active');

        // Update view containers
        document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
        document.getElementById(`${view}View`).classList.remove('hidden');

        // Fetch data
        if (view === 'users') this.fetchUsers();
        if (view === 'financial') this.fetchFinancial();
    }

    async fetchUsers() {
        try {
            const res = await fetch('/api/admin/users', {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            const data = await res.json();
            const body = document.getElementById('userTableBody');
            body.innerHTML = data.map(u => `
                <tr>
                    <td>${u.username}</td>
                    <td>₹${u.balance.toFixed(2)}</td>
                    <td>
                        <button onclick="adminManager.editBalance('${u._id}', ${u.balance})" class="btn-action btn-verify">Edit</button>
                    </td>
                </tr>
            `).join('');
        } catch (e) {}
    }

    async fetchFinancial() {
        try {
            const dRes = await fetch('/api/admin/deposit-requests', {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            const dData = await dRes.json();
            document.getElementById('depositTableBody').innerHTML = dData.map(d => `
                <tr>
                    <td>${d.username}</td>
                    <td>₹${d.amount}</td>
                    <td>${d.upiId}</td>
                    <td>
                        ${d.status === 'pending' ? `
                            <button onclick="adminManager.verifyDep('${d._id}')" class="btn-action btn-verify">Verify</button>
                            <button onclick="adminManager.rejectDep('${d._id}')" class="btn-action btn-reject">Reject</button>
                        ` : d.status}
                    </td>
                </tr>
            `).join('');

            const wRes = await fetch('/api/admin/withdrawal-requests', {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            const wData = await wRes.json();
            document.getElementById('withdrawTableBody').innerHTML = wData.map(w => `
                <tr>
                    <td>${w.username}</td>
                    <td>₹${w.amount}</td>
                    <td>${w.upiId}</td>
                    <td>
                        ${w.status === 'pending' ? `
                            <button onclick="adminManager.verifyWd('${w._id}')" class="btn-action btn-verify">Approve</button>
                            <button onclick="adminManager.rejectWd('${w._id}')" class="btn-action btn-reject">Reject</button>
                        ` : (w.status === 'approved' ? `
                            <button onclick="adminManager.processWd('${w._id}')" class="btn-action btn-verify">Process</button>
                        ` : w.status)}
                    </td>
                </tr>
            `).join('');
        } catch (e) {}
    }

    async editBalance(userId, current) {
        const val = prompt('Enter new balance:', current);
        if (val === null) return;
        try {
            const res = await fetch(`/api/admin/users/${userId}/balance`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify({ balance: parseFloat(val) })
            });
            if (res.ok) this.fetchUsers();
        } catch (e) {}
    }

    async verifyDep(id) {
        try {
            const res = await fetch(`/api/admin/deposit-requests/${id}/verify`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            if (res.ok) this.fetchFinancial();
        } catch (e) {}
    }

    async rejectDep(id) {
        try {
            const res = await fetch(`/api/admin/deposit-requests/${id}/reject`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            if (res.ok) this.fetchFinancial();
        } catch (e) {}
    }

    async verifyWd(id) {
        try {
            const res = await fetch(`/api/admin/withdrawal-requests/${id}/approve`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            if (res.ok) this.fetchFinancial();
        } catch (e) {}
    }

    async processWd(id) {
        try {
            const res = await fetch(`/api/admin/withdrawal-requests/${id}/process`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            if (res.ok) this.fetchFinancial();
        } catch (e) {}
    }

    async rejectWd(id) {
        try {
            const res = await fetch(`/api/admin/withdrawal-requests/${id}/reject`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            if (res.ok) this.fetchFinancial();
        } catch (e) {}
    }

    async applyForceResult() {
        const num = document.getElementById('forceNum').value;
        if (num === '') return alert('Enter a number 0-9');
        this.submitForce(parseInt(num));
    }

    async forceBig() {
        const bigNums = [5, 6, 7, 8, 9];
        const randomBig = bigNums[Math.floor(Math.random() * bigNums.length)];
        this.submitForce(randomBig);
    }

    async forceSmall() {
        const smallNums = [0, 1, 2, 3, 4];
        const randomSmall = smallNums[Math.floor(Math.random() * smallNums.length)];
        this.submitForce(randomSmall);
    }

    async submitForce(num) {
        try {
            const res = await fetch('/api/admin/force-result', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify({ winningNumber: num })
            });
            if (res.ok) alert(`Success! Next result forced to: ${num}`);
            else {
                const d = await res.json();
                alert(d.message);
            }
        } catch (e) {
            alert('Error connecting to server');
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.adminManager = new AdminManager();
});
