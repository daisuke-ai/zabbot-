# Database Setup Guide

This guide will help you set up the Supabase database for the educational management system.

## Prerequisites

1. Create a Supabase account at [https://supabase.com](https://supabase.com)
2. Create a new Supabase project

## Setup Steps

### 1. Configure Environment Variables

Create a `.env` file in the root of your project with the following variables:

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Replace `your_supabase_url` and `your_supabase_anon_key` with the values from your Supabase project dashboard.

### 2. Run the SQL Schema

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Create a new query
4. Copy and paste the contents of the `supabase_schema.sql` file
5. Run the query

This will:
- Create all necessary tables
- Set up Row Level Security (RLS) policies
- Create initial departments
- Create initial HOD accounts for each department

### 3. Initial Accounts

After running the schema, the following HOD accounts will be created:

| Department | Email | Password |
|------------|-------|----------|
| Computer Science | cs_hod@example.com | securepassword1 |
| Artificial Intelligence | ai_hod@example.com | securepassword2 |
| Software Engineering | se_hod@example.com | securepassword3 |
| Data Science | ds_hod@example.com | securepassword4 |

**Important:** In a production environment, you should use secure passwords and change these default passwords immediately.

## Database Schema

The database consists of the following tables:

### Departments
- `id`: UUID (Primary Key)
- `name`: Text (Department name)
- `created_at`: Timestamp
- `updated_at`: Timestamp

### Profiles
- `id`: UUID (Primary Key, references auth.users)
- `email`: Text
- `first_name`: Text
- `last_name`: Text
- `role`: Enum ('hod', 'pm', 'teacher', 'student')
- `department_id`: UUID (references departments)
- `created_at`: Timestamp
- `updated_at`: Timestamp

### Courses
- `id`: UUID (Primary Key)
- `code`: Text (Course code)
- `name`: Text (Course name)
- `department_id`: UUID (references departments)
- `created_at`: Timestamp
- `updated_at`: Timestamp

### Teacher Courses
- `id`: UUID (Primary Key)
- `teacher_id`: UUID (references profiles)
- `course_id`: UUID (references courses)
- `created_at`: Timestamp
- `updated_at`: Timestamp

### Student Courses
- `id`: UUID (Primary Key)
- `student_id`: UUID (references profiles)
- `course_id`: UUID (references courses)
- `created_at`: Timestamp
- `updated_at`: Timestamp

### Marks
- `id`: UUID (Primary Key)
- `student_id`: UUID (references profiles)
- `course_id`: UUID (references courses)
- `assessment_name`: Text
- `score`: Numeric
- `max_score`: Numeric
- `created_at`: Timestamp
- `updated_at`: Timestamp
- `created_by`: UUID (references profiles)
- `updated_by`: UUID (references profiles)

## User Roles and Permissions

### HOD (Head of Department)
- Can create PM (Program Manager) accounts for their department
- Can view all data within their department

### PM (Program Manager)
- Can create Teacher and Student accounts for their department
- Can view all teachers and students in their department
- Can view all marks for students in their department

### Teacher
- Can view and edit marks for students in their courses
- Can view students enrolled in their courses

### Student
- Can view their own marks
- Can view their enrolled courses

## Adding Sample Data

After setting up the schema, you may want to add sample data:

1. Log in as an HOD
2. Create PM accounts for your department
3. Log in as a PM
4. Create Teacher accounts
5. Create Student accounts
6. Create Courses
7. Assign Teachers to Courses
8. Enroll Students in Courses

## Troubleshooting

If you encounter any issues:

1. Check that your environment variables are correctly set
2. Verify that the SQL schema was executed successfully
3. Check the Supabase logs for any errors
4. Ensure that Row Level Security policies are correctly applied

For more help, refer to the [Supabase documentation](https://supabase.com/docs). 