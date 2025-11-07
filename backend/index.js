
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const adminRoutes = require('./routes/admin');
const csurf = require('csurf');
const { body, validationResult } = require('express-validator');
const sanitizeHtml = require('sanitize-html');
const fs = require('fs');
const https = require('https');

// Import models
const User = require('./models/User');
const Payment = require('./models/Payment');
const Admin = require('./models/Admin');

const app = express();

//Security middlewares
app.use(helmet());
app.use(express.json());
app.use(cookieParser());

//Rate limiter
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use(limiter);

// CORS (allow your frontend origin only)
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'https://localhost:3000';
app.use(cors({ origin: FRONTEND_ORIGIN, credentials: true }));

//CSRF protection 
app.use(csurf({ 
    cookie: {
        httpOnly: true,
        secure: process.env.USE_SECURE_COOKIES === 'true',
        sameSite: 'Strict'
    }
}));

// Debug middleware - only log non-sensitive info
app.use((req, res, next) => {
    // Only log method and path, no headers or body
    console.log(`${req.method} ${req.path}`);
    next();
});

// Admin routes
app.use('/api/admin', adminRoutes);

//Sanitization middleware
app.use((req, res, next) => {
  const sanitize = (val) => {
    if (typeof val === 'string') return sanitizeHtml(val);
    if (typeof val === 'object' && val !== null) {
      for (let key in val) val[key] = sanitize(val[key]);
    }
    return val;
  };
  if (req.body) req.body = sanitize(req.body);
  if (req.query) req.query = sanitize(req.query);
  next();
});

//MongoDB connection
const MONGO = process.env.MONGO_URI || 'mongodb+srv://emmanuelokoye0216_db_user:fkNF9J5k06WVbT6m@cluster0.bnk80fq.mongodb.net/payments_portal?appName=Cluster0';

// Disable mongoose debugging in production
mongoose.set('debug', process.env.NODE_ENV === 'development');

async function connectToMongoDB() {
    try {
        await mongoose.connect(MONGO);
        console.log('✓ Database connection established');
    } catch (err) {
        console.error('Database connection error');
        process.exit(1);
    }
}

connectToMongoDB();

// Models are now imported from separate files

//regex whitelists
const nameRegex = /^[A-Za-z\s]{1,100}$/;
const idRegex = /^\d{13}$/;                 
const acctRegex = /^\d{6,20}$/;            // account number numeric 6-20 digits
const amountRegex = /^\d+(\.\d{1,2})?$/;
const currencyRegex = /^[A-Z]{3}$/;
const swiftRegex = /^[A-Z0-9]{8}([A-Z0-9]{3})?$/; // 8 or 11 chars

//validation helper
function sendValidationErrors(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  return null;
}

// CSRF token route
app.get('/csrf-token', (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

//Register

app.post('/register', [
  body('fullName').matches(nameRegex),
  body('idNumber').matches(idRegex),
  body('accountNumber').matches(acctRegex),
  body('password').isLength({ min: 10 })
], async (req, res) => {
  if (sendValidationErrors(req, res)) return;

  const { fullName, idNumber, accountNumber, password } = req.body;
  try {
    const exists = await User.findOne({ accountNumber });
    if (exists) return res.status(400).json({ error: 'Account number already registered' });

    const hash = await bcrypt.hash(password, 12);
    const user = new User({ fullName, idNumber, accountNumber, passwordHash: hash });
    await user.save();
    return res.status(201).json({ message: 'Registered' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Registration failed' });
  }
});


app.post('/login', [
  body('username').matches(nameRegex),
  body('accountNumber').matches(acctRegex),
  body('password').exists()
], async (req, res) => {
  if (sendValidationErrors(req, res)) return;

  const { username, accountNumber, password } = req.body;
  try {
    const user = await User.findOne({ accountNumber, fullName: username });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user._id, accountNumber: user.accountNumber }, process.env.JWT_SECRET || 'dev-secret', { expiresIn: '1h' });

    // just seting httpOnly & secure cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: (process.env.USE_SECURE_COOKIES === 'true'),
      sameSite: 'Strict',
      maxAge: 60 * 60 * 1000
    });

    return res.json({ message: 'Logged in' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Login error' });
  }
});


const auth = (req, res, next) => {
  const token = req.cookies.token || req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// body: amount, currency, provider (SWIFT), beneficiaryName, beneficiaryAccount, swiftCode
app.post('/payment', auth, [
  body('amount').matches(amountRegex),
  body('currency').matches(currencyRegex),
  body('provider').isIn(['SWIFT']),
  body('beneficiaryName').matches(nameRegex),
  body('beneficiaryAccount').matches(acctRegex),
  body('swiftCode').matches(swiftRegex)
], async (req, res) => {
  if (sendValidationErrors(req, res)) return;

  try {
    const { amount, currency, provider, beneficiaryName, beneficiaryAccount, swiftCode } = req.body;
    // Saving payment
    const payment = new Payment({
      userId: req.user.id,
      amount,
      currency,
      provider,
      beneficiaryName,
      beneficiaryAccount,
      swiftCode
    });
    await payment.save();

    return res.json({ message: 'Payment simulated', id: payment._id });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Payment failed' });
  }
});

// Simple check route
app.get('/me', auth, async (req, res) => {
  const user = await User.findById(req.user.id).select('-passwordHash -idNumber');
  res.json({ user });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error:', err && err.message);
  if (err && err.code === 'EBADCSRFTOKEN') return res.status(403).json({ error: 'Invalid CSRF token' });
  res.status(500).json({ error: 'Internal Server Error' });
});

// HTTPS server startup
const PORT = process.env.PORT || 4000;
const sslKeyPath = process.env.SSL_KEY || 'key.pem';
const sslCertPath = process.env.SSL_CERT || 'cert.pem';

if (fs.existsSync(sslKeyPath) && fs.existsSync(sslCertPath)) {
  const sslOptions = {
    key: fs.readFileSync(sslKeyPath),
    cert: fs.readFileSync(sslCertPath)
  };
  https.createServer(sslOptions, app).listen(PORT, () => {
    console.log(`HTTPS Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  });
} else {
  // if no certs found, fallback to HTTP
  app.listen(PORT, () => console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`));
}
