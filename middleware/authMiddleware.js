const jwt = require("jsonwebtoken");

// Middleware to verify token and check roles
const verifyToken = (roles = []) => {
  return (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ success: false, message: "Access Denied: No token provided" });
      }

      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      req.user = decoded; // Attach user info to request

      // Check if the route requires specific roles
      if (roles.length && !roles.includes(req.user.role)) {
        return res.status(403).json({ success: false, message: "Forbidden: Insufficient permissions" });
      }

      next();
    } catch (err) {
      return res.status(401).json({ success: false, message: "Invalid or Expired Token" });
    }
  };
};

module.exports = { verifyToken };
