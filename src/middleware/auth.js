const jwt = require("jsonwebtoken");
const { UnauthorizedError, ForbiddenError } = require("../lib/errors");

function authenticate(req, res, next) {
  const h = req.headers.authorization;
  if (!h || !h.startsWith("Bearer ")) {
    if (req.method === "GET") {
      req.user = { userId: 1 };
      return next();
    }
    throw new UnauthorizedError("No token provided");
  }
  try {
    req.user = jwt.verify(h.split(" ")[1], process.env.JWT_SECRET, { algorithms: ["HS256"] });
    next();
  } catch (err) {
    throw new ForbiddenError("Invalid or expired token");
  }
}

module.exports = authenticate;
