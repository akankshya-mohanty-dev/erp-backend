const mongoose = require('mongoose');
const User = require('./User.model');

const ParentSchema = new mongoose.Schema({
  // Parent Identification
  parentId: {
    type: String,
    unique: true
  },
  
  // Personal Details
  dateOfBirth: Date,
  gender: {
    type: String,
    enum: ['male', 'female', 'other']
  },
  occupation: String,
  designation: String,
  company: String,
  annualIncome: Number,
  qualification: String,
  
  // Contact Information
  alternateEmail: String,
  alternatePhone: String,
  whatsappNumber: String,
  
  // Address
  address: {
    street: String,
    city: String,
    state: String,
    country: {
      type: String,
      default: 'India'
    },
    pincode: String
  },
  
  // Linked Students
  linkedStudents: [{
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true
    },
    studentName: String,
    studentRollNumber: String,
    relationship: {
      type: String,
      enum: ['father', 'mother', 'guardian', 'other'],
      required: true
    },
    isPrimary: {
      type: Boolean,
      default: false
    },
    linkedAt: {
      type: Date,
      default: Date.now
    },
    verified: {
      type: Boolean,
      default: false
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    verifiedAt: Date
  }],
  
  // Communication Preferences
  communicationPreferences: {
    receiveAttendanceAlerts: {
      type: Boolean,
      default: true
    },
    receiveFeeAlerts: {
      type: Boolean,
      default: true
    },
    receiveExamAlerts: {
      type: Boolean,
      default: true
    },
    receiveAssignmentAlerts: {
      type: Boolean,
      default: true
    },
    receiveEventAlerts: {
      type: Boolean,
      default: true
    },
    notificationChannels: [{
      type: String,
      enum: ['email', 'sms', 'whatsapp', 'in_app']
    }],
    alertFrequency: {
      type: String,
      enum: ['immediate', 'daily', 'weekly'],
      default: 'immediate'
    }
  },
  
  // Access Permissions
  permissions: {
    viewAttendance: {
      type: Boolean,
      default: true
    },
    viewMarks: {
      type: Boolean,
      default: true
    },
    viewFees: {
      type: Boolean,
      default: true
    },
    viewTimetable: {
      type: Boolean,
      default: true
    },
    viewAssignments: {
      type: Boolean,
      default: true
    },
    applyLeave: {
      type: Boolean,
      default: false
    },
    payFees: {
      type: Boolean,
      default: true
    }
  },
  
  // Meeting & Interaction History
  meetings: [{
    date: Date,
    type: {
      type: String,
      enum: ['parent_teacher', 'open_house', 'individual', 'phone']
    },
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Teacher'
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student'
    },
    purpose: String,
    discussionPoints: [String],
    actionItems: [String],
    nextMeetingDate: Date,
    notes: String
  }],
  
  // Feedback & Surveys
  feedback: [{
    type: {
      type: String,
      enum: ['academic', 'facility', 'teacher', 'overall']
    },
    rating: Number,
    comments: String,
    submittedAt: Date
  }],
  
  // Payment History
  paymentHistory: [{
    transactionId: String,
    studentName: String,
    amount: Number,
    date: Date,
    status: String
  }],
  
  // Documents
  documents: [{
    name: String,
    type: String,
    url: String,
    uploadedAt: Date
  }],
  
  // Last Login Information
  lastLogin: Date,
  loginCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Pre-save middleware
ParentSchema.pre('save', async function(next) {
  // Auto-generate parent ID
  if (!this.parentId) {
    try {
      const institute = await mongoose.model('Institute').findById(this.institute);
      const year = new Date().getFullYear().toString().slice(-2);
      
      const count = await this.constructor.countDocuments({
        institute: this.institute,
        createdAt: {
          $gte: new Date(new Date().getFullYear(), 0, 1),
          $lt: new Date(new Date().getFullYear() + 1, 0, 1)
        }
      });
      
      this.parentId = `PAR${year}${institute.code}${String(count + 1).padStart(4, '0')}`;
    } catch (error) {
      return next(error);
    }
  }
  
  // Auto-populate student names
  this.linkedStudents.forEach(async (linkedStudent, index) => {
    if (linkedStudent.student && !linkedStudent.studentName) {
      try {
        const Student = mongoose.model('Student');
        const student = await Student.findById(linkedStudent.student);
        if (student) {
          this.linkedStudents[index].studentName = student.fullName || `${student.firstName} ${student.lastName}`;
          this.linkedStudents[index].studentRollNumber = student.rollNumber;
        }
      } catch (error) {
        console.error('Error fetching student details:', error);
      }
    }
  });
  
  next();
});

// Method to link a student
ParentSchema.methods.linkStudent = async function(studentId, relationship, isPrimary = false) {
  const Student = mongoose.model('Student');
  
  // Check if student exists
  const student = await Student.findById(studentId);
  if (!student) {
    throw new Error('Student not found');
  }
  
  // Check if already linked
  const alreadyLinked = this.linkedStudents.some(ls => 
    ls.student.toString() === studentId.toString()
  );
  
  if (alreadyLinked) {
    throw new Error('Student already linked to this parent');
  }
  
  // Add student to linked list
  this.linkedStudents.push({
    student: studentId,
    studentName: student.fullName || `${student.firstName} ${student.lastName}`,
    studentRollNumber: student.rollNumber,
    relationship: relationship,
    isPrimary: isPrimary,
    linkedAt: new Date()
  });
  
  // If this is primary, update other linked students
  if (isPrimary) {
    this.linkedStudents.forEach(ls => {
      if (ls.student.toString() !== studentId.toString()) {
        ls.isPrimary = false;
      }
    });
  }
  
  await this.save();
  
  return this;
};

// Method to unlink a student
ParentSchema.methods.unlinkStudent = async function(studentId) {
  const studentIndex = this.linkedStudents.findIndex(ls => 
    ls.student.toString() === studentId.toString()
  );
  
  if (studentIndex === -1) {
    throw new Error('Student not linked to this parent');
  }
  
  this.linkedStudents.splice(studentIndex, 1);
  
  await this.save();
  
  return this;
};

// Method to get children summary
ParentSchema.methods.getChildrenSummary = async function() {
  const Student = mongoose.model('Student');
  const Attendance = mongoose.model('Attendance');
  const Assignment = mongoose.model('Assignment');
  
  const summary = {
    totalChildren: this.linkedStudents.length,
    children: []
  };
  
  for (const linkedStudent of this.linkedStudents) {
    const student = await Student.findById(linkedStudent.student)
      .populate('course', 'name')
      .populate('class', 'name section');
    
    if (!student) continue;
    
    // Get attendance summary
    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    const attendanceRecords = await Attendance.find({
      student: student._id,
      date: { $gte: monthStart, $lte: monthEnd },
      status: { $in: ['present', 'absent', 'late'] }
    });
    
    const totalClasses = attendanceRecords.length;
    const presentCount = attendanceRecords.filter(a => a.status === 'present').length;
    const attendancePercentage = totalClasses > 0 ? Math.round((presentCount / totalClasses) * 100) : 0;
    
    // Get pending assignments
    const pendingAssignments = await Assignment.countDocuments({
      'submissions.student': student._id,
      dueDate: { $gte: today },
      'submissions.marks': { $exists: false }
    });
    
    // Get upcoming exams (you would need to query Exam model)
    const upcomingExams = 0; // Placeholder
    
    // Get fee status
    const feeStatus = student.feeStatus || {};
    
    summary.children.push({
      studentId: student._id,
      name: student.fullName || `${student.firstName} ${student.lastName}`,
      rollNumber: student.rollNumber,
      course: student.course?.name,
      class: student.class?.name,
      section: student.class?.section,
      relationship: linkedStudent.relationship,
      isPrimary: linkedStudent.isPrimary,
      attendance: {
        percentage: attendancePercentage,
        present: presentCount,
        total: totalClasses
      },
      pendingAssignments: pendingAssignments,
      upcomingExams: upcomingExams,
      feeStatus: feeStatus
    });
  }
  
  return summary;
};

// Method to verify parent-student relationship
ParentSchema.methods.verifyRelationship = async function(studentId, verifiedBy, notes = '') {
  const studentIndex = this.linkedStudents.findIndex(ls => 
    ls.student.toString() === studentId.toString()
  );
  
  if (studentIndex === -1) {
    throw new Error('Student not linked to this parent');
  }
  
  this.linkedStudents[studentIndex].verified = true;
  this.linkedStudents[studentIndex].verifiedBy = verifiedBy;
  this.linkedStudents[studentIndex].verifiedAt = new Date();
  
  await this.save();
  
  return this;
};

const Parent = User.discriminator('parent', ParentSchema);
module.exports = Parent;