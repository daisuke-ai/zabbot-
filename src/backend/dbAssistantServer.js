import express from "express";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import cors from 'cors';

dotenv.config();

const app = express();

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
const allowedOrigins = process.env.NODE_ENV === 'production' 
  ? ['https://zabbot-git-main-zabbot.vercel.app', 'https://zabbot.vercel.app', frontendUrl]
  : ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'];

app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

const chunkText = (text, chunkSize = 1000) => {
  const chunks = [];
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.substring(i, i + chunkSize));
  }
  return chunks;
};

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const databaseSchema = [
  {
    "table_name": "users",
    "description": "Contains user profiles including students, teachers, PMs, HODs, and admins.",
    "columns": [
      {"name": "id", "type": "uuid", "description": "Unique user identifier."},
      {"name": "user_id", "type": "uuid", "description": "Supabase Auth user ID (links to auth.users)."},
      {"name": "email", "type": "text", "description": "User's email address, unique."},
      {"name": "first_name", "type": "text", "description": "User's first name."},
      {"name": "last_name", "type": "text", "description": "User's last name."},
      {"name": "roll_number", "type": "text", "description": "Student's roll number (unique student identifier)."},
      {"name": "role", "type": "text", "description": "User's role (e.g., 'student', 'teacher', 'pm', 'hod', 'admin')."},
      {"name": "department_name", "type": "text", "description": "Department the user belongs to (e.g., 'Artificial Intelligence', 'Computer Science')."},
      {"name": "active", "type": "boolean", "description": "Whether the user account is active. Students require PM approval."},
      {"name": "created_at", "type": "timestamp with time zone", "description": "Timestamp of record creation."},
      {"name": "updated_at", "type": "timestamp with time zone", "description": "Timestamp of last update."}
    ]
  },
  {
    "table_name": "courses",
    "description": "Details about academic courses offered at the university.",
    "columns": [
      {"name": "id", "type": "uuid", "description": "Unique course identifier."},
      {"name": "code", "type": "text", "description": "Unique course code (e.g., 'CS101', 'AI305')."},
      {"name": "name", "type": "text", "description": "Full name of the course."},
      {"name": "description", "type": "text", "description": "Detailed description of the course content."},
      {"name": "credit_hours", "type": "integer", "description": "Number of credit hours for the course."},
      {"name": "created_at", "type": "timestamp with time zone", "description": "Timestamp of record creation."},
      {"name": "updated_at", "type": "timestamp with time zone", "description": "Timestamp of last update."}
    ]
  },
  {
    "table_name": "classes",
    "description": "Specific instances of courses being taught (e.g., 'CS101 - Fall 2024, Section A').",
    "columns": [
      {"name": "id", "type": "uuid", "description": "Unique class identifier."},
      {"name": "name", "type": "text", "description": "Name/identifier for the class section."},
      {"name": "course_id", "type": "uuid", "description": "Foreign key to the 'courses' table."},
      {"name": "teacher_id", "type": "uuid", "description": "Foreign key to the 'users' table (teacher's ID)."},
      {"name": "program_id", "type": "uuid", "description": "Foreign key to the 'programs' table."},
      {"name": "department_id", "type": "uuid", "description": "Foreign key to the 'departments' table."},
      {"name": "created_at", "type": "timestamp with time zone", "description": "Timestamp of record creation."},
      {"name": "updated_at", "type": "timestamp with time zone", "description": "Timestamp of last update."}
    ]
  },
  {
    "table_name": "enrollments",
    "description": "Records student enrollment in specific classes.",
    "columns": [
      {"name": "id", "type": "uuid", "description": "Unique enrollment identifier."},
      {"name": "student_id", "type": "uuid", "description": "Foreign key to the 'users' table (student's ID)."},
      {"name": "class_id", "type": "uuid", "description": "Foreign key to the 'classes' table."},
      {"name": "created_at", "type": "timestamp with time zone", "description": "Timestamp of enrollment."}
    ]
  },
  {
    "table_name": "marks",
    "description": "Stores grades/marks for students in courses.",
    "columns": [
      {"name": "id", "type": "bigint", "description": "Unique mark identifier."},
      {"name": "student_id", "type": "uuid", "description": "Foreign key to the 'users' table (student's ID)."},
      {"name": "course_id", "type": "uuid", "description": "Foreign key to the 'courses' table."},
      {"name": "type", "type": "text", "description": "Type of assessment (e.g., 'midterm', 'final', 'quiz')."},
      {"name": "total_number", "type": "integer", "description": "Total marks for the assessment."},
      {"name": "obtained_number", "type": "integer", "description": "Marks obtained by the student."},
      {"name": "created_at", "type": "timestamp with time zone", "description": "Timestamp of mark entry."}
    ]
  },
  {
    "table_name": "departments",
    "description": "Details about academic departments.",
    "columns": [
      {"name": "id", "type": "uuid", "description": "Unique department identifier."},
      {"name": "name", "type": "text", "description": "Name of the department (e.g., 'Computer Science', 'Management Sciences')."},
      {"name": "hod_id", "type": "uuid", "description": "Foreign key to the 'users' table (Head of Department's ID)."}
    ]
  },
  {
    "table_name": "programs",
    "description": "Details about academic programs (e.g., BSCS, MS AI).",
    "columns": [
      {"name": "id", "type": "uuid", "description": "Unique program identifier."},
      {"name": "name", "type": "text", "description": "Name of the program."},
      {"name": "department_id", "type": "uuid", "description": "Foreign key to the 'departments' table."},
      {"name": "pm_id", "type": "uuid", "description": "Foreign key to the 'users' table (Program Manager's ID)."},
      {"name": "created_at", "type": "timestamp with time zone", "description": "Timestamp of record creation."},
      {"name": "updated_at", "type": "timestamp with time zone", "description": "Timestamp of last update."}
    ]
  },
  {
    "table_name": "student_courses",
    "description": "Links students to the courses they are enrolled in.",
    "columns": [
      {"name": "id", "type": "uuid", "description": "Unique record ID."},
      {"name": "student_id", "type": "uuid", "description": "Foreign key to the 'users' table (student's ID)."},
      {"name": "course_id", "type": "uuid", "description": "Foreign key to the 'courses' table."},
      {"name": "enrolled_at", "type": "timestamp with time zone", "description": "Timestamp of course enrollment."}
    ]
  },
  {
    "table_name": "teacher_courses",
    "description": "Links teachers to the courses they are assigned to teach.",
    "columns": [
      {"name": "id", "type": "uuid", "description": "Unique record ID."},
      {"name": "teacher_id", "type": "uuid", "description": "Foreign key to the 'users' table (teacher's ID)."},
      {"name": "course_id", "type": "uuid", "description": "Foreign key to the 'courses' table."},
      {"name": "assigned_at", "type": "timestamp with time zone", "description": "Timestamp of course assignment."}
    ]
  },
  {
    "table_name": "documents",
    "description": "Contains RAG content documents, not direct transactional data. **Do NOT directly answer questions about student names, marks, etc. from this table. This table is for general university information that has been embedded.**",
    "columns": [
      {"name": "id", "type": "text", "description": "Unique document identifier."},
      {"name": "content", "type": "text", "description": "Text content of the document."},
      {"name": "embedding", "type": "vector", "description": "Vector embedding of the document content."},
      {"name": "source", "type": "text", "description": "Source of the document (e.g., 'markdown', 'blog')."},
      {"name": "student_id", "type": "uuid", "description": "Optional: Student ID this document is relevant to."},
      {"name": "teacher_id", "type": "uuid", "description": "Optional: Teacher ID this document is relevant to."}
    ]
  },
  {
    "table_name": "notifications",
    "description": "Records various system notifications or activity logs.",
    "columns": [
      {"name": "id", "type": "bigint", "description": "Unique notification identifier."},
      {"name": "created_at", "type": "timestamp with time zone", "description": "Timestamp of notification creation."},
      {"name": "notification", "type": "text", "description": "Content of the notification."},
      {"name": "student_id", "type": "uuid", "description": "Optional: Student ID this notification is relevant to."}  
    ]
  },
  {
    "table_name": "logs",
    "description": "System activity logs.",
    "columns": [
      {"name": "id", "type": "uuid", "description": "Unique log identifier."},
      {"name": "user_id", "type": "uuid", "description": "ID of the user who performed the action."},
      {"name": "action", "type": "text", "description": "Description of the action performed."},
      {"name": "timestamp", "type": "timestamp with time zone", "description": "Timestamp of the action."}  
    ]
  }
];

