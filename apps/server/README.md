# Class Monitoring System - Backend

A comprehensive backend system for managing class schedules, student/teacher profiles, and session monitoring built with Hono, PostgreSQL, Drizzle ORM, and Better Auth.

## 🚀 Features

- **Authentication & Authorization**: Role-based access control with Better Auth
- **Database Management**: PostgreSQL with Drizzle ORM
- **API Endpoints**: RESTful APIs for all system entities
- **Background Jobs**: Automated class session generation with Bull and Redis
- **Type Safety**: Full TypeScript support with Zod validation
- **Error Handling**: Centralized error management with custom error codes

## 📋 Prerequisites

- Node.js 18+ 
- PostgreSQL 14+
- Redis 6+ (for background jobs)
- npm or yarn

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd class-monitoring-system/apps/server
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env` file in the root directory:
   ```env
   # Database
   DATABASE_URL="postgresql://username:password@localhost:5432/class_monitoring"
   
   # Redis (for background jobs)
   REDIS_HOST="localhost"
   REDIS_PORT=6379
   REDIS_PASSWORD="your_redis_password"
   
   # Server
   PORT=3001
   
   # Better Auth
   BETTER_AUTH_SECRET="your-secret-key-here"
   BETTER_AUTH_URL="http://localhost:3001"
   ```

4. **Database Setup**
   ```bash
   # Generate migration files
   npm run db:generate
   
   # Run migrations
   npm run db:migrate
   
   # (Optional) Seed database
   npm run db:seed
   ```

5. **Start the server**
   ```bash
   # Development
   npm run dev
   
   # Production
   npm run build
   npm start
   ```

## 📊 Database Schema

### Core Entities
- **Users**: Authentication and basic user information
- **Courses**: Academic courses with codes and names
- **Rooms**: Physical classroom spaces
- **Batches**: Student cohorts
- **Sections**: Class sections within semesters

### Profiles
- **Student Profiles**: Student-specific information linked to batches and sections
- **Teacher Profiles**: Teacher-specific information with departments and designations

### Scheduling
- **Routines**: Weekly class schedules
- **Class Sessions**: Individual class instances generated from routines
- **Booked Rooms/Teachers**: Resource booking tracking

## 🔐 Authentication & Authorization

### Roles
- **Student**: Access to own profile and class information
- **CR (Class Representative)**: Student + session management for their section
- **Teacher**: Access to assigned courses and sessions
- **Admin**: Full system access except super admin functions
- **Super Admin**: Complete system control

### Endpoints
- `POST /api/auth/sign-up` - User registration
- `POST /api/auth/sign-in` - User login
- `POST /api/auth/sign-out` - User logout
- `GET /api/auth/session` - Get current session

## 📡 API Endpoints

### Rooms
- `POST /api/v1/rooms` - Create room (Admin only)
- `GET /api/v1/rooms` - List rooms with pagination

### Courses
- `POST /api/v1/courses` - Create course (Admin only)
- `GET /api/v1/courses/:semester` - List courses by semester
- `POST /api/v1/courses/add-teachers` - Assign teachers to course (Admin only)

### Sections
- `POST /api/v1/sections` - Create section (Admin only)
- `GET /api/v1/sections/:semester` - List sections by semester (Admin only)

### Batches
- `POST /api/v1/batches` - Create batch (Admin only)
- `GET /api/v1/batches` - List batches (Admin only)
- `PUT /api/v1/batches/:id` - Update batch (Admin only)

### Student Profiles
- `GET /api/v1/student-profiles/:id` - Get student profile (Self or Admin)
- `PUT /api/v1/student-profiles/:id` - Update student profile (Self or Admin)

### Teacher Profiles
- `GET /api/v1/teacher-profiles/:id` - Get teacher profile (Self or Admin)
- `PUT /api/v1/teacher-profiles/:id` - Update teacher profile (Self or Admin)

### Routines
- `POST /api/v1/routines` - Upload routine (Admin only)
- `GET /api/v1/routines` - List routines (Teacher or Admin)
- `PUT /api/v1/routines/:id` - Update routine (Admin only)

### Class Sessions
- `GET /api/v1/sessions` - Get class sessions with filters (Teacher or Admin)
- `PUT /api/v1/sessions/:id` - Update session (CR or Teacher)

## 🔄 Background Jobs

### Monthly Session Generation
Automatically generates class sessions from routines on the 1st of each month.

### Features
- **Conflict Detection**: Checks for room and teacher availability
- **Notification System**: Alerts administrators of conflicts
- **Mid-month Updates**: Handles routine changes during the month

### Usage
```typescript
import { generateClassSessions, handleRoutineChange } from './jobs/session-generator';

// Generate sessions for a specific month
await generateClassSessions(2024, 3);

// Handle routine changes mid-month
await handleRoutineChange('routine-id', new Date());
```

## 🧪 Development

### Scripts
```bash
# Development server with hot reload
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Database operations
npm run db:generate    # Generate migrations
npm run db:migrate     # Run migrations
npm run db:studio      # Open Drizzle Studio
npm run db:seed        # Seed database

# Linting and formatting
npm run lint
npm run format
```

### Project Structure
```
src/
├── db/
│   ├── schema/         # Database schema definitions
│   └── index.ts        # Database connection
├── lib/
│   └── auth.ts         # Better Auth configuration
├── middleware/
│   └── auth.ts         # Authentication middleware
├── routes/             # API route handlers
├── jobs/               # Background job definitions
├── utils/
│   ├── types.ts        # TypeScript type definitions
│   ├── errors.ts       # Error handling utilities
│   └── validation.ts   # Zod validation schemas
└── index.ts            # Server entry point
```

## 🔧 Configuration

### Environment Variables
| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `REDIS_HOST` | Redis server host | Yes |
| `REDIS_PORT` | Redis server port | Yes |
| `REDIS_PASSWORD` | Redis password | No |
| `PORT` | Server port | No (default: 3001) |
| `BETTER_AUTH_SECRET` | Auth secret key | Yes |
| `BETTER_AUTH_URL` | Auth service URL | Yes |

### Database Configuration
The system uses PostgreSQL with Drizzle ORM. Connection pooling is configured for optimal performance:

```typescript
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

## 📈 Monitoring & Logging

### Error Handling
- Centralized error management with custom error codes
- HTTP exception handling with appropriate status codes
- Detailed error logging for debugging

### Health Checks
- `GET /health` - Server health status
- Database connection monitoring
- Redis connection status

## 🚀 Deployment

### Production Checklist
1. Set all required environment variables
2. Run database migrations
3. Configure Redis for background jobs
4. Set up reverse proxy (nginx/Apache)
5. Configure SSL certificates
6. Set up monitoring and logging

### Docker Support
```dockerfile
# Example Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3001
CMD ["npm", "start"]
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review the API endpoints and examples

---

**Built with ❤️ using Hono, PostgreSQL, Drizzle ORM, and Better Auth**