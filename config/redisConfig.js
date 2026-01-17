const mongoose = require('mongoose');

const DepartmentSchema = new mongoose.Schema({
  institute: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Institute',
    required: true
  },
  
  // Basic Information
  name: {
    type: String,
    required: [true, 'Department name is required'],
    trim: true
  },
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
  },
  description: String,
  
  // Department Hierarchy
  parentDepartment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department'
  },
  level: {
    type: Number,
    default: 1
  },
  isMainDepartment: {
    type: Boolean,
    default: false
  },
  
  // Department Head
  hod: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher'
  },
  hodName: String,
  hodEmail: String,
  
  // Contact Information
  contact: {
    email: String,
    phone: String,
    extension: String,
    fax: String
  },
  
  // Location
  location: {
    building: String,
    floor: String,
    room: String
  },
  
  // Academic Programs
  programs: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course'
  }],
  
  // Subjects Offered
  subjects: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject'
  }],
  
  // Faculty & Staff
  faculty: [{
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Teacher'
    },
    designation: String,
    isActive: Boolean,
    joinedDate: Date
  }],
  
  // Non-teaching Staff
  nonTeachingStaff: [{
    staff: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    designation: String,
    isActive: Boolean
  }],
  
  // Students
  students: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student'
  }],
  
  // Infrastructure
  infrastructure: {
    classrooms: Number,
    laboratories: Number,
    seminarHalls: Number,
    facultyRooms: Number,
    computerLabs: Number
  },
  
  // Budget & Resources
  budget: {
    academicYear: String,
    allocated: Number,
    utilized: Number,
    balance: Number
  },
  
  // Accreditation & Recognition
  accreditation: [{
    body: String,
    status: String,
    validity: Date,
    grade: String
  }],
  
  // Research & Publications
  research: {
    projects: Number,
    publications: Number,
    patents: Number,
    conferences: Number
  },
  
  // Statistics
  statistics: {
    totalFaculty: {
      type: Number,
      default: 0
    },
    totalStudents: {
      type: Number,
      default: 0
    },
    totalCourses: {
      type: Number,
      default: 0
    },
    totalSubjects: {
      type: Number,
      default: 0
    }
  },
  
  // Status
  isActive: {
    type: Boolean,
    default: true
  },
  establishedDate: Date,
  
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
DepartmentSchema.index({ institute: 1, code: 1 }, { unique: true });
DepartmentSchema.index({ institute: 1, name: 1 });
DepartmentSchema.index({ institute: 1, isActive: 1 });
DepartmentSchema.index({ institute: 1, hod: 1 });

// Pre-save middleware
DepartmentSchema.pre('save', async function(next) {
  // Auto-generate department code
  if (!this.code) {
    const institute = await mongoose.model('Institute').findById(this.institute);
    const nameWords = this.name.split(' ');
    let code = '';
    
    if (nameWords.length >= 2) {
      code = nameWords[0].substring(0, 3).toUpperCase() + 
             nameWords[1].substring(0, 3).toUpperCase();
    } else {
      code = this.name.substring(0, 6).toUpperCase();
    }
    
    const count = await this.constructor.countDocuments({ institute: this.institute });
    this.code = `${institute.code}-DEPT-${code}-${String(count + 1).padStart(3, '0')}`;
  }
  
  // Update statistics
  this.statistics.totalFaculty = this.faculty.length;
  this.statistics.totalStudents = this.students.length;
  this.statistics.totalCourses = this.programs.length;
  this.statistics.totalSubjects = this.subjects.length;
  
  next();
});

module.exports = mongoose.model('Department', DepartmentSchema);