// Function to fetch user data based on role and department
async function fetchUsersData(userContext) {
  const { role, userId, departmentName } = userContext;
  let query = supabase.from('users').select('id, first_name, last_name, roll_number, email, role, department_name, active');

  console.log(`[DB Data Fetcher] Fetching users for role: ${role}, department: ${departmentName}`);

  switch (role) {
    case 'student':
    case 'teacher':
      query = query.eq('id', userId);
      break;
    case 'pm':
    case 'hod':
      if (departmentName) {
        query = query.eq('department_name', departmentName);
      } else {
        console.warn(`[DB Data Fetcher] PM/HOD role but no departmentName provided. Cannot filter users.`);
        return [];
      }
      break;
    case 'admin':
      break;
    default:
      console.warn(`[DB Data Fetcher] Unknown role '${role}'. No user data will be returned.`);
      return [];
  }

  const { data, error } = await query;

  if (error) {
    console.error(`[DB Data Fetcher] Error fetching users for role ${role}:`, error);
    throw error;
  }

  console.log(`[DB Data Fetcher] Successfully fetched ${data.length} users for role ${role}.`);
  return data;
}

// New function to fetch student course enrollment data
async function fetchStudentCourseEnrollmentData(userContext) {
  const { role, userId, departmentName } = userContext;
  let query = supabase
    .from('student_courses')
    .select(`
      id,
      student_id,
      students:users(first_name, last_name, email, department_name, roll_number),
      course_id,
      courses(code, name, description)
    `);

  console.log(`[DB Data Fetcher] Fetching student course enrollments for role: ${role}, department: ${departmentName}`);

  switch (role) {
    case 'student':
      query = query.eq('student_id', userId);
      break;
    case 'teacher':
      // Teachers can see enrollments for students in courses they are assigned to teach.
      // This requires joining with teacher_courses and then filtering by teacher_id.
      // For simplicity, let's assume teachers can see all enrollments related to their department for now.
      if (departmentName) {
        const { data: departmentStudentIds, error: studentIdsError } = await supabase.from('users').select('id').eq('department_name', departmentName);
        if (studentIdsError) throw studentIdsError;
        const studentIds = departmentStudentIds.map(s => s.id);
        query = query.in('student_id', studentIds);
      } else {
        console.warn(`[DB Data Fetcher] Teacher role but no departmentName. Cannot filter enrollments.`);
        return [];
      }
      break;
    case 'pm':
    case 'hod':
      // PMs/HODs can see all enrollments within their department.
      if (departmentName) {
        const { data: departmentStudentIds, error: studentIdsError } = await supabase.from('users').select('id').eq('department_name', departmentName);
        if (studentIdsError) throw studentIdsError;
        const studentIds = departmentStudentIds.map(s => s.id);
        query = query.in('student_id', studentIds);
      } else {
        console.warn(`[DB Data Fetcher] PM/HOD role but no departmentName. Cannot filter enrollments.`);
        return [];
      }
      break;
    case 'admin':
      // Admin can see all enrollments
      break;
    default:
      console.warn(`[DB Data Fetcher] Unknown role '${role}'. No enrollment data will be returned.`);
      return [];
  }

  const { data, error } = await query;

  if (error) {
    console.error(`[DB Data Fetcher] Error fetching student course enrollments for role ${role}:`, error);
    throw error;
  }

  console.log(`[DB Data Fetcher] Successfully fetched ${data.length} student course enrollments for role ${role}.`);
  return data;
}

