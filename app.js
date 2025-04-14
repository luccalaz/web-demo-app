const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path = require('path');

// Import routes and middleware
const authRoutes = require('./routes/authRoutes');
const apiRoutes = require('./routes/apiRoutes');
const { isAuthenticated } = require('./middleware');

// Initialize database (this will run the initialization)
require('./database');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Set up middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Set up a simple session (insecure for demo purposes)
app.use(session({
    secret: 'insecure-static-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));

// Mount routes
app.use('/', authRoutes);
app.use('/api', apiRoutes);

// Protected dashboard route with middleware
app.get('/dashboard', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});