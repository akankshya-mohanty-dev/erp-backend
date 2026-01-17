const mongoose = require('mongoose');

const SubjectSchema = new mongoose.Schema({
  institute: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Institute',
    required: true
  },
  name: {
    type: String,
    required: [true, 'Subject name is required'],
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
    enum: ['core', 'elective', 'lab', 'project', 'seminar', 'workshop', 'tutorial'],
    default: 'core'
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department'
  },
  
  // Credit System
  credits: {
    type: Number,
    default: 3
  },
  hours: {
    lecture: Number,
    tutorial: Number,
    practical: Number,
    total: Number
  },
  
  // Marks Distribution
  marks: {
    internal: {
      theory: Number,
      practical: Number,
      assignment: Number,
      attendance: Number,
      total: Number
    },
    external: {
      theory: Number,
      practical: Number,
      total: Number
    },
    total: Number,
    passing: Number
  },
  
  // Syllabus
  syllabus: [{
    unit: Number,
    title: String,
    topics: [String],
    hours: Number
  }],
  references: [{
    title: String,
    author: String,
    publisher: String,
    edition: String
  }],
  
  // Status
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Auto-generate subject code
SubjectSchema.pre('save', async function(next) {
  if (!this.code) {
    try {
      const institute = await mongoose.model('Institute').findById(this.institute);
      const nameWords = this.name.split(' ');
      let code = '';
      
      if (nameWords.length >= 2) {
        code = nameWords[0].substring(0, 3).toUpperCase() + 
               nameWords[1].substring(0, 3).toUpperCase();
      } else {
        code = this.name.substring(0, 6).toUpperCase();
      }
      
      const count = await this.constructor.countDocuments({
        institute: this.institute,
        department: this.department
      });
      
      this.code = `${institute.code}-${code}-${String(count + 1).padStart(3, '0')}`;
    } catch (error) {
      return next(error);
    }
  }
  next();
});

module.exports = mongoose.model('Subject', SubjectSchema);