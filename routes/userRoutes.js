const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const User = require('../models/User');
const { protect, authorize } = require('../middlewares/auth');

// ========== VALIDATION MIDDLEWARE ==========
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }
  next();
};

// ========== PUBLIC ROUTES ==========

// @route   POST /api/users/register
// @desc    Register a new user
// @access  Public
router.post('/register', 
  [
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('firstName').notEmpty().withMessage('First name is required'),
    body('lastName').notEmpty().withMessage('Last name is required'),
    body('role').isIn([
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
    ]).withMessage('Invalid role'),
    body('phone').optional().isMobilePhone().withMessage('Invalid phone number'),
    validateRequest
  ],
  async (req, res) => {
    try {
      const { 
        email, 
        password, 
        firstName, 
        lastName, 
        role, 
        institute,
        phone,
        ...otherData 
      } = req.body;

      // Check if user already exists
      let user = await User.findOne({ email });
      if (user) {
        return res.status(400).json({
          success: false,
          message: 'User already exists with this email'
        });
      }

      // Create user
      user = await User.create({
        email,
        password,
        firstName,
        lastName,
        role,
        institute: role !== 'super_admin' ? institute : undefined,
        phone,
        ...otherData,
        createdBy: req.user?._id || null
      });

      // Generate token
      const token = user.generateAuthToken();

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        token,
        data: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          isVerified: user.isVerified,
          createdAt: user.createdAt
        }
      });

    } catch (error) {
      console.error(error);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
      });
    }
  }
);

// @route   POST /api/users/login
// @desc    Login user
// @access  Public
router.post('/login',
  [
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('password').notEmpty().withMessage('Password is required'),
    validateRequest
  ],
  async (req, res) => {
    try {
      const { email, password } = req.body;

      // Check if user exists
      const user = await User.findOne({ email }).select('+password +loginAttempts +lockUntil');
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      // Check if account is locked
      if (user.isLocked()) {
        return res.status(423).json({
          success: false,
          message: 'Account is locked. Please try again later'
        });
      }

      // Check if user is active
      if (!user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'Account is deactivated. Please contact administrator'
        });
      }

      // Check if user is deleted
      if (user.isDeleted) {
        return res.status(401).json({
          success: false,
          message: 'Account has been deleted'
        });
      }

      // Check password
      const isPasswordCorrect = await user.matchPassword(password);
      
      if (!isPasswordCorrect) {
        // Increment login attempts
        await user.incrementLoginAttempts();
        
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      // Reset login attempts
      await user.resetLoginAttempts();

      // Update last login
      user.lastLogin = Date.now();
      await user.save({ validateBeforeSave: false });

      // Generate token
      const token = user.generateAuthToken();
      const refreshToken = user.generateRefreshToken();

      res.status(200).json({
        success: true,
        message: 'Login successful',
        token,
        refreshToken,
        data: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          fullName: user.fullName,
          role: user.role,
          roleDisplay: user.roleDisplay,
          institute: user.institute,
          isVerified: user.isVerified,
          lastLogin: user.lastLogin,
          accessibleModules: user.getAccessibleModules()
        }
      });

    } catch (error) {
      console.error(error);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
      });
    }
  }
);

// @route   POST /api/users/forgot-password
// @desc    Forgot password - send reset email
// @access  Public
router.post('/forgot-password',
  [
    body('email').isEmail().withMessage('Please provide a valid email'),
    validateRequest
  ],
  async (req, res) => {
    try {
      const { email } = req.body;

      const user = await User.findOne({ email });
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found with this email'
        });
      }

      // Generate reset token
      const resetToken = user.createResetPasswordToken();
      await user.save({ validateBeforeSave: false });

      // In production, send email here
      const resetUrl = `${req.protocol}://${req.get('host')}/api/users/reset-password/${resetToken}`;

      res.status(200).json({
        success: true,
        message: 'Password reset email sent',
        resetToken: resetToken, // Only for testing, remove in production
        resetUrl: resetUrl // Only for testing
      });

    } catch (error) {
      console.error(error);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
      });
    }
  }
);

