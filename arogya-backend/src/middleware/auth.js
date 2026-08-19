const jwt = require("jsonwebtoken");
const config = require("../config");

function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or malformed Authorization header." });
  }
  const token = header.slice("Bearer ".length);
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    req.account = { id: payload.sub, accountType: payload.accountType };
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token." });
  }
}

// Restricts a route to specific account types (e.g. only doctors can create
// referrals; only care team members can acknowledge instructions).
function requireAccountType(...allowedTypes) {
  return (req, res, next) => {
    if (!req.account || !allowedTypes.includes(req.account.accountType)) {
      return res.status(403).json({ error: "This action is not available for your account type." });
    }
    next();
  };
}

module.exports = { requireAuth, requireAccountType };
