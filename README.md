# BRIGHT ENGLISH PORTAL
demo test website
## Overview
Bright English Portal is a modern academic document and learning management portal for an English center. It focuses on documents, folders, coursework, classes, programs, dashboard analytics, and role-based access.

## Stack
- Frontend: React, Vite, TypeScript, Tailwind CSS
- Backend: Java, Spring Boot, Spring Security, JWT, JPA
- Database: MySQL
- Storage: Local uploads directory for development; document metadata and file references are stored in MySQL

## Project structure
```text
bright-english-portal/
├── backend/
│   ├── src/main/java/com/brightenglish/portal/
│   ├── src/main/resources/
│   ├── src/test/resources/
│   └── pom.xml
├── frontend/
│   ├── src/
│   ├── package.json
│   ├── vite.config.ts
│   └── index.html
├── uploads/
├── docker-compose.yml
├── .env.example
├── README.md
└── .gitignore
```

## Demo accounts
- Admin: admin@brightenglish.com / Admin@123
- Teacher: teacher@brightenglish.com / Teacher@123
- Student: student@brightenglish.com / Student@123

## Backend setup
1. Install Java 25 (LTS) and Maven 3.9 or newer.
2. Configure MySQL and database credentials.
3. Start MySQL.
4. For email-verified registration, create a Twilio Verify Service, enable its Email channel, and configure its SendGrid integration with an authenticated sender/domain. Set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_VERIFY_SERVICE_SID` in the backend environment. Keep these credentials private; `.env.example` contains placeholders only.
5. In backend, run:

```bash
cd backend
mvn clean install
mvn spring-boot:run
```

## Frontend setup
1. Install dependencies:

```bash
cd frontend
npm install
```

2. Start the app:

```bash
npm run dev -- --host 0.0.0.0
```

The app is available at http://localhost:5173.

## Docker
```bash
docker compose up -d
```

## Notes
The backend applies versioned Flyway migrations from `backend/src/main/resources/db/migration` and validates the resulting schema at startup; Hibernate no longer changes the schema automatically. On an existing non-empty database, Flyway baselines it at version 0 and applies the initial migration without replacing existing tables. The MySQL Docker volume (`mysql_data`) and upload volume (`uploads_data`) preserve data across container restarts; do not remove these volumes when preserving data.

The `users` table stores customer/student accounts alongside admin and teacher accounts. Passwords are stored as encoded hashes, and public registration always assigns the `STUDENT` role. The `documents` table stores file metadata and the upload path; the actual file contents remain under `UPLOAD_DIR` and are not stored in MySQL. The backend seeds real development accounts, folders, and programs on an empty database. It does not seed document metadata without files: uploaded documents are stored under `UPLOAD_DIR` and their metadata is persisted in MySQL.

Document search, folder navigation, upload, preview, download, and permission checks use authenticated backend APIs. Administrators manage users; administrators and teachers can create folders and upload documents. New public registrations always receive the `STUDENT` role and require Twilio email verification.

For local development, the MySQL service and uploads use persistent Docker volumes. A running Docker Engine is required for `docker compose up -d`; without Twilio credentials and a configured SendGrid email integration, registration code delivery returns a configuration error instead of pretending to send an email.
// admin/Teacher/Student account 
Admin: admin@brightenglish.com / Admin@123
Teacher: teacher@brightenglish.com / Teacher@123
Student: student@brightenglish.com / Student@123