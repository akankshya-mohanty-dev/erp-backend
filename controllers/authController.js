const crypto = require('crypto');
const User = require('../models/User.model');
const Student = require('../models/Student.model');
const Teacher = require('../models/Teacher.model');
const Parent = require('../models/Parent.model');
const Institute = require('../models/Institute.model');
const AuditLog = require('../models/AuditLog.model');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/asyncHandler');
const { sendEmail } = require('../services/emailService');
const { sendSMS } = require('../services/smsService');
const logger = require('../utils/logger');

// Generate tokens and set cookies
const sendTokenResponse = (user, statusCode, res) => {
  // Create tokens
  const accessToken = user.getSignedJwtToken();
  const refreshToken = user.getRefreshToken();

  // Set cookie options
  const accessTokenOptions = {
    expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  };

  const refreshTokenOptions = {
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  };

  // Set cookies
  res.cookie('accessToken', accessToken, accessTokenOptions);
  res.cookie('refreshToken', refreshToken, refreshTokenOptions);

  // Remove password from output
  user.password = undefined;

  res.status(statusCode).json({
    success: true,
    accessToken,
    refreshToken,
    user: {
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.fullName,
      role: user.role,
      institute: user.institute,
      profilePhoto: user.profilePhoto,
      emailVerified: user.emailVerified,
      permissions: user.permissions
    }
  });
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = asyncHandler(async (req, res, next) => {
  const { email, password, role, instituteCode, ...userData } = req.body;

  // Validate required fields
  if (!email || !password || !role) {
    return next(new ErrorResponse('Please provide email, password and role', 400));
  }

  // Check if user exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return next(new ErrorResponse('User already exists', 400));
  }

  // Validate role
  const validRoles = ['super_admin', 'institute_admin', 'principal', 'hod', 'teacher', 'accountant', 'hr', 'support_staff', 'student', 'parent'];
  if (!validRoles.includes(role)) {
    return next(new ErrorResponse('Invalid role specified', 400));
  }

  // Handle institute validation for non-super admin
  let institute = null;
  if (role !== 'super_admin') {
    if (!instituteCode) {
      return next(new ErrorResponse('Institute code is required', 400));
    }

    institute = await Institute.findOne({ 
      code: instituteCode.toUpperCase(), 
      status: 'active' 
    });

    if (!institute) {
      return next(new ErrorResponse('Invalid institute code or institute is inactive', 400));
    }

    // Check user limit
    if (institute.subscription?.limits?.maxUsers) {
      const userCount = await User.countDocuments({ institute: institute._id });
      if (userCount >= institute.subscription.limits.maxUsers) {
        return next(new ErrorResponse('Institute user limit reached. Please contact administrator.', 400));
      }
    }

    userData.instituteCode = institute.code;
  }

  // Create user based on role
  let user;
  const userPayload = {
    ...userData,
    email,
    password,
    role,
    institute: institute?._id,
    isActive: role === 'student' || role === 'parent',
    emailVerified: false,
    createdBy: req.user?._id
  };

  switch (role) {
    case 'student':
      user = await Student.create(userPayload);
      break;
    
    case 'teacher':
      userPayload.isActive = false; // Teachers need approval
      userPayload.isApproved = false;
      user = await Teacher.create(userPayload);
      break;
    
    case 'parent':
      user = await Parent.create(userPayload);
      break;
    
    default:
      user = await User.create(userPayload);
  }

  // Generate verification token
  const verificationToken = user.getEmailVerificationToken();
  await user.save({ validateBeforeSave: false });

  // Send verification email
  const verificationUrl = `${process.env.FRONTEND_URL}/verify-email/${verificationToken}`;
  
  try {
    await sendEmail({
      email: user.email,
      subject: 'Verify Your Email - Education ERP',
      template: 'emailVerification',
      data: {
        name: user.firstName,
        verificationUrl,
        instituteName: institute?.name || 'Education ERP',
        supportEmail: process.env.SUPPORT_EMAIL
      }
    });

    // Log registration
    await AuditLog.logCreate('User', user._id, {
      email: user.email,
      role: user.role,
      institute: institute?._id
    }, req.user?._id, institute?._id, req.ip);

    res.status(201).json({
      success: true,
      message: 'Registration successful. Please check your email to verify your account.',
      data: {
        id: user._id,
        email: user.email,
        role: user.role,
        institute: institute?._id,
        requiresVerification: true
      }
    });

  } catch (error) {
    logger.error('Email sending error:', error);
    
    // Clean up user if email fails
    await User.findByIdAndDelete(user._id);
    
    return next(new ErrorResponse('Email could not be sent. Please try again.', 500));
  }
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = asyncHandler(async (req, res, next) => {
  const { email, password, instituteCode, role } = req.body;

  // Validate email & password
  if (!email || !password) {
    return next(new ErrorResponse('Please provide email and password', 400));
  }

  // Find user with password
  const user = await User.findOne({ email }).select('+password');
  
  if (!user) {
    return next(new ErrorResponse('Invalid credentials', 401));
  }

  // Check if account is locked
  if (user.isLocked()) {
    const lockTime = Math.ceil((user.lockUntil - Date.now()) / (60 * 1000));
    return next(new ErrorResponse(`Account is locked. Try again in ${lockTime} minutes.`, 423));
  }

  // Check if user is active
  if (!user.isActive) {
    return next(new ErrorResponse('Your account has been deactivated. Please contact administrator.', 401));
  }

  // Validate institute for non-super admin
  if (user.role !== 'super_admin') {
    if (!instituteCode) {
      return next(new ErrorResponse('Institute code is required', 400));
    }

    if (user.instituteCode !== instituteCode.toUpperCase()) {
      await user.incrementLoginAttempts();
      return next(new ErrorResponse('Invalid institute code', 401));
    }

    // Check if institute is active
    const institute = await Institute.findById(user.institute);
    if (!institute || institute.status !== 'active') {
      return next(new ErrorResponse('Institute is inactive or suspended', 401));
    }
  }

  // Check if password matches
  const isMatch = await user.matchPassword(password);
  
  if (!isMatch) {
    await user.incrementLoginAttempts();
    return next(new ErrorResponse('Invalid credentials', 401));
  }

  // Reset login attempts on successful login
  await user.resetLoginAttempts();

  // Update last login
  user.lastLogin = Date.now();
  await user.save({ validateBeforeSave: false });

  // Check if email is verified
  if (!user.emailVerified) {
    return res.status(200).json({
      success: true,
      requiresVerification: true,
      message: 'Please verify your email before logging in.',
      data: {
        id: user._id,
        email: user.email
      }
    });
  }

  // Check if password needs to be changed
  if (user.forcePasswordChange || user.passwordExpired) {
    return res.status(200).json({
      success: true,
      requiresPasswordChange: true,
      message: 'Please change your password.',
      data: {
        id: user._id,
        email: user.email
      }
    });
  }

  // Create token and send response
  sendTokenResponse(user, 200, res);

  // Log login
  await AuditLog.logLogin(user._id, req.ip, req.get('user-agent'), user.institute);
});

// @desc    Logout user / clear cookie
// @route   GET /api/auth/logout
// @access  Private
exports.logout = asyncHandler(async (req, res, next) => {
  // Clear cookies
  res.cookie('accessToken', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });

  res.cookie('refreshToken', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });

  // Log logout
  await AuditLog.logLogout(req.user._id, req.ip, req.user.institute);

  res.status(200).json({
    success: true,
    message: 'Logged out successfully'
  });
});

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id)
    .populate('institute', 'name code logo status')
    .select('-password -resetPasswordToken -resetPasswordExpire');

  if (!user) {
    return next(new ErrorResponse('User not found', 404));
  }

  res.status(200).json({
    success: true,
    data: user
  });
});

