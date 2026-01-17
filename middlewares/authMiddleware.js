const jwt = require('jsonwebtoken');
const User = require('../models/User.model');
const ErrorResponse = require('../utils/errorResponse');

exports.protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return next(new ErrorResponse('Not authorized to access this route', 401));
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from token
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return next(new ErrorResponse('User not found', 404));
    }

    if (!user.isActive) {
      return next(new ErrorResponse('User account is deactivated', 401));
    }

    req.user = user;
    next();
  } catch (err) {
    return next(new ErrorResponse('Not authorized to access this route', 401));
  }
};

exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new ErrorResponse(
          `User role ${req.user.role} is not authorized to access this route`,
          403
        )
      );
    }
    next();
  };
};

// Check if user belongs to institute
exports.checkInstituteAccess = async (req, res, next) => {
  try {
    // Super admin can access all
    if (req.user.role === 'super_admin') {
      return next();
    }

    // Check if user belongs to the requested institute
    const instituteId = req.params.instituteId || req.body.institute || req.query.institute;
    
    if (!instituteId) {
      return next(new ErrorResponse('Institute ID is required', 400));
    }

    if (req.user.institute.toString() !== instituteId.toString()) {
      return next(new ErrorResponse('Not authorized to access this institute', 403));
    }

    next();
  } catch (error) {
    next(error);
  }
};