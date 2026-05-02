const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Project = require('../models/Project');
const Task = require('../models/Task');
const User = require('../models/User');
const auth = require('../middleware/auth');

const getMemberRole = (project, userId) => {
  const member = project.members.find((m) => m.user.toString() === userId.toString());
  return member ? member.role : null;
};

const populateProject = (query) =>
  query.populate('members.user', 'name email avatar').populate('createdBy', 'name email');

// GET /api/projects — list projects the user belongs to
router.get('/', auth, async (req, res) => {
  try {
    const projects = await populateProject(
      Project.find({ 'members.user': req.user._id }).sort({ createdAt: -1 })
    );
    const projectsWithStats = await Promise.all(
      projects.map(async (project) => {
        const [total, done] = await Promise.all([
          Task.countDocuments({ project: project._id }),
          Task.countDocuments({ project: project._id, status: 'Done' })
        ]);
        const obj = project.toObject({ virtuals: true });
        obj.taskStats = { total, done };
        return obj;
      })
    );
    res.json({ projects: projectsWithStats });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/projects/available — projects the user has NOT joined yet
router.get('/available', auth, async (req, res) => {
  try {
    const projects = await populateProject(
      Project.find({ 'members.user': { $ne: req.user._id } }).sort({ createdAt: -1 })
    );
    const projectsWithStats = await Promise.all(
      projects.map(async (project) => {
        const [total, done] = await Promise.all([
          Task.countDocuments({ project: project._id }),
          Task.countDocuments({ project: project._id, status: 'Done' })
        ]);
        const obj = project.toObject({ virtuals: true });
        obj.taskStats = { total, done };
        return obj;
      })
    );
    res.json({ projects: projectsWithStats });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/projects/preview/:id — view project details before joining (any logged-in user)
router.get('/preview/:id', auth, async (req, res) => {
  try {
    const project = await populateProject(Project.findById(req.params.id));
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const [total, done, inProgress] = await Promise.all([
      Task.countDocuments({ project: project._id }),
      Task.countDocuments({ project: project._id, status: 'Done' }),
      Task.countDocuments({ project: project._id, status: 'In Progress' })
    ]);

    const isMember = !!getMemberRole(project, req.user._id);

    res.json({
      project,
      isMember,
      userRole: getMemberRole(project, req.user._id),
      taskStats: { total, done, inProgress }
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/projects — create project
router.post(
  '/',
  auth,
  [body('name').trim().isLength({ min: 3 }).withMessage('Project name must be at least 3 characters')],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg });

    try {
      const { name, description, color } = req.body;
      const project = await Project.create({
        name,
        description: description || '',
        color: color || '#6366f1',
        createdBy: req.user._id,
        members: [{ user: req.user._id, role: 'Admin' }]
      });
      await project.populate('members.user', 'name email avatar');
      await project.populate('createdBy', 'name email');
      res.status(201).json({ message: 'Project created', project });
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  }
);

// POST /api/projects/join — join via invite code
router.post('/join', auth, async (req, res) => {
  try {
    const { inviteCode } = req.body;
    if (!inviteCode) return res.status(400).json({ message: 'Invite code is required' });

    const project = await populateProject(
      Project.findOne({ inviteCode: inviteCode.trim().toUpperCase() })
    );
    if (!project) return res.status(404).json({ message: 'Invalid invite code — project not found' });

    const alreadyMember = project.members.find(
      (m) => m.user._id.toString() === req.user._id.toString()
    );
    if (alreadyMember) return res.status(400).json({ message: 'You are already a member of this project' });

    project.members.push({ user: req.user._id, role: 'Member' });
    await project.save();
    await project.populate('members.user', 'name email avatar');

    const obj = project.toObject({ virtuals: true });
    obj.taskStats = { total: 0, done: 0 };

    res.json({ message: `Joined project "${project.name}"`, project: obj });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/projects/:id/join-direct — one-click join
router.post('/:id/join-direct', auth, async (req, res) => {
  try {
    const project = await populateProject(Project.findById(req.params.id));
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const alreadyMember = project.members.find(
      (m) => m.user._id.toString() === req.user._id.toString()
    );
    if (alreadyMember) return res.status(400).json({ message: 'You are already a member of this project' });

    project.members.push({ user: req.user._id, role: 'Member' });
    await project.save();
    await project.populate('members.user', 'name email avatar');

    const [total, done] = await Promise.all([
      Task.countDocuments({ project: project._id }),
      Task.countDocuments({ project: project._id, status: 'Done' })
    ]);

    const obj = project.toObject({ virtuals: true });
    obj.taskStats = { total, done };

    res.json({ message: `Joined project "${project.name}"`, project: obj });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/projects/:id — get single project (members + admins only)
router.get('/:id', auth, async (req, res) => {
  try {
    const project = await populateProject(Project.findById(req.params.id));
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const role = getMemberRole(project, req.user._id);

    // Allow global admins even if not a project member
    if (!role && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({ project, userRole: role || 'Admin' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PUT /api/projects/:id — update project (Admin only)
router.put('/:id', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const role = getMemberRole(project, req.user._id);
    if (role !== 'Admin') return res.status(403).json({ message: 'Admin access required' });

    const { name, description, color } = req.body;
    if (name) project.name = name;
    if (description !== undefined) project.description = description;
    if (color) project.color = color;

    await project.save();
    await project.populate('members.user', 'name email avatar');
    res.json({ message: 'Project updated', project });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// DELETE /api/projects/:id — delete project + tasks (Admin only)
router.delete('/:id', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const role = getMemberRole(project, req.user._id);
    if (role !== 'Admin') return res.status(403).json({ message: 'Admin access required' });

    await Task.deleteMany({ project: req.params.id });
    await project.deleteOne();
    res.json({ message: 'Project and all tasks deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/projects/:id/members — add member by email (Admin only)
router.post('/:id/members', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const role = getMemberRole(project, req.user._id);
    if (role !== 'Admin') return res.status(403).json({ message: 'Admin access required' });

    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const userToAdd = await User.findOne({ email: email.toLowerCase().trim() });
    if (!userToAdd) return res.status(404).json({ message: 'No user found with that email' });

    const alreadyMember = project.members.find(
      (m) => m.user.toString() === userToAdd._id.toString()
    );
    if (alreadyMember) return res.status(400).json({ message: 'User is already a member' });

    project.members.push({ user: userToAdd._id, role: 'Member' });
    await project.save();
    await project.populate('members.user', 'name email avatar');
    res.json({ message: 'Member added', project });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// DELETE /api/projects/:id/members/:userId — remove member (Admin only)
router.delete('/:id/members/:userId', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const role = getMemberRole(project, req.user._id);
    if (role !== 'Admin') return res.status(403).json({ message: 'Admin access required' });

    if (req.params.userId === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot remove yourself as admin' });
    }

    project.members = project.members.filter(
      (m) => m.user.toString() !== req.params.userId
    );
    await project.save();
    await project.populate('members.user', 'name email avatar');
    res.json({ message: 'Member removed', project });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/projects/:id/leave — member leaves project
router.post('/:id/leave', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const role = getMemberRole(project, req.user._id);
    if (!role) return res.status(400).json({ message: 'You are not a member of this project' });

    if (role === 'Admin') {
      const otherAdmins = project.members.filter(
        (m) => m.role === 'Admin' && m.user.toString() !== req.user._id.toString()
      );
      if (otherAdmins.length === 0) {
        return res.status(400).json({
          message: 'You are the only Admin. Delete the project or assign another Admin before leaving.'
        });
      }
    }

    project.members = project.members.filter(
      (m) => m.user.toString() !== req.user._id.toString()
    );
    await project.save();
    res.json({ message: 'You have left the project' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/projects/:id/invite-code (Admin only)
router.get('/:id/invite-code', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const role = getMemberRole(project, req.user._id);
    if (role !== 'Admin') return res.status(403).json({ message: 'Admin access required' });

    res.json({ inviteCode: project.inviteCode });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/projects/:id/invite-code/regenerate (Admin only)
router.post('/:id/invite-code/regenerate', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const role = getMemberRole(project, req.user._id);
    if (role !== 'Admin') return res.status(403).json({ message: 'Admin access required' });

    project.regenerateInviteCode();
    await project.save();
    res.json({ message: 'Invite code regenerated', inviteCode: project.inviteCode });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;