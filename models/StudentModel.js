const mongoose = require('mongoose');
const User = require('./User.model');

const StudentSchema = new mongoose.Schema({
  // Student Identification
  studentId: {
    type: String,
    unique: true,
    required: true
  },
  rollNumber: {
    type: String,
    required: true
  },
  admissionNumber: String,
  
  // Personal Details
  dateOfBirth: Date,
  gender: {
    type: String,
    enum: ['male', 'female', 'other']
  },
  bloodGroup: String,
  nationality: {
    type: String,
    default: 'Indian'
  },
  religion: String,
  caste: String,
  aadharNumber: String,
  
  // Address
  permanentAddress: {
    addressLine1: String,
    addressLine2: String,
    city: String,
    state: String,
    country: String,
    pincode: String
  },
  correspondenceAddress: {
    sameAsPermanent: {
      type: Boolean,
      default: true
    },
    addressLine1: String,
    addressLine2: String,
    city: String,
    state: String,
    country: String,
    pincode: String
  },
  
  // Academic Details
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
  section: String,
  academicYear: {
    type: String,
    required: true
  },
  batch: String,
  semester: Number,
  
  // Parent/Guardian Details
  father: {
    name: String,
    occupation: String,
    qualification: String,
    phone: String,
    email: String,
    annualIncome: Number
  },
  mother: {
    name: String,
    occupation: String,
    qualification: String,
    phone: String,
    email: String,
    annualIncome: Number
  },
  guardian: {
    name: String,
    relation: String,
    occupation: String,
    phone: String,
    email: String,
    address: String
  },
  
  // Emergency Contact
  emergencyContact: {
    name: String,
    relation: String,
    phone: String,
    alternatePhone: String
  },
  
  // Medical Information
  medicalInfo: {
    bloodGroup: String,
    allergies: [String],
    medicalConditions: [String],
    disability: String,
    height: Number, // in cm
    weight: Number // in kg
  },
  
  // Transport
  transport: {
    usesTransport: {
      type: Boolean,
      default: false
    },
    route: String,
    pickupPoint: String,
    dropPoint: String,
    vehicleNumber: String
  },
  
  // Hostel
  hostel: {
    isHosteller: {
      type: Boolean,
      default: false
    },
    hostelName: String,
    roomNumber: String,
    block: String,
    bedNumber: String
  },
  
  // Documents
  documents: [{
    documentType: {
      type: String,
      enum: ['birth_certificate', 'transfer_certificate', 'aadhar', 'pan', 'passport', 'marksheet', 'photo']
    },
    documentName: String,
    documentUrl: String,
    uploadDate: Date,
    verified: {
      type: Boolean,
      default: false
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    verifiedDate: Date
  }],
  
  // Academic Performance
  attendancePercentage: {
    type: Number,
    default: 0
  },
  cgpa: {
    type: Number,
    default: 0
  },
  overallGrade: String,
  
  // Status
  admissionDate: {
    type: Date,
    default: Date.now
  },
  leavingDate: Date,
  isGraduated: {
    type: Boolean,
    default: false
  },
  graduationDate: Date,
  leavingReason: String,
  
  // Fees
  feeCategory: String, // General, SC, ST, OBC, etc.
  feeConcession: {
    type: Number,
    default: 0
  },
  scholarship: {
    type: Boolean,
    default: false
  },
  scholarshipDetails: String
}, {
  timestamps: true
});

// Auto-generate student ID
StudentSchema.pre('save', async function(next) {
  if (!this.studentId) {
    try {
      const institute = await mongoose.model('Institute').findById(this.institute);
      const year = new Date().getFullYear().toString().slice(-2);
      const course = await mongoose.model('Course').findById(this.course);
      const courseCode = course?.code?.substring(0, 3) || 'GEN';
      
      const count = await this.constructor.countDocuments({
        institute: this.institute,
        academicYear: this.academicYear
      });
      
      this.studentId = `${institute.code}${year}${courseCode}${String(count + 1).padStart(4, '0')}`;
    } catch (error) {
      return next(error);
    }
  }
  next();
});

const Student = User.discriminator('student', StudentSchema);
module.exports = Student;