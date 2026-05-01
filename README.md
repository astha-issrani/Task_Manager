# ⚡ TaskFlow — Team Task Manager

A full-stack collaborative task management web app built with React, Node.js, Express, and MongoDB.

---

## 📁 File Structure

```
TEAM_TASK_MANAGER/
│
├── backend/
│   ├── controllers/          # (empty — logic is in routes for simplicity)
│   ├── middleware/
│   │   └── auth.js           # JWT authentication middleware
│   ├── models/
│   │   ├── User.js           # User schema
│   │   ├── Project.js        # Project schema with members
│   │   └── Task.js           # Task schema
│   ├── routes/
│   │   ├── auth.js           # /api/auth — signup, login, me
│   │   ├── projects.js       # /api/projects — CRUD + members
│   │   ├── tasks.js          # /api/tasks — CRUD
│   │   └── dashboard.js      # /api/dashboard — stats
│   ├── .env                  # Your environment variables (create this)
│   ├── .env.example          # Template for .env
│   ├── package.json
│   └── server.js             # Entry point
│
├── frontend/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── components/
│   │   │   └── Layout.js     # Sidebar + nav wrapper
│   │   ├── context/
│   │   │   └── AuthContext.js # Global auth state
│   │   ├── pages/
│   │   │   ├── LoginPage.js
│   │   │   ├── SignupPage.js
│   │   │   ├── DashboardPage.js
│   │   │   ├── ProjectsPage.js
│   │   │   └── ProjectDetailPage.js
│   │   ├── utils/
│   │   │   └── api.js        # Axios instance with JWT interceptor
│   │   ├── App.js            # Routes
│   │   ├── index.js          # React entry
│   │   └── index.css         # Global styles
│   ├── .env                  # Frontend env (create this)
│   ├── .env.example
│   └── package.json
│
└── README.md
```

---

## 🚀 Setup Instructions

### Prerequisites
- Node.js v18+
- MongoDB (local) OR MongoDB Atlas (free cloud)
- Git

---

### Step 1 — Clone & open project
```bash
cd TEAM_TASK_MANAGER
```

---

### Step 2 — Backend setup

```bash
cd backend
npm install
```

Create your `.env` file:
```bash
cp .env.example .env
```

Edit `backend/.env`:
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/teamtaskmanager
JWT_SECRET=supersecretkey_changethis_inproduction
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

> For MongoDB Atlas, replace MONGODB_URI with your Atlas connection string.

Start backend:
```bash
npm run dev       # development (with nodemon auto-restart)
# OR
npm start         # production
```

Backend runs at: http://localhost:5000

---

### Step 3 — Frontend setup

Open a NEW terminal:
```bash
cd frontend
npm install
```

Create your `.env` file:
```bash
cp .env.example .env
```

Edit `frontend/.env`:
```
REACT_APP_API_URL=http://localhost:5000/api
```

Start frontend:
```bash
npm start
```

Frontend runs at: http://localhost:3000

---

## 🌐 Deployment on Railway

### Step 1 — Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/team-task-manager.git
git push -u origin main
```

### Step 2 — Deploy Backend
1. Go to https://railway.app → New Project → Deploy from GitHub
2. Select your repo → select `backend` folder as root
3. Add environment variables:
   - `MONGODB_URI` → your MongoDB Atlas URI
   - `JWT_SECRET` → any long random string
   - `FRONTEND_URL` → your frontend Railway URL (after deploying frontend)
   - `NODE_ENV` → production
4. Railway auto-detects `npm start`

### Step 3 — Deploy Frontend
1. Add another service → same repo → `frontend` folder as root
2. Add environment variable:
   - `REACT_APP_API_URL` → your backend Railway URL + `/api`
3. Build command: `npm run build`
4. Start command: `npx serve -s build`

---

## 🔑 API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/auth/signup | ❌ | Register user |
| POST | /api/auth/login | ❌ | Login |
| GET | /api/auth/me | ✅ | Get current user |
| GET | /api/projects | ✅ | List user's projects |
| POST | /api/projects | ✅ | Create project |
| GET | /api/projects/:id | ✅ | Get project |
| PUT | /api/projects/:id | ✅ Admin | Update project |
| DELETE | /api/projects/:id | ✅ Admin | Delete project |
| POST | /api/projects/:id/members | ✅ Admin | Add member |
| DELETE | /api/projects/:id/members/:userId | ✅ Admin | Remove member |
| GET | /api/tasks?projectId=xxx | ✅ | List tasks |
| POST | /api/tasks | ✅ Admin | Create task |
| PUT | /api/tasks/:id | ✅ | Update task |
| DELETE | /api/tasks/:id | ✅ Admin | Delete task |
| GET | /api/dashboard | ✅ | Get dashboard stats |

---

## 🧑‍💻 Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18, React Router v6, Recharts |
| Styling | Pure CSS (custom design system) |
| Auth | JWT (jsonwebtoken) |
| Backend | Node.js, Express.js |
| Database | MongoDB with Mongoose |
| Deployment | Railway |
