// Unified Backend Server for ZABBOT AI Assistant
// Combines both server.js and dbAssistantServer.js functionality
import express from "express";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { TextLoader } from "langchain/document_loaders/fs/text";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from "dotenv";
import cors from 'cors';
import { createClient as createContentfulClient } from 'contentful';
import gtts from 'gtts';
import fileUpload from 'express-fileupload';
import os from 'os';
import { BufferMemory } from "langchain/memory";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const app = express();

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// CORS Configuration
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
const allowedOrigins = process.env.NODE_ENV === 'production' 
  ? [
      'https://zabbot-git-main-zabbot.vercel.app', 
      'https://zabbot.vercel.app', 
      'https://zabbot-frontend.vercel.app',
      process.env.FRONTEND_URL // Ensure this is explicitly included
    ]
  : ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'];

app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(fileUpload({
  limits: { fileSize: 50 * 1024 * 1024 },
  abortOnLimit: true
}));

// Environment Variable Checks
const requiredEnv = [
  'OPENAI_API_KEY',
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY'
];

const missingEnv = requiredEnv.filter(env => !process.env[env]);
if (missingEnv.length > 0) {
  console.error('Missing required environment variables:', missingEnv);
  process.exit(1);
}

// Initialize clients
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const memory = new BufferMemory();

// Initialize Contentful client only if credentials are available. This is used to fetch blog posts.
let contentfulClient = null;
if (process.env.VITE_CONTENTFUL_SPACE_ID && process.env.VITE_CONTENTFUL_ACCESS_TOKEN) {
  try {
    contentfulClient = createContentfulClient({
      space: process.env.VITE_CONTENTFUL_SPACE_ID,
      accessToken: process.env.VITE_CONTENTFUL_ACCESS_TOKEN
    });
    console.log('✅ Contentful client initialized successfully');
  } catch (error) {
    console.warn('⚠️ Contentful client initialization failed:', error.message);
    contentfulClient = null;
  }
} else {
  console.log('ℹ️ Contentful credentials not provided - blog embedding will be skipped');
}

// Add caches
const queryCache = new Map();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
const ttsCache = new Map();
const TTS_CACHE_SIZE_LIMIT = 100;
const TTS_CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

// Database schema definition (from dbAssistantServer.js)
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
    "description": "Contains RAG content documents, not direct transactional data.",
    "columns": [
      {"name": "id", "type": "text", "description": "Unique document identifier."},
      {"name": "content", "type": "text", "description": "Text content of the document."},
      {"name": "embedding", "type": "vector", "description": "Vector embedding of the document content."},
      {"name": "source", "type": "text", "description": "Source of the document (e.g., 'markdown', 'blog')."},
      {"name": "student_id", "type": "uuid", "description": "Optional: Student ID this document is relevant to."},
      {"name": "teacher_id", "type": "uuid", "description": "Optional: Teacher ID this document is relevant to."}
    ]
  }
];

// Utility functions
const chunkText = (text, chunkSize = 1000) => {
  const chunks = [];
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.substring(i, i + chunkSize));
  }
  return chunks;
};

async function ensureSourceColumn() {
  const { error } = await supabase.rpc('add_source_column_if_not_exists');
  if (error) {
    console.error('Error ensuring source column:', error);
  }
}

async function initializeEmbeddings() {
  try {
    await ensureSourceColumn();
    
    const { data: existingDocs } = await supabase
      .from('documents')
      .select('id')
      .limit(1);

    if (!existingDocs?.length) {
      console.log('Generating initial embeddings...');
      await generateAndStoreEmbeddings();
      console.log('Initial embeddings generated successfully');
    } else {
      console.log('Embeddings already exist in the database');
    }
  } catch (error) {
    console.error('Error initializing embeddings:', error);
  }
}

async function getBlogPosts() {
  if (!contentfulClient) {
    console.log('Contentful not configured, skipping blog posts');
    return [];
  }
  try {
    const response = await contentfulClient.getEntries({
      content_type: 'universityBlog',
      include: 2,
    });
    return response.items;
  } catch (error) {
    console.error('Error fetching blog posts:', error);
    return [];
  }
}