// @desc    Update user details
// @route   PUT /api/auth/updatedetails
// @access  Private
exports.updateDetails = asyncHandler(async (req, res, next) => {
  const fieldsToUpdate = {
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    phone: req.body.phone,
    email: req.body.email
  };

  // Remove undefined fields
  Object.keys(fieldsToUpdate).forEach(key => 
    fieldsToUpdate[key] === undefined && delete fieldsToUpdate[key]
  );

  const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
    new: true,
    runValidators: true
  }).select('-password -resetPasswordToken -resetPasswordExpire');

  // Log update
  await AuditLog.logUpdate('User', user._id, req.user, user, Object.keys(fieldsToUpdate), req.user._id, user.institute, req.ip);

  res.status(200).json({
    success: true,
    data: user
  });
});

// @desc    Update password
// @route   PUT /api/auth/updatepassword
// @access  Private
exports.updatePassword = asyncHandler(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return next(new ErrorResponse('Please provide current and new password', 400));
  }

  // Get user with password
  const user = await User.findById(req.user.id).select('+password');

  // Check current password
  const isMatch = await user.matchPassword(currentPassword);
  if (!isMatch) {
    return next(new ErrorResponse('Current password is incorrect', 401));
  }

  // Update password
  user.password = newPassword;
  user.forcePasswordChange = false;
  await user.save();

  // Log password change
  await AuditLog.log({
    entityType: 'User',
    entityId: user._id,
    action: 'update_password',
    performedBy: user._id,
    performedByName: user.fullName,
    performedByRole: user.role,
    institute: user.institute,
    metadata: {
      changedAt: new Date()
    }
  });

  sendTokenResponse(user, 200, res);
});

