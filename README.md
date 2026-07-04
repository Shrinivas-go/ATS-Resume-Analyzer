# ATS Resume Checker

A full-stack application designed to analyze resume PDFs against job descriptions, calculating matching scores based on technical skills, experience details, education, and formatting structure.

## Features

- **ATS Resume Scanning**: Upload a resume in PDF format and paste a target job description to get instant feedback.
- **Weighted Skill Scoring**: Compares core and optional skills, factoring in experience, education, and formatting completeness.
- **Detailed Skill Mapping**: Breaks down matched and missing core/optional skills in a clear dashboard interface.
- **User Scan History**: Registered users can save, view, and track their previous resume scans over time.
- **Authentication**: Supports secure local email/password sign-in and Google OAuth 2.0.

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | React, Vite, React Router, Tailwind CSS (or Vanilla CSS) |
| **Backend** | Node.js, Express, Mongoose, Multer, pdf-parse |
| **Database** | MongoDB Atlas |
| **Authentication** | JWT (access and refresh tokens), Google OAuth 2.0, bcryptjs |
| **Testing** | Jest (Backend) |
| **Deployment** | Vercel (Frontend), Render (Backend), Render Blueprint |

## Folder Structure

```
ats-resume-checker/
├── backend/
│   ├── tests/                  # Backend unit tests
│   ├── uploads/                # Multer upload directory
│   ├── ats_checker.js          # Main scoring engine
│   ├── index.js                # Express server and routes
│   ├── models.js               # Mongoose database models
│   └── package.json            # Backend package manager config
├── frontend/
│   ├── src/
│   │   ├── components/         # Dashboard, Hero, Navbar, Footer, AuthModal
│   │   ├── config/             # Axios API client setup
│   │   ├── context/            # Authentication context
│   │   ├── pages/              # Landing page
│   │   └── main.jsx            # Application entry point
│   ├── index.html              # HTML entry template
│   └── package.json            # Frontend package manager config
├── render.yaml                 # Render blueprint for backend
└── package.json                # Root monorepo scripts config
```

## Installation

### Prerequisites

- **Node.js** (v18 or higher)
- **MongoDB** (Local instance or MongoDB Atlas cluster URI)
- **Google OAuth Client ID** (optional, for Google Login integration)

### Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Shrinivas-go/ats-resume-checker.git
   cd ats-resume-checker
   ```

2. **Install all dependencies**:
   ```bash
   npm run install:all
   ```

3. **Configure Environment Variables**:
   - For the **Backend**, copy `backend/.env.example` to `backend/.env` and enter your database connection string and credentials.
   - For the **Frontend**, copy `frontend/.env.example` to `frontend/.env.local` and configure the backend URL and Google Client ID.

4. **Run Development Servers**:
   ```bash
   # Run backend and frontend dev servers concurrently
   npm run dev:backend & npm run dev:frontend
   ```

## Running Tests

To run the backend test suite:
```bash
cd backend
npm test
```

## Deployment

The application is configured to run as two services:
- **Frontend** can be deployed to Vercel (using the included `vercel.json` configurations).
- **Backend** can be deployed to Render using the included `render.yaml` blueprint.
