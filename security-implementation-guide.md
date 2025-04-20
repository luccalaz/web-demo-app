# Security Logging and Monitoring Implementation

Step-by-step instructions to implementing security logging and monitoring in the app.

We'll be adding:
1. A logging system with Winston
2. Security monitoring for suspicious activities
3. Email alerts for security incidents
4. Integration with authentication and API routes

## Prerequisites

```bash
npm install winston nodemailer --save
```

## Implementation Steps

### Step 1: Create Logger (logger.js)

The logger is already implemented with Winston. It creates logs with timestamps and writes to:
- Console (for development visibility)
- combined.log (all log levels)
- error.log (error-level logs only)

### Step 2: Create Email Alert System (emailAlert.js)

Function to send alert emails using nodemailer and ethereal.

```javascript
const nodemailer = require('nodemailer');
const logger = require('./logger');

// Function to send email alerts
async function sendAlertEmail(subject, message) {
  try {
    // Create test account (in a real app, you'd use your actual SMTP credentials)
    const testAccount = await nodemailer.createTestAccount();

    // Create reusable transporter using ethereal (fake SMTP for local testing)
    const transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false, // no SSL for demo purposes
      auth: {
        user: testAccount.user,
        pass: testAccount.pass
      }
    });

    // Set up email options
    const mailOptions = {
      from: '"Security Monitor" <security@demo.com>',
      to: 'admin@example.com', // In production, use actual admin email
      subject: `ALERT: ${subject}`,
      text: message,
      html: `<p>${message}</p>`
    };

    // Send mail
    const info = await transporter.sendMail(mailOptions);

    logger.info('Security alert email sent', {
      messageId: info.messageId,
      previewURL: nodemailer.getTestMessageUrl(info)
    });

    return true;
  } catch (error) {
    logger.error('Failed to send alert email', { error });
    return false;
  }
}

module.exports = { sendAlertEmail };
```

### Step 3: Implement Security Monitoring (securityMonitor.js)

Functions and variables to keep track and monitor suspicious activity.

```javascript
const logger = require('./logger');
const { sendAlertEmail } = require('./emailAlert');

// Store suspicious activity data
const suspiciousActivities = {
  failedLogins: {}, // Track failed login attempts by IP
  largeTransfers: [], // Track unusually large transfers
};

// Monitor failed login attempts
function monitorFailedLogin(username, ipAddress) {
  logger.warn('Failed login attempt', { username, ipAddress});

  // Initialize tracking for new IP addresses
  if (!suspiciousActivities.failedLogins[ipAddress]) {
    suspiciousActivities.failedLogins[ipAddress] = { count: 0, timestamps: [] };
  }

  // Update failed login data
  suspiciousActivities.failedLogins[ipAddress].count++;
  suspiciousActivities.failedLogins[ipAddress].timestamps.push(new Date());

  // Send alert if threshold reached
  if (suspiciousActivities.failedLogins[ipAddress].count === 3) {
    const message = `Multiple failed logins for ${username} from ${ipAddress}`;
    logger.error(message);
    sendAlertEmail('Multiple failed login attempts', message);
  }
}

// Monitor large money transfers
function monitorTransfer(userId, amount, recipient) {
  logger.info('Money transfer', { userId, amount, recipient, timestamp: new Date() });

  // Check if transfer amount exceeds threshold
  if (amount >= 1000) {
    const message = `Large transfer of $${amount} made by user id ${userId} to ${recipient}`;
    logger.warn(message);
    sendAlertEmail('Large money transfer detected', message);

    suspiciousActivities.largeTransfers.push({
      userId,
      amount,
      recipient,
      timestamp: new Date()
    });
  }
}

// Export monitoring functions
module.exports = {
  monitorFailedLogin,
  monitorTransfer
};
```

### Step 4: Update Authentication Routes (routes/authRoutes.js)

Add logging for login attempts.

```javascript
// In routes/authRoutes.js - add these requires at the top
const logger = require('../logger');
const { monitorFailedLogin } = require('../securityMonitor');

// Then modify the login post route:
router.post('/login', (req, res) => {
    const { username, password } = req.body;

    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);

    if (user && bcrypt.compareSync(password, user.password)) {
        req.session.userId = user.id;
        req.session.username = user.username;

        res.redirect('/dashboard');
    } else {
        // Monitor and log failed login attempt  < ---------------------
        monitorFailedLogin(username, req.ip);
        res.redirect('/login?error=1');
    }
});
```

### Step 5: Update API Routes (routes/apiRoutes.js)

Add logging and monitoring for API activities and money transfers.

```javascript
// In routes/apiRoutes.js - add this require at the top
const { monitorTransfer } = require('../securityMonitor');

// Then modify the transfer endpoint:
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

        // Monitor and log successful transfer   < ---------------------
        monitorTransfer(userId, amountNum, recipient);

        res.json({ success: true });
    } catch (error) {
        // add error logging   < ---------------------
        logger.error("Transfer failed", {error})
        res.status(500).json({ error: 'Transfer failed' });
    }
});
```

### Step 6: Update Authentication Middleware (middleware.js)

Add logging for unauthorized access attempts.

```javascript
// In middleware.js - add this require at the top
const logger = require('./logger');

// Update the isAuthenticated function
function isAuthenticated(req, res, next) {
    if (req.session.userId) {
        next();
    } else {
        logger.warn('Unauthorized access attempt', {
            path: req.path,
            method: req.method,
            ip: req.ip
        });
        res.redirect('/login');
    }
}
```

## Testing The Implementation

1. **Failed Login Detection**:
   - Try to login with incorrect credentials 3+ times
   - Check logs for warnings and alerts
   - A security email should be triggered after 3 failed attempts

2. **Large Transfer Detection**:
   - Login and perform a transfer over $1000
   - Check logs for the transfer detection
   - A security email should be triggered

3. **Unauthorized Access**:
   - Log out and try to access a protected route
   - Check logs for unauthorized access warning

## Log Files

Check the following locations for your logs:
- `./logs/combined.log` - All log entries
- `./logs/error.log` - Error-level entries only
- Console output - For development visibility