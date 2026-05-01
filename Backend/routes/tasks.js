const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Task = require('../models/Task');
const Project = require('../models/Project');
const auth = require('../middleware/auth');

const getMemberRole = (project, userId) => {
  const member = project.members.find((m) => m.user.toString() === userId.toString());
  return member ? member.role : null;
};

// GET /api/tasks?projectId=xxx — get tasks for a project
router.get('/', auth, async (req, res) => {
  try {
    const { projectId } = req.query;
    if (!projectId) return res.status(400).json({ message: 'projectId query param required' });

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const role = getMemberRole(project, req.user._id);
    // Global admins can always view all tasks even if not a project member
    if (!role && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not a member of this project' });
    }

    let query = { project: projectId };

    // Project-level Members only see tasks assigned to them
    if (role === 'Member') {
      query.assignedTo = req.user._id;
    }

    const tasks = await Task.find(query)
      .populate('assignedTo', 'name email avatar')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({ tasks, userRole: role || 'Admin' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/tasks — create task (project Admin only)
router.post(
  '/',
  auth,
  [
    body('title').trim().isLength({ min: 3 }).withMessage('Title must be at least 3 characters'),
    body('dueDate').isISO8601().withMessage('Valid due date is required'),
    body('projectId').notEmpty().withMessage('Project ID is required')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg });

    try {
      const { title, description, dueDate, priority, assignedTo, projectId } = req.body;

      const project = await Project.findById(projectId);
      if (!project) return res.status(404).json({ message: 'Project not found' });

      const role = getMemberRole(project, req.user._id);
      // Allow global admins to create tasks too
      if (role !== 'Admin' && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }

      if (assignedTo) {
        const isProjectMember = project.members.find((m) => m.user.toString() === assignedTo);
        if (!isProjectMember) return res.status(400).json({ message: 'Assigned user is not a project member' });
      }

      const task = await Task.create({
        title,
        description,
        dueDate,
        priority: priority || 'Medium',
        assignedTo: assignedTo || null,
        project: projectId,
        createdBy: req.user._id
      });

      await task.populate('assignedTo', 'name email avatar');
      await task.populate('createdBy', 'name email');

      res.status(201).json({ message: 'Task created', task });
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  }
);

// GET /api/tasks/:id — get single task
router.get('/:id', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('assignedTo', 'name email avatar')
      .populate('createdBy', 'name email')
      .populate('project', 'name');

    if (!task) return res.status(404).json({ message: 'Task not found' });

    const project = await Project.findById(task.project);
    const role = getMemberRole(project, req.user._id);

    if (!role && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (role === 'Member' && task.assignedTo?._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({ task, userRole: role || 'Admin' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PUT /api/tasks/:id — update task
router.put('/:id', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    const project = await Project.findById(task.project);
    const role = getMemberRole(project, req.user._id);
    const isGlobalAdmin = req.user.role === 'admin';

    if (!role && !isGlobalAdmin) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (role === 'Member') {
      // Members can only update status of their own assigned tasks
      if (task.assignedTo?.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'You can only update your assigned tasks' });
      }
      const { status } = req.body;
      if (status) task.status = status;
    } else {
      // Project Admin or global admin: can update everything
      const { title, description, dueDate, priority, status, assignedTo } = req.body;
      if (title) task.title = title;
      if (description !== undefined) task.description = description;
      if (dueDate) task.dueDate = dueDate;
      if (priority) task.priority = priority;
      if (status) task.status = status;
      if (assignedTo !== undefined) task.assignedTo = assignedTo || null;
    }

    await task.save();
    await task.populate('assignedTo', 'name email avatar');
    await task.populate('createdBy', 'name email');

    res.json({ message: 'Task updated', task });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// DELETE /api/tasks/:id — delete task (project Admin or global admin)
router.delete('/:id', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    const project = await Project.findById(task.project);
    const role = getMemberRole(project, req.user._id);

    if (role !== 'Admin' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    await task.deleteOne();
    res.json({ message: 'Task deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;