// @desc    Forgot password
// @route   POST /api/auth/forgotpassword
// @access  Public
exports.forgotPassword = asyncHandler(async (req, res, next) => {
  const { email, instituteCode } = req.body;

  if (!email) {
    return next(new ErrorResponse('Please provide email', 400));
  }

  const user = await User.findOne({ email });
  
  if (!user) {
    // Don't reveal that user doesn't exist
    return res.status(200).json({
      success: true,
      message: 'If an account exists with this email, you will receive a password reset link.'
    });
  }

  // Validate institute for non-super admin
  if (user.role !== 'super_admin') {
    if (!instituteCode) {
      return next(new ErrorResponse('Institute code is required', 400));
    }

    if (user.instituteCode !== instituteCode.toUpperCase()) {
      return next(new ErrorResponse('Invalid institute code', 400));
    }
  }

  // Generate reset token
  const resetToken = user.getResetPasswordToken();
  await user.save({ validateBeforeSave: false });

  // Create reset URL
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

  // Send email
  try {
    await sendEmail({
      email: user.email,
      subject: 'Password Reset Request - Education ERP',
      template: 'passwordReset',
      data: {
        name: user.firstName,
        resetUrl,
        expiryTime: '10 minutes',
        instituteName: user.institute?.name || 'Education ERP'
      }
    });

    res.status(200).json({
      success: true,
      message: 'Password reset email sent'
    });

  } catch (err) {
    logger.error('Password reset email error:', err);

    // Reset token if email fails
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save({ validateBeforeSave: false });

    return next(new ErrorResponse('Email could not be sent', 500));
  }
});

// @desc    Reset password
// @route   PUT /api/auth/resetpassword/:resettoken
// @access  Public
exports.resetPassword = asyncHandler(async (req, res, next) => {
  // Get hashed token
  const resetPasswordToken = crypto
    .createHash('sha256')
    .update(req.params.resettoken)
    .digest('hex');

  const user = await User.findOne({
    resetPasswordToken,
    resetPasswordExpire: { $gt: Date.now() }
  });

  if (!user) {
    return next(new ErrorResponse('Invalid or expired reset token', 400));
  }

  // Set new password
  user.password = req.body.password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  user.forcePasswordChange = false;
  await user.save();

  // Log password reset
  await AuditLog.log({
    entityType: 'User',
    entityId: user._id,
    action: 'reset_password',
    performedBy: user._id,
    performedByName: user.fullName,
    performedByRole: user.role,
    institute: user.institute,
    metadata: {
      resetMethod: 'token',
      resetAt: new Date()
    }
  });

  sendTokenResponse(user, 200, res);
});