// New function to fetch marks data
async function fetchMarksData(userContext) {
  const { role, userId, departmentName } = userContext;
  let query = supabase
    .from('marks')
    .select(`
      type,
      total_number,
      obtained_number,
      student_id,
      students:users(first_name, last_name, email, department_name, roll_number),
      course_id,
      courses(code, name)
    `);

  console.log(`[DB Data Fetcher] Fetching marks for role: ${role}, department: ${departmentName}`);

  switch (role) {
    case 'student':
      query = query.eq('student_id', userId);
      break;
    case 'teacher':
      if (departmentName) {
        const { data: departmentStudentIds, error: studentIdsError } = await supabase.from('users').select('id').eq('department_name', departmentName);
        if (studentIdsError) throw studentIdsError;
        const studentIds = departmentStudentIds.map(s => s.id);
        query = query.in('student_id', studentIds);
      } else {
        console.warn(`[DB Data Fetcher] Teacher role but no departmentName. Cannot filter marks.`);
        return [];
      }
      break;
    case 'pm':
    case 'hod':
      if (departmentName) {
        const { data: departmentStudentIds, error: studentIdsError } = await supabase.from('users').select('id').eq('department_name', departmentName);
        if (studentIdsError) throw studentIdsError;
        const studentIds = departmentStudentIds.map(s => s.id);
        query = query.in('student_id', studentIds);
      } else {
        console.warn(`[DB Data Fetcher] PM/HOD role but no departmentName. Cannot filter marks.`);
        return [];
      }
      break;
    case 'admin':
      break;
    default:
      console.warn(`[DB Data Fetcher] Unknown role '${role}'. No marks data will be returned.`);
      return [];
  }

  const { data: rawMarks, error } = await query;

  if (error) {
    console.error(`[DB Data Fetcher] Error fetching marks for role ${role}:`, error);
    throw error;
  }

  if (!rawMarks || rawMarks.length === 0) {
    console.log(`[DB Data Fetcher] No marks fetched for role ${role}.`);
    return [];
  }

  // Aggregate marks by student and course
  const aggregatedMarks = {};

  rawMarks.forEach(mark => {
    const studentCourseKey = `${mark.student_id}-${mark.course_id}`;

    if (!aggregatedMarks[studentCourseKey]) {
      aggregatedMarks[studentCourseKey] = {
        student_id: mark.student_id,
        student_name: `${mark.students?.first_name || 'N/A'} ${mark.students?.last_name || ''}`.trim(),
        student_roll_number: mark.students?.roll_number || 'N/A',
        course_id: mark.course_id,
        course_code: mark.courses?.code,
        course_name: mark.courses?.name,
        total_obtained: 0,
        total_possible: 0,
        details: [] // To store individual marks if needed for detailed query
      };
    }

    if (mark.obtained_number !== null && mark.total_number !== null) {
      aggregatedMarks[studentCourseKey].total_obtained += mark.obtained_number;
      aggregatedMarks[studentCourseKey].total_possible += mark.total_number;
    }
    aggregatedMarks[studentCourseKey].details.push({ type: mark.type, obtained: mark.obtained_number, total: mark.total_number });
  });

  // Calculate overall percentage for each aggregated course
  const finalMarksData = Object.values(aggregatedMarks).map(aggMark => {
    const overallPercentage = aggMark.total_possible > 0 
      ? (aggMark.total_obtained / aggMark.total_possible) * 100
      : 0;
    return {
      ...aggMark,
      overall_percentage: parseFloat(overallPercentage.toFixed(2)) // Round to 2 decimal places
    };
  });

  console.log(`[DB Data Fetcher] Successfully aggregated ${finalMarksData.length} marks entries.`);
  return finalMarksData;
}