// @route   PUT /api/users/reset-password/:token
// @desc    Reset password
// @access  Public
router.put('/reset-password/:token',
  [
    param('token').notEmpty().withMessage('Token is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    validateRequest
  ],
  async (req, res) => {
    try {
      const { token } = req.params;
      const { password } = req.body;

      // Hash token
      const crypto = require('crypto');
      const hashedToken = crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');

      // Find user by token
      const user = await User.findOne({
        resetPasswordToken: hashedToken,
        resetPasswordExpire: { $gt: Date.now() }
      });

      if (!user) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or expired token'
        });
      }

      // Set new password
      user.password = password;
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save();

      // Generate new token
      const newToken = user.generateAuthToken();

      res.status(200).json({
        success: true,
        message: 'Password reset successful',
        token: newToken
      });

    } catch (error) {
      console.error(error);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
      });
    }
  }
);

// ========== PROTECTED ROUTES ==========

// All routes below require authentication
router.use(protect);

// @route   GET /api/users/me
// @desc    Get current user profile
// @access  Private
router.get('/me', async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('-password -resetPasswordToken -resetPasswordExpire -loginAttempts -lockUntil')
      .populate('institute', 'name code');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: user
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   PUT /api/users/me
// @desc    Update current user profile
// @access  Private
router.put('/me',
  [
    body('firstName').optional().trim().notEmpty().withMessage('First name cannot be empty'),
    body('lastName').optional().trim().notEmpty().withMessage('Last name cannot be empty'),
    body('phone').optional().isMobilePhone().withMessage('Invalid phone number'),
    body('gender').optional().isIn(['male', 'female', 'other', 'prefer-not-to-say']),
    body('preferences.language').optional().isIn(['en', 'hi', 'es', 'fr', 'de', 'zh', 'ar']),
    body('preferences.theme').optional().isIn(['light', 'dark', 'auto']),
    validateRequest
  ],
  async (req, res) => {
    try {
      const updates = {
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        phone: req.body.phone,
        gender: req.body.gender,
        dateOfBirth: req.body.dateOfBirth,
        profilePhoto: req.body.profilePhoto,
        preferences: req.body.preferences,
        updatedBy: req.user.id
      };

      // Remove undefined fields
      Object.keys(updates).forEach(key => {
        if (updates[key] === undefined) {
          delete updates[key];
        }
      });

      const user = await User.findByIdAndUpdate(
        req.user.id,
        updates,
        { new: true, runValidators: true }
      ).select('-password');

      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: user
      });

    } catch (error) {
      console.error(error);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
      });
    }
  }
);

// @route   PUT /api/users/change-password
// @desc    Change current user password
// @access  Private
router.put('/change-password',
  [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
    validateRequest
  ],
  async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;

      // Get user with password
      const user = await User.findById(req.user.id).select('+password');

      // Check current password
      const isPasswordCorrect = await user.matchPassword(currentPassword);
      if (!isPasswordCorrect) {
        return res.status(401).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }

      // Update password
      user.password = newPassword;
      await user.save();

      // Generate new token
      const token = user.generateAuthToken();

      res.status(200).json({
        success: true,
        message: 'Password changed successfully',
        token
      });

    } catch (error) {
      console.error(error);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
      });
    }
  }
);

// ========== ADMIN ROUTES ==========

// All routes below require admin role
router.use(authorize('super_admin', 'institute_admin'));

