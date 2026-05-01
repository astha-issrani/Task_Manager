// middleware/requireAdmin.js
// Blocks access to routes unless the authenticated user has the global 'admin' role.
// Always use AFTER the `auth` middleware so req.user is already set.

const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

module.exports = requireAdmin;