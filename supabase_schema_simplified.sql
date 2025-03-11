-- Create extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create extension for password hashing
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create enum for user roles
CREATE TYPE user_role AS ENUM ('hod', 'pm', 'teacher', 'student');

-- Create enum for semesters
CREATE TYPE semester AS ENUM ('Spring', 'Summer', 'Fall', 'Winter');

-- Create departments table
CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE
);

-- Create users table with role-based information
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    role user_role NOT NULL,
    department_id UUID REFERENCES departments(id),
    current_semester semester,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create courses table
CREATE TABLE courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    department_id UUID REFERENCES departments(id) NOT NULL,
    semester semester
);

-- Create student enrollments
CREATE TABLE enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES profiles(id) NOT NULL,
    course_id UUID REFERENCES courses(id) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(student_id, course_id)
);

-- Create teacher assignments
CREATE TABLE teacher_courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    teacher_id UUID REFERENCES profiles(id) NOT NULL,
    course_id UUID REFERENCES courses(id) NOT NULL,
    UNIQUE(teacher_id, course_id)
);

-- Create marks table
CREATE TABLE marks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES profiles(id) NOT NULL,
    course_id UUID REFERENCES courses(id) NOT NULL,
    assessment_name TEXT NOT NULL,
    score NUMERIC(5,2) NOT NULL,
    max_score NUMERIC(5,2) NOT NULL DEFAULT 100,
    created_by UUID REFERENCES profiles(id) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(student_id, course_id, assessment_name)
);

-- Insert initial departments
INSERT INTO departments (name) VALUES 
('Computer Science'),
('Artificial Intelligence'),
('Software Engineering'),
('Data Science');

-- Enable Row Level Security
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE marks ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Users can view their own profile"
ON profiles FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
ON profiles FOR UPDATE 
USING (auth.uid() = id);

CREATE POLICY "HODs can create PM profiles"
ON profiles FOR INSERT 
TO authenticated
WITH CHECK (
    NEW.role = 'pm' AND
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'hod'
        AND profiles.department_id = NEW.department_id
    )
);

CREATE POLICY "PMs can create teacher profiles"
ON profiles FOR INSERT 
TO authenticated
WITH CHECK (
    NEW.role = 'teacher' AND
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'pm'
        AND profiles.department_id = NEW.department_id
    )
);

CREATE POLICY "PMs can create student profiles"
ON profiles FOR INSERT 
TO authenticated
WITH CHECK (
    NEW.role = 'student' AND
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'pm'
        AND profiles.department_id = NEW.department_id
    )
);

CREATE POLICY "Students can create their own profile"
ON profiles FOR INSERT 
TO authenticated
WITH CHECK (
    NEW.role = 'student' AND
    auth.uid() = id
);

-- Policies for enrollments
CREATE POLICY "Students can enroll themselves in courses"
ON enrollments FOR INSERT 
TO authenticated
WITH CHECK (
    auth.uid() = NEW.student_id AND
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'student'
    )
);

CREATE POLICY "Students can view their own enrollments"
ON enrollments FOR SELECT 
USING (auth.uid() = student_id);

CREATE POLICY "Teachers can view enrollments for their courses"
ON enrollments FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM teacher_courses
        WHERE teacher_courses.teacher_id = auth.uid()
        AND teacher_courses.course_id = enrollments.course_id
    )
);

-- Policies for marks
CREATE POLICY "Teachers can insert marks for their courses"
ON marks FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM teacher_courses
        WHERE teacher_courses.teacher_id = auth.uid()
        AND teacher_courses.course_id = NEW.course_id
    )
);

CREATE POLICY "Teachers can update marks for their courses"
ON marks FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM teacher_courses
        WHERE teacher_courses.teacher_id = auth.uid()
        AND teacher_courses.course_id = marks.course_id
    )
);

CREATE POLICY "Teachers can delete marks for their courses"
ON marks FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM teacher_courses
        WHERE teacher_courses.teacher_id = auth.uid()
        AND teacher_courses.course_id = marks.course_id
    )
);

CREATE POLICY "Teachers can view marks for their courses"
ON marks FOR SELECT
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM teacher_courses
        WHERE teacher_courses.teacher_id = auth.uid()
        AND teacher_courses.course_id = marks.course_id
    )
);

CREATE POLICY "Students can view their own marks"
ON marks FOR SELECT 
USING (auth.uid() = student_id);

CREATE POLICY "PMs can view all marks in their department"
ON marks FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM profiles p
        JOIN courses c ON p.department_id = c.department_id
        WHERE p.id = auth.uid()
        AND p.role = 'pm'
        AND c.id = marks.course_id
    )
);

-- Policies for courses
CREATE POLICY "Anyone can view courses"
ON courses FOR SELECT 
USING (true);

CREATE POLICY "PMs can create courses in their department"
ON courses FOR INSERT 
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'pm'
        AND profiles.department_id = NEW.department_id
    )
);

-- Function to create initial HOD accounts
CREATE OR REPLACE FUNCTION create_hod_account(
    email TEXT,
    password TEXT,
    first_name TEXT,
    last_name TEXT,
    department_name TEXT
) RETURNS UUID AS $$
DECLARE
    new_user_id UUID;
    dept_id UUID;
BEGIN
    -- Get department ID
    SELECT id INTO dept_id FROM departments WHERE name = department_name;
    
    -- Create user in auth.users without email verification
    INSERT INTO auth.users (email, password, email_confirmed_at)
    VALUES (email, crypt(password, gen_salt('bf')), NOW())
    RETURNING id INTO new_user_id;
    
    -- Create profile
    INSERT INTO profiles (id, email, first_name, last_name, role, department_id)
    VALUES (new_user_id, email, first_name, last_name, 'hod', dept_id);
    
    RETURN new_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create HOD accounts
SELECT create_hod_account(
    'cs_hod@example.com',
    'password123',
    'John',
    'Smith',
    'Computer Science'
);

SELECT create_hod_account(
    'ai_hod@example.com',
    'password123',
    'Sarah',
    'Johnson',
    'Artificial Intelligence'
);

SELECT create_hod_account(
    'se_hod@example.com',
    'password123',
    'Michael',
    'Brown',
    'Software Engineering'
);

SELECT create_hod_account(
    'ds_hod@example.com',
    'password123',
    'Emily',
    'Davis',
    'Data Science'
);

-- Function to create user accounts without email verification
CREATE OR REPLACE FUNCTION create_user_account(
    email TEXT,
    password TEXT,
    first_name TEXT,
    last_name TEXT,
    role user_role,
    department_id UUID,
    current_semester semester DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    new_user_id UUID;
BEGIN
    -- Create user in auth.users without email verification
    INSERT INTO auth.users (email, password, email_confirmed_at)
    VALUES (email, crypt(password, gen_salt('bf')), NOW())
    RETURNING id INTO new_user_id;
    
    -- Create profile
    INSERT INTO profiles (id, email, first_name, last_name, role, department_id, current_semester)
    VALUES (new_user_id, email, first_name, last_name, role, department_id, current_semester);
    
    RETURN new_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 