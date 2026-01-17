const express = require('express');
const router = express.Router();

const {
  createAssignment,
  publishAssignment,
  submitAssignment,
  getSubmissions,
  evaluateSubmission
} = require('../controllers/assignmentController');

const { protect, authorize } = require('../middleware/auth');

/**
 * @route   POST /api/assignments
 * @desc    Create assignment
 * @access  Teacher, Admin
 */
router.post(
  '/',
  protect,
  authorize('teacher', 'admin'),
  createAssignment
);

/**
 * @route   PUT /api/assignments/:id/publish
 * @desc    Publish assignment
 * @access  Teacher, Admin
 */
router.put(
  '/:id/publish',
  protect,
  authorize('teacher', 'admin'),
  publishAssignment
);


/**
 * @route   POST /api/assignments/:id/submit
 * @desc    Student submit assignment
 * @access  Student
 */
router.post(
  '/:id/submit',
  protect,
  authorize('student'),
  submitAssignment
);



/**
 * @route   GET /api/assignments/:id/submissions
 * @desc    Get all submissions (filter, search, pagination)
 * @access  Teacher, Admin
 */
router.get(
  '/:id/submissions',
  protect,
  authorize('teacher', 'admin'),
  getSubmissions
);

/**
 * @route   PUT /api/assignments/:assignmentId/submissions/:submissionId/evaluate
 * @desc    Evaluate a submission
 * @access  Teacher, Admin
 */
router.put(
  '/:assignmentId/submissions/:submissionId/evaluate',
  protect,
  authorize('teacher', 'admin'),
  evaluateSubmission
);

module.exports = router;
