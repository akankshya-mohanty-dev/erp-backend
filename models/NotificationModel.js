const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  institute: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Institute'
  },
  
  // Notification Details
  title: {
    type: String,
    required: [true, 'Notification title is required'],
    trim: true
  },
  message: {
    type: String,
    required: true
  },
  shortMessage: String,
  type: {
    type: String,
    enum: ['academic', 'fee', 'attendance', 'exam', 'assignment', 'holiday', 'event', 'alert', 'system', 'announcement', 'result', 'leave', 'payment'],
    required: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  category: String,
  
  // Sender Information
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  senderName: String,
  senderRole: String,
  senderDepartment: String,
  
  // Recipients Configuration
  targetAudience: {
    type: {
      type: String,
      enum: ['all', 'roles', 'users', 'groups', 'courses', 'classes', 'departments', 'custom'],
      default: 'all'
    },
    roles: [String],
    users: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    groups: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class'
    }],
    courses: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course'
    }],
    classes: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class'
    }],
    departments: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department'
    }],
    year: String,
    semester: Number,
    section: String
  },
  
  // Content & Media
  attachments: [{
    name: String,
    url: String,
    type: String,
    size: Number,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  images: [String],
  thumbnail: String,
  link: String,
  action: {
    text: String,
    url: String,
    type: {
      type: String,
      enum: ['view', 'download', 'approve', 'reject', 'pay', 'submit', 'mark', 'view_details']
    }
  },
  
  // Delivery Configuration
  delivery: {
    channels: [{
      type: String,
      enum: ['in_app', 'email', 'sms', 'push', 'whatsapp'],
      required: true
    }],
    schedule: {
      type: {
        type: String,
        enum: ['immediate', 'scheduled', 'recurring'],
        default: 'immediate'
      },
      date: Date,
      time: String,
      timezone: String,
      recurrence: {
        pattern: String, // daily, weekly, monthly
        interval: Number,
        daysOfWeek: [String],
        endDate: Date
      }
    },
    retryAttempts: {
      type: Number,
      default: 3
    },
    expiryHours: {
      type: Number,
      default: 168 // 7 days
    }
  },
  
  // Status Tracking
  status: {
    type: String,
    enum: ['draft', 'scheduled', 'processing', 'sent', 'partial', 'failed', 'cancelled'],
    default: 'draft'
  },
  processingStartedAt: Date,
  sentAt: Date,
  completedAt: Date,
  expiresAt: Date,
  
  // Delivery Statistics
  statistics: {
    totalRecipients: {
      type: Number,
      default: 0
    },
    inApp: {
      sent: {
        type: Number,
        default: 0
      },
      delivered: {
        type: Number,
        default: 0
      },
      read: {
        type: Number,
        default: 0
      },
      clicked: {
        type: Number,
        default: 0
      }
    },
    email: {
      sent: {
        type: Number,
        default: 0
      },
      delivered: {
        type: Number,
        default: 0
      },
      opened: {
        type: Number,
        default: 0
      },
      clicked: {
        type: Number,
        default: 0
      },
      bounced: {
        type: Number,
        default: 0
      }
    },
    sms: {
      sent: {
        type: Number,
        default: 0
      },
      delivered: {
        type: Number,
        default: 0
      },
      failed: {
        type: Number,
        default: 0
      }
    },
    push: {
      sent: {
        type: Number,
        default: 0
      },
      delivered: {
        type: Number,
        default: 0
      },
      opened: {
        type: Number,
        default: 0
      }
    }
  },
  
  // Failure Details
  failures: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    channel: String,
    error: String,
    attemptedAt: Date,
    retryCount: Number
  }],
  
  // Response Tracking
  responses: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    channel: String,
    action: String,
    respondedAt: Date,
    ipAddress: String,
    userAgent: String
  }],
  
  // Settings
  settings: {
    requireAcknowledgement: {
      type: Boolean,
      default: false
    },
    allowReply: {
      type: Boolean,
      default: false
    },
    enableTracking: {
      type: Boolean,
      default: true
    },
    isImportant: {
      type: Boolean,
      default: false
    },
    pinToTop: {
      type: Boolean,
      default: false
    }
  },
  
  // Metadata
  metadata: mongoose.Schema.Types.Mixed,
  tags: [String],
  referenceId: String, // For linking to specific records
  
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

// Sub-schema for User Notifications (Read Status)
const UserNotificationSchema = new mongoose.Schema({
  notification: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Notification',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['sent', 'delivered', 'read', 'clicked', 'archived', 'deleted'],
    default: 'sent'
  },
  readAt: Date,
  clickedAt: Date,
  archivedAt: Date,
  channel: String,
  deliveryAttempts: [{
    attemptedAt: Date,
    status: String,
    error: String
  }]
}, {
  timestamps: true
});

// Indexes
NotificationSchema.index({ institute: 1, status: 1 });
NotificationSchema.index({ institute: 1, type: 1 });
NotificationSchema.index({ institute: 1, 'delivery.schedule.date': 1 });
NotificationSchema.index({ institute: 1, createdAt: -1 });
NotificationSchema.index({ institute: 1, sender: 1 });
NotificationSchema.index({ institute: 1, 'targetAudience.type': 1 });

UserNotificationSchema.index({ user: 1, notification: 1 }, { unique: true });
UserNotificationSchema.index({ user: 1, status: 1 });
UserNotificationSchema.index({ user: 1, readAt: 1 });
UserNotificationSchema.index({ notification: 1, status: 1 });

