const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const Project = require('../models/Project');
const auth = require('../middleware/auth');

// GET /api/dashboard
// Query params:
//   ?projectId=xxx  — scoped to one project
//   ?scope=mine     — only tasks assigned to the current user (used by Member role)
router.get('/', auth, async (req, res) => {
  try {
    const { projectId, scope } = req.query;

    let taskFilter = {};

    if (projectId) {
      // Scoped to a specific project — verify membership
      const project = await Project.findById(projectId);
      if (!project) return res.status(404).json({ message: 'Project not found' });

      const member = project.members.find((m) => m.user.toString() === req.user._id.toString());
      if (!member && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied' });
      }

      taskFilter.project = projectId;
    } else {
      // All projects the user belongs to
      const userProjects = await Project.find({ 'members.user': req.user._id }).select('_id');
      const projectIds = userProjects.map((p) => p._id);
      taskFilter.project = { $in: projectIds };
    }

    // ?scope=mine → filter down to only tasks assigned to this user
    // Frontend sends this for non-global-admin users
    if (scope === 'mine') {
      taskFilter.assignedTo = req.user._id;
    }

    const now = new Date();

    const [totalTasks, tasksByStatus, overdueTasks, tasksByUser, recentTasks] = await Promise.all([
      Task.countDocuments(taskFilter),

      Task.aggregate([
        { $match: taskFilter },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),

      Task.countDocuments({
        ...taskFilter,
        dueDate: { $lt: now },
        status: { $ne: 'Done' }
      }),

      // tasksByUser is only meaningful for admins; members won't use it but we compute cheaply
      Task.aggregate([
        { $match: { ...taskFilter, assignedTo: { $ne: null } } },
        {
          $group: {
            _id: '$assignedTo',
            total: { $sum: 1 },
            done: { $sum: { $cond: [{ $eq: ['$status', 'Done'] }, 1, 0] } },
            inProgress: { $sum: { $cond: [{ $eq: ['$status', 'In Progress'] }, 1, 0] } },
            todo: { $sum: { $cond: [{ $eq: ['$status', 'To Do'] }, 1, 0] } }
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'user'
          }
        },
        { $unwind: '$user' },
        {
          $project: {
            'user.name': 1,
            'user.email': 1,
            'user.avatar': 1,
            total: 1,
            done: 1,
            inProgress: 1,
            todo: 1
          }
        }
      ]),

      Task.find(taskFilter)
        .populate('assignedTo', 'name avatar')
        .populate('project', 'name color')
        .sort({ createdAt: -1 })
        .limit(10)
    ]);

    const statusMap = { 'To Do': 0, 'In Progress': 0, Done: 0 };
    tasksByStatus.forEach((s) => { statusMap[s._id] = s.count; });

    res.json({
      totalTasks,
      tasksByStatus: statusMap,
      overdueTasks,
      tasksByUser,
      recentTasks
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;