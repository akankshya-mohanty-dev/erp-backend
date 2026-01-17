const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema({
  // Entity Information
  entityType: {
    type: String,
    required: true,
    enum: ['User', 'Student', 'Teacher', 'Institute', 'Course', 'Class', 'Attendance', 'Assignment', 'Exam', 'Fee', 'Leave', 'Notification', 'SupportTicket', 'System']
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  
  // Action Information
  action: {
    type: String,
    required: true,
    enum: ['create', 'update', 'delete', 'login', 'logout', 'approve', 'reject', 'publish', 'archive', 'restore', 'export', 'import', 'payment', 'refund', 'reset_password']
  },
  actionDetails: String,
  
  // Changes Tracking
  changes: {
    before: mongoose.Schema.Types.Mixed,
    after: mongoose.Schema.Types.Mixed,
    changedFields: [String],
    ipAddress: String,
    userAgent: String
  },
  
  // User Information
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  performedByName: String,
  performedByRole: String,
  performedByIp: String,
  
  // Institute Context
  institute: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Institute'
  },
  
  // Metadata
  metadata: mongoose.Schema.Types.Mixed,
  
  // Timestamp
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
AuditLogSchema.index({ entityType: 1, entityId: 1 });
AuditLogSchema.index({ performedBy: 1, timestamp: -1 });
AuditLogSchema.index({ institute: 1, timestamp: -1 });
AuditLogSchema.index({ action: 1, timestamp: -1 });
AuditLogSchema.index({ timestamp: -1 });

// Pre-save middleware
AuditLogSchema.pre('save', async function(next) {
  // Auto-populate user details if not provided
  if (this.performedBy && (!this.performedByName || !this.performedByRole)) {
    try {
      const User = mongoose.model('User');
      const user = await User.findById(this.performedBy);
      if (user) {
        this.performedByName = user.fullName || `${user.firstName} ${user.lastName}`;
        this.performedByRole = user.role;
      }
    } catch (error) {
      console.error('Error fetching user details for audit log:', error);
    }
  }
  
  next();
});

// Static method to log an action
AuditLogSchema.statics.log = async function(logData) {
  try {
    const auditLog = await this.create(logData);
    return auditLog;
  } catch (error) {
    console.error('Error creating audit log:', error);
    // Don't throw error for audit logging failures
    return null;
  }
};

// Static method to log user login
AuditLogSchema.statics.logLogin = async function(userId, ipAddress, userAgent, instituteId) {
  return await this.log({
    entityType: 'User',
    entityId: userId,
    action: 'login',
    changes: {
      ipAddress: ipAddress,
      userAgent: userAgent
    },
    performedBy: userId,
    performedByIp: ipAddress,
    institute: instituteId,
    metadata: {
      loginTime: new Date()
    }
  });
};

// Static method to log user logout
AuditLogSchema.statics.logLogout = async function(userId, ipAddress, instituteId) {
  return await this.log({
    entityType: 'User',
    entityId: userId,
    action: 'logout',
    performedBy: userId,
    performedByIp: ipAddress,
    institute: instituteId,
    metadata: {
      logoutTime: new Date()
    }
  });
};

// Static method to log entity creation
AuditLogSchema.statics.logCreate = async function(entityType, entityId, data, userId, instituteId, ipAddress) {
  return await this.log({
    entityType: entityType,
    entityId: entityId,
    action: 'create',
    changes: {
      after: data
    },
    performedBy: userId,
    performedByIp: ipAddress,
    institute: instituteId,
    metadata: {
      createdAt: new Date()
    }
  });
};

// Static method to log entity update
AuditLogSchema.statics.logUpdate = async function(entityType, entityId, before, after, changedFields, userId, instituteId, ipAddress) {
  return await this.log({
    entityType: entityType,
    entityId: entityId,
    action: 'update',
    changes: {
      before: before,
      after: after,
      changedFields: changedFields
    },
    performedBy: userId,
    performedByIp: ipAddress,
    institute: instituteId,
    metadata: {
      updatedAt: new Date()
    }
  });
};

// Static method to log entity deletion
AuditLogSchema.statics.logDelete = async function(entityType, entityId, data, userId, instituteId, ipAddress) {
  return await this.log({
    entityType: entityType,
    entityId: entityId,
    action: 'delete',
    changes: {
      before: data
    },
    performedBy: userId,
    performedByIp: ipAddress,
    institute: instituteId,
    metadata: {
      deletedAt: new Date()
    }
  });
};

// Static method to get audit trail for an entity
AuditLogSchema.statics.getAuditTrail = async function(entityType, entityId, options = {}) {
  const {
    startDate,
    endDate,
    action,
    performedBy,
    limit = 100,
    skip = 0
  } = options;
  
  const query = { entityType, entityId };
  
  if (startDate || endDate) {
    query.timestamp = {};
    if (startDate) query.timestamp.$gte = new Date(startDate);
    if (endDate) query.timestamp.$lte = new Date(endDate);
  }
  
  if (action) query.action = action;
  if (performedBy) query.performedBy = performedBy;
  
  const logs = await this.find(query)
    .populate('performedBy', 'firstName lastName email role')
    .sort({ timestamp: -1 })
    .limit(limit)
    .skip(skip);
  
  const total = await this.countDocuments(query);
  
  return {
    logs,
    pagination: {
      total,
      limit,
      skip,
      hasMore: total > skip + limit
    }
  };
};

// Static method to get user activity log
AuditLogSchema.statics.getUserActivity = async function(userId, options = {}) {
  const {
    startDate,
    endDate,
    entityType,
    action,
    limit = 100,
    skip = 0
  } = options;
  
  const query = { performedBy: userId };
  
  if (startDate || endDate) {
    query.timestamp = {};
    if (startDate) query.timestamp.$gte = new Date(startDate);
    if (endDate) query.timestamp.$lte = new Date(endDate);
  }
  
  if (entityType) query.entityType = entityType;
  if (action) query.action = action;
  
  const logs = await this.find(query)
    .populate('institute', 'name code')
    .sort({ timestamp: -1 })
    .limit(limit)
    .skip(skip);
  
  const total = await this.countDocuments(query);
  
  return {
    logs,
    pagination: {
      total,
      limit,
      skip,
      hasMore: total > skip + limit
    }
  };
};

// Static method to get institute audit report
AuditLogSchema.statics.getInstituteAuditReport = async function(instituteId, options = {}) {
  const {
    startDate,
    endDate,
    entityType,
    action,
    performedBy,
    groupBy = 'day'
  } = options;
  
  const query = { institute: instituteId };
  
  if (startDate || endDate) {
    query.timestamp = {};
    if (startDate) query.timestamp.$gte = new Date(startDate);
    if (endDate) query.timestamp.$lte = new Date(endDate);
  }
  
  if (entityType) query.entityType = entityType;
  if (action) query.action = action;
  if (performedBy) query.performedBy = performedBy;
  
  // Get logs
  const logs = await this.find(query)
    .populate('performedBy', 'firstName lastName email role')
    .sort({ timestamp: -1 })
    .limit(1000);
  
  // Generate statistics
  const statistics = {
    totalActions: logs.length,
    byAction: {},
    byEntity: {},
    byUser: {},
    byHour: {},
    byDay: {}
  };
  
  logs.forEach(log => {
    // Count by action
    statistics.byAction[log.action] = (statistics.byAction[log.action] || 0) + 1;
    
    // Count by entity
    statistics.byEntity[log.entityType] = (statistics.byEntity[log.entityType] || 0) + 1;
    
    // Count by user
    const userId = log.performedBy?._id?.toString() || 'unknown';
    if (!statistics.byUser[userId]) {
      statistics.byUser[userId] = {
        count: 0,
        name: log.performedByName || 'Unknown',
        role: log.performedByRole || 'unknown'
      };
    }
    statistics.byUser[userId].count++;
    
    // Count by hour
    const hour = log.timestamp.getHours();
    statistics.byHour[hour] = (statistics.byHour[hour] || 0) + 1;
    
    // Count by day
    const day = log.timestamp.toISOString().split('T')[0];
    statistics.byDay[day] = (statistics.byDay[day] || 0) + 1;
  });
  
  // Get top activities
  const topActivities = logs
    .slice(0, 10)
    .map(log => ({
      timestamp: log.timestamp,
      action: log.action,
      entityType: log.entityType,
      performedByName: log.performedByName,
      actionDetails: log.actionDetails
    }));
  
  return {
    statistics,
    topActivities,
    filters: options
  };
};

// Method to format audit log for display
AuditLogSchema.methods.formatForDisplay = function() {
  const formatDate = (date) => {
    return date ? new Date(date).toLocaleString() : '';
  };
  
  let description = '';
  
  switch (this.action) {
    case 'create':
      description = `${this.performedByName} created ${this.entityType.toLowerCase()} ${this.entityId}`;
      break;
    case 'update':
      description = `${this.performedByName} updated ${this.entityType.toLowerCase()} ${this.entityId}`;
      if (this.changes.changedFields && this.changes.changedFields.length > 0) {
        description += ` (Changed: ${this.changes.changedFields.join(', ')})`;
      }
      break;
    case 'delete':
      description = `${this.performedByName} deleted ${this.entityType.toLowerCase()} ${this.entityId}`;
      break;
    case 'login':
      description = `${this.performedByName} logged in`;
      if (this.changes.ipAddress) {
        description += ` from IP: ${this.changes.ipAddress}`;
      }
      break;
    case 'logout':
      description = `${this.performedByName} logged out`;
      break;
    default:
      description = `${this.performedByName} performed ${this.action} on ${this.entityType.toLowerCase()} ${this.entityId}`;
  }
  
  return {
    id: this._id,
    timestamp: formatDate(this.timestamp),
    action: this.action,
    entityType: this.entityType,
    entityId: this.entityId,
    description: description,
    performedBy: {
      id: this.performedBy,
      name: this.performedByName,
      role: this.performedByRole
    },
    institute: this.institute,
    changes: this.changes,
    metadata: this.metadata
  };
};

module.exports = mongoose.model('AuditLog', AuditLogSchema);