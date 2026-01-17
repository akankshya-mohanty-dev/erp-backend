const mongoose = require('mongoose');

const ClassSchema = new mongoose.Schema({
  institute: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Institute',
    required: true
  },
  name: {
    type: String,
    required: [true, 'Class name is required'],
    trim: true
  },
  code: {
    type: String,
    required: true,
    unique: true
  },
  section: {
    type: String,
    default: 'A'
  },
  academicYear: {
    type: String,
    required: true
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  semester: {
    type: Number,
    min: 1,
    required: function() {
      return this.course?.academicPattern === 'semester' || 
             this.course?.academicPattern === 'trimester';
    }
  },
  year: {
    type: Number,
    min: 1,
    required: function() {
      return this.course?.academicPattern === 'annual';
    }
  },
  
 
  classTeacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher'
  },
  
  room: {
    number: String,
    building: String,
    floor: String,
    capacity: Number
  },
  
  maxStrength: {
    type: Number,
    default: 60
  },
  currentStrength: {
    type: Number,
    default: 0
  },
  
  subjects: [{
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: true
    },
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Teacher',
      required: true
    },
    isOptional: {
      type: Boolean,
      default: false
    },
    electiveGroup: String,
    credits: Number,
    lectureHours: Number,
    tutorialHours: Number,
    practicalHours: Number
  }],
  
  
  students: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student'
  }],
  
 
  timetable: [{
    day: {
      type: String,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    },
    periods: [{
      periodNumber: Number,
      startTime: String,
      endTime: String,
      subject: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subject'
      },
      teacher: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Teacher'
      },
      room: String,
      type: {
        type: String,
        enum: ['lecture', 'tutorial', 'practical', 'lab', 'break', 'activity']
      }
    }]
  }],
  
  isActive: {
    type: Boolean,
    default: true
  },
  startDate: Date,
  endDate: Date
}, {
  timestamps: true
});

ClassSchema.pre('save', async function(next) {
  if (this.isModified('students')) {
    this.currentStrength = this.students.length;
  }
 
  if (!this.code) {
    const course = await mongoose.model('Course').findById(this.course);
    this.code = `${course.code}-${this.section}-${this.academicYear.replace('-', '')}`;
  }
  
  next();
});

module.exports = mongoose.model('Class', ClassSchema);