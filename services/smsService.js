const logger = require('../utils/logger');

// Mock SMS service - integrate with actual provider like Twilio, MessageBird, etc.
exports.sendSMS = async (options) => {
  if (process.env.SMS_ENABLED !== 'true') {
    logger.warn('SMS service is disabled');
    return { success: false, message: 'SMS service disabled' };
  }

  try {
    const { to, message, template, data } = options;

    if (!to) {
      throw new Error('Recipient phone number is required');
    }

    if (!message && !template) {
      throw new Error('Message or template is required');
    }

    let finalMessage = message;

    // If using template, replace placeholders
    if (template && data) {
      finalMessage = this.renderTemplate(template, data);
    }

    // Here you would integrate with your SMS provider
    // Example for Twilio:
    /*
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const client = require('twilio')(accountSid, authToken);

    const result = await client.messages.create({
      body: finalMessage,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: to
    });
    */

    // For now, just log the SMS
    logger.info(`SMS to ${to}: ${finalMessage.substring(0, 50)}...`);

    return {
      success: true,
      message: 'SMS sent successfully',
      // For actual provider, include provider response
      // providerResponse: result
    };

  } catch (error) {
    logger.error('SMS sending failed:', error);
    throw error;
  }
};

// Render SMS template
exports.renderTemplate = (template, data) => {
  const templates = {
    otp: `Your OTP is ${data.otp}. Valid for ${data.expiryTime || '10 minutes'}.`,
    welcome: `Welcome to ${data.instituteName}! Your account has been created successfully.`,
    passwordReset: `Password reset OTP: ${data.otp}. Valid for ${data.expiryTime || '10 minutes'}.`,
    attendanceAlert: `Attendance Alert: ${data.studentName} was ${data.status} on ${data.date}.`,
    feeReminder: `Fee Reminder: ${data.amount} due on ${data.dueDate}.`,
    examSchedule: `Exam Alert: ${data.examName} on ${data.date} at ${data.time}.`,
    assignmentDeadline: `Assignment Reminder: ${data.assignmentName} due on ${data.dueDate}.`,
    leaveApproved: `Leave Request Approved: ${data.leaveType} from ${data.fromDate} to ${data.toDate}.`,
    leaveRejected: `Leave Request Rejected: ${data.leaveType}. Reason: ${data.reason}.`
  };

  let message = templates[template] || template;

  // Replace placeholders
  Object.keys(data).forEach(key => {
    const placeholder = `{${key}}`;
    message = message.replace(new RegExp(placeholder, 'g'), data[key]);
  });

  return message;
};

// Send bulk SMS
exports.sendBulkSMS = async (phoneNumbers, options) => {
  if (process.env.SMS_ENABLED !== 'true') {
    logger.warn('Bulk SMS service is disabled');
    return { success: false, message: 'SMS service disabled' };
  }

  const results = [];
  
  for (const phoneNumber of phoneNumbers) {
    try {
      const result = await this.sendSMS({
        ...options,
        to: phoneNumber
      });
      results.push({ phoneNumber, success: true, result });
    } catch (error) {
      results.push({ phoneNumber, success: false, error: error.message });
    }
  }
  
  return results;
};

// Validate phone number
exports.validatePhoneNumber = (phoneNumber) => {
  // Basic Indian phone number validation
  const indianRegex = /^[6-9]\d{9}$/;
  const internationalRegex = /^\+\d{10,15}$/;

  const cleanedNumber = phoneNumber.replace(/\D/g, '');

  if (cleanedNumber.length === 10) {
    return indianRegex.test(cleanedNumber);
  } else if (phoneNumber.startsWith('+')) {
    return internationalRegex.test(phoneNumber);
  }

  return false;
};

// Format phone number
exports.formatPhoneNumber = (phoneNumber) => {
  const cleaned = phoneNumber.replace(/\D/g, '');

  if (cleaned.length === 10) {
    return `+91${cleaned}`;
  } else if (cleaned.length > 10 && !cleaned.startsWith('91')) {
    return `+${cleaned}`;
  } else if (cleaned.length === 12 && cleaned.startsWith('91')) {
    return `+${cleaned}`;
  }

  return phoneNumber;
};