// @desc    Verify email
// @route   GET /api/auth/verifyemail/:verificationtoken
// @access  Public
exports.verifyEmail = asyncHandler(async (req, res, next) => {
  // Get hashed token
  const emailVerificationToken = crypto
    .createHash('sha256')
    .update(req.params.verificationtoken)
    .digest('hex');

  const user = await User.findOne({
    emailVerificationToken,
    emailVerificationExpire: { $gt: Date.now() }
  });

  if (!user) {
    return next(new ErrorResponse('Invalid or expired verification token', 400));
  }

  // Mark email as verified
  user.emailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpire = undefined;
  await user.save();

  // Log email verification
  await AuditLog.log({
    entityType: 'User',
    entityId: user._id,
    action: 'verify_email',
    performedBy: user._id,
    performedByName: user.fullName,
    performedByRole: user.role,
    institute: user.institute,
    metadata: {
      verifiedAt: new Date()
    }
  });

  res.status(200).json({
    success: true,
    message: 'Email verified successfully. You can now login.'
  });
});

// @desc    Resend verification email
// @route   POST /api/auth/resendverification
// @access  Public
exports.resendVerification = asyncHandler(async (req, res, next) => {
  const { email, instituteCode } = req.body;

  if (!email) {
    return next(new ErrorResponse('Please provide email', 400));
  }

  const user = await User.findOne({ email });
  
  if (!user) {
    return next(new ErrorResponse('User not found', 404));
  }

  if (user.emailVerified) {
    return next(new ErrorResponse('Email is already verified', 400));
  }

  // Validate institute for non-super admin
  if (user.role !== 'super_admin') {
    if (!instituteCode) {
      return next(new ErrorResponse('Institute code is required', 400));
    }

    if (user.instituteCode !== instituteCode.toUpperCase()) {
      return next(new ErrorResponse('Invalid institute code', 400));
    }
  }

  // Generate new verification token
  const verificationToken = user.getEmailVerificationToken();
  await user.save({ validateBeforeSave: false });

  // Create verification URL
  const verificationUrl = `${process.env.FRONTEND_URL}/verify-email/${verificationToken}`;

  // Send email
  try {
    await sendEmail({
      email: user.email,
      subject: 'Resend: Verify Your Email - Education ERP',
      template: 'emailVerification',
      data: {
        name: user.firstName,
        verificationUrl,
        instituteName: user.institute?.name || 'Education ERP'
      }
    });

    res.status(200).json({
      success: true,
      message: 'Verification email sent'
    });

  } catch (err) {
    logger.error('Resend verification email error:', err);

    // Reset token if email fails
    user.emailVerificationToken = undefined;
    user.emailVerificationExpire = undefined;
    await user.save({ validateBeforeSave: false });

    return next(new ErrorResponse('Email could not be sent', 500));
  }
});

// @desc    Send OTP for login/verification
// @route   POST /api/auth/sendotp
// @access  Public
exports.sendOTP = asyncHandler(async (req, res, next) => {
  const { email, phone, purpose = 'login', instituteCode } = req.body;

  if (!email && !phone) {
    return next(new ErrorResponse('Please provide email or phone', 400));
  }

  // Find user
  let query = {};
  if (email) query.email = email;
  if (phone) query.phone = phone;

  const user = await User.findOne(query);
  
  if (!user) {
    // Don't reveal that user doesn't exist
    return res.status(200).json({
      success: true,
      message: 'If an account exists, you will receive an OTP.'
    });
  }

  // Validate institute for non-super admin
  if (user.role !== 'super_admin' && instituteCode) {
    if (user.instituteCode !== instituteCode.toUpperCase()) {
      return next(new ErrorResponse('Invalid institute code', 400));
    }
  }

  // Generate OTP
  const otp = user.generateOTP();
  await user.save({ validateBeforeSave: false });

  // Send OTP via email or SMS
  try {
    if (email) {
      await sendEmail({
        email: user.email,
        subject: `Your OTP for ${purpose} - Education ERP`,
        template: 'otp',
        data: {
          name: user.firstName,
          otp,
          purpose,
          expiryTime: '10 minutes',
          instituteName: user.institute?.name || 'Education ERP'
        }
      });
    }

    if (phone && process.env.SMS_ENABLED === 'true') {
      await sendSMS({
        to: user.phone,
        message: `Your OTP for ${purpose} is ${otp}. Valid for 10 minutes. - ${user.institute?.name || 'Education ERP'}`
      });
    }

    res.status(200).json({
      success: true,
      message: `OTP sent to your ${email ? 'email' : 'phone'}`,
      data: {
        otpMethod: email ? 'email' : 'sms',
        // In production, don't send OTP in response
        // otp: process.env.NODE_ENV === 'development' ? otp : undefined
      }
    });

  } catch (err) {
    logger.error('OTP sending error:', err);

    // Reset OTP if sending fails
    user.otp = undefined;
    user.otpExpire = undefined;
    await user.save({ validateBeforeSave: false });

    return next(new ErrorResponse('Failed to send OTP', 500));
  }
});

