# Customer & Employee International Payments Portal 


💳 Secure Payments Portal
📘 Overview

The Payments Portal is a secure full-stack web application that simulates customer registration, login, and international payment functionality.
It is built using React (Frontend) and Node.js + Express (Backend) with a MongoDB database.

Video(Demonstration) : https://drive.google.com/drive/folders/1KOuKd3WusKxYl7GmlCJ6R3Err4io84-8?usp=sharing

The project is hardened against major web security threats, including:

Session Jacking

Clickjacking

SQL Injection

Cross-Site Scripting (XSS)

Man-in-the-Middle (MITM)

Distributed Denial of Service (DDoS)

This application enforces HTTPS, CSRF protection, input validation, and other best practices to protect sensitive user and payment information.

🏗️ Project Structure

payments-portal/
│
├── backend/
│ ├── index.js # Express HTTPS server
│ ├── .env # Backend environment configuration
│ ├── cert.pem # SSL certificate
│ ├── key.pem # SSL private key
│ ├── package.json
│ └── ...
│
├── frontend/
│ ├── src/
│ │ ├── App.js # Main frontend React component
│ │ ├── setupAxios.js # Axios instance with CSRF setup
│ │ └── ...
│ ├── .env # Frontend environment configuration
│ └── package.json
│
└── README.md

⚙️ Environment Setup
1️⃣ Backend Setup
Prerequisites:

Node.js v18+

MongoDB Atlas or local MongoDB

Steps:

cd backend
npm install

Create a .env file in the backend/ folder:
MONGO_URI=mongodb+srv://<your_connection_string>
JWT_SECRET=this_is_a_long_random_secret_key
FRONTEND_ORIGIN=https://localhost:3000

USE_SECURE_COOKIES=false
HTTPS=true
PORT=4000

🛡️ The app uses self-signed certificates for HTTPS.
If you don't have them yet, run:
openssl req -nodes -new -x509 -keyout key.pem -out cert.pem

Start the secure backend:
npx nodemon index.js

When running, you should see:
✅ HTTPS API running securely at https://localhost:4000

Connected to MongoDB

2️⃣ Frontend Setup
Steps:

cd frontend
npm install

Create a .env file in the frontend/ folder:
HTTPS=true
PORT=3000
REACT_APP_API_URL=https://localhost:4000

Start the frontend:
npm start

✅ The React app will now run securely at https://localhost:3000

🔐 Security Hardenings
Attack Type Protection Implemented
Session Jacking Secure, HTTP-only JWT cookies; SameSite=Strict; Token expiration after 1 hour
Clickjacking Helmet automatically sets X-Frame-Options: DENY
SQL Injection No SQL used — all queries via Mongoose ODM (safe from injection)
Cross-Site Scripting (XSS) Input sanitization via sanitize-html; React auto-escapes output
Man-in-the-Middle (MITM) Full HTTPS with SSL certificate enforcement
DDoS Rate limiting via express-rate-limit middleware
🧱 Core Features

� Customer Features
�🔸 Registration
Customers provide:

- Full Name
- ID Number (13 digits)
- Account Number
- Password (10+ characters)
  All fields are validated and sanitized before storage.

🔸 Customer Login
Customers log in using:

- Username (Full Name)
- Account Number
- Password
  On success, a secure JWT session cookie is issued.

🔸 Payment Simulation
After logging in, customers can:

- Enter payment amount
- Choose currency
- Select a provider (SWIFT)
- Enter beneficiary name, account, and SWIFT code
- Click Pay Now to submit payment
- View their payment history and status
  Each payment is securely saved to MongoDB and requires admin verification.

👨‍💼 Admin Features
🔸 Admin Login
Administrators log in using:

- Username
- Password
- Employee ID (format: EMPxxxxxx)
  Secure admin session with role-based access control.

🔸 Payment Management
Admins can:

- View all pending payments
- Verify or reject payment requests
- Submit verified payments to SWIFT system
- Track SWIFT submission status
- Access detailed payment history

🔸 Security Controls
Admin interface includes:

- Strict authentication checks
- Employee ID verification
- Activity logging for auditing
- Secure SWIFT transaction processing
- Role-based access restrictions

🧪 Testing Notes

You can test API routes using Postman or the provided React frontend.

CSRF tokens are automatically fetched and included by the frontend via setupAxios.js.

The app enforces HTTPS — both backend and frontend must be run on secure localhost ports.

📂 API Endpoints

🔹 Customer Endpoints
Method | Endpoint | Description
-------|----------|-------------
GET | /csrf-token | Retrieve CSRF token
POST | /register | Register a new customer
POST | /login | Authenticate a customer
POST | /payment | Submit a new payment
GET | /me | Fetch current user profile
GET | /payments | View user's payment history

🔹 Admin Endpoints
Method | Endpoint | Description
-------|----------|-------------
POST | /admin/login | Admin authentication
GET | /admin/payments | View all payments
GET | /admin/payments/pending | View pending payments
POST | /admin/payments/:id/verify | Verify/reject payment
POST | /admin/payments/:id/submit-to-swift | Submit to SWIFT
GET | /admin/payments/:id/swift-status | Check SWIFT status
POST | /admin/logout | Secure admin logout
🛠️ Tech Stack

Frontend: React, Axios, CSS

Backend: Node.js, Express.js, Helmet, Csurf, Bcrypt, JWT

Database: MongoDB (via Mongoose)

Security: HTTPS, CSRF, Input Sanitization, Rate Limiting