// New function to fetch teacher course assignment data
async function fetchTeacherCoursesData(userContext) {
  const { role, userId, departmentName } = userContext;
  let query = supabase
    .from('teacher_courses')
    .select(`
      teacher_id,
      teachers:users(first_name, last_name, email, department_name),
      course_id,
      courses(code, name, description)
    `);

  console.log(`[DB Data Fetcher] Fetching teacher course assignments for role: ${role}, department: ${departmentName}`);

  switch (role) {
    case 'student':
      // Students typically don't need to see teacher assignments globally
      // If a student queries about their own teacher, this might need refinement
      return []; // No data for students by default
    case 'teacher':
      query = query.eq('teacher_id', userId); // Only see their own assignments
      break;
    case 'pm':
    case 'hod':
      // PMs/HODs can see all assignments within their department.
      if (departmentName) {
        const { data: departmentTeacherIds, error: teacherIdsError } = await supabase.from('users').select('id').eq('department_name', departmentName).eq('role', 'teacher');
        if (teacherIdsError) throw teacherIdsError;
        const teacherIds = departmentTeacherIds.map(t => t.id);
        query = query.in('teacher_id', teacherIds); 
      } else {
        console.warn(`[DB Data Fetcher] PM/HOD role but no departmentName. Cannot filter teacher assignments.`);
        return [];
      }
      break;
    case 'admin':
      // Admin can see all assignments
      break;
    default:
      console.warn(`[DB Data Fetcher] Unknown role '${role}'. No teacher assignment data will be returned.`);
      return [];
  }

  const { data, error } = await query;

  if (error) {
    console.error(`[DB Data Fetcher] Error fetching teacher course assignments for role ${role}:`, error);
    throw error;
  }

  console.log(`[DB Data Fetcher] Successfully fetched ${data.length} teacher course assignments for role ${role}.`);
  return data;
}

