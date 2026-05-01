const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// POST /api/auth/signup
router.post(
  '/signup',
  [
    body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
    body('email').isEmail().normalizeEmail().withMessage('Enter a valid email'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
  ],
  async (req, res) => {
    console.log('📩 Signup request received:', req.body);

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ Validation error:', errors.array()[0].msg);
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    try {
      const { name, email, password } = req.body;
      console.log('🔍 Checking if email exists:', email);

      const existingUser = await User.findOne({ email });
      if (existingUser) {
        console.log('❌ Email already registered');
        return res.status(400).json({ message: 'Email already registered' });
      }

      console.log('✏️ Creating user...');
      const user = await User.create({ name, email, password });
      console.log('✅ User created:', user._id, '| role:', user.role);

      const token = generateToken(user._id);

      res.status(201).json({
        message: 'Account created successfully',
        token,
        user: user.toJSON()
      });
    } catch (err) {
      console.error('🔥 Signup error:', err.message);
      console.error(err);
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  }
);

// POST /api/auth/login
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail().withMessage('Enter a valid email'),
    body('password').notEmpty().withMessage('Password is required')
  ],
  async (req, res) => {
    console.log('📩 Login request received:', req.body.email);

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ Validation error:', errors.array()[0].msg);
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    try {
      const { email, password } = req.body;

      const user = await User.findOne({ email }).select('+password +role');
      if (!user) {
        console.log('❌ No user found for email:', email);
        return res.status(401).json({ message: 'Invalid email or password' });
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        console.log('❌ Password mismatch for:', email);
        return res.status(401).json({ message: 'Invalid email or password' });
      }

      console.log('✅ Login successful:', email, '| role:', user.role);
      const token = generateToken(user._id);

      res.json({
        message: 'Login successful',
        token,
        user: user.toJSON()
      });
    } catch (err) {
      console.error('🔥 Login error:', err.message);
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  }
);

// GET /api/auth/me
router.get('/me', auth, async (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;