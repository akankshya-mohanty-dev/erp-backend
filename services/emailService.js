const nodemailer = require('nodemailer');
const ejs = require('ejs');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

// Create transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_PORT == 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  },
  tls: {
    rejectUnauthorized: false
  }
});

// Verify connection
transporter.verify((error, success) => {
  if (error) {
    logger.error('SMTP connection error:', error);
  } else {
    logger.info('SMTP server is ready to send messages');
  }
});

// Load email templates
const templates = {
  emailVerification: fs.readFileSync(path.join(__dirname, '../templates/emailVerification.ejs'), 'utf8'),
  passwordReset: fs.readFileSync(path.join(__dirname, '../templates/passwordReset.ejs'), 'utf8'),
  otp: fs.readFileSync(path.join(__dirname, '../templates/otp.ejs'), 'utf8'),
  welcome: fs.readFileSync(path.join(__dirname, '../templates/welcome.ejs'), 'utf8'),
  accountApproved: fs.readFileSync(path.join(__dirname, '../templates/accountApproved.ejs'), 'utf8'),
  accountDeactivated: fs.readFileSync(path.join(__dirname, '../templates/accountDeactivated.ejs'), 'utf8'),
  paymentReceipt: fs.readFileSync(path.join(__dirname, '../templates/paymentReceipt.ejs'), 'utf8'),
  attendanceAlert: fs.readFileSync(path.join(__dirname, '../templates/attendanceAlert.ejs'), 'utf8'),
  examSchedule: fs.readFileSync(path.join(__dirname, '../templates/examSchedule.ejs'), 'utf8'),
  assignmentDeadline: fs.readFileSync(path.join(__dirname, '../templates/assignmentDeadline.ejs'), 'utf8'),
  feeReminder: fs.readFileSync(path.join(__dirname, '../templates/feeReminder.ejs'), 'utf8'),
  leaveApproved: fs.readFileSync(path.join(__dirname, '../templates/leaveApproved.ejs'), 'utf8'),
  leaveRejected: fs.readFileSync(path.join(__dirname, '../templates/leaveRejected.ejs'), 'utf8'),
  notification: fs.readFileSync(path.join(__dirname, '../templates/notification.ejs'), 'utf8')
};

// Send email function
exports.sendEmail = async (options) => {
  try {
    // Get template
    const template = templates[options.template] || options.html;
    
    if (!template) {
      throw new Error(`Template ${options.template} not found`);
    }

    // Render template with data
    const html = ejs.render(template, {
      ...options.data,
      year: new Date().getFullYear(),
      supportEmail: process.env.SUPPORT_EMAIL,
      websiteUrl: process.env.FRONTEND_URL,
      logoUrl: process.env.LOGO_URL || 'https://via.placeholder.com/150x50'
    });

    // Setup email data
    const mailOptions = {
      from: `"${process.env.FROM_NAME || 'Education ERP'}" <${process.env.FROM_EMAIL || process.env.SMTP_USER}>`,
      to: options.email,
      subject: options.subject,
      html: html,
      replyTo: process.env.REPLY_TO_EMAIL || process.env.SUPPORT_EMAIL
    };

    // Add CC and BCC if provided
    if (options.cc) mailOptions.cc = options.cc;
    if (options.bcc) mailOptions.bcc = options.bcc;

    // Add attachments if provided
    if (options.attachments) mailOptions.attachments = options.attachments;

    // Send email
    const info = await transporter.sendMail(mailOptions);

    logger.info(`Email sent: ${info.messageId} to ${options.email}`);
    
    return {
      success: true,
      messageId: info.messageId,
      response: info.response
    };

  } catch (error) {
    logger.error('Email sending failed:', error);
    throw error;
  }
};

// Send bulk emails
exports.sendBulkEmail = async (emails, options) => {
  const results = [];
  
  for (const email of emails) {
    try {
      const result = await this.sendEmail({
        ...options,
        email
      });
      results.push({ email, success: true, result });
    } catch (error) {
      results.push({ email, success: false, error: error.message });
    }
  }
  
  return results;
};

// Send email with retry
exports.sendEmailWithRetry = async (options, maxRetries = 3) => {
  let lastError;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await this.sendEmail(options);
    } catch (error) {
      lastError = error;
      
      if (i < maxRetries - 1) {
        const delay = 1000 * Math.pow(2, i); // Exponential backoff
        logger.warn(`Retry ${i + 1}/${maxRetries} after ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
};

// Test email connection
exports.testConnection = async () => {
  try {
    const testEmail = {
      email: process.env.TEST_EMAIL || process.env.SMTP_USER,
      subject: 'Test Email - Education ERP',
      template: 'welcome',
      data: {
        name: 'Test User',
        instituteName: 'Education ERP Test'
      }
    };
    
    const result = await this.sendEmail(testEmail);
    return { success: true, result };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Queue email for later sending (basic implementation)
const emailQueue = [];
let isProcessing = false;

exports.queueEmail = (options) => {
  emailQueue.push(options);
  processQueue();
};

const processQueue = async () => {
  if (isProcessing || emailQueue.length === 0) return;
  
  isProcessing = true;
  
  while (emailQueue.length > 0) {
    const options = emailQueue.shift();
    
    try {
      await this.sendEmail(options);
      logger.info(`Queued email sent to ${options.email}`);
    } catch (error) {
      logger.error(`Failed to send queued email to ${options.email}:`, error);
      // You could add retry logic here or move to a dead letter queue
    }
  }
  
  isProcessing = false;
};