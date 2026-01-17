const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const UserSchema = new mongoose.Schema({
  // Authentication
  email: {
    type: String,
    required: [true, 'Please add an email'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email'
    ]
  },
  username: {
    type: String,
    unique: true,
    sparse: true,
    trim: true
  },
  password: {
    type: String,
    required: [true, 'Please add a password'],
    minlength: 6,
    select: false
  },
  
  // Personal Information
  firstName: {
    type: String,
    required: [true, 'Please add first name'],
    trim: true,
    maxlength: [50, 'First name cannot exceed 50 characters']
  },
  lastName: {
    type: String,
    required: [true, 'Please add last name'],
    trim: true,
    maxlength: [50, 'Last name cannot exceed 50 characters']
  },
  fullName: String,
  phone: {
    type: String,
    trim: true,
    match: [/^[\+]?[1-9][\d]{0,15}$/, 'Please add a valid phone number']
  },
  profilePhoto: {
    type: String,
    default: 'default-avatar.png'
  },
  dateOfBirth: Date,
  gender: {
    type: String,
    enum: ['male', 'female', 'other', 'prefer-not-to-say'],
    default: 'prefer-not-to-say'
  },
  
  // Role & Access
  role: {
    type: String,
    enum: [
      'super_admin',
      'institute_admin',
      'director',
      'principal',
      'hod',
      'teacher',
      'accountant',
      'hr',
      'support_staff',
      'student',
      'parent'
    ],
    required: true
  },
  institute: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Institute',
    required: function() { return this.role !== 'super_admin'; }
  },
  
  // Status & Security
  isActive: {
    type: Boolean,
    default: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  lastLogin: Date,
  forcePasswordChange: {
    type: Boolean,
    default: false
  },
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: Date,
  
  // Password Management
  passwordChangedAt: Date,
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  verificationToken: String,
  verificationTokenExpire: Date,
  
  // Permissions
  permissions: [{
    module: String,
    actions: [String]
  }],
  
  // Preferences
  preferences: {
    language: {
      type: String,
      default: 'en',
      enum: ['en', 'hi', 'es', 'fr', 'de', 'zh', 'ar']
    },
    timezone: {
      type: String,
      default: 'UTC'
    },
    theme: {
      type: String,
      default: 'light',
      enum: ['light', 'dark', 'auto']
    },
    notifications: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      sms: { type: Boolean, default: false }
    }
  },
  
  // Audit Trail
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Soft Delete
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: Date,
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
  
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ========== MIDDLEWARE ==========

// Set full name before saving
UserSchema.pre('save', function(next) {
  if (this.firstName && this.lastName) {
    this.fullName = `${this.firstName} ${this.lastName}`;
  }
  
  // Auto generate username if not provided
  if (!this.username && this.email) {
    this.username = this.email.split('@')[0];
  }
  
  next();
});

// Encrypt password before saving
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    
    // Set password changed at
    if (!this.isNew) {
      this.passwordChangedAt = Date.now() - 1000;
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

// Filter out deleted users
UserSchema.pre(/^find/, function(next) {
  if (this.getQuery().isDeleted === undefined) {
    this.find({ isDeleted: { $ne: true } });
  }
  next();
});

// ========== VIRTUAL PROPERTIES ==========

UserSchema.virtual('displayName').get(function() {
  return this.fullName || this.firstName || this.username || this.email.split('@')[0];
});

UserSchema.virtual('roleDisplay').get(function() {
  const roleNames = {
    'super_admin': 'Super Administrator',
    'institute_admin': 'Institute Administrator',
    'director': 'Director',
    'principal': 'Principal',
    'hod': 'Head of Department',
    'teacher': 'Teacher',
    'accountant': 'Accountant',
    'hr': 'HR Manager',
    'support_staff': 'Support Staff',
    'student': 'Student',
    'parent': 'Parent'
  };
  return roleNames[this.role] || this.role;
});

// ========== INSTANCE METHODS ==========

// Generate JWT Token
UserSchema.methods.generateAuthToken = function() {
  return jwt.sign(
    { 
      id: this._id, 
      role: this.role, 
      institute: this.institute,
      email: this.email 
    },
    process.env.JWT_SECRET || 'your_jwt_secret',
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

// Generate Refresh Token
UserSchema.methods.generateRefreshToken = function() {
  return jwt.sign(
    { id: this._id },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + '_refresh',
    { expiresIn: process.env.JWT_REFRESH_EXPIRE || '30d' }
  );
};

// Match Password
UserSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Check Password Changed After
UserSchema.methods.changedPasswordAfter = function(JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

// Generate Reset Token
UserSchema.methods.createResetPasswordToken = function() {
  const resetToken = crypto.randomBytes(32).toString('hex');
  
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  
  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
  
  return resetToken;
};

// Generate Verification Token
UserSchema.methods.createVerificationToken = function() {
  const verificationToken = crypto.randomBytes(32).toString('hex');
  
  this.verificationToken = crypto
    .createHash('sha256')
    .update(verificationToken)
    .digest('hex');
  
  this.verificationTokenExpire = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  
  return verificationToken;
};

// Check if Account is Locked
UserSchema.methods.isLocked = function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
};

// Increment Login Attempts
UserSchema.methods.incrementLoginAttempts = async function() {
  this.loginAttempts += 1;
  
  if (this.loginAttempts >= 5 && !this.isLocked()) {
    this.lockUntil = Date.now() + 60 * 60 * 1000; // 1 hour
  }
  
  await this.save({ validateBeforeSave: false });
};

// Reset Login Attempts
UserSchema.methods.resetLoginAttempts = async function() {
  this.loginAttempts = 0;
  this.lockUntil = undefined;
  await this.save({ validateBeforeSave: false });
};

// Check Permission
UserSchema.methods.hasPermission = function(module, action) {
  if (this.role === 'super_admin' || this.role === 'institute_admin') {
    return true;
  }
  
  const permission = this.permissions.find(p => p.module === module);
  if (!permission) return false;
  
  return permission.actions.includes(action);
};

// Get Accessible Modules
UserSchema.methods.getAccessibleModules = function() {
  const baseModules = ['dashboard', 'profile', 'notifications'];
  const roleModules = {
    'super_admin': ['dashboard', 'users', 'institutes', 'settings', 'reports'],
    'institute_admin': ['dashboard', 'students', 'teachers', 'classes', 'attendance', 'fees'],
    'teacher': ['dashboard', 'classes', 'attendance', 'marks', 'timetable'],
    'student': ['dashboard', 'attendance', 'marks', 'timetable', 'fees'],
    'parent': ['dashboard', 'children', 'attendance', 'marks', 'fees']
  };
  
  const modules = roleModules[this.role] || [];
  return [...new Set([...baseModules, ...modules])];
};

// Soft Delete User
UserSchema.methods.softDelete = async function(deletedBy) {
  this.isDeleted = true;
  this.deletedAt = Date.now();
  this.deletedBy = deletedBy;
  this.isActive = false;
  return this.save({ validateBeforeSave: false });
};

// Restore User
UserSchema.methods.restore = async function() {
  this.isDeleted = false;
  this.deletedAt = undefined;
  this.deletedBy = undefined;
  this.isActive = true;
  return this.save({ validateBeforeSave: false });
};

// ========== STATIC METHODS ==========

// Find by Email or Username
UserSchema.statics.findByEmailOrUsername = function(identifier) {
  return this.findOne({
    $or: [
      { email: identifier },
      { username: identifier }
    ]
  });
};

// Get User Statistics
UserSchema.statics.getUserStats = async function(instituteId) {
  const matchStage = instituteId 
    ? { institute: mongoose.Types.ObjectId(instituteId) }
    : {};
  
  return await this.aggregate([
    {
      $match: {
        ...matchStage,
        isDeleted: { $ne: true }
      }
    },
    {
      $group: {
        _id: '$role',
        total: { $sum: 1 },
        active: { $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] } },
        verified: { $sum: { $cond: [{ $eq: ['$isVerified', true] }, 1, 0] } }
      }
    },
    {
      $project: {
        role: '$_id',
        total: 1,
        active: 1,
        inactive: { $subtract: ['$total', '$active'] },
        verified: 1,
        unverified: { $subtract: ['$total', '$verified'] }
      }
    }
  ]);
};

// Search Users
UserSchema.statics.searchUsers = async function(searchTerm, options = {}) {
  const { 
    instituteId, 
    role, 
    isActive,
    page = 1,
    limit = 20
  } = options;
  
  const query = {
    isDeleted: { $ne: true },
    $or: [
      { email: { $regex: searchTerm, $options: 'i' } },
      { username: { $regex: searchTerm, $options: 'i' } },
      { firstName: { $regex: searchTerm, $options: 'i' } },
      { lastName: { $regex: searchTerm, $options: 'i' } },
      { fullName: { $regex: searchTerm, $options: 'i' } }
    ]
  };
  
  if (instituteId) query.institute = instituteId;
  if (role) query.role = role;
  if (isActive !== undefined) query.isActive = isActive;
  
  const skip = (page - 1) * limit;
  
  return await this.find(query)
    .select('-password -resetPasswordToken -resetPasswordExpire -loginAttempts -lockUntil')
    .skip(skip)
    .limit(limit)
    .populate('institute', 'name code')
    .populate('createdBy', 'firstName lastName email')
    .populate('updatedBy', 'firstName lastName email');
};

// Get Active Users Count
UserSchema.statics.getActiveUsersCount = async function(instituteId) {
  const query = {
    isActive: true,
    isDeleted: { $ne: true }
  };
  
  if (instituteId) query.institute = instituteId;
  
  return await this.countDocuments(query);
};

// Get Recent Users
UserSchema.statics.getRecentUsers = async function(limit = 10, instituteId) {
  const query = {
    isDeleted: { $ne: true }
  };
  
  if (instituteId) query.institute = instituteId;
  
  return await this.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .select('firstName lastName email role createdAt');
};

// ========== INDEXES ==========

UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ username: 1 }, { unique: true, sparse: true });
UserSchema.index({ role: 1 });
UserSchema.index({ institute: 1 });
UserSchema.index({ isActive: 1 });
UserSchema.index({ isDeleted: 1 });
UserSchema.index({ createdAt: -1 });
UserSchema.index({ fullName: 'text', email: 'text', username: 'text' });

module.exports = mongoose.model('User', UserSchema);