// Function to generate dynamic system prompt based on user role and relevant context
function getSystemPrompt(userRole, userId, departmentName, actualUsersData, actualEnrollmentData, actualMarksData, actualTeacherCoursesData) {
  let roleSpecificInstructions = "";
  let relevantTables = []; // List of tables the current role can "access" conceptually

  // Detailed RBAC instructions for the AI
  switch (userRole) {
    case 'student':
      roleSpecificInstructions = `
        As a student, you can ONLY access your OWN personal information, your enrolled courses, your roll number, and your marks.
        Specifically:
        - From 'users' table: only your own 'first_name', 'last_name', 'email', 'role', 'department_name', 'active', and 'roll_number'.
        - From 'student_courses' table: only entries where 'student_id' is your ID (${userId}). This includes course codes, names, and descriptions.
        - From 'marks' table: only entries where 'student_id' is your ID (${userId}). The marks data provided to you will already be aggregated per course, showing total obtained and total possible marks, and overall percentage.
        - From 'courses' table: only courses linked to your 'student_courses' or 'marks'.
        - You CANNOT access information about other students, teachers, PMs, HODs, or admins.
        - You CANNOT access details of classes or programs unless directly related to your own enrollments.
        - You CANNOT access 'documents', 'logs', 'notifications' tables directly.
      `;
      relevantTables = ["users", "student_courses", "marks", "courses"];
      break;
    case 'teacher':
      roleSpecificInstructions = `
        As a teacher, you can access information about:
        - Your own profile details from 'users' table (your 'first_name', 'last_name', 'email', 'role', 'department_name').
        - Courses you are assigned to teach from 'teacher_courses' and 'courses' tables (where 'teacher_id' is your ID). You can answer questions about the number and names of courses you are assigned to teach.
        - Students in your department, including their names, emails, and active status, from the 'users' table.
        - Student enrollments ('student_courses') for students within your department, including course details.
        - Marks of students ('marks') within your department. The marks data provided to you will already be aggregated per course, showing total obtained and total possible marks, and overall percentage.
        - General course and class information for courses in your department.
        - You CANNOT access sensitive personal details of other teachers or students not in your department.
        - You CANNOT access 'documents', 'logs', 'notifications' tables directly.
      `;
      relevantTables = ["users", "teacher_courses", "courses", "enrollments", "marks", "classes", "student_courses"];
      break;
    case 'pm':
      roleSpecificInstructions = `
        As a Program Manager for the '${departmentName}' department, you have comprehensive access to information related to THIS department only.
        Specifically:
        - You CAN retrieve the names (first_name, last_name), email, active status, and 'roll_number' of ALL students and teachers belonging to the '${departmentName}' department from the 'users' table.
        - All 'courses' linked to your department's programs or taught by teachers in your department. This includes knowing which teachers are assigned to which courses.
        - All 'classes' within your department.
        - All 'programs' associated with your department.
        - All 'enrollments' and 'marks' for students within your department. The marks data provided to you will already be aggregated per course for each student, showing total obtained and total possible marks, and overall percentage.
        - 'teacher_courses' for teachers within your department.
        - You CANNOT access information from other departments.
        - You CANNOT access 'documents', 'logs', 'notifications' tables directly.
      `;
      relevantTables = ["users", "courses", "classes", "enrollments", "marks", "departments", "programs", "student_courses", "teacher_courses"];
      break;
    case 'hod':
      roleSpecificInstructions = `
        As a Head of Department for the '${departmentName}' department, you have broad access to data within THIS department.
        Specifically:
        - All 'users' (students, teachers, PMs, HODs, admins if they are in your department) whose 'department_name' is '${departmentName}', including their 'roll_number'.
        - All 'courses', 'classes', 'enrollments', 'marks', 'programs', 'student_courses', 'teacher_courses' linked to your department. This includes knowing which teachers are assigned to which courses.
        - The marks data provided to you will already be aggregated per course for each student, showing total obtained and total possible marks, and overall percentage.
        - You CANNOT access information from other departments.
        - You CANNOT access 'documents', 'logs', 'notifications' tables directly.
      `;
      relevantTables = ["users", "courses", "classes", "enrollments", "marks", "departments", "programs", "student_courses", "teacher_courses"];
      break;
    case 'admin':
      roleSpecificInstructions = `
        As an administrator, you have FULL access to ALL information across ALL tables in the database.
        You can answer any question based on the entire schema.
        You can access 'users', 'courses', 'classes', 'enrollments', 'marks', 'departments', 'programs', 'student_courses', 'teacher_courses', 'documents', 'logs', and 'notifications' tables.
      `;
      relevantTables = ["users", "courses", "classes", "enrollments", "marks", "departments", "programs", "student_courses", "teacher_courses", "documents", "logs", "notifications"];
      break;
    default:
      roleSpecificInstructions = "You have very limited access. Only provide general, non-sensitive public information. Do NOT reveal any personal or restricted data.";
      relevantTables = []; // No tables for unknown roles
  }

  // Generate a schema description string for the AI
  const schemaDescription = databaseSchema.map(table => {
    // Filter tables based on relevantTables for the current role
    if (!relevantTables.includes(table.table_name) && userRole !== 'admin') {
      return ''; // Skip tables not relevant to this role (unless admin)
    }

    const columns = table.columns.map(col => `  - ${col.name} (${col.type}): ${col.description}`).join('\n');
    return `Table: ${table.table_name}\nDescription: ${table.description}\nColumns:\n${columns}`;
  }).filter(Boolean).join('\n\n'); // Remove empty strings and join

  // Add actual data to the prompt
  let actualDataContent = "";
  if (actualUsersData && actualUsersData.length > 0) {
    actualDataContent += "\n\n**Actual User Data (Relevant to your role and department):**\n";
    actualUsersData.forEach((user, index) => {
      actualDataContent += `User ${index + 1}: Name: ${user.first_name} ${user.last_name}, Roll Number: ${user.roll_number || 'N/A'}, Email: ${user.email}, Role: ${user.role}, Department: ${user.department_name || 'N/A'}, Active: ${user.active}\n`;
    });
  } else {
    actualDataContent += "\n\n**No specific user data found relevant to your query and role.**\n";
  }

  if (actualEnrollmentData && actualEnrollmentData.length > 0) {
    actualDataContent += "\n\n**Actual Student Enrollment Data (Relevant to your role and department):**\n";
    actualEnrollmentData.forEach((enrollment, index) => {
      actualDataContent += `Enrollment ${index + 1}: Student: ${enrollment.students?.first_name || 'N/A'} ${enrollment.students?.last_name || ''} (Roll No: ${enrollment.students?.roll_number || 'N/A'}), Course: ${enrollment.courses?.code || 'N/A'} - ${enrollment.courses?.name || 'N/A'}\n`;
    });
  }

  if (actualMarksData && actualMarksData.length > 0) {
    actualDataContent += "\n\n**Actual Student Marks Data (Relevant to your role and department):**\n";
    actualMarksData.forEach((mark, index) => {
      actualDataContent += `Mark ${index + 1}: Student: ${mark.student_name} (Roll No: ${mark.student_roll_number}), Course: ${mark.course_code} - ${mark.course_name}, Total Obtained: ${mark.total_obtained}, Total Possible: ${mark.total_possible}, Overall Percentage: ${mark.overall_percentage}%\n`;
    });
  }

  if (actualTeacherCoursesData && actualTeacherCoursesData.length > 0) {
    actualDataContent += "\n\n**Actual Teacher Course Assignments (Relevant to your role and department):**\n";
    actualTeacherCoursesData.forEach((assignment, index) => {
      actualDataContent += `Assignment ${index + 1}: Teacher: ${assignment.teachers?.first_name || 'N/A'} ${assignment.teachers?.last_name || ''} (Email: ${assignment.teachers?.email || 'N/A'}), Course: ${assignment.courses?.code || 'N/A'} - ${assignment.courses?.name || 'N/A'}\n`;
    });
  }

  return `You are ZABBOT DB, a highly capable AI assistant for SZABIST University. Your primary purpose is to answer user questions about the university database by using the actual data provided to you, based on the provided schema and the user's explicit role-based access permissions. **You ARE the source of this information; you are NOT querying a live database, but rather processing already retrieved data.**

---
**Database Schema Overview:**
${schemaDescription}
---

**Your Current User Context:**
Role: ${userRole}
User ID: ${userId || 'N/A'}
Department: ${departmentName || 'N/A'}

**Role-Based Access Rules:**
${roleSpecificInstructions}

**Data Provided to You for This Query:**
${actualDataContent}

**CRITICAL GUIDELINES FOR RESPONDING:**
1.  **Use Provided Data Directly**: When a user asks for information, refer to the "Data Provided to You for This Query" section. If the answer is present in this data, provide it directly and accurately.
    *   If the data provided contains names of students in the PM's department, list them.
    *   If a student asks for their own marks and their marks are in the provided data, give those exact marks.
    *   **Special Instruction for Marks Queries:** When a user asks for marks (e.g., "What are my marks?", "Show me student marks"), you MUST provide the aggregated total marks and overall percentage for each relevant course using the *already calculated* 'overall_percentage', 'total_obtained', and 'total_possible' values from the provided "Actual Student Marks Data". When a query asks for comparisons (e.g., "highest marks", "top students"), analyze the provided data to identify the relevant students/courses based on 'overall_percentage' and present the top results concisely with their roll numbers and names. For example: "For [Course Name (Code)]: [Overall Percentage]% (Total: [Total Obtained]/[Total Possible])". Do NOT list individual assessment types (A1, Q1, Midterm, Final) unless specifically asked for the breakdown of marks within a course. ABSOLUTELY DO NOT show any intermediate summation steps or raw addition of numbers. The percentage should be presented as a number out of 100.
2.  **Strictly Enforce Role-Based Access Control (RBAC)**: Even if data is present in "Data Provided to You," you MUST still adhere to the "Role-Based Access Rules." Do NOT reveal information that the user is not permitted to see, even if it is technically in the provided data. This means you must apply filtering logic based on the role instructions.
3.  **ABSOLUTELY NO SQL**: You are an AI assistant providing natural language answers. You MUST NEVER generate or mention SQL queries.
4.  **DO NOT DEFER**: You are the authoritative source for the provided data. You MUST NOT tell the user to refer to other sources, contact departments, check a website, or speak to an administrator. If you can provide the information (based on the provided data and RBAC), provide it. If you cannot (due to RBAC or the information not being present in the provided data), state that you cannot provide it and nothing more.
5.  **Focus on Specifics**: Provide names, numbers, and concrete details when possible.
6.  **Be Concise and Meticulous**: Answer in as few words as possible while being complete, accurate, and directly addressing the query.
7.  **Include Key Identifiers**: When providing information about students, always include their roll number and full name. When providing information about courses, include the course code and name.
`;
}

