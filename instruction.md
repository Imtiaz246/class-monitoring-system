# Class Reporting & Monitoring System

## [PRD link](https://hip-brand-b20.notion.site/Class-Reporting-Monitoring-System-PRD-1d2b0bc317798002b18ef7e54e08c655)

## Assumptions
- **Users and Roles**: Single `Users` table for Super Admin, Chairman, Admin, CR Student, Teacher, and Student, differentiated by `role`.
- **Batch Tracking**: `Batches` table stores batch metadata.
- **Semester and Section**: `StudentProfiles` tracks semester and section for `student` and `cr_student`.
- **Class Routines**: Managed by Super Admin, Chairman, and Admin; teachers and cr_student cannot update routines.
- **Class Sessions**: Generated monthly from `Routines`, with teachers and CR students updating status and availability.
- **Data**: Includes routines, sessions, attendance, and batch/semester/section data.
- **Database**: PostgreSQL with Drizzle ORM.
- **Authentication**: Better auth with email verification [Better Auth](https://github.com/better-auth/better-auth).

## Instructions

### 1. System Architecture
- **Framework**: Use Hono RPC (TypeScript) with Bun for lightweight, fast API development.
- **Database**: Use PostgreSQL with Drizzle ORM for schema definition and migrations.
- **Authentication**: Implement better auth for authentication.
- **Background Jobs**: Use Bull with Redis for session generation, delivery status sync.
- **API Design**: Create RESTful APIs with versioned endpoints (e.g., `/api/v1/`).
- **Error Handling**: Centralize error handling with consistent error codes and messages.
- **Logging**: Use Winston for debugging and auditing.

### 2. Database Schema
Design a PostgreSQL schema with Drizzle ORM. The schema includes:

- **Users**(You may follow the better auth schema. Following is just for example):
  - `id` (UUID, primary key)
  - `email` (varchar, unique key)
  - `hashPassword` (varchar)
  - `name` (varchar)
  - `role` (enum: 'super_admin', 'chairman', 'admin', 'cr_student', 'teacher', 'student')
  - `gender` (enum: 'male', 'female', 'other')
  - `phone` (varchar)
  - `address` (varchar)
  - `created_at`, `updated_at` (timestamp)
- **Courses**:
  - `courseCode` (varchar, primary key, passed by user while adding course)
  - `courseName` (varchar)
  - `creditHours` (double)
  - `semester` (integer)
  - `updatedAt` (timestamp)
  - `updatedBy` (UUID, foreign key to Users)
- **Rooms**:
  - `roomId` (UUID, primary key)
  - `roomName` (varchar)
  - `location` (varchar)
  - `updatedAt` (timestamp)
  - `updatedBy` (UUID, foreign key to Users)
- **Batches**:
  - `batchId` (UUID, primary key)
  - `batchName` (varchar)
  - `updatedAt` (timestamp)
  - `updatedBy` (UUID, foreign key to Users)
- **Sections**:
  - `sectionId` (UUID, primary key)
  - `sectionName` (varchar)
  - `semester` (integer)
  - `batchId` (UUID, foreign key to Batches)
  - `updatedAt` (timestamp)
  - `updatedBy` (UUID, foreign key to Users)
- **StudentProfiles**:
  - `studentId` (varchar, primary key, passed by user while createing an account)
  - `userId` (UUID, foreign key to Users)
  - `semester` (integer)
  - `batchId` (UUID, foreign key to Batches)
  - `sectionId` (UUID, foreign key to Sections)
  - `priority` (integer, 0 means CR-class representitive, 1 means normal student)
  - `updatedAt` (timestamp)
  - `updatedBy` (UUID, foreign key to Users)
- **TeacherProfiles**:
  - `teacherId` (UUID, primary key)
  - `userId` (UUID, foreign key to Users)
  - `isGuestTeacher` (boolean)
  - `updatedAt` (timestamp)
  - `updatedBy` (UUID, foreign key to Users)
- **CourseTeacher**:
  - `courseTeacherId` (UUID, primary key)
  - `courseCode` (varchar, foreign key to Courses)
  - `teacherId` (UUID, foreign key to Teachers)
  - `updatedAt` (timestamp)
  - `updatedBy` (UUID, foreign key to Users)
- **Routines**:
  - `routineId` (UUID, primary key)
  - `sectionId` (UUID, foreign key to Sections)
  - `courseTeacherId` (UUID, foreign key to CourseTeacher)
  - `roomId` (UUID, foreign key to Rooms)
  - `dayOfWeek` (enum: 'monday', 'tuesday', ...)
  - `startTime` (timestamp)
  - `endTime` (timestamp)
  - `updatedAt` (timestamp)
  - `updatedBy` (UUID, foreign key to Users)
- **ClassSessions**:
  - `sessionId` (UUID, primary key)
  - `routineId` (UUID, foreign key to Routines)
  - `sessionDate` (timestamp)
  - `originalScheduleAt` (timestamp)
  - `actualScheduleAt` (timestamp)
  - `sessionStatus` (enum: 'delivered', 'rescheduled', 'cancelled')
  - `rescheduleOrCancelReason` (text)
  - `updatedAt` (timestamp)
  - `updatedBy` (UUID, foreign key to Users)
- **BookedRooms**:
  - `id` (UUID, primary key)
  - `sessionId` (UUID, foreign key to ClassSessions)
  - `roomId` (UUID, foreign key to Rooms)
  - `bookedDate` (timestamp)
  - `startTime` (timestamp)
  - `endTime` (timestamp)
  - `bookedAt` (timestamp)
  - `bookedBy` (UUID, foreign key to Users)
- **BookedTeachers**:
  - `id` (UUID, primary key)
  - `sessionId` (UUID, foreign key to ClassSessions)
  - `teacherId` (UUID, foreign key to Teachers)
  - `bookedDate` (timestamp)
  - `startTime` (timestamp)
  - `endTime` (timestamp)
  - `bookedAt` (timestamp)
  - `bookedBy` (UUID, foreign key to Users)

### 3. API Endpoints
Implement RESTful APIs using Hono RPC with TypeScript. Make sure to validate request body with Zod for typescript types. Use HTTP status codes (e.g., 200, 201, 400, 401, 403, 404).
- **Authentication**:
  - See better auth documentation for authentication & authorization. [Better Auth](https://github.com/better-auth/better-auth)

- **Users**:
  - In this schema record is automatically created while user create an account from any frontend client. It is coming from better auth.

- **Rooms**:
  - `POST /api/v1/rooms`: Create a room. Accessible by Super Admin, Admin & Chariman.
    - **Request Body**:
      ```json
      {
        "roomName": "",
        "location": ""
      }
      ```
    - **Rules**:
      1. `roomName` should not empty.
      2. `location` should not empty.
      3. `roomName` & `location` both are not same for 2 records.
  - `GET /api/v1/rooms`: List of rooms. Accessible by all user.
    - **Query Parameters**:
      - `page` (integer, default 1): Page number for pagination.
      - `limit` (integer, default 20): Number of records per page.
    - **Response Body**:
      ```json
      {
        "data": [
          {
            "roomId": "",
            "roomName": "",
            "location": "",
            "updatedAt": "",
            "updatedBy": {
              "name": "",
              "userId": "",
              "role": "", // role define in Users table
            }
          }
        ]
      }
      ```

- **Courses**:
  - `POST /api/v1/courses`: Create a course. Accesible by Super Admin, Admin, Chairman. 
    - **Request Body**:
      ```json
      {
        "courseCode": "",
        "courseName": "",
        "creditHours": 0,
        "semester": 0
      }
      ```
    - **Rules**:
      1. `courseCode` should be unique & not empty.
      2. `courseName` should be unique & not empty.
      3. `creditHours` should be greater than 0.
      4. `semester` should be greater than 0.
  - `GET /api/v1/courses/:id`: List of courses of particular semester. Accessible by all user. In path parameters `id` refers `semester`.
    - **Response Body**:
      ```json
      {
        "data": [
          {
            "courseCode": "",
            "courseName": "",
            "creditHours": 0,
            "semester": 0,
            "updatedAt": "",
            "updatedBy": {
              "name": "",
              "userId": "",
              "role": "", // role define in Users table
            }
          }
        ]
      }
      ```
  - `POST /api/v1/courses/add-teachers`: Add teachers to a course. Need to create records in `CourseTeacher` table. Accessible by Super Admin, Admin, Chairman.
    - **Request Body**:
      ```json
      {
        "courseCode": "",
        "teacherIds": []
      }
      ```
    - **Rules**:
      1. `courseCode` should not empty.
      2. `teacherIds` should not empty.

- **Sections**:
  - `POST /api/v1/sections`: Create a section. Accessible by Super Admin, Admin, Chairman.
    - **Request Body**:
      ```json
      {
        "sectionName": "",
        "semester": 0
      }
      ```
    - **Rules**:
      1. `sectionName` should not empty.
      2. `semester` should be greater than 0.
  - `GET /api/v1/sections/:id`: List of sections of particular semester. Accessible by Super Admin, Admin & Chairman. In path parameter `id` refers `semester`.
    - **Response Body**:
      ```json
      {
        "data": [
          {
            "sectionId": "",
            "sectionName": "",
            "semester": 0,
            "updatedAt": "",
            "updatedBy": {
              "name": "",
              "userId": "",
              "role": "", // role define in Users table
            }
          }
        ]
      }
      ```

- **Batches**:
  - `POST /api/v1/batches`: Create a batch. Accessible by Super Admin, Admin, Chairman.
    - **Request Body**:
      ```json
      {
        "batchName": ""
      }
      ```
  - `GET /api/v1/batches`: List batches. Accesible by Super Admin, Admin, Chairman.
    - **Query Parameters**:
      - `page` (integer, default: 1)
      - `limit` (integer, default: 20)
    - **Response Body**:
      ```json
      {
        "data": [
          {
            "batchId": "",
            "batchName": "",
            "updatedAt": "",
            "updatedBy": {
              "name": "",
              "userId": "",
              "role": "", // role define in Users table
            }
          }
        ]
      }
      ```
  - `PUT /api/v1/batches/:id`: Update batch details. Accessible by Super Admin, Admin, Chairman.
    - **Request Body**:
      ```json
      {
        "batchName": ""
      }
      ```
    - **Rules**:
      1. `batchName` should be unique & not empty.

- **Student Profiles**:
  - Add student automatically while user create an account from any frontend client. 
  - `GET /api/v1/student-profiles/:id`: Retrieve student profile. Accessible by Admin, Super Admin, Chariman, Teacher or self. In path parameter id refers `userId`.
    - **Response Body**:
      ```json
      {
        "name": "",
        "studentId": "",
        "userId": "",
        "email": "",
        "semester": 0,
        "batchName": "",
        "sectionName": "",
        "role": "",
        "gender": "",
        "phone": "",
        "address": "",
        "updatedAt": "",
        "updatedBy": ""
      }
      ```
  - `PUT /api/v1/student-profiles/:id`: Update student profile. Accessible by Admin, Super Admin, Chariman and self. In path parameter id refers `userId`.
    - **Request Body**:
      ```json
      {
        "name": "", // nullable
        "role": "", // nullable
        "gender": "", // nullable
        "phone": "", // nullable
        "address": "", // nullable
      }
      ```

- **TeacherProfiles**:
  - Techer only created by Super Admin, Admin & Chairman.
  - `GET /api/v1/teacher-profiles/:id`: Retrieve teacher profile. Accesible by Admin, Super Admin, Chariman and self. In path parameter id refers `userId`.
    - **Response Body**:
      ```json
      {
        "name": "",
        "teacherId": "",
        "userId": "",
        "email": "",
        "isGuestTeacher": false,
        "gender": "",
        "phone": "",
        "address": "",
        "updatedAt": "",
        "updatedBy": ""
      }
      ```
  - `PUT /api/v1/teacher-profiles/:id`: Update teacher profile (Super Admin, Admin, Chairman). In path parameter id refers `userId`.
    - **Request Body**:
      ```json
      {
        "name": "", // nullable
        "isGuestTeacher": false, // nullable
        "gender": "", // nullable
        "phone": "", // nullable
        "address": "", // nullable
      }
      ```
    - **Rules**:
      1. For `isGuestTeacher` update `TeacherProfiles` table. For rest of the field update `Users` table data.

- **Routines**:
  - `POST /api/v1/routines`: Upload routine (Super Admin, Chairman, Admin). Add a record in `Routines` table.
    - **Request Body**:
      ```json
      {
        "sectionId": "", // UUID
        "courseCode": "CSE-2207",
        "teacherId": "", // UUID
        "roomId": "", // UUID
        "dayOfWeek": "Monday",
        "startTime": "09:00",
        "endTime": "10:30",
      }
      ```
    - **Rules**:
      1. `teacherId` should be assigned with same `courseCode`. Which is stored in `CourseTeacher` table.
      2. `roomId` should be available in `Rooms` table.
      3. `sectionId` shoule be available in `Sections` table.
      4. `startTime` must be smaller than `endTime`. Both are in format `HH:mm`.
      `startTime` and `endTime` are greater than `00:00` and less that `24:00`.
      5. `teacherId` should be available in `BookedTeacher` table for same day between `startTime` and `endTime`.
      6. `roomId` should be available in `BookedRoom` table for same day between `startTime` and `endTime`.
      7. After adding a routine, the `ClassSession` table should be automatically populated for the remaining days of the current month. One session should be created per week on the specified day and time. After class session creation teacher & room should be booked for that date time.
  - `GET /api/v1/routines`: Get list routines. Only accesible for Super Admin, Chairman & Admin.
    - **Query Parameters**:
      - `page` (integer, default: 1)
      - `limit` (integer, default: 20)
      - `batchId` (UUID, optional)
      - `semester` (integer, optional)
      - `courseCode` (string, optional)
      - `sectionId` (UUID, optional)
      - `teacherId` (UUID, optional)
      - `weekDay` (string , optional)
  - `PUT /api/v1/routines/:id`: Update routine (Super Admin, Chairman, Admin). In path parameter id referes `routineId`.
    - **Request Body**:
      All fields are nullable. If the value is null then no need to update that field.
      ```json
      {
        "routineId": "", // UUID
        "sectionId": "", // UUID
        "courseCode": "CSE-2207",
        "teacherId": "", // UUID
        "roomId": "", // UUID
        "dayOfWeek": "Monday",
        "startTime": "09:00",
        "endTime": "10:30",
      }
      ```
    - **Rules**:
      1. `teacherId` should be assigned with same `courseCode`. Which is stored in `CourseTeacher` table.
      2. `roomId` should be available in `Rooms` table.
      3. `sectionId` shoule be available in `Sections` table.
      4. `startTime` must be smaller than `endTime`. Both are in format `HH:mm`. `startTime` and `endTime` are greater than `00:00` and less that `24:00`.
      5. `teacherId` should be available in `BookedTeacher` table for same day between `startTime` and `endTime`.
      6. `roomId` should be available in `BookedRoom` table for same day between `startTime` and `endTime`.
      7. Need to update future entries of `ClassSession` table with same `routineId` & also update `BookedRoom` & `BookedTeacher` table.

- **Class Sessions**:
  - `GET /api/v1/sessions`: Retrieve session details of specific section. 
    - **Query Parameters (Filters):**
      If no date is provided in query parameter then it will return current & previous month sessions. Both `startDate` and `endDate` must be provided together; supplying only one will return an error.
      - `startDate` (string, optional, ISO 8601 format)
      - `endDate` (string, optional, ISO 8601 format)
      - `sectionId` (UUID, optional)
      - `teacherId` (UUID, optional)
      - `roomId` (UUID, optional)
      - `courseCode` (string, optional)
      - `dayOfWeek` (string, optional)
      - `sessionStatus` (string, optional)
      - `semester` (integer, optional)
      - `batch` (integer, optional)
      - `includePrevious` (boolean, optional, incluse previous session if true defalu false)
    - **Response:**
      ```json
      {
        "data": [
          {
            "sessionId": "",
            "section": {
              "sectionId": "",
              "sectionName": "A",
            },
            "course": {
              "courseCode": "",
              "courseName": "",
              "creditHours": 1.5,
            },
            "teacher": {
              "teacherId": "",
              "teacherName": "",
              "isGuestTeacher": ""
            },
            "room": {
              "roomId": "",
              "roomName": "",
              "location": ""
            },
            "batch": {
              "batchId": "",
              "batchName": ""
            },
            "date": "2023-01-01",
            "dayOfWeek": "Monday",
            "startTime": "09:00",
            "endTime": "10:30",
            "sessionStatus": "Active",
            "semester": 1,
            "createdAt": "2023-01-01T00:00:00Z",
            "updatedAt": "2023-01-01T00:00:00Z"
          },
        ] 
      }
      ```
  - `PUT /api/v1/sessions/:id`: Update session. Only accessible by teachers and CR students. To update a session, the teacher must be assigned to that session. For CR students, they must have a `priority` of 0 in their `student profile` and their `sectionId` must match the `session's` `sectionId`. In path parameter id refers `sessionId`.
    - **Request Body:**
    ```json
    {
      "roomId": "", // updated room UUID, nullable
      "date": "2023-01-01T00:00:00Z", // updated date (ISO 8601 format), nullable
      "startTime": "10:00", // updated start time, nullable
      "endTime": "11:30", // updated end time, nullable
      "sessionStatus": "", // (enum: 'delivered', 'rescheduled', 'cancelled'), nullable
      "rescheduleOrCancelReason": "" // nullable
    }
    ```
    - **Rules:**
      1. `startTime` must be smaller than `endTime`. Both are in format `HH:mm`. `startTime` and `endTime` are greater than `00:00` and less that `24:00`.
      2. `roomId` should be available in `BookedRoom` table for request body `date` between `startTime` and `endTime`.
      3. `teacherId` should be available in `BookedTeacher` table for request body `date` between `startTime` and `endTime`. Note that `teacherId` is not sent via request body but it is present in `CourseTeacher` table and `CourseTeacher` table has a reference with `Routine` table.
      4. `date` should be greater or equal than current date. If equal than `startTime` & `endTime` should be greater than current time.
      5. If `sessionStatus` is delivered then all fields in request body should be null. After successfully delivered a session `BookedTeacher` & `BookedRoom` record should be cleared. Note that future class session `sessionStatus` can not be delivered. 
      6. If `sessionStatus` is cancelled then `rescheduleOrCancelReason` must be provided. Except these two all fields should be null otherwise return an error. After cancelling a session `BookedTeacher` & `BookedRoom` record should be cleared.
      7. If `sessionStatus` is rescheduled then `date`, `startTime`, `endTime`, `rescheduleOrCancelReason` must be provided. After rescheduling a session `BookedTeacher` & `BookedRoom` previous record should be cleared and new record should be created.




### 4. Background Job for Class Session Generation
- **Implementation**: Create a monthly background job to generate `ClassSessions` records from `Routines`.
- **Logic**:
  - Query `Routines` for the upcoming month, grouped by `batch_id`.
  - For each routine, generate `ClassSessions` records based on `class_timing` and `day`, mapping to specific dates.
  - Check `Room_Availability` and `Teacher_Availability` to avoid conflicts, updating these tables to mark booked slots (set `is_available` to false, `reason` to 'booked').
  - Set initial `status` to ‘scheduled’ and copy `room_number` from `Classes`.
  - Notify teachers and CR students via Pub/Sub when sessions are created.
  - Handle mid-month routine changes by regenerating affected sessions and notifying users.
- **Tasks**:
  - Use Bull with Redis to schedule the job (first day of each month, 12:00 AM).
  - Optimize with batch processing for large datasets.
  - Log job execution and errors for debugging.
  - Update availability tables transactionally to ensure consistency.

### 5. Security and Authentication
- **Authentication**: See better auth documentation.
- **Authorization**: See better auth documentation.
- **Audit Logging**: Log API requests, session updates, and availability changes for FERPA compliance.

### 6. Error Handling and Monitoring
- **Error Handling**:
  - Centralize error handling with formatted responses (e.g., `{ error: { code, message } }`).
  - Use unique error codes (e.g., `ERR_CONFLICT_ROOM`).
- **Monitoring**:
  - Integrate Prometheus for metrics (e.g., API latency, error rates).
  - Set up alerts for critical failures (e.g., database downtime).
- **Tasks**:
  - Implement error middleware in Hono.
  - Configure logging for errors and events (e.g., Winston).

## Constraints
- Use open-source libraries (e.g., Drizzle ORM, Hono).
- Ensure compatibility with PostgreSQL 15+ and S3-compatible storage.
- Follow RESTful API best practices.
- Optimize for performance (e.g., indexed queries for availability checks).

## Notes
- Modularize code into services (e.g., routine, session), controllers, and data access layers.
- Use TypeScript for type safety and Hono RPC for client generation.
- Focus exclusively on backend; exclude frontend/UI logic.
