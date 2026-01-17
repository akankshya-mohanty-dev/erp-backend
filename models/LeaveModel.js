const mongoose = require('mongoose');

const LeaveSchema = new mongoose.Schema({
  institute: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Institute',
    required: true
  },
  
  // Applicant Details
  applicant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  applicantRole: String,
  applicantName: String,
  applicantDepartment: String,
  applicantDesignation: String,
  employeeId: String,
  
  leaveType: {
    type: String,
    enum: ['casual', 'sick', 'earned', 'maternity', 'paternity', 'compensatory', 'study', 'bereavement', 'medical', 'privilege', 'loss_of_pay', 'other'],
    required: true
  },
  reason: {
    type: String,
    required: true
  },
  description: String,
  emergencyContact: String,
  locationDuringLeave: String,
  
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  numberOfDays: {
    type: Number,
    default: 1
  },
  workingDays: {
    type: Number,
    default: 0
  },
  halfDay: {
    type: Boolean,
    default: false
  },
  halfDayType: {
    type: String,
    enum: ['first_half', 'second_half']
  },
  
  workHandover: {
    to: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    toName: String,
    handoverNotes: String,
    handoverDate: Date,
    handoverStatus: {
      type: String,
      enum: ['pending', 'completed', 'not_required'],
      default: 'pending'
    }
  },
  
  documents: [{
    name: String,
    url: String,
    type: String,
    size: Number,
    uploadedAt: {
      type: Date,
      default: Date.now
    },
    verified: {
      type: Boolean,
      default: false
    }
  }],
  medicalCertificate: {
    hasCertificate: {
      type: Boolean,
      default: false
    },
    url: String,
    doctorName: String,
    hospitalName: String,
    certificateDate: Date
  },
  
  leaveBalance: {
    beforeLeave: {
      casual: Number,
      sick: Number,
      earned: Number,
      maternity: Number,
      paternity: Number,
      compensatory: Number,
      total: Number
    },
    afterLeave: {
      casual: Number,
      sick: Number,
      earned: Number,
      maternity: Number,
      paternity: Number,
      compensatory: Number,
      total: Number
    }
  },
  eligibility: {
    isEligible: {
      type: Boolean,
      default: true
    },
    eligibilityMessage: String,
    minimumService: {
      required: Number, // in months
      completed: Number,
      eligible: Boolean
    }
  },
  
  // Approval Workflow
  status: {
    type: String,
    enum: ['draft', 'submitted', 'pending_approval', 'recommended', 'approved', 'rejected', 'cancelled', 'withdrawn', 'auto_approved'],
    default: 'draft'
  },
  approvalFlow: [{
    level: {
      type: Number,
      required: true
    },
    approverRole: String,
    approver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    approverName: String,
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'delegated'],
      default: 'pending'
    },
    comments: String,
    actionDate: Date,
    delegatedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  currentApprovalLevel: {
    type: Number,
    default: 1
  },
  totalApprovalLevels: {
    type: Number,
    default: 2
  },
  
  // Approver Details
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedByName: String,
  approvedDate: Date,
  approvedComments: String,
  
  rejectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  rejectedByName: String,
  rejectedDate: Date,
  rejectionReason: String,
  
  // Cancellation & Withdrawal
  cancelledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  cancelledDate: Date,
  cancellationReason: String,
  
  withdrawnBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  withdrawnDate: Date,
  withdrawalReason: String,
  
  // Attendance Impact
  attendanceImpact: {
    markedAs: {
      type: String,
      enum: ['leave', 'present', 'half_day', 'absent'],
      default: 'leave'
    },
    attendanceUpdated: {
      type: Boolean,
      default: false
    },
    updatedAt: Date,
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  
  // Salary Impact
  salaryImpact: {
    isDeducted: {
      type: Boolean,
      default: false
    },
    deductionAmount: Number,
    deductionPercentage: Number,
    deductedMonth: String,
    deductedYear: String,
    processed: {
      type: Boolean,
      default: false
    },
    processedAt: Date,
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  
  // Extension & Modification
  isExtended: {
    type: Boolean,
    default: false
  },
  originalEndDate: Date,
  extensionReason: String,
  extensionApprovedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  extensionApprovedDate: Date,
  
  isModified: {
    type: Boolean,
    default: false
  },
  modificationHistory: [{
    field: String,
    oldValue: mongoose.Schema.Types.Mixed,
    newValue: mongoose.Schema.Types.Mixed,
    modifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    modifiedAt: Date,
    reason: String
  }],
  
  // Emergency Leave
  isEmergency: {
    type: Boolean,
    default: false
  },
  emergencyLevel: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'low'
  },
  
  // Return from Leave
  actualReturnDate: Date,
  returnVerification: {
    verified: {
      type: Boolean,
      default: false
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    verifiedDate: Date,
    verificationNotes: String
  },
  
  // Back to Work
  backToWorkReport: {
    submitted: {
      type: Boolean,
      default: false
    },
    submissionDate: Date,
    reportUrl: String,
    handoverTakenBack: {
      type: Boolean,
      default: false
    },
    handoverTakenBackDate: Date
  },
  
  // Statistics & Analytics
  analytics: {
    processingTime: Number, // in hours
    approverResponseTime: Number, // in hours
    leavePattern: String,
    frequency: Number
  },
  
  // Notifications
  notifications: [{
    type: {
      type: String,
      enum: ['submission', 'approval', 'rejection', 'reminder', 'cancellation', 'withdrawal', 'extension']
    },
    sentTo: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    sentAt: Date,
    channel: String
  }],
  
  // Timestamps
  appliedAt: {
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

// Indexes for optimized queries
LeaveSchema.index({ institute: 1, applicant: 1 });
LeaveSchema.index({ institute: 1, status: 1 });
LeaveSchema.index({ institute: 1, leaveType: 1 });
LeaveSchema.index({ institute: 1, startDate: 1, endDate: 1 });
LeaveSchema.index({ institute: 1, 'approvalFlow.approver': 1 });
LeaveSchema.index({ institute: 1, appliedAt: -1 });
LeaveSchema.index({ applicant: 1, startDate: -1 });

// Pre-save middleware for calculations and validations
LeaveSchema.pre('save', async function(next) {
  // Calculate number of days
  if (this.startDate && this.endDate) {
    const timeDiff = this.endDate.getTime() - this.startDate.getTime();
    const dayDiff = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1; // Inclusive
    
    if (this.halfDay) {
      this.numberOfDays = 0.5;
    } else {
      this.numberOfDays = dayDiff;
    }
    
    // Calculate working days (excluding weekends)
    let workingDays = 0;
    let currentDate = new Date(this.startDate);
    
    while (currentDate <= this.endDate) {
      const dayOfWeek = currentDate.getDay();
      // Saturday = 6, Sunday = 0
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        workingDays++;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    if (this.halfDay) {
      this.workingDays = 0.5;
    } else {
      this.workingDays = workingDays;
    }
  }
  
  // Auto-populate applicant details if not provided
  if (!this.applicantName || !this.applicantRole) {
    try {
      const User = mongoose.model('User');
      const applicant = await User.findById(this.applicant);
      if (applicant) {
        this.applicantName = applicant.fullName || `${applicant.firstName} ${applicant.lastName}`;
        this.applicantRole = applicant.role;
        
        // Get employee ID if teacher
        if (applicant.role === 'teacher') {
          const Teacher = mongoose.model('Teacher');
          const teacher = await Teacher.findById(this.applicant);
          if (teacher) {
            this.employeeId = teacher.employeeId;
          }
        }
        
        // Get student ID if student
        if (applicant.role === 'student') {
          const Student = mongoose.model('Student');
          const student = await Student.findById(this.applicant);
          if (student) {
            this.employeeId = student.studentId;
          }
        }
      }
    } catch (error) {
      console.error('Error fetching applicant details:', error);
    }
  }
  
  // Validate dates
  if (this.startDate > this.endDate) {
    return next(new Error('End date cannot be before start date'));
  }
  
  // Check for overlapping leaves
  if (this.isNew || this.isModified('startDate') || this.isModified('endDate') || this.isModified('applicant')) {
    const existingLeaves = await this.constructor.find({
      institute: this.institute,
      applicant: this.applicant,
      status: { $in: ['submitted', 'pending_approval', 'approved'] },
      $or: [
        {
          startDate: { $lte: this.endDate },
          endDate: { $gte: this.startDate }
        }
      ],
      _id: { $ne: this._id }
    });
    
    if (existingLeaves.length > 0) {
      return next(new Error('Overlapping leave application exists'));
    }
  }
  
  // Auto-set applied date for new leaves
  if (this.isNew && !this.appliedAt) {
    this.appliedAt = new Date();
  }
  
  next();
});

// Static method to check leave balance
LeaveSchema.statics.checkLeaveBalance = async function(userId, leaveType, instituteId) {
  const currentYear = new Date().getFullYear();
  const yearStart = new Date(currentYear, 0, 1);
  const yearEnd = new Date(currentYear, 11, 31);
  
  // Get approved leaves for the current year
  const approvedLeaves = await this.find({
    institute: instituteId,
    applicant: userId,
    leaveType: leaveType,
    status: 'approved',
    startDate: { $gte: yearStart, $lte: yearEnd }
  });
  
  const totalDaysUsed = approvedLeaves.reduce((sum, leave) => sum + leave.numberOfDays, 0);
  
  // Get user's leave entitlement (you would typically fetch this from HR settings)
  const entitlement = {
    casual: 12,
    sick: 12,
    earned: 30,
    maternity: 180,
    paternity: 15,
    compensatory: 0,
    medical: 15,
    privilege: 0
  };
  
  const totalEntitlement = entitlement[leaveType] || 0;
  const balance = totalEntitlement - totalDaysUsed;
  
  return {
    totalEntitlement,
    used: totalDaysUsed,
    balance: balance > 0 ? balance : 0,
    overdrawn: balance < 0 ? Math.abs(balance) : 0
  };
};

// Method to get leave summary for a user
LeaveSchema.statics.getUserLeaveSummary = async function(userId, instituteId, year) {
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year, 11, 31);
  
  const leaves = await this.find({
    institute: instituteId,
    applicant: userId,
    startDate: { $gte: yearStart, $lte: yearEnd }
  });
  
  const summary = {
    totalApplied: leaves.length,
    approved: leaves.filter(l => l.status === 'approved').length,
    pending: leaves.filter(l => ['submitted', 'pending_approval'].includes(l.status)).length,
    rejected: leaves.filter(l => l.status === 'rejected').length,
    cancelled: leaves.filter(l => l.status === 'cancelled').length,
    byType: {},
    byMonth: {}
  };
  
  // Group by leave type
  leaves.forEach(leave => {
    if (!summary.byType[leave.leaveType]) {
      summary.byType[leave.leaveType] = {
        count: 0,
        days: 0
      };
    }
    summary.byType[leave.leaveType].count++;
    summary.byType[leave.leaveType].days += leave.numberOfDays;
  });
  
  // Group by month
  leaves.forEach(leave => {
    const month = leave.startDate.getMonth();
    if (!summary.byMonth[month]) {
      summary.byMonth[month] = {
        count: 0,
        days: 0
      };
    }
    summary.byMonth[month].count++;
    summary.byMonth[month].days += leave.numberOfDays;
  });
  
  return summary;
};

// Method to submit leave for approval
LeaveSchema.methods.submitForApproval = async function() {
  if (this.status !== 'draft') {
    throw new Error('Leave can only be submitted from draft status');
  }
  
  this.status = 'submitted';
  this.currentApprovalLevel = 1;
  
  // Initialize approval flow based on institute settings
  const Institute = mongoose.model('Institute');
  const institute = await Institute.findById(this.institute);
  
  // Here you would typically fetch approval hierarchy from institute settings
  // This is a simplified example
  this.approvalFlow = [
    {
      level: 1,
      approverRole: 'hod',
      status: 'pending',
      comments: ''
    },
    {
      level: 2,
      approverRole: 'principal',
      status: 'pending',
      comments: ''
    }
  ];
  
  this.totalApprovalLevels = this.approvalFlow.length;
  
  await this.save();
  
  // Trigger notification for first approver
  await this.notifyApprover(1);
  
  return this;
};

// Method to approve/reject leave
LeaveSchema.methods.processApproval = async function(approverId, level, action, comments) {
  const approvalStep = this.approvalFlow.find(step => step.level === level);
  
  if (!approvalStep) {
    throw new Error('Invalid approval level');
  }
  
  if (approvalStep.status !== 'pending') {
    throw new Error('This step has already been processed');
  }
  
  // Update approval step
  approvalStep.approver = approverId;
  approvalStep.status = action;
  approvalStep.comments = comments;
  approvalStep.actionDate = new Date();
  
  // Get approver details
  const User = mongoose.model('User');
  const approver = await User.findById(approverId);
  if (approver) {
    approvalStep.approverName = approver.fullName || `${approver.firstName} ${approver.lastName}`;
  }
  
  if (action === 'approved') {
    // Move to next level if exists
    if (level < this.totalApprovalLevels) {
      this.currentApprovalLevel = level + 1;
      await this.notifyApprover(level + 1);
    } else {
      // All levels approved
      this.status = 'approved';
      this.approvedBy = approverId;
      this.approvedDate = new Date();
      this.approvedComments = comments;
      
      // Update leave balance
      await this.updateLeaveBalance();
      
      // Update attendance
      await this.updateAttendance();
    }
  } else if (action === 'rejected') {
    this.status = 'rejected';
    this.rejectedBy = approverId;
    this.rejectedDate = new Date();
    this.rejectionReason = comments;
  }
  
  await this.save();
  
  // Notify applicant
  await this.notifyApplicant(action);
  
  return this;
};

// Method to update leave balance
LeaveSchema.methods.updateLeaveBalance = async function() {
  if (this.status !== 'approved') {
    return;
  }
  
  // This is where you would integrate with your HR/leave balance system
  // For now, we'll just calculate and store the balance
  
  const balanceBefore = this.leaveBalance.beforeLeave || {};
  const balanceAfter = {};
  
  // Calculate new balance
  Object.keys(balanceBefore).forEach(type => {
    if (type === this.leaveType) {
      balanceAfter[type] = (balanceBefore[type] || 0) - this.numberOfDays;
    } else {
      balanceAfter[type] = balanceBefore[type] || 0;
    }
  });
  
  this.leaveBalance.afterLeave = balanceAfter;
  await this.save();
};

// Method to update attendance
LeaveSchema.methods.updateAttendance = async function() {
  if (this.status !== 'approved') {
    return;
  }
  
  const Attendance = mongoose.model('Attendance');
  const currentDate = new Date(this.startDate);
  
  while (currentDate <= this.endDate) {
    // Check if it's a working day
    const dayOfWeek = currentDate.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Saturday or Sunday
      
      let attendanceStatus = 'leave';
      let lateMinutes = 0;
      
      if (this.halfDay) {
        attendanceStatus = 'half_day';
        if (this.halfDayType === 'first_half') {
          // First half as leave, second half as present
        } else {
          // Second half as leave, first half as present
        }
      }
      
      // Create or update attendance record
      await Attendance.findOneAndUpdate(
        {
          institute: this.institute,
          student: this.applicant,
          date: new Date(currentDate),
          session: 'full_day'
        },
        {
          $set: {
            status: attendanceStatus,
            markedBy: this.approvedBy,
            markedAt: new Date(),
            remark: `Leave: ${this.leaveType} - ${this.reason}`,
            lateMinutes: lateMinutes,
            isSelfMarked: false
          }
        },
        {
          upsert: true,
          new: true
        }
      );
    }
    
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  this.attendanceImpact.attendanceUpdated = true;
  this.attendanceImpact.updatedAt = new Date();
  this.attendanceImpact.updatedBy = this.approvedBy;
  
  await this.save();
};

// Method to notify approver
LeaveSchema.methods.notifyApproval = async function() {
  if (this.status === 'approved') {
    // Send approval notification
    // This would integrate with your notification system
    console.log(`Leave approved for ${this.applicantName}`);
  } else if (this.status === 'rejected') {
    // Send rejection notification
    console.log(`Leave rejected for ${this.applicantName}`);
  }
};

// Method to check if leave can be cancelled
LeaveSchema.methods.canBeCancelled = function() {
  const today = new Date();
  const startDate = new Date(this.startDate);
  
  // Can be cancelled if:
  // 1. Status is approved or pending
  // 2. Start date is in the future
  // 3. Not already cancelled or withdrawn
  
  const allowedStatuses = ['approved', 'pending_approval', 'submitted'];
  return allowedStatuses.includes(this.status) && startDate > today;
};

// Virtual for formatted dates
LeaveSchema.virtual('formattedStartDate').get(function() {
  return this.startDate ? this.startDate.toLocaleDateString('en-IN') : '';
});

LeaveSchema.virtual('formattedEndDate').get(function() {
  return this.endDate ? this.endDate.toLocaleDateString('en-IN') : '';
});

LeaveSchema.virtual('durationText').get(function() {
  if (this.halfDay) {
    return `${this.halfDayType === 'first_half' ? 'First Half' : 'Second Half'} Day`;
  }
  return `${this.numberOfDays} Day${this.numberOfDays > 1 ? 's' : ''}`;
});

module.exports = mongoose.model('Leave', LeaveSchema);