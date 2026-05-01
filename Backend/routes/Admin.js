const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Task = require('../models/Task');
const Project = require('../models/Project');
const auth = require('../middleware/auth');
const requireAdmin = require('../middleware/requireAdmin');

// All routes here require auth + global admin role
router.use(auth, requireAdmin);

// ─── GET /api/admin/users — list all users ────────────────────────────────────
router.get('/users', async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json({ users });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ─── PUT /api/admin/users/:id — update user role ─────────────────────────────
router.put('/users/:id', async (req, res) => {
  try {
    const { role } = req.body;

    if (!['admin', 'member'].includes(role)) {
      return res.status(400).json({ message: 'Role must be "admin" or "member"' });
    }

    // Prevent self-demotion (safety guard)
    if (req.params.id === req.user._id.toString() && role !== 'admin') {
      return res.status(400).json({ message: 'You cannot change your own role' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true, runValidators: true }
    );
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json({ message: 'User role updated', user });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ─── DELETE /api/admin/users/:id — delete user + clean up ────────────────────
router.delete('/users/:id', async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ message: "You cannot delete your own account" });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Unassign their tasks instead of deleting them
    await Task.updateMany(
      { assignedTo: req.params.id },
      { $set: { assignedTo: null } }
    );

    // Remove from all project member lists
    await Project.updateMany(
      { 'members.user': req.params.id },
      { $pull: { members: { user: req.params.id } } }
    );

    await user.deleteOne();

    res.json({ message: 'User deleted and removed from all projects' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ─── GET /api/admin/tasks — list all tasks across all projects ────────────────
router.get('/tasks', async (req, res) => {
  try {
    const tasks = await Task.find()
      .populate('assignedTo', 'name email avatar')
      .populate('createdBy', 'name email')
      .populate('project', 'name color')
      .sort({ createdAt: -1 });

    res.json({ tasks });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;