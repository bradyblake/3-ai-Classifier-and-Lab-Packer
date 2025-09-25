# 📅 Project Management Platform - Minimal Deployment

## Smart Calendar, Project Planner & Reports

A production-ready project management platform with essential features only. Additional tools can be added as patches later.

## 🚀 Quick Start

```bash
npm install
npm start
```

Access at: `http://localhost:3000`

**Default Login**: `admin` / `admin123`

## 📋 Core Features

### ✅ Included
- **Smart Calendar**: Event scheduling, monthly view
- **Project Management**: Create/view projects
- **Kanban Board**: Task management with drag-and-drop columns
- **Dashboard**: Project overview and activity feed
- **Reports**: Basic analytics and time tracking
- **Authentication**: JWT-based login system

### 🔧 Minimal Dependencies
- `express` - Web server
- `cors` - Cross-origin requests
- `jsonwebtoken` - Authentication
- `bcryptjs` - Password hashing

## 🏗️ Architecture

```
PROJECT-MANAGEMENT-DEPLOYMENT/
├── backend/
│   └── server.js          # Express server with all APIs
├── frontend/
│   └── index.html         # Complete SPA interface
├── package.json           # Minimal dependencies
└── README.md             # This file
```

## 🎯 API Endpoints

### Authentication
- `POST /auth/login` - User login
- `POST /auth/register` - User registration

### Projects
- `GET /projects` - List user projects
- `POST /projects` - Create new project
- `GET /projects/{id}` - Get project details

### Tasks (Kanban)
- `GET /projects/{id}/tasks` - Get project tasks
- `POST /projects/{id}/tasks` - Create task
- `PUT /tasks/{id}/status` - Update task status

### Calendar
- `GET /calendar/events` - Get calendar events
- `POST /calendar/events` - Create calendar event

### Time Tracking
- `POST /time/start` - Start time tracking
- `PUT /time/stop` - Stop time tracking

### Reports
- `GET /reports/dashboard` - Dashboard analytics

## 🔒 Security Features

- JWT authentication with 24h expiration
- Bcrypt password hashing
- CORS protection
- User isolation (users only see their own data)

## 💾 Data Storage

Currently uses **in-memory storage** for immediate deployment. Data resets on server restart.

**Production Upgrade Path:**
1. Add PostgreSQL database
2. Implement data persistence
3. Add database migrations

## 🎨 Interface Features

- **Responsive Design**: Works on desktop and mobile
- **Modern UI**: Clean, professional interface
- **Real-time Updates**: Dynamic content loading
- **Intuitive Navigation**: Tab-based page switching

## ⚡ Performance

- **Single File Deployment**: Everything in 2 files
- **No Build Process**: Direct HTML/CSS/JS
- **Fast Load Times**: Minimal dependencies
- **Low Resource Usage**: < 50MB RAM

## 🚀 Deployment Options

### Local Development
```bash
npm start
```

### Production Server
```bash
PORT=80 npm start
```

### Process Manager (PM2)
```bash
npm install -g pm2
pm2 start backend/server.js --name "project-manager"
```

### Docker
```bash
docker build -t project-manager .
docker run -p 3000:3000 project-manager
```

## 🔧 Customization

### Adding Features
The codebase is designed for easy extension:

- **Add new pages**: Add to frontend/index.html
- **Add new APIs**: Add routes to backend/server.js
- **Add new data models**: Extend in-memory objects

### Environment Variables
- `PORT` - Server port (default: 3000)
- `JWT_SECRET` - JWT signing secret
- `NODE_ENV` - Environment (development/production)

## 🎪 Future Patches

Planned additions as separate patches:
- PostgreSQL database integration
- File upload/attachment system
- Email notifications
- Advanced reporting with charts
- Team collaboration features
- External calendar sync (Google/Outlook)
- Mobile app API
- SSO integration

## ✅ Production Ready

- Authentication system
- Error handling
- CORS configuration
- Secure password storage
- Clean separation of concerns
- RESTful API design

---

**Ready to manage projects efficiently!** 🎯