async function generateAndStoreEmbeddings() {
  // Handle markdown file
  const filePath = path.join(__dirname, "../../data/rag_Data.md");
  let markdownChunks = [];
  
  if (fs.existsSync(filePath)) {
    const loader = new TextLoader(filePath);
    const docs = await loader.load();
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });
    markdownChunks = await textSplitter.splitDocuments(docs);
  } else {
    console.log('rag_Data.md not found, skipping markdown embedding');
  }

  // Get blog posts
  const blogPosts = await getBlogPosts();
  
  // Combine markdown chunks and blog posts
  const allContent = [
    ...markdownChunks.map(chunk => ({
      content: chunk.pageContent,
      source: 'markdown'
    })),
    ...blogPosts.map(post => ({
      content: `Blog Post: ${post.fields.title}\n${post.fields.content.content
        .map(item => item.content?.map(c => c.value).join(' '))
        .join('\n')}`,
      source: 'blog'
    }))
  ];

  if (allContent.length === 0) {
    console.log('No content to embed');
    return;
  }

  const promises = allContent.map(async ({ content, source }, index) => {
    const cleanContent = content.replace(/\n/g, " ");

    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: cleanContent,
    });

    const [{ embedding }] = embeddingResponse.data;

    const uniqueId = `${Date.now()}-${index}-${Math.random().toString(36).substring(2, 10)}`;

    const { error } = await supabase.from("documents").insert({
      id: uniqueId,
      content: cleanContent,
      embedding,
      source
    });

    if (error) {
      throw error;
    }
  });

  await Promise.all(promises);
}

// Database query functions (from dbAssistantServer.js)
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
        details: []
      };
    }

    if (mark.obtained_number !== null && mark.total_number !== null) {
      aggregatedMarks[studentCourseKey].total_obtained += mark.obtained_number;
      aggregatedMarks[studentCourseKey].total_possible += mark.total_number;
    }
    aggregatedMarks[studentCourseKey].details.push({ 
      type: mark.type, 
      obtained: mark.obtained_number, 
      total: mark.total_number 
    });
  });

  // Calculate overall percentage for each aggregated course
  const finalMarksData = Object.values(aggregatedMarks).map(aggMark => {
    const overallPercentage = aggMark.total_possible > 0 
      ? (aggMark.total_obtained / aggMark.total_possible) * 100
      : 0;
    return {
      ...aggMark,
      overall_percentage: parseFloat(overallPercentage.toFixed(2))
    };
  });

  console.log(`[DB Data Fetcher] Successfully aggregated ${finalMarksData.length} marks entries.`);
  return finalMarksData;
}

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
      return [];
    case 'teacher':
      query = query.eq('teacher_id', userId);
      break;
    case 'pm':
    case 'hod':
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