// @route   GET /api/users
// @desc    Get all users (with pagination, filtering, searching)
// @access  Private/Admin
router.get('/',
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('role').optional().isIn([
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
    ]),
    query('isActive').optional().isBoolean().toBoolean(),
    query('search').optional().trim(),
    query('sortBy').optional().isIn(['createdAt', 'firstName', 'lastName', 'email', 'role']),
    query('sortOrder').optional().isIn(['asc', 'desc']),
    validateRequest
  ],
  async (req, res) => {
    try {
      const {
        page = 1,
        limit = 10,
        role,
        isActive,
        search,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      // Build query
      const query = {};

      // Add role filter
      if (role) query.role = role;

      // Add active filter
      if (isActive !== undefined) query.isActive = isActive;

      // Add search filter
      if (search) {
        query.$or = [
          { email: { $regex: search, $options: 'i' } },
          { firstName: { $regex: search, $options: 'i' } },
          { lastName: { $regex: search, $options: 'i' } },
          { fullName: { $regex: search, $options: 'i' } }
        ];
      }

      // Institute admin can only see users from their institute
      if (req.user.role === 'institute_admin') {
        query.institute = req.user.institute;
      }

      // Pagination
      const skip = (page - 1) * limit;

      // Sorting
      const sort = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

      // Execute query
      const users = await User.find(query)
        .select('-password -resetPasswordToken -resetPasswordExpire')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('institute', 'name code')
        .populate('createdBy', 'firstName lastName email')
        .populate('updatedBy', 'firstName lastName email');

      // Get total count
      const total = await User.countDocuments(query);

      res.status(200).json({
        success: true,
        count: users.length,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / limit)
        },
        data: users
      });

    } catch (error) {
      console.error(error);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
      });
    }
  }
);

// @route   GET /api/users/:id
// @desc    Get user by ID
// @access  Private/Admin
router.get('/:id',
  [
    param('id').isMongoId().withMessage('Invalid user ID'),
    validateRequest
  ],
  async (req, res) => {
    try {
      const user = await User.findById(req.params.id)
        .select('-password -resetPasswordToken -resetPasswordExpire')
        .populate('institute', 'name code')
        .populate('createdBy', 'firstName lastName email')
        .populate('updatedBy', 'firstName lastName email');

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Institute admin can only see users from their institute
      if (req.user.role === 'institute_admin' && user.institute.toString() !== req.user.institute.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to view this user'
        });
      }

      res.status(200).json({
        success: true,
        data: user
      });

    } catch (error) {
      console.error(error);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
      });
    }
  }
);

// @route   POST /api/users
// @desc    Create a new user (Admin only)
// @access  Private/Admin
router.post('/',
  [
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('firstName').notEmpty().withMessage('First name is required'),
    body('lastName').notEmpty().withMessage('Last name is required'),
    body('role').isIn([
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
    ]).withMessage('Invalid role'),
    body('phone').optional().isMobilePhone().withMessage('Invalid phone number'),
    body('isActive').optional().isBoolean(),
    validateRequest
  ],
  async (req, res) => {
    try {
      const { 
        email, 
        password, 
        firstName, 
        lastName, 
        role, 
        institute,
        phone,
        isActive = true,
        ...otherData 
      } = req.body;

      // Check if user already exists
      let existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'User already exists with this email'
        });
      }

      // Set institute for non-super_admin users
      let userInstitute = institute;
      if (role !== 'super_admin') {
        if (!institute) {
          userInstitute = req.user.institute; // Use admin's institute
        }
        
        // Institute admin can only create users for their institute
        if (req.user.role === 'institute_admin' && userInstitute.toString() !== req.user.institute.toString()) {
          return res.status(403).json({
            success: false,
            message: 'You can only create users for your institute'
          });
        }
      }

      // Create user
      const user = await User.create({
        email,
        password,
        firstName,
        lastName,
        role,
        institute: userInstitute,
        phone,
        isActive,
        ...otherData,
        createdBy: req.user.id
      });

      res.status(201).json({
        success: true,
        message: 'User created successfully',
        data: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          isActive: user.isActive,
          createdAt: user.createdAt
        }
      });

    } catch (error) {
      console.error(error);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
      });
    }
  }
);

