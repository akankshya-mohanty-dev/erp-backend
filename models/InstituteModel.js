const mongoose = require('mongoose');

const InstituteSchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: [true, 'Institute name is required'],
    unique: true,
    trim: true
  },
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    maxlength: 10
  },
  type: {
    type: String,
    enum: ['school', 'college', 'university', 'coaching', 'training_institute', 'other'],
    required: true
  },
  category: {
    type: String,
    enum: ['government', 'private_aided', 'private_unaided', 'autonomous', 'deemed']
  },
  
  // Contact Information
  contact: {
    email: {
      type: String,
      required: true,
      lowercase: true
    },
    phone: {
      type: String,
      required: true
    },
    alternatePhone: String,
    fax: String,
    website: String
  },
  
  // Address
  address: {
    addressLine1: {
      type: String,
      required: true
    },
    addressLine2: String,
    city: {
      type: String,
      required: true
    },
    state: {
      type: String,
      required: true
    },
    country: {
      type: String,
      default: 'India'
    },
    pincode: {
      type: String,
      required: true
    },
    latitude: Number,
    longitude: Number
  },
  
  // Registration & Accreditation
  registration: {
    registrationNumber: String,
    registrationDate: Date,
    registrationAuthority: String
  },
  accreditation: [{
    body: String,
    certificateNumber: String,
    accreditationDate: Date,
    validity: Date,
    grade: String,
    status: {
      type: String,
      enum: ['valid', 'expired', 'suspended']
    }
  }],
  affiliation: [{
    university: String,
    board: String,
    code: String,
    affiliationDate: Date,
    validity: Date
  }],
  
  // Branding
  branding: {
    logo: {
      type: String,
      default: 'default-logo.png'
    },
    logoUrl: String,
    theme: {
      primaryColor: {
        type: String,
        default: '#1976d2'
      },
      secondaryColor: {
        type: String,
        default: '#dc004e'
      },
      fontFamily: String,
      logoDarkMode: String
    },
    favicon: String
  },
  
  // SaaS Subscription
  subscription: {
    plan: {
      type: String,
      enum: ['free_trial', 'basic', 'standard', 'premium', 'enterprise'],
      default: 'free_trial'
    },
    startDate: {
      type: Date,
      default: Date.now
    },
    endDate: Date,
    isActive: {
      type: Boolean,
      default: true
    },
    autoRenew: {
      type: Boolean,
      default: true
    },
    modules: [{
      name: {
        type: String,
        enum: ['academic', 'attendance', 'lms', 'exam', 'fee', 'hr', 'inventory', 'transport', 'hostel', 'library']
      },
      isActive: Boolean,
      activatedOn: Date
    }],
    limits: {
      maxUsers: {
        type: Number,
        default: 100
      },
      maxStorage: {
        type: Number,
        default: 10 // GB
      },
      maxStudents: {
        type: Number,
        default: 1000
      },
      maxTeachers: {
        type: Number,
        default: 100
      }
    }
  },
  
  // Academic Settings
  academicSettings: {
    academicYear: {
      type: String,
      required: true,
      default: '2024-2025'
    },
    terms: [{
      name: String,
      startDate: Date,
      endDate: Date,
      isCurrent: Boolean
    }],
    gradingSystem: {
      type: {
        type: String,
        enum: ['percentage', 'cgpa', 'letter_grade', 'gpa'],
        default: 'percentage'
      },
      passingPercentage: {
        type: Number,
        default: 35
      },
      gradeScale: [{
        minPercentage: Number,
        maxPercentage: Number,
        grade: String,
        gradePoint: Number
      }]
    },
    attendance: {
      minPercentage: {
        type: Number,
        default: 75
      },
      calculationMethod: {
        type: String,
        enum: ['daily', 'subject_wise', 'session_wise'],
        default: 'daily'
      },
      lateMarking: {
        enabled: Boolean,
        gracePeriod: Number // in minutes
      },
      autoLock: {
        enabled: Boolean,
        lockAfter: Number // in hours
      }
    },
    workingDays: [{
      type: String,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    }],
    holidays: [{
      name: String,
      date: Date,
      type: {
        type: String,
        enum: ['national', 'regional', 'institute', 'other']
      }
    }]
  },
  
  // Fee Settings
  feeSettings: {
    currency: {
      type: String,
      default: 'INR'
    },
    symbol: {
      type: String,
      default: '₹'
    },
    tax: {
      enabled: Boolean,
      percentage: Number,
      gstNumber: String
    },
    lateFee: {
      enabled: Boolean,
      percentage: Number,
      gracePeriod: Number // in days
    },
    paymentModes: [{
      type: String,
      enum: ['cash', 'cheque', 'online', 'upi', 'card', 'net_banking']
    }],
    bankAccounts: [{
      accountName: String,
      bankName: String,
      accountNumber: String,
      ifscCode: String,
      branch: String,
      isPrimary: Boolean
    }]
  },
  
  // Statistics
  statistics: {
    totalStudents: {
      type: Number,
      default: 0
    },
    totalTeachers: {
      type: Number,
      default: 0
    },
    totalStaff: {
      type: Number,
      default: 0
    },
    totalCourses: {
      type: Number,
      default: 0
    },
    totalClasses: {
      type: Number,
      default: 0
    },
    feeCollection: {
      total: {
        type: Number,
        default: 0
      },
      collected: {
        type: Number,
        default: 0
      },
      pending: {
        type: Number,
        default: 0
      }
    }
  },
  
  // Super Admin Reference
  superAdmin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Institute Admin
  instituteAdmin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Status
  status: {
    type: String,
    enum: ['active', 'suspended', 'trial', 'inactive', 'pending_verification'],
    default: 'pending_verification'
  },
  verification: {
    verified: {
      type: Boolean,
      default: false
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    verifiedDate: Date,
    documents: [{
      type: String,
      url: String
    }]
  }
}, {
  timestamps: true
});

// Auto-generate institute code
InstituteSchema.pre('save', async function(next) {
  if (!this.code) {
    try {
      const nameWords = this.name.split(' ');
      let code = '';
      
      if (nameWords.length >= 2) {
        code = nameWords[0].substring(0, 2).toUpperCase() + 
               nameWords[1].substring(0, 2).toUpperCase();
      } else {
        code = this.name.substring(0, 4).toUpperCase();
      }
      
      // Add random numbers
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      this.code = `${code}${randomNum}`;
    } catch (error) {
      return next(error);
    }
  }
  next();
});

module.exports = mongoose.model('Institute', InstituteSchema);