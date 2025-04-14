const express = require('express');
const { db } = require('../database');
const { isAuthenticated } = require('../middleware');

const router = express.Router();

// User info endpoint
router.get('/user-info', isAuthenticated, (req, res) => {
    const userId = req.session.userId;

    const user = db.prepare('SELECT id, username, balance FROM users WHERE id = ?').get(userId);

    // No logging of sensitive data access
    res.json(user);
});

// Transactions history endpoint
router.get('/transactions', isAuthenticated, (req, res) => {
    const userId = req.session.userId;

    const transactions = db.prepare(
        'SELECT * FROM transactions WHERE user_id = ? ORDER BY timestamp DESC'
    ).all(userId);

    // No logging of transaction history access
    res.json(transactions);
});

// Money transfer endpoint
router.post('/transfer', isAuthenticated, (req, res) => {
    const userId = req.session.userId;
    const { recipient, amount } = req.body;

    try {
        const amountNum = parseFloat(amount);

        // Get user balance
        const user = db.prepare('SELECT balance FROM users WHERE id = ?').get(userId);

        if (user.balance < amountNum) {
            return res.status(400).json({ error: 'Insufficient funds' });
        }

        // Start transaction
        const updateBalance = db.prepare('UPDATE users SET balance = balance - ? WHERE id = ?');
        const insertTransaction = db.prepare(
            'INSERT INTO transactions (user_id, amount, recipient) VALUES (?, ?, ?)'
        );

        // Execute transaction
        updateBalance.run(amountNum, userId);
        insertTransaction.run(userId, -amountNum, recipient);

        // No logging of successful transfers

        res.json({ success: true });
    } catch (error) {
        // No error logging
        res.status(500).json({ error: 'Transfer failed' });
    }
});

module.exports = router;