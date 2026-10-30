module.exports = (req, res, next) => {
  if (!req.session.businessId) {
    return res.status(401).json({ error: 'Please log in' });
  }

  next();
};