function getSystemPrompt(userRole, userId, departmentName, actualUsersData, actualEnrollmentData, actualMarksData, actualTeacherCoursesData) {
  let roleSpecificInstructions = "";
  let relevantTables = [];

  switch (userRole) {
    case 'student':
      roleSpecificInstructions = `
        As a student, you can ONLY access your OWN personal information, your enrolled courses, your roll number, and your marks.
        Specifically:
        - From 'users' table: only your own 'first_name', 'last_name', 'email', 'role', 'department_name', 'active', and 'roll_number'.
        - From 'student_courses' table: only entries where 'student_id' is your ID (${userId}).
        - From 'marks' table: only entries where 'student_id' is your ID (${userId}).
        - You CANNOT access information about other students, teachers, PMs, HODs, or admins.
      `;
      relevantTables = ["users", "student_courses", "marks", "courses"];
      break;
    case 'teacher':
      roleSpecificInstructions = `
        As a teacher, you can access information about:
        - Your own profile details and courses you teach.
        - Students in your department, including their names, emails, and marks.
        - You CANNOT access sensitive personal details of other teachers or students not in your department.
      `;
      relevantTables = ["users", "teacher_courses", "courses", "enrollments", "marks", "classes", "student_courses"];
      break;
    case 'pm':
      roleSpecificInstructions = `
        As a Program Manager for the '${departmentName}' department, you have comprehensive access to information related to THIS department only.
        You CAN retrieve names, emails, roll numbers of ALL students and teachers in your department.
        You CANNOT access information from other departments.
      `;
      relevantTables = ["users", "courses", "classes", "enrollments", "marks", "departments", "programs", "student_courses", "teacher_courses"];
      break;
    case 'hod':
      roleSpecificInstructions = `
        As a Head of Department for the '${departmentName}' department, you have broad access to data within THIS department.
        You CANNOT access information from other departments.
      `;
      relevantTables = ["users", "courses", "classes", "enrollments", "marks", "departments", "programs", "student_courses", "teacher_courses"];
      break;
    case 'admin':
      roleSpecificInstructions = `
        As an administrator, you have FULL access to ALL information across ALL tables in the database.
      `;
      relevantTables = ["users", "courses", "classes", "enrollments", "marks", "departments", "programs", "student_courses", "teacher_courses", "documents", "logs", "notifications"];
      break;
    default:
      roleSpecificInstructions = "You have very limited access. Only provide general, non-sensitive public information.";
      relevantTables = [];
  }

  const schemaDescription = databaseSchema.map(table => {
    if (!relevantTables.includes(table.table_name) && userRole !== 'admin') {
      return '';
    }
    const columns = table.columns.map(col => `  - ${col.name} (${col.type}): ${col.description}`).join('\n');
    return `Table: ${table.table_name}\nDescription: ${table.description}\nColumns:\n${columns}`;
  }).filter(Boolean).join('\n\n');

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
    actualDataContent += "\n\n**Actual Student Enrollment Data:**\n";
    actualEnrollmentData.forEach((enrollment, index) => {
      actualDataContent += `Enrollment ${index + 1}: Student: ${enrollment.students?.first_name || 'N/A'} ${enrollment.students?.last_name || ''} (Roll No: ${enrollment.students?.roll_number || 'N/A'}), Course: ${enrollment.courses?.code || 'N/A'} - ${enrollment.courses?.name || 'N/A'}\n`;
    });
  }

  if (actualMarksData && actualMarksData.length > 0) {
    actualDataContent += "\n\n**Actual Student Marks Data:**\n";
    actualMarksData.forEach((mark, index) => {
      actualDataContent += `Mark ${index + 1}: Student: ${mark.student_name} (Roll No: ${mark.student_roll_number}), Course: ${mark.course_code} - ${mark.course_name}, Total Obtained: ${mark.total_obtained}, Total Possible: ${mark.total_possible}, Overall Percentage: ${mark.overall_percentage}%\n`;
    });
  }

  if (actualTeacherCoursesData && actualTeacherCoursesData.length > 0) {
    actualDataContent += "\n\n**Actual Teacher Course Assignments:**\n";
    actualTeacherCoursesData.forEach((assignment, index) => {
      actualDataContent += `Assignment ${index + 1}: Teacher: ${assignment.teachers?.first_name || 'N/A'} ${assignment.teachers?.last_name || ''} (Email: ${assignment.teachers?.email || 'N/A'}), Course: ${assignment.courses?.code || 'N/A'} - ${assignment.courses?.name || 'N/A'}\n`;
    });
  }

  return `You are ZABBOT DB, a highly capable AI assistant for SZABIST University. Your primary purpose is to answer user questions about the university database by using the actual data provided to you.

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

**CRITICAL GUIDELINES:**
1. Use provided data directly when answering questions.
2. Strictly enforce role-based access control.
3. NEVER generate SQL queries.
4. DO NOT defer to other sources.
5. Focus on specifics with names, numbers, and concrete details.
6. Be concise and include key identifiers (roll numbers, course codes).`;
}