// Pre-save middleware
NotificationSchema.pre('save', function(next) {
  // Generate short message if not provided
  if (!this.shortMessage && this.message) {
    this.shortMessage = this.message.length > 100 
      ? this.message.substring(0, 100) + '...' 
      : this.message;
  }
  
  // Calculate expiry date
  if (!this.expiresAt) {
    const expiryDate = new Date();
    expiryDate.setHours(expiryDate.getHours() + (this.delivery.expiryHours || 168));
    this.expiresAt = expiryDate;
  }
  
  // Auto-set sentAt for immediate notifications
  if (this.delivery.schedule.type === 'immediate' && this.status === 'sent' && !this.sentAt) {
    this.sentAt = new Date();
  }
  
  // Set processing started date
  if (this.status === 'processing' && !this.processingStartedAt) {
    this.processingStartedAt = new Date();
  }
  
  // Set completed date
  if (['sent', 'partial', 'failed'].includes(this.status) && !this.completedAt) {
    this.completedAt = new Date();
  }
  
  next();
});

// Static method to send notification
NotificationSchema.statics.sendNotification = async function(notificationData) {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    // Create notification
    const notification = await this.create([notificationData], { session });
    
    // Determine recipients
    const recipients = await this.determineRecipients(notificationData.targetAudience);
    
    // Create user notification entries
    const UserNotification = mongoose.model('UserNotification');
    const userNotifications = recipients.map(userId => ({
      notification: notification[0]._id,
      user: userId,
      status: 'sent'
    }));
    
    await UserNotification.insertMany(userNotifications, { session });
    
    // Update statistics
    notification[0].statistics.totalRecipients = recipients.length;
    await notification[0].save({ session });
    
    await session.commitTransaction();
    
    // Trigger delivery through different channels
    await this.triggerDelivery(notification[0], recipients);
    
    return notification[0];
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

// Static method to determine recipients
NotificationSchema.statics.determineRecipients = async function(targetAudience) {
  const User = mongoose.model('User');
  let query = { isActive: true };
  
  switch (targetAudience.type) {
    case 'all':
      // All active users in institute
      break;
      
    case 'roles':
      query.role = { $in: targetAudience.roles };
      break;
      
    case 'users':
      query._id = { $in: targetAudience.users };
      break;
      
    case 'groups':
      const Class = mongoose.model('Class');
      const classes = await Class.find({ _id: { $in: targetAudience.groups } }).populate('students');
      const studentIds = classes.flatMap(cls => cls.students);
      query._id = { $in: studentIds };
      break;
      
    case 'courses':
      const Student = mongoose.model('Student');
      const students = await Student.find({ course: { $in: targetAudience.courses } });
      query._id = { $in: students.map(s => s._id) };
      break;
      
    case 'classes':
      const studentsInClasses = await Student.find({ class: { $in: targetAudience.classes } });
      query._id = { $in: studentsInClasses.map(s => s._id) };
      break;
      
    case 'departments':
      const Teacher = mongoose.model('Teacher');
      const teachers = await Teacher.find({ department: { $in: targetAudience.departments } });
      query._id = { $in: teachers.map(t => t._id) };
      break;
  }
  
  const users = await User.find(query).select('_id');
  return users.map(u => u._id);
};

// Static method to trigger delivery
NotificationSchema.statics.triggerDelivery = async function(notification, recipientIds) {
  const User = mongoose.model('User');
  const users = await User.find({ _id: { $in: recipientIds } });
  
  const deliveryPromises = [];
  
  notification.delivery.channels.forEach(channel => {
    switch (channel) {
      case 'in_app':
        deliveryPromises.push(this.deliverInApp(notification, users));
        break;
      case 'email':
        deliveryPromises.push(this.deliverEmail(notification, users));
        break;
      case 'sms':
        deliveryPromises.push(this.deliverSMS(notification, users));
        break;
      case 'push':
        deliveryPromises.push(this.deliverPush(notification, users));
        break;
    }
  });
  
  try {
    await Promise.all(deliveryPromises);
    notification.status = 'sent';
  } catch (error) {
    notification.status = 'partial';
    notification.failures.push({
      error: error.message,
      attemptedAt: new Date()
    });
  }
  
  await notification.save();
};

// Delivery methods (stubs - implement based on your services)
NotificationSchema.statics.deliverInApp = async function(notification, users) {
  // Implement in-app notification delivery
  // Could be using WebSockets, database updates, etc.
  console.log(`Delivering in-app notification to ${users.length} users`);
  return Promise.resolve();
};

NotificationSchema.statics.deliverEmail = async function(notification, users) {
  // Implement email delivery using nodemailer or email service
  console.log(`Delivering email notification to ${users.length} users`);
  return Promise.resolve();
};

NotificationSchema.statics.deliverSMS = async function(notification, users) {
  // Implement SMS delivery using SMS gateway
  console.log(`Delivering SMS notification to ${users.length} users`);
  return Promise.resolve();
};

NotificationSchema.statics.deliverPush = async function(notification, users) {
  // Implement push notification delivery
  console.log(`Delivering push notification to ${users.length} users`);
  return Promise.resolve();
};

// Create UserNotification model
const UserNotification = mongoose.model('UserNotification', UserNotificationSchema);

module.exports = mongoose.model('Notification', NotificationSchema);
module.exports.UserNotification = UserNotification;