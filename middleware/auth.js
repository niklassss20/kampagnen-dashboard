function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Nicht authentifiziert" });
  }
  return next();
}

module.exports = { requireAuth };
