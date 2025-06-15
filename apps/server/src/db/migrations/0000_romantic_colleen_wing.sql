CREATE TYPE "public"."day_of_week" AS ENUM('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday');--> statement-breakpoint
CREATE TYPE "public"."gender" AS ENUM('male', 'female', 'other');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('super_admin', 'chairman', 'admin', 'cr_student', 'teacher', 'student');--> statement-breakpoint
CREATE TYPE "public"."session_status" AS ENUM('scheduled', 'delivered', 'rescheduled', 'cancelled');--> statement-breakpoint
CREATE TABLE "batches" (
	"batch_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"batch_name" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" text NOT NULL,
	CONSTRAINT "batches_batch_name_unique" UNIQUE("batch_name")
);
--> statement-breakpoint
CREATE TABLE "course_teacher" (
	"course_teacher_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_code" text NOT NULL,
	"teacher_id" uuid NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "courses" (
	"course_code" text PRIMARY KEY NOT NULL,
	"course_name" text NOT NULL,
	"credit_hours" double precision NOT NULL,
	"semester" integer NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" text NOT NULL,
	CONSTRAINT "courses_course_name_unique" UNIQUE("course_name")
);
--> statement-breakpoint
CREATE TABLE "rooms" (
	"room_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"room_name" text NOT NULL,
	"location" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sections" (
	"section_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"section_name" text NOT NULL,
	"semester" integer NOT NULL,
	"batch_id" uuid NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "student_profiles" (
	"student_id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"semester" integer NOT NULL,
	"batch_id" uuid NOT NULL,
	"section_id" uuid NOT NULL,
	"priority" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teacher_profiles" (
	"teacher_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"is_guest_teacher" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "booked_rooms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"room_id" uuid NOT NULL,
	"booked_date" timestamp NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"booked_at" timestamp DEFAULT now() NOT NULL,
	"booked_by" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "booked_teachers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"teacher_id" uuid NOT NULL,
	"booked_date" timestamp NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"booked_at" timestamp DEFAULT now() NOT NULL,
	"booked_by" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "class_sessions" (
	"session_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"routine_id" uuid NOT NULL,
	"session_date" timestamp NOT NULL,
	"original_schedule_at" timestamp NOT NULL,
	"actual_schedule_at" timestamp,
	"session_status" "session_status" DEFAULT 'scheduled' NOT NULL,
	"reschedule_or_cancel_reason" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" text
);
--> statement-breakpoint
CREATE TABLE "routines" (
	"routine_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"section_id" uuid NOT NULL,
	"course_teacher_id" uuid NOT NULL,
	"room_id" uuid NOT NULL,
	"day_of_week" "day_of_week" NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"impersonated_by" text,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean NOT NULL,
	"image" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"role" "role" DEFAULT 'student' NOT NULL,
	"gender" "gender",
	"phone" text,
	"address" text,
	"banned" boolean,
	"ban_reason" text,
	"ban_expires" timestamp,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "batches" ADD CONSTRAINT "batches_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_teacher" ADD CONSTRAINT "course_teacher_course_code_courses_course_code_fk" FOREIGN KEY ("course_code") REFERENCES "public"."courses"("course_code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_teacher" ADD CONSTRAINT "course_teacher_teacher_id_teacher_profiles_teacher_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."teacher_profiles"("teacher_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_teacher" ADD CONSTRAINT "course_teacher_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sections" ADD CONSTRAINT "sections_batch_id_batches_batch_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."batches"("batch_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sections" ADD CONSTRAINT "sections_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_batch_id_batches_batch_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."batches"("batch_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_section_id_sections_section_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."sections"("section_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_profiles" ADD CONSTRAINT "teacher_profiles_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_profiles" ADD CONSTRAINT "teacher_profiles_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booked_rooms" ADD CONSTRAINT "booked_rooms_session_id_class_sessions_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."class_sessions"("session_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booked_rooms" ADD CONSTRAINT "booked_rooms_room_id_rooms_room_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("room_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booked_rooms" ADD CONSTRAINT "booked_rooms_booked_by_user_id_fk" FOREIGN KEY ("booked_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booked_teachers" ADD CONSTRAINT "booked_teachers_session_id_class_sessions_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."class_sessions"("session_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booked_teachers" ADD CONSTRAINT "booked_teachers_teacher_id_teacher_profiles_teacher_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."teacher_profiles"("teacher_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booked_teachers" ADD CONSTRAINT "booked_teachers_booked_by_user_id_fk" FOREIGN KEY ("booked_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_sessions" ADD CONSTRAINT "class_sessions_routine_id_routines_routine_id_fk" FOREIGN KEY ("routine_id") REFERENCES "public"."routines"("routine_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_sessions" ADD CONSTRAINT "class_sessions_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routines" ADD CONSTRAINT "routines_section_id_sections_section_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."sections"("section_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routines" ADD CONSTRAINT "routines_course_teacher_id_course_teacher_course_teacher_id_fk" FOREIGN KEY ("course_teacher_id") REFERENCES "public"."course_teacher"("course_teacher_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routines" ADD CONSTRAINT "routines_room_id_rooms_room_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("room_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routines" ADD CONSTRAINT "routines_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;