const mongoose = require('mongoose');

const AssignmentSchema = new mongoose.Schema({
  institute: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Institute',
    required: true
  },
  
  title: {
    type: String,
    required: [true, 'Assignment title is required'],
   
  },
  description: String,
  instructions: String,
  assignmentNumber: Number,
  
  // Academic References
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  class: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: true
  },
  subject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    required: true
  },
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher',
    required: true
  },
  
  // LMS Module Reference
  module: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Module'
  },
  
  // Files & Attachments
  attachments: [{
    name: String,
    url: String,
    type: String,
    size: Number,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Timeline
  assignedDate: {
    type: Date,
    default: Date.now
  },
  dueDate: {
    type: Date,
    required: true
  },
  submissionDate: Date,
  evaluatedDate: Date,
  
  // Marks & Grading
  maximumMarks: {
    type: Number,
    required: true,
    default: 100
  },
  passingMarks: {
    type: Number,
    default: 33
  },
  weightage: {
    type: Number,
    default: 10 // Percentage of total marks
  },
  
  // Submission Rules
  submissionType: {
    type: String,
    enum: ['individual', 'group', 'both'],
    default: 'individual'
  },
  allowedFileTypes: [String],
  maxFileSize: { 
    type: Number,
    default: 10
  },
  maxFiles: {
    type: Number,
    default: 1
  },
  allowLateSubmission: {
    type: Boolean,
    default: false
  },
  lateSubmissionPenalty: {
    type: Number,
    default: 0 // Percentage deduction per day
  },
  allowResubmission: {
    type: Boolean,
    default: false
  },
  maxResubmissions: {
    type: Number,
    default: 1
  },
  
  // Status & Visibility
  status: {
    type: String,
    enum: ['draft', 'published', 'in_progress', 'submission_closed', 'evaluation_completed', 'archived'],
    default: 'draft'
  },
  isPublished: {
    type: Boolean,
    default: false
  },
  publishedAt: Date,
  visibility: {
    type: String,
    enum: ['all_students', 'selected_students', 'selected_groups'],
    default: 'all_students'
  },
  visibleTo: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student'
  }],
  
  // Submissions (Embedded or Reference)
  submissions: [{
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true
    },
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group'
    },
    submittedAt: {
      type: Date,
      default: Date.now
    },
    files: [{
      name: String,
      url: String,
      type: String,
      size: Number,
      uploadedAt: Date
    }],
    textSubmission: String,
    comments: String,
    plagiarismScore: Number,
    similarityReport: String,
    submissionStatus: {
      type: String,
      enum: ['submitted', 'late', 'resubmitted', 'overdue'],
      default: 'submitted'
    },
    marks: {
      obtained: Number,
      maximum: Number,
      percentage: Number,
      grade: String
    },
    remarks: String,
    feedback: String,
    evaluatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Teacher'
    },
    evaluatedAt: Date,
    isRejected: {
      type: Boolean,
      default: false
    },
    rejectionReason: String,
    resubmissionCount: {
      type: Number,
      default: 0
    }
  }],
  
  // Statistics
  statistics: {
    totalStudents: {
      type: Number,
      default: 0
    },
    submitted: {
      type: Number,
      default: 0
    },
    pending: {
      type: Number,
      default: 0
    },
    evaluated: {
      type: Number,
      default: 0
    },
    averageMarks: {
      type: Number,
      default: 0
    },
    highestMarks: {
      type: Number,
      default: 0
    },
    lowestMarks: {
      type: Number,
      default: 0
    }
  },
  
  // Settings
  settings: {
    notifyOnSubmission: {
      type: Boolean,
      default: true
    },
    notifyOnEvaluation: {
      type: Boolean,
      default: true
    },
    allowPeerReview: {
      type: Boolean,
      default: false
    },
    enablePlagiarismCheck: {
      type: Boolean,
      default: false
    },
    requireApproval: {
      type: Boolean,
      default: false
    }
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes
AssignmentSchema.index({ institute: 1, class: 1, subject: 1 });
AssignmentSchema.index({ institute: 1, teacher: 1 });
AssignmentSchema.index({ institute: 1, dueDate: 1 });
AssignmentSchema.index({ institute: 1, status: 1 });

// Pre-save middleware
AssignmentSchema.pre('save', async function(next) {
  // Auto-assign assignment number
  if (!this.assignmentNumber) {
    const count = await this.constructor.countDocuments({
      institute: this.institute,
      class: this.class,
      subject: this.subject
    });
    this.assignmentNumber = count + 1;
  }
  
  // Auto-update status based on dates
  const now = new Date();
  
  if (this.dueDate && now > this.dueDate && this.status === 'published') {
    this.status = 'submission_closed';
  }
  
  // Update statistics
  if (this.submissions && this.submissions.length > 0) {
    this.statistics.submitted = this.submissions.length;
    this.statistics.evaluated = this.submissions.filter(s => s.marks && s.marks.obtained !== undefined).length;
    this.statistics.pending = this.statistics.submitted - this.statistics.evaluated;
    
    // Calculate average marks
    const evaluatedSubmissions = this.submissions.filter(s => s.marks && s.marks.obtained !== undefined);
    if (evaluatedSubmissions.length > 0) {
      const totalMarks = evaluatedSubmissions.reduce((sum, s) => sum + s.marks.obtained, 0);
      this.statistics.averageMarks = totalMarks / evaluatedSubmissions.length;
      this.statistics.highestMarks = Math.max(...evaluatedSubmissions.map(s => s.marks.obtained));
      this.statistics.lowestMarks = Math.min(...evaluatedSubmissions.map(s => s.marks.obtained));
    }
  }
  
  next();
});

// Method to check if student has submitted
AssignmentSchema.methods.hasStudentSubmitted = function(studentId) {
  return this.submissions.some(submission => 
    submission.student.toString() === studentId.toString()
  );
};

// Method to get student submission
AssignmentSchema.methods.getStudentSubmission = function(studentId) {
  return this.submissions.find(submission => 
    submission.student.toString() === studentId.toString()
  );
};

module.exports = mongoose.model('Assignment', AssignmentSchema);