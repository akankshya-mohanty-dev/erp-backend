const Assignment = require('../models/Assignment');
const Class = require('../models/Class');
const asyncHandler = require('../middleware/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');


exports.createAssignment = asyncHandler(async (req, res, next) => {
  req.body.institute = req.user.institute;
  req.body.teacher = req.user._id;

  const assignment = await Assignment.create(req.body);

  res.status(201).json({
    success: true,
    data: assignment
  });
});

exports.publishAssignment = asyncHandler(async (req, res, next) => {
  const assignment = await Assignment.findById(req.params.id);

  if (!assignment) {
    return next(new ErrorResponse('Assignment not found', 404));
  }

  assignment.status = 'published';
  assignment.isPublished = true;
  assignment.publishedAt = new Date();

  await assignment.save();

  res.status(200).json({
    success: true,
    message: 'Assignment published successfully'
  });
});


exports.submitAssignment = asyncHandler(async (req, res, next) => {
  const assignment = await Assignment.findById(req.params.id);

  if (!assignment || !assignment.isPublished) {
    return next(new ErrorResponse('Assignment not available', 404));
  }

  const alreadySubmitted = assignment.hasStudentSubmitted(req.user._id);

  if (alreadySubmitted && !assignment.allowResubmission) {
    return next(new ErrorResponse('Resubmission not allowed', 400));
  }

  const submissionStatus =
    assignment.allowLateSubmission && new Date() > assignment.dueDate
      ? 'late'
      : 'submitted';

  if (alreadySubmitted) {
    const submission = assignment.getStudentSubmission(req.user._id);
    submission.files = req.body.files || submission.files;
    submission.textSubmission = req.body.textSubmission;
    submission.resubmissionCount += 1;
    submission.submissionStatus = 'resubmitted';
    submission.submittedAt = new Date();
  } else {
    assignment.submissions.push({
      student: req.user._id,
      files: req.body.files,
      textSubmission: req.body.textSubmission,
      submissionStatus
    });
  }

  await assignment.save();

  res.status(200).json({
    success: true,
    message: 'Assignment submitted successfully'
  });
});


exports.getSubmissions = asyncHandler(async (req, res, next) => {
  const {
    page = 1,
    limit = 10,
    status,
    search,
    sortBy = 'submittedAt',
    sortOrder = 'desc'
  } = req.query;

  const assignment = await Assignment.findById(req.params.id)
    .populate('submissions.student', 'firstName lastName rollNumber email')
    .populate('submissions.evaluatedBy', 'firstName lastName');

  if (!assignment) {
    return next(new ErrorResponse('Assignment not found', 404));
  }

  if (assignment.institute.toString() !== req.user.institute.toString()) {
    return next(new ErrorResponse('Unauthorized', 403));
  }

  let submissions = [...assignment.submissions];

  /* ---------- STATUS FILTER ---------- */
  if (status === 'submitted') {
    submissions = submissions.filter(s => s.submissionStatus === 'submitted');
  }

  if (status === 'late') {
    submissions = submissions.filter(s => s.submissionStatus === 'late');
  }

  if (status === 'evaluated') {
    submissions = submissions.filter(s => s.marks && s.marks.obtained !== undefined);
  }

  if (status === 'pending') {
    const submittedIds = submissions.map(s => s.student._id.toString());

    const classData = await Class.findById(assignment.class).populate(
      'students',
      'firstName lastName rollNumber email'
    );

    submissions = classData.students
      .filter(s => !submittedIds.includes(s._id.toString()))
      .map(student => ({
        _id: null,
        student,
        submissionStatus: 'pending',
        submittedAt: null,
        marks: null
      }));
  }

  
  if (search) {
    const key = search.toLowerCase();
    submissions = submissions.filter(s =>
      s.student.firstName.toLowerCase().includes(key) ||
      s.student.lastName.toLowerCase().includes(key) ||
      s.student.rollNumber?.toLowerCase().includes(key)
    );
  }

  
  submissions.sort((a, b) => {
    if (sortBy === 'marks') {
      return sortOrder === 'asc'
        ? (a.marks?.obtained || 0) - (b.marks?.obtained || 0)
        : (b.marks?.obtained || 0) - (a.marks?.obtained || 0);
    }

    return sortOrder === 'asc'
      ? new Date(a.submittedAt || 0) - new Date(b.submittedAt || 0)
      : new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0);
  });

  
  const total = submissions.length;
  const start = (page - 1) * limit;
  const data = submissions.slice(start, start + Number(limit));

  res.status(200).json({
    success: true,
    count: data.length,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / limit)
    },
    data
  });
});


exports.evaluateSubmission = asyncHandler(async (req, res, next) => {
  const { marks, remarks, feedback, grade } = req.body;

  const assignment = await Assignment.findById(req.params.assignmentId);

  if (!assignment) {
    return next(new ErrorResponse('Assignment not found', 404));
  }

  const submission = assignment.submissions.id(req.params.submissionId);

  if (!submission) {
    return next(new ErrorResponse('Submission not found', 404));
  }

  submission.marks = {
    obtained: marks,
    maximum: assignment.maximumMarks,
    percentage: (marks / assignment.maximumMarks) * 100,
    grade
  };

  submission.remarks = remarks;
  submission.feedback = feedback;
  submission.evaluatedBy = req.user._id;
  submission.evaluatedAt = new Date();

  assignment.evaluatedDate = new Date();

  await assignment.save();

  res.status(200).json({
    success: true,
    message: 'Submission evaluated successfully'
  });
});
