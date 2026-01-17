const mongoose = require('mongoose');
const User = require('./User.model');

const TeacherSchema = new mongoose.Schema({
  // Teacher Identification
  employeeId: {
    type: String,
    unique: true,
    required: true
  },
  
  // Professional Details
  qualification: [{
    degree: String,
    specialization: String,
    university: String,
    year: Number,
    percentage: Number,
    isHighest: Boolean
  }],
  experience: {
    total: Number,
    details: [{
      organization: String,
      designation: String,
      from: Date,
      to: Date,
      duration: String
    }]
  },
  specialization: [String],
  designation: {
    type: String,
    required: true
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department'
  },
  
  // Personal Details
  dateOfBirth: Date,
  gender: String,
  maritalStatus: String,
  spouseName: String,
  
  // Address
  address: {
    present: {
      addressLine1: String,
      addressLine2: String,
      city: String,
      state: String,
      pincode: String
    },
    permanent: {
      addressLine1: String,
      addressLine2: String,
      city: String,
      state: String,
      pincode: String
    }
  },
  
  // Employment Details
  joiningDate: {
    type: Date,
    default: Date.now
  },
  employmentType: {
    type: String,
    enum: ['permanent', 'contract', 'visiting', 'temporary', 'probation'],
    default: 'permanent'
  },
  contractEndDate: Date,
  probationEndDate: Date,
  
  // Bank Details
  bankDetails: {
    accountNumber: String,
    bankName: String,
    branch: String,
    ifscCode: String,
    accountHolderName: String,
    panNumber: String
  },
  
  // Salary
  salary: {
    basic: Number,
    hra: Number,
    da: Number,
    specialAllowance: Number,
    otherAllowances: Number,
    total: Number,
    pfDeduction: Number,
    professionalTax: Number,
    netSalary: Number
  },
  
  // Teaching Assignments
  assignedClasses: [{
    class: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class'
    },
    section: String,
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject'
    },
    isClassTeacher: {
      type: Boolean,
      default: false
    }
  }],
  
  // Timetable
  timetable: [{
    day: {
      type: String,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    },
    periods: [{
      periodNumber: Number,
      startTime: String,
      endTime: String,
      subject: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subject'
      },
      class: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Class'
      },
      section: String,
      room: String
    }]
  }],
  
  // HOD Role
  isHOD: {
    type: Boolean,
    default: false
  },
  hodOf: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department'
  },
  
  // Leave Management
  leaveBalance: {
    casual: Number,
    sick: Number,
    earned: Number,
    maternity: Number,
    paternity: Number
  },
  
  // Documents
  documents: [{
    type: {
      type: String,
      enum: ['degree', 'experience', 'pan', 'aadhar', 'passport', 'photo', 'resume']
    },
    name: String,
    url: String,
    uploadDate: Date,
    verified: Boolean
  }],
  
  // Performance
  rating: {
    type: Number,
    min: 0,
    max: 5,
    default: 0
  },
  appraisals: [{
    year: String,
    rating: Number,
    comments: String,
    assessedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    date: Date
  }],
  
  // Status
  isApproved: {
    type: Boolean,
    default: false
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvalDate: Date,
  isResigned: {
    type: Boolean,
    default: false
  },
  resignationDate: Date,
  relievingDate: Date
}, {
  timestamps: true
});

// Auto-generate employee ID
TeacherSchema.pre('save', async function(next) {
  if (!this.employeeId) {
    try {
      const institute = await mongoose.model('Institute').findById(this.institute);
      const department = await mongoose.model('Department').findById(this.department);
      const deptCode = department?.code || 'GEN';
      
      const count = await this.constructor.countDocuments({
        institute: this.institute,
        department: this.department
      });
      
      this.employeeId = `T${institute.code}${deptCode}${String(count + 1).padStart(4, '0')}`;
    } catch (error) {
      return next(error);
    }
  }
  next();
});

const Teacher = User.discriminator('teacher', TeacherSchema);
module.exports = Teacher;