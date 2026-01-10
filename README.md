# 🎀 TaskFlow - Task Management Application

A beautiful, modern task planning web application with a girlish pink/lavender theme.

## Features

- 👑 **Admin**: Manage users (create managers & executors)
- 💼 **Manager**: Create tasks, assign to executors, close completed tasks
- 👩‍💻 **Executor**: View assigned tasks, mark as completed, view history
- 📱 **Responsive**: Works on desktop, tablet, and mobile

## Task Workflow

```
OPEN → PENDING → COMPLETED → CLOSED
```

## Tech Stack

- **Frontend**: React + Vite + React Router
- **Backend**: Node.js + Express
- **Database**: SQLite + Sequelize ORM
- **Auth**: JWT

## Quick Start

### 1. Backend Setup

```bash
cd backend
npm install
npm run seed   # Seeds database with demo users
npm start      # Starts on http://localhost:5000
```

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev    # Starts on http://localhost:5173
```

## Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@taskflow.com | admin123 |
| Manager | maria@taskflow.com | manager123 |
| Manager | diana@taskflow.com | manager123 |
| Executor | ana@taskflow.com | executor123 |
| Executor | elena@taskflow.com | executor123 |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/login | Login |
| POST | /api/auth/register | Create user (admin) |
| GET | /api/users | List users (admin) |
| GET | /api/users/executors | List my executors (manager) |
| POST | /api/tasks | Create task (manager) |
| GET | /api/tasks | List tasks |
| PATCH | /api/tasks/:id/assign | Assign task (manager) |
| PATCH | /api/tasks/:id/complete | Complete task (executor) |
| PATCH | /api/tasks/:id/close | Close task (manager) |

## Project Structure

```
TW/
├── backend/
│   ├── config/          # Database config
│   ├── middleware/      # Auth middleware
│   ├── models/          # Sequelize models
│   ├── routes/          # API routes
│   ├── seeders/         # Database seeder
│   └── server.js        # Entry point
└── frontend/
    └── src/
        ├── components/  # React components
        ├── context/     # Auth context
        ├── pages/       # Page components
        └── services/    # API service
```

---
Made with 💕 by TaskFlow Team
