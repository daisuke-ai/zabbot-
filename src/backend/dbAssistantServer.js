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

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// --- Database Schema (Informational for AI's general knowledge, not for SQL generation) ---
// This detailed schema information will be part of the system prompt to guide the AI.
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
      {"name": "teacher_id", "type": "uuid", "description": "Optional: Teacher ID this document is relevant to."},
      {"name": "department_id", "type": "uuid", "description": "Optional: Department ID this document is relevant to."}
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
  let query = supabase.from('users').select('id, first_name, last_name, email, role, department_name, active');

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
      student_id,
      students:users(first_name, last_name, email, department_name),
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
      // A more robust solution would involve more complex Supabase queries or RLS.
      if (departmentName) {
        query = query.eq('students.department_name', departmentName); // Assuming students relation is joined
      } else {
        console.warn(`[DB Data Fetcher] Teacher role but no departmentName. Cannot filter enrollments.`);
        return [];
      }
      break;
    case 'pm':
    case 'hod':
      // PMs/HODs can see all enrollments within their department.
      if (departmentName) {
        query = query.eq('students.department_name', departmentName); // Assuming students relation is joined
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
      students:users(first_name, last_name, email, department_name),
      course_id,
      courses(code, name)
    `);

  console.log(`[DB Data Fetcher] Fetching marks for role: ${role}, department: ${departmentName}`);

  switch (role) {
    case 'student':
      query = query.eq('student_id', userId);
      break;
    case 'teacher':
      // Teachers can see marks for students in courses they are assigned to teach.
      // This requires joining with teacher_courses and then filtering.
      // For simplicity, let's assume teachers can see all marks related to their department for now.
      if (departmentName) {
        query = query.eq('students.department_name', departmentName); // Assuming students relation is joined
      } else {
        console.warn(`[DB Data Fetcher] Teacher role but no departmentName. Cannot filter marks.`);
        return [];
      }
      break;
    case 'pm':
    case 'hod':
      // PMs/HODs can see all marks within their department.
      if (departmentName) {
        query = query.eq('students.department_name', departmentName); // Assuming students relation is joined
      } else {
        console.warn(`[DB Data Fetcher] PM/HOD role but no departmentName. Cannot filter marks.`);
        return [];
      }
      break;
    case 'admin':
      // Admin can see all marks
      break;
    default:
      console.warn(`[DB Data Fetcher] Unknown role '${role}'. No marks data will be returned.`);
      return [];
  }

  const { data, error } = await query;

  if (error) {
    console.error(`[DB Data Fetcher] Error fetching marks for role ${role}:`, error);
    throw error;
  }

  console.log(`[DB Data Fetcher] Successfully fetched ${data.length} marks for role ${role}.`);
  return data;
}

// Function to generate dynamic system prompt based on user role and relevant context
function getSystemPrompt(userRole, userId, departmentName, actualUsersData) {
  let roleSpecificInstructions = "";
  let relevantTables = []; // List of tables the current role can "access" conceptually

  // Detailed RBAC instructions for the AI
  switch (userRole) {
    case 'student':
      roleSpecificInstructions = `
        As a student, you can ONLY access your OWN personal information, your enrolled courses, and your marks.
        Specifically:
        - From 'users' table: only your own 'first_name', 'last_name', 'email', 'role', 'department_name'.
        - From 'student_courses' table: only entries where 'student_id' is your ID (${userId}).
        - From 'marks' table: only entries where 'student_id' is your ID (${userId}).
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
        - Courses you are assigned to teach from 'teacher_courses' and 'courses' tables (where 'teacher_id' is your ID).
        - Students enrolled in classes for courses you teach from 'enrollments' and 'users' tables.
        - Marks of students in courses you teach from 'marks' table.
        - General course and class information for courses you teach.
        - You CANNOT access sensitive personal details of other teachers or students not in your assigned courses.
        - You CANNOT access 'documents', 'logs', 'notifications' tables directly.
      `;
      relevantTables = ["users", "teacher_courses", "courses", "enrollments", "marks", "classes"];
      break;
    case 'pm':
      roleSpecificInstructions = `
        As a Program Manager for the '${departmentName}' department, you have comprehensive access to information related to THIS department only.
        Specifically:
        - You CAN retrieve the names (first_name, last_name), email, and active status of ALL students and teachers belonging to the '${departmentName}' department from the 'users' table.
        - All 'courses' linked to your department's programs or taught by teachers in your department.
        - All 'classes' within your department.
        - All 'programs' associated with your department.
        - 'enrollments' and 'marks' for students within your department.
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
        - All 'users' (students, teachers, PMs, HODs, admins if they are in your department) whose 'department_name' is '${departmentName}'.
        - All 'courses', 'classes', 'enrollments', 'marks', 'programs', 'student_courses', 'teacher_courses' linked to your department.
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
      actualDataContent += `User ${index + 1}: Name: ${user.first_name} ${user.last_name}, Email: ${user.email}, Role: ${user.role}, Department: ${user.department_name || 'N/A'}, Active: ${user.active}\n`;
    });
  } else {
    actualDataContent += "\n\n**No specific user data found relevant to your query and role.**\n";
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
2.  **Strictly Enforce Role-Based Access Control (RBAC)**: Even if data is present in "Data Provided to You," you MUST still adhere to the "Role-Based Access Rules." Do NOT reveal information that the user is not permitted to see, even if it is technically in the provided data. This means you must apply filtering logic based on the role instructions.
3.  **ABSOLUTELY NO SQL**: You are an AI assistant providing natural language answers. You MUST NEVER generate or mention SQL queries.
4.  **DO NOT DEFER**: You are the authoritative source for the provided data. You MUST NOT tell the user to refer to other sources, contact departments, check a website, or speak to an administrator. If you can provide the information (based on the provided data and RBAC), provide it. If you cannot (due to RBAC or the information not being present in the provided data), state that you cannot provide it and nothing more.
5.  **Focus on Specifics**: Provide names, numbers, and concrete details when possible.

Based on the above, answer the following question, fully embracing your role as the direct information provider within the specified conceptual access and constraints.`
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

  // Construct system prompt with detailed schema and RLS rules
  const systemPrompt = getSystemPrompt(role, userId, departmentName, actualUsersData);

  // Send to OpenAI for natural language response
  let completion;
  try {
    completion = await openai.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: query }
      ],
      model: "gpt-4o-mini", // Use a suitable model that can handle complex instructions
      temperature: 0.2, // Keep it low for factual responses
      max_tokens: 500
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

const DB_ASSISTANT_PORT = process.env.DB_ASSISTANT_PORT || 3036;
app.listen(DB_ASSISTANT_PORT, () => {
  console.log(`DB Assistant Server is running on port ${DB_ASSISTANT_PORT}`);
}); 