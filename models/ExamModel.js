const mongoose = require('mongoose');

const ExamSchema = new mongoose.Schema({
  institute: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Institute',
    required: true
  },
  
  // Exam Details
  name: {
    type: String,
    required: [true, 'Exam name is required'],
    trim: true
  },
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
  },
  description: String,
  academicYear: {
    type: String,
    required: true
  },
  
  // Exam Type
  type: {
    type: String,
    enum: ['unit_test', 'mid_term', 'final', 'semester', 'practical', 'viva', 'quiz', 'assignment', 'project'],
    required: true
  },
  category: {
    type: String,
    enum: ['internal', 'external', 'board', 'university'],
    default: 'internal'
  },
  
  // Academic References
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  class: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class'
  },
  subject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject'
  },
  
  // Schedule
  examDate: {
    type: Date,
    required: true
  },
  startTime: String,
  endTime: String,
  duration: Number, // in minutes
  reportingTime: String,
  
  // Venue
  venue: {
    room: String,
    building: String,
    floor: String,
    seatingCapacity: Number
  },
  
  // Marks & Grading
  totalMarks: {
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
    default: 100 // percentage of total
  },
  
  // Question Paper
  questionPaper: {
    url: String,
    fileName: String,
    uploadedAt: Date,
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  
  // Syllabus
  syllabus: String,
  chapters: [String],
  topics: [String],
  
  // Exam Pattern
  pattern: {
    type: String,
    enum: ['objective', 'subjective', 'mixed', 'practical', 'oral'],
    default: 'mixed'
  },
  sections: [{
    name: String,
    marks: Number,
    questions: Number,
    optionalQuestions: Number
  }],
  
  // Status
  status: {
    type: String,
    enum: ['draft', 'scheduled', 'ongoing', 'completed', 'cancelled', 'postponed'],
    default: 'draft'
  },
  isPublished: {
    type: Boolean,
    default: false
  },
  publishedAt: Date,
  
  // Invigilation
  invigilators: [{
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Teacher'
    },
    role: {
      type: String,
      enum: ['chief', 'assistant', 'observer']
    },
    assignedAt: Date
  }],
  
  // Students
  enrolledStudents: [{
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student'
    },
    rollNumber: String,
    seatNumber: String,
    attendanceStatus: {
      type: String,
      enum: ['present', 'absent', 'late'],
      default: 'absent'
    },
    marks: {
      obtained: Number,
      grace: Number,
      total: Number,
      grade: String,
      result: {
        type: String,
        enum: ['pass', 'fail', 'compartment']
      }
    },
    evaluatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Teacher'
    },
    evaluatedAt: Date,
    remarks: String
  }],
  
  // Result
  result: {
    declared: {
      type: Boolean,
      default: false
    },
    declaredAt: Date,
    declaredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    statistics: {
      totalStudents: Number,
      appeared: Number,
      passed: Number,
      failed: Number,
      compartment: Number,
      averageMarks: Number,
      highestMarks: Number,
      lowestMarks: Number,
      passPercentage: Number
    }
  },
  
  // Approval Workflow
  approval: {
    required: {
      type: Boolean,
      default: false
    },
    approvedBy: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      role: String,
      approvedAt: Date,
      status: {
        type: String,
        enum: ['pending', 'approved', 'rejected']
      },
      comments: String
    }]
  },
  
  // Settings
  settings: {
    allowRevaluation: {
      type: Boolean,
      default: false
    },
    allowChallenge: {
      type: Boolean,
      default: false
    },
    graceMarksAllowed: {
      type: Boolean,
      default: false
    },
    maxGraceMarks: Number,
    negativeMarking: {
      enabled: {
        type: Boolean,
        default: false
      },
      percentage: Number
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
ExamSchema.index({ institute: 1, examDate: 1 });
ExamSchema.index({ institute: 1, course: 1, class: 1 });
ExamSchema.index({ institute: 1, type: 1 });
ExamSchema.index({ institute: 1, status: 1 });

// Pre-save middleware
ExamSchema.pre('save', function(next) {
  // Auto-generate exam code
  if (!this.code) {
    const year = new Date().getFullYear().toString().slice(-2);
    const examType = this.type.substring(0, 3).toUpperCase();
    const random = Math.floor(1000 + Math.random() * 9000);
    this.code = `EXAM${year}${examType}${random}`;
  }
  
  // Update result statistics
  if (this.enrolledStudents && this.enrolledStudents.length > 0) {
    const totalStudents = this.enrolledStudents.length;
    const appeared = this.enrolledStudents.filter(s => s.attendanceStatus === 'present').length;
    const passed = this.enrolledStudents.filter(s => s.marks?.result === 'pass').length;
    const failed = this.enrolledStudents.filter(s => s.marks?.result === 'fail').length;
    const compartment = this.enrolledStudents.filter(s => s.marks?.result === 'compartment').length;
    
    this.result.statistics = {
      totalStudents,
      appeared,
      passed,
      failed,
      compartment,
      passPercentage: appeared > 0 ? Math.round((passed / appeared) * 100) : 0,
      averageMarks: 0,
      highestMarks: 0,
      lowestMarks: 0
    };
    
    // Calculate marks statistics
    const presentStudents = this.enrolledStudents.filter(s => s.attendanceStatus === 'present' && s.marks?.obtained);
    if (presentStudents.length > 0) {
      const marks = presentStudents.map(s => s.marks.obtained);
      this.result.statistics.averageMarks = Math.round(marks.reduce((a, b) => a + b, 0) / marks.length);
      this.result.statistics.highestMarks = Math.max(...marks);
      this.result.statistics.lowestMarks = Math.min(...marks);
    }
  }
  
  next();
});

module.exports = mongoose.model('Exam', ExamSchema);