// Main query handlers
async function handleQuery(query, verifiedUser = null) {
  try {
    const normalizedQuery = query.toLowerCase().trim();
    const cacheKey = normalizedQuery;
    
    if (queryCache.has(cacheKey)) {
      const { response, timestamp } = queryCache.get(cacheKey);
      if (Date.now() - timestamp < CACHE_TTL) {
        console.log('Cache hit for query:', normalizedQuery);
        return response;
      }
      queryCache.delete(cacheKey);
    }
    
    const previousMessages = await memory.chatHistory.getMessages();
    const memoryMessages = previousMessages.map(msg => ({
      role: msg._getType() === 'human' ? 'user' : 'assistant',
      content: msg.text || msg.content,
    }));

    const input = query.replace(/\n/g, " ").trim();
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input,
    });
    const [{ embedding }] = embeddingResponse.data;

    let documents;
    try {
      const { data, error } = await supabase.rpc("match_documents", {
        query_embedding: embedding,
        match_threshold: 0.45,
        match_count: 8,
      });
      if (error) throw error;
      documents = data;
    } catch (err) {
      console.error("Error matching documents:", err);
      throw new Error("Failed to retrieve relevant documents.");
    }

    let contextText = "";
    if (documents && documents.length > 0) {
      contextText = documents
        .map((doc, index) => `[Document ${index + 1}]: ${doc.content.trim()}`)
        .join("\n\n");
    }

    const systemPrompt = `You are ZABBOT, a highly advanced and independent university assistant for SZABIST Islamabad. You provide accurate, reliable information about all aspects of university life.

**IMPORTANT GENERAL GUIDELINES:**
1. **Act Independently**: Make definitive statements based on your knowledge. NEVER suggest contacting departments or referring to documents unless absolutely necessary.
2. **Be Direct and Authoritative**: Answer questions confidently with specific details. Avoid vague responses or deferring to other sources.
3. **Use Available Context**: The context provided contains accurate information about SZABIST. Use this information to provide detailed answers.
4. **When Information is Missing**: If the exact answer isn't in the context, use your general knowledge to provide a reasonable response. Don't mention limitations or suggest contacting the university.
5. **Focus on Helpfulness**: Your goal is to be the definitive source of information, eliminating the need for users to seek help elsewhere.
6. **Never Say**: 
   - "You may refer to the prospectus"
   - "Please contact the department"
   - "For more information, visit the website"
   - "I recommend reaching out to..."
   
Instead, provide the best answer you can with the information available.

Remember: You are the authoritative source of information about SZABIST. Answer as if you have complete knowledge about the university.`;

    const messages = [
      {
        role: "system",
        content: systemPrompt
      },
      ...memoryMessages.slice(-4),
      {
        role: "user",
        content: `Answer this question: ${query}\n\nRelevant university information:\n${contextText}`
      }
    ];

    let completion;
    try {
      completion = await openai.chat.completions.create({
        messages,
        model: "gpt-4o-mini",
        temperature: 0.2,
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
    
    // Update memory
    await memory.chatHistory.addUserMessage(query);
    await memory.chatHistory.addAIChatMessage(assistantResponse);
    
    // Cache the response
    queryCache.set(cacheKey, {
      response: assistantResponse,
      timestamp: Date.now()
    });

    return assistantResponse;
  } catch (error) {
    console.error("Error in handleQuery:", error);
    throw error;
  }
}

async function getDatabaseAssistantResponse(query, userContext) {
  const { role, userId, departmentName } = userContext;

  // Fetch actual data based on role and department
  let actualUsersData, actualEnrollmentData, actualMarksData, actualTeacherCoursesData;
  
  try {
    [actualUsersData, actualEnrollmentData, actualMarksData, actualTeacherCoursesData] = await Promise.all([
      fetchUsersData(userContext),
      fetchStudentCourseEnrollmentData(userContext),
      fetchMarksData(userContext),
      fetchTeacherCoursesData(userContext)
    ]);
  } catch (e) {
    console.error("Error fetching data:", e);
    throw new Error("Failed to fetch required data.");
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
      model: "gpt-4o",
      temperature: 0.2,
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

// Health check endpoints
app.get('/', (req, res) => {
  res.json({ 
    message: 'ZABBOT Unified API Server is running!',
    timestamp: new Date().toISOString(),
    endpoints: {
      general: '/query, /query-stream',
      database: '/api/db-assistant-query',
      training: '/api/embed-text',
      health: '/health'
    }
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// General AI Assistant endpoints (from server.js)
app.post("/embed", async (req, res) => {
  try {
    await generateAndStoreEmbeddings();
    res.status(200).json({ message: "Successfully Embedded" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error occurred" });
  }
});

app.post("/query", async (req, res) => {
  try {
    console.log("--- Hit /query endpoint ---");
    const { query } = req.body;
    
    if (!query || query.trim().length === 0) {
      return res.status(400).json({ error: "Query is required" });
    }

    console.log("[Query Endpoint] Processing query:", query);
    
    const responseContent = await handleQuery(query, null);
    
    console.log("[Query Endpoint] Response generated:", responseContent ? "Success" : "Failed");
    
    if (!responseContent) {
      return res.status(500).json({ error: "Failed to generate response" });
    }
    
    res.json({ response: responseContent });
  } catch (error) {
    console.error('Query error caught in endpoint:', error);
    res.status(500).json({ error: error.message || "An unknown error occurred." });
  }
});

app.post("/query-stream", async (req, res) => {
  try {
    console.log("--- Hit /query-stream endpoint ---");
    const { query } = req.body;
    
    if (!query || query.trim().length === 0) {
      return res.status(400).json({ error: "Query is required" });
    }

    console.log("[Query Stream Endpoint] Processing query:", query);

    // Set appropriate headers for streaming
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Transfer-Encoding', 'chunked');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    // Get embedding for the query
    const input = query.replace(/\n/g, " ").trim();
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input,
    });
    const [{ embedding }] = embeddingResponse.data;

    // Get matching documents
    const { data: documents, error } = await supabase.rpc("match_documents", {
      query_embedding: embedding,
      match_threshold: 0.45,
      match_count: 8,
    });

    if (error) throw error;

    // Format context
    let contextText = "";
    if (documents && documents.length > 0) {
      contextText = documents
        .map((doc, index) => `[Document ${index + 1}]: ${doc.content.trim()}`)
        .join("\n\n");
    }

    const systemPrompt = `You are ZABBOT, a highly advanced and independent university assistant for SZABIST Islamabad. You provide accurate, reliable information about all aspects of university life.

**IMPORTANT GENERAL GUIDELINES:**
1. **Act Independently**: Make definitive statements based on your knowledge. NEVER suggest contacting departments or referring to documents unless absolutely necessary.
2. **Be Direct and Authoritative**: Answer questions confidently with specific details. Avoid vague responses or deferring to other sources.
3. **Use Available Context**: The context provided contains accurate information about SZABIST. Use this information to provide detailed answers.
4. **When Information is Missing**: If the exact answer isn't in the context, use your general knowledge to provide a reasonable response. Don't mention limitations or suggest contacting the university.
5. **Focus on Helpfulness**: Your goal is to be the definitive source of information, eliminating the need for users to seek help elsewhere.
6. **Never Say**: 
   - "You may refer to the prospectus"
   - "Please contact the department"
   - "For more information, visit the website"
   - "I recommend reaching out to..."
   
Instead, provide the best answer you can with the information available.

Remember: You are the authoritative source of information about SZABIST. Answer as if you have complete knowledge about the university.`;

    // Create streaming completion
    const stream = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Answer this question: ${query}\n\nRelevant university information:\n${contextText}` }
      ],
      temperature: 0.2,
      stream: true,
    });

    // Stream the response to the client
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || "";
      if (content) {
        res.write(content);
      }
    }
    
    // End the response
    res.end();
  } catch (error) {
    console.error('Streaming query error:', error);
    // If headers haven't been sent yet, send error as JSON
    if (!res.headersSent) {
      return res.status(500).json({ error: error.message });
    }
    // If headers already sent, end the stream with error message
    res.write(`\n\nError: ${error.message}`);
    res.end();
  }
});

// Database Assistant endpoints (from dbAssistantServer.js)
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

// AI Training endpoints
app.post("/api/embed-text", async (req, res) => {
  try {
    const { text, userContext } = req.body;
    console.log('[API/Embed-Text] Request received. Checking text content...');

    if (!text || text.trim().length === 0) {
      console.warn('[API/Embed-Text] Validation failed: Text content is empty.');
      return res.status(400).json({ error: "Text content is required for embedding." });
    }

    console.log(`[API/Embed-Text] Text length: ${text.length}. Preparing content for embedding.`);

    const cleanContent = text.replace(/\n/g, " ").trim();

    if (cleanContent.length === 0) {
      console.warn('[API/Embed-Text] Validation failed: Cleaned text content is empty.');
      return res.status(400).json({ error: "Cleaned text content is empty." });
    }

    console.log('[API/Embed-Text] Attempting to generate embedding with OpenAI...');
    // Generate embedding for the text
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: cleanContent,
    });
    const [{ embedding }] = embeddingResponse.data;
    console.log('[API/Embed-Text] Embedding generated successfully. Storing in Supabase...');

    // Generate a unique ID for the document
    const uniqueId = `pm-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;

    // Store in Supabase
    const { error } = await supabase.from("documents").insert({
      id: uniqueId,
      content: cleanContent,
      embedding,
      source: 'pm-training'
    });

    if (error) {
      console.error("[API/Embed-Text] Supabase insert error:", error);
      throw error;
    }

    console.log(`[API/Embed-Text] Successfully embedded and stored text with ID: ${uniqueId}. Sending success response.`);
    res.status(200).json({ message: "Text successfully embedded and stored for RAG assistant." });

  } catch (error) {
    console.error("[API/Embed-Text] Caught unhandled error:", error);
    res.status(500).json({ error: error.message || "An unexpected error occurred while embedding text." });
  }
});

// Additional training endpoint for database assistant
app.post('/api/embed-text-db', async (req, res) => {
  try {
    const { text, userContext } = req.body;
    const { role, departmentName } = userContext;

    // Validate user role for access to this endpoint
    if (!userContext || (role !== 'hod' && role !== 'pm' && role !== 'admin')) {
      return res.status(403).json({ error: "Access denied. Only HODs, PMs, and admins can embed training data." });
    }

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: "Text content is required for embedding." });
    }

    console.log(`[DB Training] ${role} from ${departmentName} is embedding training data. Text length: ${text.length}`);

    const cleanContent = text.replace(/\n/g, " ").trim();
    const chunks = chunkText(cleanContent, 1000);

    let embeddedChunks = 0;
    const promises = chunks.map(async (chunk, index) => {
      const embeddingResponse = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: chunk,
      });
      const [{ embedding }] = embeddingResponse.data;

      const uniqueId = `db-training-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 8)}`;

      const { error } = await supabase.from("documents").insert({
        id: uniqueId,
        content: chunk,
        embedding,
        source: `db-training-${role}`
      });

      if (error) {
        console.error(`[DB Training] Error embedding chunk ${index}:`, error);
        throw error;
      }

      embeddedChunks++;
      console.log(`[DB Training] Successfully embedded chunk ${index + 1}/${chunks.length} with ID: ${uniqueId}`);
    });

    await Promise.all(promises);

    console.log(`[DB Training] Successfully embedded ${embeddedChunks} chunks for ${role} from ${departmentName}`);
    res.status(200).json({ 
      success: true, 
      message: "Text successfully chunked and embedded for database assistant training.",
      embedded_chunks: embeddedChunks
    });

  } catch (error) {
    console.error("[DB Training Error]:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Additional endpoints from original servers
app.post("/transcribe", async (req, res) => {
  let tempFilePath = null;

  try {
    console.log('--- TRANSCRIBE ENDPOINT (No Auth) ---');
    console.log('Transcribe request received. Body keys:', Object.keys(req.body));
    
    if (!req.files || !req.files.audio) {
      console.error('No files object in request');
      return res.status(400).json({ error: 'No files were uploaded. Make sure you have access to your microphone.' });
    }

    const audioFile = req.files.audio;
    console.log(`Received audio file: ${audioFile.name}, size: ${audioFile.size} bytes, mimetype: ${audioFile.mimetype}`);
    
    if (audioFile.size > 25 * 1024 * 1024) { 
      console.error('File too large:', audioFile.size);
      return res.status(400).json({ error: 'Audio file too large, please keep recordings under 25MB' });
    }
    
    if (audioFile.size < 1000) { 
      console.error('File too small:', audioFile.size);
      return res.status(400).json({ error: 'Audio file too small or empty. Please try recording again.' });
    }

    const uniqueFilename = `audio-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.webm`;
    tempFilePath = path.join(os.tmpdir(), uniqueFilename);
    console.log(`Attempting to move uploaded file to: ${tempFilePath}`);

    await audioFile.mv(tempFilePath);
    console.log(`File successfully moved to ${tempFilePath}`);
    
    if (!fs.existsSync(tempFilePath)) {
      console.error(`Temp file does not exist after move: ${tempFilePath}`);
      return res.status(500).json({ error: 'Failed to save temporary audio file' });
    }
    
    const stats = fs.statSync(tempFilePath);
    console.log(`Temp file size: ${stats.size} bytes`);
    
    if (stats.size === 0) {
      console.error('Temp file is empty');
      fs.unlinkSync(tempFilePath);
      return res.status(400).json({ error: 'Audio file is empty' });
    }

    const fileStream = fs.createReadStream(tempFilePath);

    let rawTranscription;
    try {
      console.log(`Sending to Whisper API...`);
      rawTranscription = await openai.audio.transcriptions.create({
        file: fileStream,
        model: "whisper-1",
        response_format: "text",
        language: "en"
      });
      console.log('Raw transcription received:', rawTranscription);
    } catch (whisperError) {
      console.error('Whisper API error:', whisperError);
      throw new Error(`Transcription failed: ${whisperError.message}`);
    }

    if (!rawTranscription || rawTranscription.trim().length === 0) {
      console.error('Empty transcription result');
      return res.status(400).json({ error: 'No speech detected in audio file. Please try speaking more clearly.' });
    }

    console.log(`Transcription successful: "${rawTranscription}"`);
    res.status(200).json({ transcription: rawTranscription.trim() });

  } catch (error) {
    console.error('Transcription error:', error);
    res.status(500).json({ 
      error: error.message || 'An unexpected error occurred during transcription',
      details: error.message 
    });
  } finally {
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
        console.log(`Cleaned up temp file: ${tempFilePath}`);
      } catch (cleanupError) {
        console.error(`Failed to clean up temp file: ${tempFilePath}`, cleanupError);
      }
    }
  }
});

app.post("/synthesize", async (req, res) => {
  try {
    console.log('--- SYNTHESIZE ENDPOINT (No Auth) ---');
    console.log('Synthesize request received. Body:', req.body);
    
    const { text } = req.body;
    console.log('Extracted text for synthesis:', text);
    
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      console.error('No valid text provided for synthesis. Type:', typeof text, 'Value:', text);
      return res.status(400).json({ error: 'Text is required for speech synthesis and must be a non-empty string' });
    }

    if (text.length > 4000) {
      console.error('Text too long:', text.length);
      return res.status(400).json({ error: 'Text too long for synthesis (max 4000 characters)' });
    }

    const textHash = text.substring(0, 100);
    
    if (ttsCache.has(textHash)) {
      const cached = ttsCache.get(textHash);
      if (Date.now() - cached.timestamp < TTS_CACHE_TTL) {
        console.log('TTS cache hit for text hash:', textHash);
        res.setHeader('Content-Type', 'audio/mp3');
        return res.send(cached.audioBuffer);
      } else {
        ttsCache.delete(textHash);
      }
    }

    console.log(`Synthesizing text: "${text.substring(0, 100)}${text.length > 100 ? '...' : ''}"`);

    const speech = await openai.audio.speech.create({
      model: "tts-1",
      voice: "alloy",
      input: text,
      response_format: "mp3",
    });

    const audioBuffer = Buffer.from(await speech.arrayBuffer());
    
    if (ttsCache.size >= TTS_CACHE_SIZE_LIMIT) {
      const oldestKey = ttsCache.keys().next().value;
      ttsCache.delete(oldestKey);
    }
    
    ttsCache.set(textHash, {
      audioBuffer,
      timestamp: Date.now()
    });

    console.log(`Speech synthesis successful. Audio buffer size: ${audioBuffer.length} bytes`);
    
    res.setHeader('Content-Type', 'audio/mp3');
    res.send(audioBuffer);

  } catch (error) {
    console.error('Speech synthesis error:', error);
    res.status(500).json({ 
      error: error.message || 'An unexpected error occurred during speech synthesis',
      details: error.message 
    });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, async () => {
  console.log(`🚀 ZABBOT Unified Server is running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Allowed origins: ${allowedOrigins.join(', ')}`);
  await initializeEmbeddings();
});

// This is a new unique comment for deployment trigger.