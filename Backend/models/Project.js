const mongoose = require('mongoose');
const crypto = require('crypto');

const memberSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  role: {
    type: String,
    enum: ['Admin', 'Member'],
    default: 'Member'
  }
});

const projectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Project name is required'],
      trim: true,
      minlength: [3, 'Project name must be at least 3 characters']
    },
    description: {
      type: String,
      trim: true,
      default: ''
    },
    members: [memberSchema],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    color: {
      type: String,
      default: '#6366f1'
    },
    // Invite code for members to self-join via ProjectsPage
    inviteCode: {
      type: String,
      unique: true,
      sparse: true // allows null without unique conflict
    }
  },
  { timestamps: true }
);

// Auto-generate an invite code before first save
projectSchema.pre('save', function (next) {
  if (!this.inviteCode) {
    // Format: ABC-XXXXX  (3 letters + dash + 5 alphanumeric)
    const letters = crypto.randomBytes(3).toString('hex').toUpperCase().slice(0, 3);
    const suffix = crypto.randomBytes(4).toString('hex').toUpperCase().slice(0, 5);
    this.inviteCode = `${letters}-${suffix}`;
  }
  next();
});

// Helper to regenerate invite code
projectSchema.methods.regenerateInviteCode = function () {
  const letters = crypto.randomBytes(3).toString('hex').toUpperCase().slice(0, 3);
  const suffix = crypto.randomBytes(4).toString('hex').toUpperCase().slice(0, 5);
  this.inviteCode = `${letters}-${suffix}`;
};

// Virtual for task count
projectSchema.virtual('taskCount', {
  ref: 'Task',
  localField: '_id',
  foreignField: 'project',
  count: true
});

module.exports = mongoose.model('Project', projectSchema);