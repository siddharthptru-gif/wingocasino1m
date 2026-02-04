-- Database Schema for Wingo Casino Application

-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    balance DECIMAL(10, 2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_admin BOOLEAN DEFAULT FALSE
);

-- Transactions table
CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    type VARCHAR(20) CHECK (type IN ('deposit', 'withdrawal', 'bet', 'win')),
    amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
    reference_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Game sessions table (for tracking each 1-minute game)
CREATE TABLE game_sessions (
    id SERIAL PRIMARY KEY,
    session_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed')),
    winning_number INTEGER,
    winning_color VARCHAR(20),
    big_small_result VARCHAR(10) CHECK (big_small_result IN ('big', 'small', 'tie'))
);

-- Bets table (tracking user bets)
CREATE TABLE bets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    game_session_id INTEGER REFERENCES game_sessions(id),
    bet_type VARCHAR(20) CHECK (bet_type IN ('color', 'number', 'big_small')),
    bet_option VARCHAR(50), -- specific color, number, or 'big'/'small'
    bet_amount DECIMAL(10, 2) NOT NULL,
    payout DECIMAL(10, 2),
    is_winning BOOLEAN DEFAULT FALSE,
    placed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Admin logs table (for tracking admin actions)
CREATE TABLE admin_logs (
    id SERIAL PRIMARY KEY,
    admin_user_id INTEGER REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Deposit requests table
CREATE TABLE deposit_requests (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    amount DECIMAL(10, 2) NOT NULL,
    upi_id VARCHAR(100) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
    request_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_date TIMESTAMP,
    processed_by INTEGER REFERENCES users(id) -- admin who processed
);

-- Withdrawal requests table
CREATE TABLE withdrawal_requests (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    amount DECIMAL(10, 2) NOT NULL,
    upi_id VARCHAR(100) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'processed')),
    request_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_date TIMESTAMP,
    processed_by INTEGER REFERENCES users(id) -- admin who processed
);

-- Indexes for performance
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_bets_user_id ON bets(user_id);
CREATE INDEX idx_bets_game_session_id ON bets(game_session_id);
CREATE INDEX idx_deposit_requests_user_id ON deposit_requests(user_id);
CREATE INDEX idx_withdrawal_requests_user_id ON withdrawal_requests(user_id);