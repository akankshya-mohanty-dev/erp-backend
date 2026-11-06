# ERP Backend

A Node.js / Express REST API for an education-institute **ERP system**. The codebase covers academics, attendance, exams, fees and payments, HR and finance, an LMS, notifications and support tickets, with role-based access for the different kinds of users in an institute.

## Features

- **Authentication and authorisation:** JWT-based login with refresh-token support, password hashing with bcrypt, and role-based access middleware
- **Roles:** `super_admin`, `institute_admin`, `director`, `principal`, `hod`, `teacher`, `accountant`, `hr`, `support_staff`, `student`, `parent`
- **Academics:** academic years, departments, classes, subjects, courses, modules and timetables
- **Attendance:** attendance sessions and records
- **Exams and marks:** exams, exam schedules and marks
- **Assignments:** assignments and student submissions
- **Fees and payments:** fee structures, invoices, payments and transactions
- **HR and payroll:** leave management and payroll
- **LMS:** course content and learning modules
- **Support:** support tickets
- **Notifications:** notification model plus email and SMS service modules
- **Audit log model** and centralised error-handling middleware

## Tech stack

- **Runtime and framework:** Node.js (ES modules), Express 5
- **Database:** MongoDB with Mongoose
- **Auth:** jsonwebtoken, bcrypt / bcryptjs
- **Other:** CORS, dotenv, nodemon (development)

> **Note:** the `config/` and `services/` folders also contain integration code for Cloudinary (file uploads), SMTP email, Twilio SMS and Redis. Those packages are not listed in `package.json` yet, so install them (for example `npm install cloudinary nodemailer twilio redis`) before enabling those features.

## Project structure

```
erp-backend/
├── config/        # database, Cloudinary, email and Redis configuration
├── controllers/   # request handlers for each module
├── middlewares/   # auth, role checks, uploads, validation, error handling
├── models/        # Mongoose schemas
├── routes/        # route definitions for each module
├── services/      # email, SMS, payment, file and report services
├── utils/         # constants, helpers, logger, permissions, validators
└── index.js       # application entry point
```

## Getting started

### Prerequisites

- Node.js 18 or newer
- A MongoDB database (local or hosted)

### Installation

```bash
git clone https://github.com/akankshya-mohanty-dev/erp-backend.git
cd erp-backend
npm install
```

### Environment variables

Create a `.env` file in the project root. **Never commit it.** The variables the code reads are:

| Variable | Purpose |
| --- | --- |
| `PORT` | Port the server listens on |
| `NODE_ENV` | `development` or `production` |
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret used to sign access tokens |
| `JWT_REFRESH_SECRET` | Secret used to sign refresh tokens |
| `JWT_COOKIE_EXPIRE` | Cookie lifetime for the token |
| `FRONTEND_URL` | Allowed frontend origin |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | Email sending |
| `SUPPORT_EMAIL` | Address for support emails |
| `SMS_ENABLED` | Turns SMS on or off |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` | SMS via Twilio |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | File uploads |

### Run

```bash
npm run dev     # development, with nodemon
npm start       # production
```

## API

The API is mounted under `/api/users`, with separate route modules for each area (auth, academics, attendance, exams, fees, finance, HR, LMS, payments, support and more). See the `routes/` folder for the full list of endpoints.

## Author

**Akankshya Mohanty** - MERN Stack Developer
[GitHub](https://github.com/akankshya-mohanty-dev) | [LinkedIn](https://www.linkedin.com/in/akankshya-mohanty-/)