// @desc    Verify OTP
// @route   POST /api/auth/verifyotp
// @access  Public
exports.verifyOTP = asyncHandler(async (req, res, next) => {
  const { email, phone, otp, purpose = 'login' } = req.body;

  if (!otp) {
    return next(new ErrorResponse('Please provide OTP', 400));
  }

  // Find user
  let query = {};
  if (email) query.email = email;
  if (phone) query.phone = phone;

  const user = await User.findOne(query).select('+otp +otpExpire');
  
  if (!user) {
    return next(new ErrorResponse('Invalid OTP', 400));
  }

  // Hash provided OTP
  const hashedOTP = crypto
    .createHash('sha256')
    .update(otp)
    .digest('hex');

  // Check OTP
  if (hashedOTP !== user.otp) {
    return next(new ErrorResponse('Invalid OTP', 400));
  }

  // Check expiry
  if (user.otpExpire < Date.now()) {
    return next(new ErrorResponse('OTP has expired', 400));
  }

  // Clear OTP
  user.otp = undefined;
  user.otpExpire = undefined;

  // Handle based on purpose
  switch (purpose) {
    case 'login':
      // Complete login process
      user.lastLogin = Date.now();
      await user.save({ validateBeforeSave: false });
      
      sendTokenResponse(user, 200, res);
      break;

    case 'email_verification':
      user.emailVerified = true;
      await user.save({ validateBeforeSave: false });
      
      res.status(200).json({
        success: true,
        message: 'Email verified successfully'
      });
      break;

    case 'password_reset':
      // Allow password reset
      res.status(200).json({
        success: true,
        message: 'OTP verified. You can now reset your password.',
        data: {
          resetAllowed: true,
          userId: user._id
        }
      });
      break;

    default:
      res.status(200).json({
        success: true,
        message: 'OTP verified successfully'
      });
  }

  // Log OTP verification
  await AuditLog.log({
    entityType: 'User',
    entityId: user._id,
    action: 'verify_otp',
    actionDetails: `Purpose: ${purpose}`,
    performedBy: user._id,
    performedByName: user.fullName,
    performedByRole: user.role,
    institute: user.institute,
    metadata: {
      purpose,
      verifiedAt: new Date()
    }
  });
});

// @desc    Refresh access token
// @route   POST /api/auth/refresh
// @access  Public (with refresh token)
exports.refreshToken = asyncHandler(async (req, res, next) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return next(new ErrorResponse('Refresh token required', 400));
  }

  try {
    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    
    // Find user
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return next(new ErrorResponse('User not found', 404));
    }

    if (!user.isActive) {
      return next(new ErrorResponse('User account is deactivated', 401));
    }

    // Generate new tokens
    const newAccessToken = user.getSignedJwtToken();
    const newRefreshToken = user.getRefreshToken();

    // Set cookies
    const accessTokenOptions = {
      expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    };

    const refreshTokenOptions = {
      expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    };

    res.cookie('accessToken', newAccessToken, accessTokenOptions);
    res.cookie('refreshToken', newRefreshToken, refreshTokenOptions);

    res.status(200).json({
      success: true,
      accessToken: newAccessToken,
      refreshToken: newRefreshToken
    });

  } catch (error) {
    return next(new ErrorResponse('Invalid refresh token', 401));
  }
});

