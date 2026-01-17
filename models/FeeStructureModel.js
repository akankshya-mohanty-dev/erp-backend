const mongoose = require('mongoose');

const FeeStructureSchema = new mongoose.Schema({
  institute: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Institute',
    required: true
  },
  
  // Basic Info
  name: {
    type: String,
    required: [true, 'Fee structure name is required'],
    trim: true
  },
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
  },
  academicYear: {
    type: String,
    required: true
  },
  
  // Applicable To
  applicableFor: {
    type: String,
    enum: ['all', 'course', 'class', 'category', 'individual'],
    default: 'all'
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course'
  },
  class: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class'
  },
  studentCategory: String, // General, SC, ST, OBC, etc.
  specificStudents: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student'
  }],
  
  // Fee Components
  components: [{
    name: {
      type: String,
      required: true
    },
    code: {
      type: String,
      required: true,
      uppercase: true
    },
    type: {
      type: String,
      enum: ['tuition', 'admission', 'exam', 'library', 'sports', 'hostel', 'transport', 'development', 'other'],
      required: true
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    isOptional: {
      type: Boolean,
      default: false
    },
    taxable: {
      type: Boolean,
      default: false
    },
    taxPercentage: {
      type: Number,
      default: 0
    },
    taxAmount: {
      type: Number,
      default: 0
    },
    totalAmount: {
      type: Number,
      default: 0
    },
    description: String,
    applicableFor: {
      type: String,
      enum: ['all', 'boys', 'girls', 'hostellers', 'day_scholars'],
      default: 'all'
    },
    refundable: {
      type: Boolean,
      default: false
    },
    refundPercentage: Number
  }],
  
  // Installments
  installments: [{
    installmentNumber: {
      type: Number,
      required: true,
      min: 1
    },
    name: String,
    dueDate: {
      type: Date,
      required: true
    },
    gracePeriod: Number, // in days
    lateFeePercentage: {
      type: Number,
      default: 0
    },
    components: [{
      componentCode: String,
      amount: Number
    }],
    totalAmount: {
      type: Number,
      default: 0
    }
  }],
  
  // Discounts & Concessions
  discounts: [{
    name: String,
    type: {
      type: String,
      enum: ['percentage', 'fixed', 'category', 'merit']
    },
    value: Number,
    applicableFor: [String],
    maxAmount: Number,
    criteria: String
  }],
  
  // Total Calculation
  totalAmount: {
    type: Number,
    default: 0
  },
  totalTax: {
    type: Number,
    default: 0
  },
  grandTotal: {
    type: Number,
    default: 0
  },
  
  // Status
  status: {
    type: String,
    enum: ['draft', 'published', 'active', 'archived'],
    default: 'draft'
  },
  publishedAt: Date,
  publishedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Validity
  validFrom: Date,
  validTo: Date,
  
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
FeeStructureSchema.index({ institute: 1, academicYear: 1 });
FeeStructureSchema.index({ institute: 1, status: 1 });
FeeStructureSchema.index({ institute: 1, course: 1, class: 1 });

// Pre-save middleware
FeeStructureSchema.pre('save', function(next) {
  // Calculate component totals
  this.components.forEach(component => {
    component.taxAmount = component.taxable ? (component.amount * component.taxPercentage) / 100 : 0;
    component.totalAmount = component.amount + component.taxAmount;
  });
  
  // Calculate installment totals
  this.installments.forEach(installment => {
    installment.totalAmount = installment.components.reduce((sum, comp) => sum + comp.amount, 0);
  });
  
  // Calculate structure totals
  this.totalAmount = this.components.reduce((sum, comp) => sum + comp.amount, 0);
  this.totalTax = this.components.reduce((sum, comp) => sum + comp.taxAmount, 0);
  this.grandTotal = this.totalAmount + this.totalTax;
  
  // Auto-generate code
  if (!this.code) {
    const year = this.academicYear.replace('-', '').slice(-4);
    const random = Math.floor(1000 + Math.random() * 9000);
    this.code = `FEE${year}${random}`;
  }
  
  next();
});

module.exports = mongoose.model('FeeStructure', FeeStructureSchema);