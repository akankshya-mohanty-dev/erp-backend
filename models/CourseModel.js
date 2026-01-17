const mongoose = require('mongoose');

const CourseSchema = new mongoose.Schema({
  institute: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Institute',
    required: true
  },
  name: {
    type: String,
    required: [true, 'Course name is required'],
    trim: true
  },
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
  },
  description: String,
  type: {
    type: String,
    enum: ['undergraduate', 'postgraduate', 'diploma', 'certificate', 'school', 'coaching', 'vocational'],
    required: true
  },
  level: {
    type: String,
    enum: ['primary', 'secondary', 'higher_secondary', 'degree', 'masters', 'phd']
  },
  duration: {
    years: Number,
    semesters: Number,
    months: Number
  },
  academicPattern: {
    type: String,
    enum: ['semester', 'annual', 'trimester', 'quarter'],
    default: 'semester'
  },
  totalCredits: Number,
  minCreditsForCompletion: Number,
  
  // Eligibility
  eligibility: {
    minQualification: String,
    minPercentage: Number,
    entranceExam: String,
    ageLimit: {
      min: Number,
      max: Number
    }
  },
  
  // Fee Structure Reference
  feeStructure: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FeeStructure'
  },
  
  // Subjects/Syllabus
  syllabus: [{
    semester: Number,
    subjects: [{
      subject: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subject'
      },
      isElective: Boolean,
      electiveGroup: String,
      credits: Number,
      lectureHours: Number,
      tutorialHours: Number,
      practicalHours: Number,
      internalMarks: Number,
      externalMarks: Number,
      totalMarks: Number,
      passingMarks: Number
    }],
    totalCredits: Number
  }],
  
  // Department
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department'
  },
  
  // Course Coordinator
  coordinator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher'
  },
  
  // Admission Details
  admission: {
    open: {
      type: Boolean,
      default: false
    },
    startDate: Date,
    endDate: Date,
    intake: {
      total: Number,
      general: Number,
      sc: Number,
      st: Number,
      obc: Number,
      other: Number,
      filled: {
        type: Number,
        default: 0
      }
    },
    applicationFee: Number
  },
  
  // Status
  isActive: {
    type: Boolean,
    default: true
  },
  approvalStatus: {
    type: String,
    enum: ['draft', 'pending_approval', 'approved', 'rejected'],
    default: 'draft'
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvalDate: Date
}, {
  timestamps: true
});

// Auto-generate course code
CourseSchema.pre('save', async function(next) {
  if (!this.code) {
    try {
      const institute = await mongoose.model('Institute').findById(this.institute);
      const nameWords = this.name.split(' ');
      let code = '';
      
      if (nameWords.length >= 2) {
        code = nameWords[0].substring(0, 1).toUpperCase() + 
               nameWords[1].substring(0, 1).toUpperCase();
      } else {
        code = this.name.substring(0, 2).toUpperCase();
      }
      
      const count = await this.constructor.countDocuments({
        institute: this.institute,
        type: this.type
      });
      
      this.code = `${institute.code}-${code}-${String(count + 1).padStart(3, '0')}`;
    } catch (error) {
      return next(error);
    }
  }
  next();
});

module.exports = mongoose.model('Course', CourseSchema);