const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema({
  // Required References
  institute: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Institute',
    required: true
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  class: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: true
  },
  
  // Subject (optional for daily attendance)
  subject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject'
  },
  
  // Date & Time
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  session: {
    type: String,
    enum: ['morning', 'afternoon', 'evening', 'full_day', 'period_1', 'period_2', 'period_3', 'period_4', 'period_5', 'period_6', 'period_7', 'period_8'],
    default: 'full_day'
  },
  period: {
    type: Number,
    min: 1,
    max: 8
  },
  
  // Attendance Status
  status: {
    type: String,
    enum: ['present', 'absent', 'late', 'half_day', 'leave', 'holiday', 'sunday', 'excused'],
    default: 'absent'
  },
  lateMinutes: {
    type: Number,
    default: 0
  },
  leaveType: {
    type: String,
    enum: ['casual', 'sick', 'earned', 'maternity', 'paternity', 'compensatory', 'other']
  },
  
  // Marking Details
  markedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  markedAt: {
    type: Date,
    default: Date.now
  },
  markedMethod: {
    type: String,
    enum: ['teacher', 'student_self', 'biometric', 'rfid', 'mobile', 'admin'],
    default: 'teacher'
  },
  
  // Self-Marking Details
  isSelfMarked: {
    type: Boolean,
    default: false
  },
  selfMarkLocation: {
    latitude: Number,
    longitude: Number,
    accuracy: Number
  },
  selfMarkIP: String,
  selfMarkDevice: String,
  
  // Verification
  verified: {
    type: Boolean,
    default: false
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  verifiedAt: Date,
  
  // Remarks & Notes
  remark: String,
  teacherComment: String,
  studentComment: String,
  
  // Locking & Editing
  isLocked: {
    type: Boolean,
    default: false
  },
  lockedAt: Date,
  lockedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Override Details
  isOverridden: {
    type: Boolean,
    default: false
  },
  overriddenBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  overriddenAt: Date,
  originalStatus: String,
  overrideReason: String,
  
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

// Compound Index for faster queries
AttendanceSchema.index({ institute: 1, student: 1, date: 1, subject: 1 });
AttendanceSchema.index({ institute: 1, class: 1, date: 1 });
AttendanceSchema.index({ institute: 1, date: 1, status: 1 });
AttendanceSchema.index({ student: 1, class: 1, subject: 1 });
AttendanceSchema.index({ date: 1, markedBy: 1 });

// Pre-save middleware
AttendanceSchema.pre('save', function(next) {
  // Auto-calculate lateMinutes based on status
  if (this.status === 'late' && !this.lateMinutes) {
    this.lateMinutes = 15; // Default 15 minutes late
  }
  
  // Update isSelfMarked based on markedMethod
  if (this.markedMethod === 'student_self') {
    this.isSelfMarked = true;
  }
  
  // Auto-lock attendance after 24 hours
  const now = new Date();
  const attendanceDate = new Date(this.date);
  const diffHours = (now - attendanceDate) / (1000 * 60 * 60);
  
  if (diffHours > 24 && !this.isLocked) {
    this.isLocked = true;
    this.lockedAt = now;
    this.lockedBy = this.markedBy;
  }
  
  next();
});

// Static method to get attendance summary
AttendanceSchema.statics.getStudentAttendanceSummary = async function(studentId, startDate, endDate) {
  const attendanceRecords = await this.find({
    student: studentId,
    date: { $gte: startDate, $lte: endDate }
  });
  
  const summary = {
    totalClasses: attendanceRecords.length,
    present: attendanceRecords.filter(a => a.status === 'present').length,
    absent: attendanceRecords.filter(a => a.status === 'absent').length,
    late: attendanceRecords.filter(a => a.status === 'late').length,
    leave: attendanceRecords.filter(a => a.status === 'leave').length,
    halfDay: attendanceRecords.filter(a => a.status === 'half_day').length,
    attendancePercentage: 0
  };
  
  // Calculate percentage (present + half_day*0.5) / total
  const effectivePresent = summary.present + (summary.halfDay * 0.5);
  summary.attendancePercentage = summary.totalClasses > 0 
    ? Math.round((effectivePresent / summary.totalClasses) * 100) 
    : 0;
  
  return summary;
};

// Static method for bulk attendance marking
AttendanceSchema.statics.markBulkAttendance = async function(attendanceData) {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const bulkOps = attendanceData.map(record => ({
      updateOne: {
        filter: {
          institute: record.institute,
          student: record.student,
          class: record.class,
          subject: record.subject,
          date: record.date,
          session: record.session
        },
        update: {
          $set: {
            status: record.status,
            markedBy: record.markedBy,
            markedAt: new Date(),
            markedMethod: record.markedMethod || 'teacher',
            remark: record.remark,
            lateMinutes: record.lateMinutes || 0,
            isSelfMarked: record.markedMethod === 'student_self'
          }
        },
        upsert: true
      }
    }));
    
    const result = await this.bulkWrite(bulkOps, { session });
    await session.commitTransaction();
    return result;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

module.exports = mongoose.model('Attendance', AttendanceSchema);