const express = require('express');
const router = express.Router();
const Admin = require('../models/Admin');
const Payment = require('../models/Payment');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const sanitizeHtml = require('sanitize-html');

// Regex patterns
const usernameRegex = /^[A-Za-z0-9_]{3,20}$/;
const employeeIdRegex = /^EMP\d{6}$/;
const nameRegex = /^[A-Za-z\s]{1,100}$/;

// Admin authentication middleware
const adminAuth = async (req, res, next) => {
    try {
        const token = req.cookies.adminToken || req.header('Authorization')?.replace('Bearer ', '');
        if (!token) return res.status(401).json({ error: 'Unauthorized' });

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
        const admin = await Admin.findById(decoded.id);
        
        if (!admin) return res.status(401).json({ error: 'Unauthorized' });
        
        req.admin = admin;
        next();
    } catch (error) {
        if (process.env.NODE_ENV !== 'production') {
            console.error('Auth error:', error.name);
        }
        res.status(401).json({ error: 'Invalid token' });
    }
};

// Admin login route
router.post('/login', [
    body('username').matches(usernameRegex),
    body('password').exists()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { username, password } = req.body;
        
        const admin = await Admin.findOne({ username });
        if (!admin) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const ok = await admin.comparePassword(password);
        if (!ok) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: admin._id, role: 'admin' },
            process.env.JWT_SECRET || 'dev-secret',
            { expiresIn: '8h' }
        );

        res.cookie('adminToken', token, {
            httpOnly: true,
            secure: process.env.USE_SECURE_COOKIES === 'true',
            sameSite: 'Strict',
            maxAge: 8 * 60 * 60 * 1000 // 8 hours
        });

        res.json({
            message: 'Logged in successfully',
            admin: {
                username: admin.username,
                employeeId: admin.employeeId,
                fullName: admin.fullName
            }
        });
    } catch (error) {
        if (process.env.NODE_ENV !== 'production') {
            console.error('Admin login error:', error.name);
        }
        res.status(500).json({ error: 'Login failed' });
    }
});

// Get all payments
router.get('/payments', adminAuth, async (req, res) => {
    try {
        const payments = await Payment.find()
            .populate('userId', 'fullName accountNumber')
            .sort({ createdAt: -1 });
        
        res.json(payments);
    } catch (error) {
        if (process.env.NODE_ENV !== 'production') {
            console.error('Error fetching payments:', error.name);
        }
        res.status(500).json({ error: 'Failed to fetch payments' });
    }
});

// Get all pending payments
router.get('/payments/pending', adminAuth, async (req, res) => {
    try {
        const payments = await Payment.find({ status: 'pending' })
            .populate('userId', 'fullName accountNumber')
            .sort({ createdAt: -1 });
        res.json(payments);
    } catch (error) {
        if (process.env.NODE_ENV !== 'production') {
            console.error('Error fetching pending payments:', error.name);
        }
        res.status(500).json({ error: 'Failed to fetch payments' });
    }
});

// Verify or reject payment
router.post('/payments/:paymentId/verify', [
    adminAuth,
    body('action').isIn(['verify', 'reject']),
    body('notes').optional().trim().isLength({ max: 500 })
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const payment = await Payment.findById(req.params.paymentId);
        
        if (!payment) {
            return res.status(404).json({ error: 'Payment not found' });
        }

        if (payment.status !== 'pending') {
            return res.status(400).json({ error: 'Payment already processed' });
        }

        // Update payment status and add verification details
        payment.status = req.body.action === 'verify' ? 'verified' : 'rejected';
        payment.verifiedBy = {
            adminId: req.admin._id,
            employeeId: req.admin.employeeId,
            verifiedAt: new Date(),
            notes: req.body.notes || ''
        };

        const savedPayment = await payment.save();

        res.json({ 
            message: `Payment ${req.body.action === 'verify' ? 'verified' : 'rejected'} successfully`,
            payment: savedPayment
        });
    } catch (error) {
        if (process.env.NODE_ENV !== 'production') {
            console.error('Error verifying payment:', error.name);
        }
        res.status(500).json({ error: `Failed to ${req.body.action} payment` });
    }
});

// Submit payment to SWIFT
router.post('/payments/:paymentId/submit-to-swift', adminAuth, async (req, res) => {
    try {
        const payment = await Payment.findById(req.params.paymentId);
        if (!payment) {
            return res.status(404).json({ error: 'Payment not found' });
        }

        if (payment.status !== 'verified') {
            return res.status(400).json({ error: 'Payment must be verified before submitting to SWIFT' });
        }

        // Generate a unique SWIFT transaction ID
        const swiftTransactionId = 'SWIFT' + Date.now() + Math.random().toString(36).substr(2, 5).toUpperCase();
        const submissionDate = new Date();

        // Update payment status and details
        payment.status = 'submitted_to_swift';
        payment.submittedBy = {
            adminId: req.admin._id,
            employeeId: req.admin.employeeId,
            submittedAt: submissionDate
        };
        payment.swiftDetails = {
            transactionId: swiftTransactionId,
            submissionDate: submissionDate,
            status: 'pending',
            responseCode: 'PROCESSING',
            responseMessage: 'Payment is being processed by SWIFT'
        };

        // Save the updated payment
        const updatedPayment = await payment.save();

        res.json({
            message: 'Payment submitted to SWIFT successfully',
            payment: updatedPayment
        });
    } catch (error) {
        if (process.env.NODE_ENV !== 'production') {
            console.error('SWIFT submission error:', error.name);
        }
        res.status(500).json({ error: 'Failed to submit payment to SWIFT' });
    }
});

// Get SWIFT submission status
router.get('/payments/:paymentId/swift-status', adminAuth, async (req, res) => {
    try {
        const { paymentId } = req.params;
        
        const payment = await Payment.findById(paymentId);
        if (!payment) {
            return res.status(404).json({ error: 'Payment not found' });
        }

        if (!payment.swiftDetails) {
            return res.status(400).json({ error: 'Payment has not been submitted to SWIFT' });
        }

        res.json({
            paymentId: payment._id,
            status: payment.status,
            swiftDetails: payment.swiftDetails
        });
    } catch (error) {
        if (process.env.NODE_ENV !== 'production') {
            console.error('Error getting SWIFT status:', error.name);
        }
        res.status(500).json({ error: 'Failed to get SWIFT status' });
    }
});

// Admin logout
router.post('/logout', (req, res) => {
    try {
        // Clear the admin token cookie
        res.cookie('adminToken', '', {
            httpOnly: true,
            secure: process.env.USE_SECURE_COOKIES === 'true',
            sameSite: 'Strict',
            expires: new Date(0),
            path: '/'
        });

        // Clear CSRF token cookie if it exists
        res.cookie('XSRF-TOKEN', '', {
            expires: new Date(0),
            path: '/'
        });

        res.json({ message: 'Logged out successfully' });
    } catch (error) {
        if (process.env.NODE_ENV !== 'production') {
            console.error('Logout error:', error.name);
        }
        res.status(500).json({ error: 'Logout failed' });
    }
});

module.exports = router;