// @desc    Validate token
// @route   GET /api/auth/validate
// @access  Private
exports.validateToken = asyncHandler(async (req, res, next) => {
  res.status(200).json({
    success: true,
    valid: true,
    user: {
      id: req.user._id,
      email: req.user.email,
      role: req.user.role,
      institute: req.user.institute,
      permissions: req.user.permissions
    }
  });
});

// @desc    Get login activity
// @route   GET /api/auth/activity
// @access  Private
exports.getLoginActivity = asyncHandler(async (req, res, next) => {
  const { limit = 10, page = 1 } = req.query;
  const skip = (page - 1) * limit;

  const logs = await AuditLog.find({
    $or: [
      { entityType: 'User', entityId: req.user._id, action: 'login' },
      { entityType: 'User', entityId: req.user._id, action: 'logout' }
    ]
  })
  .sort({ timestamp: -1 })
  .skip(skip)
  .limit(parseInt(limit));

  const total = await AuditLog.countDocuments({
    $or: [
      { entityType: 'User', entityId: req.user._id, action: 'login' },
      { entityType: 'User', entityId: req.user._id, action: 'logout' }
    ]
  });

  res.status(200).json({
    success: true,
    count: logs.length,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    },
    data: logs
  });
});

// @desc    Change email
// @route   PUT /api/auth/changeemail
// @access  Private
exports.changeEmail = asyncHandler(async (req, res, next) => {
  const { newEmail, password } = req.body;

  if (!newEmail || !password) {
    return next(new ErrorResponse('Please provide new email and password', 400));
  }

  // Validate new email
  const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
  if (!emailRegex.test(newEmail)) {
    return next(new ErrorResponse('Please provide a valid email', 400));
  }

  // Check if new email already exists
  const existingUser = await User.findOne({ email: newEmail });
  if (existingUser) {
    return next(new ErrorResponse('Email already in use', 400));
  }

  // Get user with password
  const user = await User.findById(req.user.id).select('+password');

  // Verify password
  const isMatch = await user.matchPassword(password);
  if (!isMatch) {
    return next(new ErrorResponse('Password is incorrect', 401));
  }

  const oldEmail = user.email;
  
  // Update email
  user.email = newEmail;
  user.emailVerified = false;
  await user.save();

  // Generate verification token for new email
  const verificationToken = user.getEmailVerificationToken();
  await user.save({ validateBeforeSave: false });

  // Send verification email to new address
  const verificationUrl = `${process.env.FRONTEND_URL}/verify-email/${verificationToken}`;
  
  try {
    await sendEmail({
      email: newEmail,
      subject: 'Verify Your New Email - Education ERP',
      template: 'emailChangeVerification',
      data: {
        name: user.firstName,
        oldEmail,
        newEmail,
        verificationUrl,
        instituteName: user.institute?.name || 'Education ERP'
      }
    });

    // Also notify old email
    await sendEmail({
      email: oldEmail,
      subject: 'Email Change Notification - Education ERP',
      template: 'emailChangeNotification',
      data: {
        name: user.firstName,
        oldEmail,
        newEmail,
        changedAt: new Date().toLocaleString(),
        instituteName: user.institute?.name || 'Education ERP'
      }
    });

    // Log email change
    await AuditLog.log({
      entityType: 'User',
      entityId: user._id,
      action: 'change_email',
      actionDetails: `Changed from ${oldEmail} to ${newEmail}`,
      performedBy: user._id,
      performedByName: user.fullName,
      performedByRole: user.role,
      institute: user.institute,
      metadata: {
        oldEmail,
        newEmail,
        changedAt: new Date()
      }
    });

    res.status(200).json({
      success: true,
      message: 'Email changed successfully. Please verify your new email.',
      data: {
        email: newEmail,
        emailVerified: false
      }
    });

  } catch (error) {
    logger.error('Email change notification error:', error);
    
    // Revert changes if email fails
    user.email = oldEmail;
    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpire = undefined;
    await user.save({ validateBeforeSave: false });

    return next(new ErrorResponse('Failed to send verification email', 500));
  }
});

module.exports.sendTokenResponse = sendTokenResponse;