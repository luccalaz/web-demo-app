const express = require('express');
const path = require('path');
const bcrypt = require('bcrypt');
const { db } = require('../database');

const router = express.Router();

// Routes
router.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

router.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '../public', 'login.html'));
});

router.post('/login', (req, res) => {
    const { username, password } = req.body;

    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);

    if (user && bcrypt.compareSync(password, user.password)) {
        // No logging of successful login attempts
        req.session.userId = user.id;
        req.session.username = user.username;

        res.redirect('/dashboard');
    } else {
        // No logging of failed login attempts
        res.redirect('/login?error=1');
    }
});

router.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

module.exports = router;