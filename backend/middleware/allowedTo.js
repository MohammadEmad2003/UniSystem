module.exports = (...allowedRoles) => {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.currentUser.role)) {
      const err = new Error("You are not authorized to access this route");
      err.statusCode = 403;
      return next(err);
    }
    next();
  };
};