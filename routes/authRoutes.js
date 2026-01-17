const express = require('express');
const router = express.Router();
const {
  register,
  login,
  logout,
  getMe,
  updateDetails,
  updatePassword,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
  sendOTP,
  verifyOTP,
  refreshToken,
  validateToken,
  getLoginActivity,
  changeEmail
} = require('../controllers/authController');
const { protect, authorize } = require('../middleware/auth');

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/forgotpassword', forgotPassword);
router.put('/resetpassword/:resettoken', resetPassword);
router.get('/verifyemail/:verificationtoken', verifyEmail);
router.post('/resendverification', resendVerification);
router.post('/sendotp', sendOTP);
router.post('/verifyotp', verifyOTP);
router.post('/refresh', refreshToken);

// Protected routes (require authentication)
router.get('/logout', protect, logout);
router.get('/me', protect, getMe);
router.put('/updatedetails', protect, updateDetails);
router.put('/updatepassword', protect, updatePassword);
router.get('/validate', protect, validateToken);
router.get('/activity', protect, getLoginActivity);
router.put('/changeemail', protect, changeEmail);

// Admin only routes
router.get('/admin/users', protect, authorize('super_admin', 'institute_admin'), getUsers);
router.get('/admin/users/:id', protect, authorize('super_admin', 'institute_admin'), getUser);
router.put('/admin/users/:id', protect, authorize('super_admin', 'institute_admin'), updateUser);
router.delete('/admin/users/:id', protect, authorize('super_admin', 'institute_admin'), deleteUser);
router.put('/admin/users/:id/activate', protect, authorize('super_admin', 'institute_admin'), activateUser);
router.put('/admin/users/:id/deactivate', protect, authorize('super_admin', 'institute_admin'), deactivateUser);
router.put('/admin/users/:id/resetpassword', protect, authorize('super_admin', 'institute_admin'), resetPassword);

module.exports = router;