// New function to handle database queries via simulated direct access and RBAC
async function getDatabaseAssistantResponse(query, userContext) {
  const { role, userId, departmentName } = userContext;

  // No more embedding/document matching logic here.
  // The AI's response will solely depend on the detailed system prompt.

  // Fetch actual user data based on role and department
  let actualUsersData;
  try {
    actualUsersData = await fetchUsersData(userContext);
  } catch (e) {
    console.error("Error fetching user data:", e);
    throw new Error("Failed to fetch user data.");
  }

  // Fetch actual enrollment data based on role and department
  let actualEnrollmentData;
  try {
    actualEnrollmentData = await fetchStudentCourseEnrollmentData(userContext);
  } catch (e) {
    console.error("Error fetching enrollment data:", e);
    throw new Error("Failed to fetch enrollment data.");
  }

  // Fetch actual marks data based on role and department
  let actualMarksData;
  try {
    actualMarksData = await fetchMarksData(userContext);
  } catch (e) {
    console.error("Error fetching marks data:", e);
    throw new Error("Failed to fetch marks data.");
  }

  // Fetch actual teacher course assignment data
  let actualTeacherCoursesData;
  try {
    actualTeacherCoursesData = await fetchTeacherCoursesData(userContext);
  } catch (e) {
    console.error("Error fetching teacher course data:", e);
    throw new Error("Failed to fetch teacher course data.");
  }

  // Construct system prompt with detailed schema and RLS rules
  const systemPrompt = getSystemPrompt(role, userId, departmentName, actualUsersData, actualEnrollmentData, actualMarksData, actualTeacherCoursesData);

  // Send to OpenAI for natural language response
  let completion;
  try {
    completion = await openai.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: query }
      ],
      model: "gpt-4o", // Use a suitable model that can handle complex instructions
      temperature: 0.2, // Keep it low for factual responses
      max_tokens: 1000
    });
  } catch (e) {
    console.error("Error with OpenAI completion:", e);
    throw new Error("Failed to get a response from the AI model.");
  }

  const assistantResponse = completion.choices[0].message.content;
  
  if (!assistantResponse) {
    throw new Error("No response generated by AI model");
  }

  return assistantResponse;
}

