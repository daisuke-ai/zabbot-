-- Supabase Schema for Educational Management System

-- Create enum for user roles
CREATE TYPE user_role AS ENUM ('hod', 'pm', 'teacher', 'student');

-- Create departments table
CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create users table with role-based information
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    role user_role NOT NULL,
    department_id UUID REFERENCES departments(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create courses table
CREATE TABLE courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    department_id UUID REFERENCES departments(id) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create teacher-course assignments
CREATE TABLE teacher_courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    teacher_id UUID REFERENCES profiles(id) NOT NULL,
    course_id UUID REFERENCES courses(id) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(teacher_id, course_id)
);

-- Create student enrollments
CREATE TABLE student_courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES profiles(id) NOT NULL,
    course_id UUID REFERENCES courses(id) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(student_id, course_id)
);

-- Create marks table
CREATE TABLE marks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES profiles(id) NOT NULL,
    course_id UUID REFERENCES courses(id) NOT NULL,
    assessment_name TEXT NOT NULL,
    score NUMERIC(5,2) NOT NULL,
    max_score NUMERIC(5,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id) NOT NULL,
    updated_by UUID REFERENCES profiles(id) NOT NULL,
    UNIQUE(student_id, course_id, assessment_name)
);

-- Insert initial departments for CS including AI
INSERT INTO departments (name) VALUES 
('Computer Science'),
('Artificial Intelligence'),
('Software Engineering'),
('Data Science');

-- Set up Row Level Security (RLS) policies

-- Profiles table policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Everyone can read their own profile
CREATE POLICY "Users can view their own profile"
ON profiles FOR SELECT
USING (auth.uid() = id);

-- HODs can create PM profiles
CREATE POLICY "HODs can create PM profiles"
ON profiles FOR INSERT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'hod'
    )
)
WITH CHECK (
    NEW.role = 'pm' AND
    NEW.department_id IN (
        SELECT department_id FROM profiles
        WHERE id = auth.uid() AND role = 'hod'
    )
);

-- PMs can create teacher profiles
CREATE POLICY "PMs can create teacher profiles"
ON profiles FOR INSERT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'pm'
    )
)
WITH CHECK (
    NEW.role = 'teacher' AND
    NEW.department_id = (
        SELECT department_id FROM profiles
        WHERE id = auth.uid() AND role = 'pm'
    )
);

-- PMs can create student profiles
CREATE POLICY "PMs can create student profiles"
ON profiles FOR INSERT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'pm'
    )
)
WITH CHECK (
    NEW.role = 'student' AND
    NEW.department_id = (
        SELECT department_id FROM profiles
        WHERE id = auth.uid() AND role = 'pm'
    )
);

-- Students can create their own profiles
CREATE POLICY "Students can create their own profile"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (NEW.role = 'student');

-- Marks table policies
ALTER TABLE marks ENABLE ROW LEVEL SECURITY;

-- Teachers can insert and update marks for their courses
CREATE POLICY "Teachers can manage marks for their courses"
ON marks FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles p
        JOIN teacher_courses tc ON p.id = tc.teacher_id
        WHERE p.id = auth.uid()
        AND p.role = 'teacher'
        AND tc.course_id = marks.course_id
    )
);

-- Students can view their own marks
CREATE POLICY "Students can view their own marks"
ON marks FOR SELECT
TO authenticated
USING (
    auth.uid() = student_id OR
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND (role = 'teacher' OR role = 'pm' OR role = 'hod')
    )
);

-- PMs can view all marks in their department
CREATE POLICY "PMs can view all marks in their department"
ON marks FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles p
        JOIN courses c ON p.department_id = c.department_id
        WHERE p.id = auth.uid()
        AND p.role = 'pm'
        AND c.id = marks.course_id
    )
);

-- Create function to create user with role
CREATE OR REPLACE FUNCTION create_user_with_role(
    email TEXT,
    password TEXT,
    first_name TEXT,
    last_name TEXT,
    user_role TEXT,
    department_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    new_user_id UUID;
BEGIN
    -- Create the user in auth.users
    INSERT INTO auth.users (email, password)
    VALUES (email, crypt(password, gen_salt('bf')))
    RETURNING id INTO new_user_id;
    
    -- Create the profile with role information
    INSERT INTO profiles (id, email, first_name, last_name, role, department_id)
    VALUES (new_user_id, email, first_name, last_name, user_role::user_role, department_id);
    
    RETURN new_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create initial HOD accounts for each department
-- Note: In a real application, you would use secure passwords
SELECT create_user_with_role(
    'cs_hod@example.com',
    'securepassword1',
    'John',
    'Smith',
    'hod',
    (SELECT id FROM departments WHERE name = 'Computer Science')
);

SELECT create_user_with_role(
    'ai_hod@example.com',
    'securepassword2',
    'Sarah',
    'Johnson',
    'hod',
    (SELECT id FROM departments WHERE name = 'Artificial Intelligence')
);

SELECT create_user_with_role(
    'se_hod@example.com',
    'securepassword3',
    'Michael',
    'Brown',
    'hod',
    (SELECT id FROM departments WHERE name = 'Software Engineering')
);

SELECT create_user_with_role(
    'ds_hod@example.com',
    'securepassword4',
    'Emily',
    'Davis',
    'hod',
    (SELECT id FROM departments WHERE name = 'Data Science')
); 