// @route   PUT /api/users/:id
// @desc    Update user by ID
// @access  Private/Admin
router.put('/:id',
  [
    param('id').isMongoId().withMessage('Invalid user ID'),
    body('firstName').optional().trim().notEmpty(),
    body('lastName').optional().trim().notEmpty(),
    body('phone').optional().isMobilePhone(),
    body('role').optional().isIn([
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
    ]),
    body('isActive').optional().isBoolean(),
    validateRequest
  ],
  async (req, res) => {
    try {
      const user = await User.findById(req.params.id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Institute admin can only update users from their institute
      if (req.user.role === 'institute_admin' && user.institute.toString() !== req.user.institute.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to update this user'
        });
      }

      // Super admin cannot be updated by institute admin
      if (req.user.role === 'institute_admin' && user.role === 'super_admin') {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to update super admin'
        });
      }

      // Prepare update data
      const updateData = {
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        phone: req.body.phone,
        gender: req.body.gender,
        dateOfBirth: req.body.dateOfBirth,
        profilePhoto: req.body.profilePhoto,
        role: req.body.role,
        isActive: req.body.isActive,
        permissions: req.body.permissions,
        preferences: req.body.preferences,
        updatedBy: req.user.id
      };

      // Remove undefined fields
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined) {
          delete updateData[key];
        }
      });

      // Update user
      const updatedUser = await User.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true, runValidators: true }
      ).select('-password');

      res.status(200).json({
        success: true,
        message: 'User updated successfully',
        data: updatedUser
      });

    } catch (error) {
      console.error(error);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
      });
    }
  }
);

// @route   DELETE /api/users/:id
// @desc    Delete user by ID (soft delete)
// @access  Private/Admin
router.delete('/:id',
  [
    param('id').isMongoId().withMessage('Invalid user ID'),
    validateRequest
  ],
  async (req, res) => {
    try {
      const user = await User.findById(req.params.id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Cannot delete yourself
      if (user._id.toString() === req.user.id) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete your own account'
        });
      }

      // Institute admin can only delete users from their institute
      if (req.user.role === 'institute_admin' && user.institute.toString() !== req.user.institute.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to delete this user'
        });
      }

      // Super admin cannot be deleted by institute admin
      if (req.user.role === 'institute_admin' && user.role === 'super_admin') {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to delete super admin'
        });
      }

      // Soft delete
      await user.softDelete(req.user.id);

      res.status(200).json({
        success: true,
        message: 'User deleted successfully'
      });

    } catch (error) {
      console.error(error);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
      });
    }
  }
);

// @route   PUT /api/users/:id/restore
// @desc    Restore soft-deleted user
// @access  Private/Admin
router.put('/:id/restore',
  [
    param('id').isMongoId().withMessage('Invalid user ID'),
    validateRequest
  ],
  async (req, res) => {
    try {
      const user = await User.findById(req.params.id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Restore user
      await user.restore();

      res.status(200).json({
        success: true,
        message: 'User restored successfully',
        data: user
      });

    } catch (error) {
      console.error(error);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
      });
    }
  }
);

// @route   GET /api/users/stats
// @desc    Get user statistics
// @access  Private/Admin
router.get('/stats', async (req, res) => {
  try {
    let instituteId = null;
    
    // Institute admin can only see stats for their institute
    if (req.user.role === 'institute_admin') {
      instituteId = req.user.institute;
    }

    const stats = await User.getUserStats(instituteId);
    const totalActive = await User.getActiveUsersCount(instituteId);
    const recentUsers = await User.getRecentUsers(5, instituteId);

    res.status(200).json({
      success: true,
      data: {
        stats,
        totalActive,
        recentUsers
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/users/search/quick
// @desc    Quick search users
// @access  Private/Admin
router.get('/search/quick',
  [
    query('q').notEmpty().withMessage('Search query is required'),
    query('limit').optional().isInt({ min: 1, max: 50 }).toInt(),
    validateRequest
  ],
  async (req, res) => {
    try {
      const { q, limit = 10 } = req.query;
      let instituteId = null;

      if (req.user.role === 'institute_admin') {
        instituteId = req.user.institute;
      }

      const users = await User.searchUsers(q, {
        instituteId,
        limit
      });

      res.status(200).json({
        success: true,
        count: users.length,
        data: users
      });

    } catch (error) {
      console.error(error);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
      });
    }
  }
);

module.exports = router;