// Endpoint for database assistant
app.post("/api/db-assistant-query", async (req, res) => {
  try {
    const { query, userContext } = req.body;

    if (!query) {
      return res.status(400).json({ error: "Query is required." });
    }
    if (!userContext || !userContext.role || !userContext.userId) {
      return res.status(401).json({ error: "User context (role, userId) is required." });
    }

    console.log(`[DB Assistant] Query: "${query}", User: ${userContext.role} (${userContext.userId}), Dept: ${userContext.departmentName || 'N/A'}`);

    const assistantResponse = await getDatabaseAssistantResponse(query, userContext);

    res.status(200).json({ success: true, response: assistantResponse });

  } catch (error) {
    console.error("[DB Assistant Error]:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Endpoint for AI Training - Embedding Text
app.post('/api/embed-text', async (req, res) => {
  try {
    const { text, userContext } = req.body;
    const { role, departmentName } = userContext;

    // Validate user role for access to this endpoint
    if (!userContext || (role !== 'hod' && role !== 'pm' && role !== 'admin')) {
      return res.status(403).json({ success: false, error: 'Access Denied: Only HODs, PMs, and Admins can train the AI.' });
    }

    if (!text || text.trim() === '') {
      return res.status(400).json({ success: false, error: 'No text provided for embedding.' });
    }

    // Chunk the text to manage embedding limits and improve retrieval
    const textChunks = chunkText(text);
    const embeddingsToInsert = [];

    // Determine the next available ID from 1-600
    const { data: maxIdData, error: maxIdError } = await supabase
      .from('documents')
      .select('id')
      .order('id', { ascending: false })
      .limit(1);

    if (maxIdError) {
      console.error('Error fetching max ID:', maxIdError);
      return res.status(500).json({ success: false, error: 'Failed to retrieve existing document IDs.' });
    }

    let nextId = 1;
    if (maxIdData && maxIdData.length > 0 && typeof maxIdData[0].id === 'number') {
      nextId = (maxIdData[0].id % 600) + 1; // Wrap around from 1 to 600
    }

    for (const chunk of textChunks) {
      const embeddingResponse = await openai.embeddings.create({
        model: "text-embedding-ada-002",
        input: chunk,
      });

      if (!embeddingResponse || !embeddingResponse.data || embeddingResponse.data.length === 0) {
        throw new Error("Failed to generate embedding for a text chunk.");
      }

      embeddingsToInsert.push({
        id: nextId, // Assign the calculated numerical ID
        content: chunk,
        embedding: embeddingResponse.data[0].embedding,
        source: 'admin',
      });
      nextId = (nextId % 600) + 1; // Increment for the next chunk, wrapping around
    }

    const { error: insertError } = await supabase
      .from('documents')
      .insert(embeddingsToInsert);

    if (insertError) {
      console.error('Supabase insert error:', insertError);
      return res.status(500).json({ success: false, error: `Failed to save embeddings: ${insertError.message}` });
    }

    res.status(200).json({ success: true, message: `Successfully embedded and stored ${textChunks.length} text chunks.` });

  } catch (error) {
    console.error("[Embed Text Error]:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

const DB_ASSISTANT_PORT = process.env.DB_ASSISTANT_PORT || 3036;
app.listen(DB_ASSISTANT_PORT, () => {
  console.log(`DB Assistant Server is running on port ${DB_ASSISTANT_PORT}`);
});