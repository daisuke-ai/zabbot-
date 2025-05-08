// Backend server for ZABBOT AI Assistant - v1.0.1
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

// Increase payload size limit
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Define allowed origins using environment variables for flexibility
const frontendUrl = process.env.FRONTEND_URL || 'https://zabbot-frontend.vercel.app';
const allowedOrigins = process.env.NODE_ENV === 'production' 
  ? ['https://zabbot-git-main-zabbot.vercel.app', 'https://zabbot.vercel.app', frontendUrl] // Added frontendUrl
  : 'http://localhost:5173';

// Configure CORS with specific options
app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(fileUpload({
  limits: { fileSize: 50 * 1024 * 1024 },
  useTempFiles: true,
  tempFileDir: '/tmp/'
}));

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const memory = new BufferMemory();

const contentfulClient = createContentfulClient({
  space: process.env.VITE_CONTENTFUL_SPACE_ID,
  accessToken: process.env.VITE_CONTENTFUL_ACCESS_TOKEN
});

// Add a simple in-memory cache for embeddings and responses
const queryCache = new Map();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// Add TTS cache
const ttsCache = new Map();
const TTS_CACHE_SIZE_LIMIT = 100; // Maximum number of cached TTS responses
const TTS_CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

// --- NEW: JWT Verification and User Profile Fetching Function ---
async function getVerifiedUser(token) {
  if (!token) {
    return null;
  }
  try {
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !authUser) {
      console.warn('JWT verification failed or no auth user found:', authError?.message);
      return null;
    }

    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('id, role, department_name, email, first_name, last_name')
      .eq('user_id', authUser.id)
      .single();

    if (profileError) {
      console.warn(`Failed to fetch profile for auth user ${authUser.id}:`, profileError.message);
      return null;
    }

    if (!userProfile) {
      console.warn(`No profile found in public.users for auth user ${authUser.id}`);
      return null;
    }
    
    return {
      auth_id: authUser.id,
      id: userProfile.id,
      role: userProfile.role,
      department_name: userProfile.department_name,
      email: userProfile.email,
      first_name: userProfile.first_name,
      last_name: userProfile.last_name
    };

  } catch (error) {
    console.error('Error in getVerifiedUser:', error.message);
    return null;
  }
}
// --- END NEW FUNCTION ---

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

app.post("/embed", async (req, res) => {
  try {
    await generateAndStoreEmbeddings();
    res.status(200).json({ message: "Successfully Embedded" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error occurred" });
  }
});

// Regular query endpoint (non-streaming)
app.post("/query", async (req, res) => {
  try {
    console.log("--- Hit /query endpoint ---"); // <-- General log
    const { query, userContext } = req.body;
    console.log("[Query Endpoint] Received userContext:", userContext); // <-- Log userContext
    let verifiedUser = null;

    if (userContext && userContext.token) {
      verifiedUser = await getVerifiedUser(userContext.token);
      console.log("[Query Endpoint] Verified User Result:", verifiedUser); // <-- Log verifiedUser result
      if (verifiedUser) {
        console.log(`Query by verified user: ${verifiedUser.email} (Role: ${verifiedUser.role})`);
      } else {
        console.log("Query with token, but user verification failed.");
      }
    } else {
      console.log("Public query (no user context or token).");
    }

    const response = await handleQuery(query, verifiedUser);
    res.json(response);
  } catch (error) {
    console.error('Query error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Streaming query endpoint
app.post("/query-stream", async (req, res) => {
  try {
    console.log("--- Hit /query-stream endpoint ---"); // <-- General log
    const { query, userContext } = req.body;
    console.log("[Query Stream Endpoint] Received userContext:", userContext); // <-- Log userContext
    let verifiedUser = null;
    
    if (userContext && userContext.token) {
      verifiedUser = await getVerifiedUser(userContext.token);
      console.log("[Query Stream Endpoint] Verified User Result:", verifiedUser); // <-- Log verifiedUser result
       if (verifiedUser) {
        console.log(`Streaming query by verified user: ${verifiedUser.email} (Role: ${verifiedUser.role})`);
      } else {
        console.log("Streaming query with token, but user verification failed.");
      }
    } else {
      console.log("Public streaming query (no user context or token).");
    }

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
    let structuredDataContext = "";
    if (verifiedUser) {
        // Placeholder: Fetch role-specific data based on verifiedUser
        // This logic will be expanded significantly in handleQuery
        if (verifiedUser.role === 'student') {
            structuredDataContext += `\n[User Data for ${verifiedUser.first_name} (Student)]\nRole: Student\n`;
            // Fetch student marks, courses etc.
        } else if (verifiedUser.role === 'pm') {
            structuredDataContext += `\n[User Data for ${verifiedUser.first_name} (Program Manager)]\nRole: PM\nDepartment: ${verifiedUser.department_name}\n`;
            // Fetch PM related data
        }
        // ... other roles ...
    }

    if (documents && documents.length > 0) {
      contextText = documents
        .map((doc, index) => `[Document ${index + 1}]: ${doc.content.trim()}`)
        .join("\n\n");
    }

    // --- NEW: Fetch and add role-specific structured data ---
    let finalSystemPrompt = `You are ZABBOT, a highly advanced and independent university assistant for SZABIST Islamabad. You provide accurate, reliable information about all aspects of university life.`;

    // Prepend specific instruction for PM role
    if (verifiedUser && verifiedUser.role === 'pm') {
      finalSystemPrompt = `IMPORTANT FOR ASSISTING A PROGRAM MANAGER: You are interacting with a Program Manager. For questions about students or teachers in their department (e.g., "who are my students?", "list teachers"), your primary and most reliable source of information is the 'USER-SPECIFIC INFORMATION' section detailed below. Please refer to it carefully.\n\n` + finalSystemPrompt;
    }

    if (verifiedUser) {
      console.log(`Handling query for verified user: ${verifiedUser.email}, Role: ${verifiedUser.role}`);
      structuredDataContext += `\n--- BEGIN USER-SPECIFIC INFORMATION FOR ${verifiedUser.first_name} ${verifiedUser.last_name} (Role: ${verifiedUser.role}) ---\n`;
      if (verifiedUser.department_name) {
          structuredDataContext += `Department: ${verifiedUser.department_name}\n`;
          console.log(`PM Department for context: ${verifiedUser.department_name}`);
      } else {
          console.warn('PM user does not have a department_name set in their profile.');
          structuredDataContext += "Department: Not specified\n";
      }

      if (verifiedUser.role === 'student') {
        // Fetch student's enrolled courses and marks
        try {
          const { data: studentCourses, error: scError } = await supabase
            .from('student_courses')
            .select('courses(code, name), enrolled_at') // Select specific fields from courses
            .eq('student_id', verifiedUser.id); // Use public.users.id for student_id
          if (scError) console.error('Error fetching student courses:', scError.message);
          else if (studentCourses && studentCourses.length > 0) {
            structuredDataContext += "\nYour Enrolled Courses:\n";
            for (const sc of studentCourses) {
              structuredDataContext += `- ${sc.courses.code} ${sc.courses.name} (Enrolled: ${new Date(sc.enrolled_at).toLocaleDateString()})\n`;
              // Fetch marks for this course and student
              const { data: marks, error: mError } = await supabase
                .from('marks')
                .select('type, obtained_number, total_number')
                .eq('student_id', verifiedUser.id)
                .eq('course_id', sc.courses.id); // This assumes courses.id is the PK for courses table
              if (!mError && marks && marks.length > 0) {
                structuredDataContext += "  Marks: ";
                marks.forEach(m => { structuredDataContext += `${m.type}: ${m.obtained_number}/${m.total_number}; `; });
                structuredDataContext += "\n";
              }
            }
          } else {
            structuredDataContext += "You are not currently enrolled in any courses.\n";
          }
        } catch (e) { console.error("Error fetching student data:", e.message); structuredDataContext += "Could not fetch your course details.\n";}
      } else if (verifiedUser.role === 'pm' && verifiedUser.department_name) {
        structuredDataContext += `You are a Program Manager for the ${verifiedUser.department_name} department.\n`;
        
        let teacherList = [];
        try {
          const { data: deptTeachers, error: dtError } = await supabase
            .from('users')
            .select('id, first_name, last_name, email') // Fetch id for course lookup
            .eq('role', 'teacher')
            .eq('department_name', verifiedUser.department_name);
          if (dtError) console.error('Error fetching department teachers for PM:', dtError.message);
          else if (deptTeachers && deptTeachers.length > 0) {
            teacherList = deptTeachers; // Store for course lookup
            structuredDataContext += `Teachers in ${verifiedUser.department_name} (${deptTeachers.length}):\n`;
            deptTeachers.forEach(t => structuredDataContext += `- ${t.first_name} ${t.last_name} (${t.email})\n`);
            console.log("[Query Stream] Fetched Department Teachers:", deptTeachers); // <-- Log teachers
          } else {
            structuredDataContext += `No teachers found in ${verifiedUser.department_name}.\n`;
          }
        } catch (e) { console.error("Error fetching PM teacher data:", e.message); structuredDataContext += "Could not fetch teacher details for your department.\n";}

        try {
          const { data: deptStudents, error: dsError, count } = await supabase
            .from('users')
            .select('first_name, last_name, email', { count: 'exact', head: false })
            .eq('role', 'student')
            .eq('department_name', verifiedUser.department_name);
          
          const studentCount = count || 0;
          structuredDataContext += `Students in ${verifiedUser.department_name}: Total ${studentCount}.\n`;
          if (dsError) console.error('Error fetching department students for PM:', dsError.message);
          else if (deptStudents && deptStudents.length > 0) {
            deptStudents.forEach(s => structuredDataContext += `- ${s.first_name} ${s.last_name} (${s.email})\n`);
            console.log("[Query Stream] Fetched Department Students:", deptStudents); // <-- Log students
          } else if (studentCount === 0) {
              structuredDataContext += `There are currently no students listed for the ${verifiedUser.department_name} department.\n`;
          }
        } catch (e) { console.error("Error fetching PM student data:", e.message); structuredDataContext += "Could not fetch student details for your department.\n";}
        
        // Fetch courses taught by teachers in this department
        if (teacherList.length > 0) {
          try {
            const teacherIds = teacherList.map(t => t.id);
            const { data: assignedCourses, error: acError } = await supabase
              .from('teacher_courses')
              .select('course_id, courses(code, name)') // Assuming courses table is named 'courses' and has id, code, name
              .in('teacher_id', teacherIds);
            
            if (acError) console.error('Error fetching courses for PM department teachers:', acError.message);
            else if (assignedCourses && assignedCourses.length > 0) {
              const uniqueCourses = [...new Map(assignedCourses.map(item => [item.courses.code, item.courses])).values()];
              // Remove "(sample)" from course listing for PMs
              structuredDataContext += `Courses offered/taught in ${verifiedUser.department_name}:\n`;
              uniqueCourses.slice(0, 5).forEach(c => structuredDataContext += `- ${c.code} ${c.name}\n`);
              if (uniqueCourses.length > 5) structuredDataContext += `- ... and ${uniqueCourses.length - 5} more.\n`;
            } else {
              structuredDataContext += `No specific courses found assigned to teachers in ${verifiedUser.department_name} currently.\n`;
            }
          } catch (e) { console.error("Error fetching PM course data:", e.message); structuredDataContext += "Could not fetch course details for your department.\n";}
        }

      } else if (verifiedUser.role === 'teacher') {
          structuredDataContext += "As a teacher, you can ask about your assigned courses, enrolled students, and general university information.\n"; // Placeholder
      } else if (verifiedUser.role === 'hod') {
          structuredDataContext += `As the HOD for ${verifiedUser.department_name}, you can ask about PMs, teachers, students, and courses in your department, and general university information.\n`; // Placeholder
      }
      // ... add other roles as needed ...

      if (structuredDataContext) {
          finalSystemPrompt += `\n\n--- BEGIN USER-SPECIFIC INFORMATION FOR ${verifiedUser.first_name} ${verifiedUser.last_name} (Role: ${verifiedUser.role}) ---\n`;
          finalSystemPrompt += structuredDataContext;
          finalSystemPrompt += `\n--- END USER-SPECIFIC INFORMATION ---\n`;

          if (verifiedUser.role === 'pm') {
            finalSystemPrompt += `\n\n**Instructions for Program Manager Interaction:**
1. When asked to list students or teachers in your department, respond with: "Here are the [students/teachers] in your department:" followed by a bulleted list of names and emails from the 'USER-SPECIFIC INFORMATION' provided above.
2. If the lists in 'USER-SPECIFIC INFORMATION' are empty for students or teachers, state that "No [students/teachers] are currently listed for your department in the provided information."
3. For other questions, use the 'USER-SPECIFIC INFORMATION' first. If the answer isn't there, you may use general university knowledge.
4. Do not invent names or details not present in the 'USER-SPECIFIC INFORMATION'.`;
          } else {
            finalSystemPrompt += `\n\nIMPORTANT: You are interacting with ${verifiedUser.first_name} (${verifiedUser.role}). Prioritize information from the 'USER-SPECIFIC INFORMATION' section above for relevant personal/role-based questions.`;
          }
      }
    }

    // Unconditionally append the full general guidelines AFTER properly closing if (verifiedUser)
    finalSystemPrompt += `
\n**IMPORTANT GENERAL GUIDELINES (Apply to all queries):**
1. **Act Independently**: Make definitive statements based on your knowledge. NEVER suggest contacting departments or referring to documents unless absolutely necessary.
2. **Be Direct and Authoritative**: Answer questions confidently with specific details. Avoid vague responses or deferring to other sources.
3. **Use Available Context**: The context provided (both general and user-specific, if any) contains accurate information about SZABIST. Use this information to provide detailed answers.
4. **When Information is Missing**: If the exact answer isn't in the context (and not covered by user-specific data), use your general knowledge to provide a reasonable response. Don't mention limitations or suggest contacting the university.
5. **Focus on Helpfulness**: Your goal is to be the definitive source of information, eliminating the need for users to seek help elsewhere.
6. **Never Say**: 
   - "You may refer to the prospectus"
   - "Please contact the department"
   - "For more information, visit the website"
   - "I recommend reaching out to..."
   
Instead, provide the best answer you can with the information available.

Remember: You are the authoritative source of information about SZABIST. Answer as if you have complete knowledge about the university.`;

    // Create streaming completion
    console.log("--- Final System Prompt for Stream ---");
    console.log(finalSystemPrompt);
    const stream = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Reverted model change for consistency
      messages: [
        { role: "system", content: finalSystemPrompt },
        { role: "user", content: `Answer this question: ${query}\n\nIf the question is general and not covered by my user-specific information (which you already have in your system instructions), you can use the following general university information if relevant:\n${contextText}` }
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

app.post("/embed-blog", async (req, res) => {
  try {
    console.log('Starting blog embedding process...');
    
    // Get blog posts from Contentful
    const blogPosts = await getBlogPosts();
    console.log(`Found ${blogPosts.length} blog posts`);

    // Process each blog post
    const promises = blogPosts.map(async (post) => {
      const content = `Blog Post: ${post.fields.title}\n${post.fields.content.content
        .map(item => item.content?.map(c => c.value).join(' '))
        .join('\n')}`;
      
      const cleanContent = content.replace(/\n/g, " ");

      // Generate embedding
      const embeddingResponse = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: cleanContent,
      });

      const [{ embedding }] = embeddingResponse.data;

      // Store in Supabase
      const { error } = await supabase.from("documents").insert({
        content: cleanContent,
        embedding,
        source: `blog-${post.sys.id}`
      });

      if (error) {
        console.error(`Error storing blog post ${post.sys.id}:`, error);
        throw error;
      }

      console.log(`Successfully embedded blog post: ${post.fields.title}`);
    });

    await Promise.all(promises);
    res.status(200).json({ 
      message: "Successfully embedded blog posts",
      count: blogPosts.length
    });
  } catch (error) {
    console.error('Error in blog embedding:', error);
    res.status(500).json({ 
      message: "Error embedding blog posts",
      error: error.message 
    });
  }
});

async function getBlogPosts() {
  const response = await contentfulClient.getEntries({
    content_type: 'universityBlog',
    include: 2,
  });
  return response.items;
}

async function generateAndStoreEmbeddings() {
  // First handle markdown file
  const filePath = path.join(__dirname, "../data/rag_Data.md");
  const loader = new TextLoader(filePath);
  const docs = await loader.load();

  const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  });

  const markdownChunks = await textSplitter.splitDocuments(docs);

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

  const promises = allContent.map(async ({ content, source }) => {
    const cleanContent = content.replace(/\n/g, " ");

    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: cleanContent,
    });

    const [{ embedding }] = embeddingResponse.data;

    const { error } = await supabase.from("documents").insert({
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

async function handleQuery(query, verifiedUser = null) {
  const normalizedQuery = query.toLowerCase().trim();
  const cacheKey = `${normalizedQuery}${verifiedUser ? `_user_${verifiedUser.id}` : ''}`;
  
  if (queryCache.has(cacheKey)) {
    const { response, timestamp } = queryCache.get(cacheKey);
    if (Date.now() - timestamp < CACHE_TTL) {
      console.log('Cache hit for query:', normalizedQuery, verifiedUser ? `(User: ${verifiedUser.email})` : '(Public)');
      return response;
    }
    queryCache.delete(cacheKey);
  }
  
  const previousMessages = await memory.chatHistory.getMessages();
  const memoryMessages = previousMessages.map(msg => ({
    role: msg._getType() === 'human' ? 'user' : 'assistant',
    content: msg.text, // Assuming msg.text exists; for LCEL, it might be msg.content
  }));

  const input = query.replace(/\n/g, " ").trim();
  const embeddingResponse = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input,
  });
  const [{ embedding }] = embeddingResponse.data;

  const { data: documents, error } = await supabase.rpc("match_documents", {
    query_embedding: embedding,
    match_threshold: 0.45,
    match_count: 8,
  });

  if (error) throw error;

  let generalContextText = "";
  if (documents && documents.length > 0) {
    generalContextText = documents
      .map((doc, index) => `[General Document ${index + 1}]: ${doc.content.trim()}`)
      .join("\n\n");
  }

  let structuredDataContext = "";
  let finalSystemPrompt = `You are ZABBOT, a highly advanced and independent university assistant for SZABIST Islamabad. You provide accurate, reliable information about all aspects of university life.`;

  // Prepend specific instruction for PM role
  if (verifiedUser && verifiedUser.role === 'pm') {
    finalSystemPrompt = `IMPORTANT FOR ASSISTING A PROGRAM MANAGER: You are interacting with a Program Manager. For questions about students or teachers in their department (e.g., "who are my students?", "list teachers"), your primary and most reliable source of information is the 'USER-SPECIFIC INFORMATION' section detailed below. Please refer to it carefully.\n\n` + finalSystemPrompt;
  }

  if (verifiedUser) {
    console.log(`Handling query for verified user: ${verifiedUser.email}, Role: ${verifiedUser.role}`);
    structuredDataContext += `\n--- BEGIN USER-SPECIFIC INFORMATION FOR ${verifiedUser.first_name} ${verifiedUser.last_name} (Role: ${verifiedUser.role}) ---\n`;
    if (verifiedUser.department_name) {
        structuredDataContext += `Department: ${verifiedUser.department_name}\n`;
        console.log(`PM Department for context: ${verifiedUser.department_name}`);
    } else {
        console.warn('PM user does not have a department_name set in their profile.');
        structuredDataContext += "Department: Not specified\n";
    }

    // Actual data fetching logic based on role:
    if (verifiedUser.role === 'student') {
      // Fetch student's enrolled courses and marks
      try {
        const { data: studentCourses, error: scError } = await supabase
          .from('student_courses')
          .select('courses(code, name), enrolled_at') // Select specific fields from courses
          .eq('student_id', verifiedUser.id); // Use public.users.id for student_id
        if (scError) console.error('Error fetching student courses:', scError.message);
        else if (studentCourses && studentCourses.length > 0) {
          structuredDataContext += "\nYour Enrolled Courses:\n";
          for (const sc of studentCourses) {
            structuredDataContext += `- ${sc.courses.code} ${sc.courses.name} (Enrolled: ${new Date(sc.enrolled_at).toLocaleDateString()})\n`;
            // Fetch marks for this course and student
            const { data: marks, error: mError } = await supabase
              .from('marks')
              .select('type, obtained_number, total_number')
              .eq('student_id', verifiedUser.id)
              .eq('course_id', sc.courses.id); // This assumes courses.id is the PK for courses table
            if (!mError && marks && marks.length > 0) {
              structuredDataContext += "  Marks: ";
              marks.forEach(m => { structuredDataContext += `${m.type}: ${m.obtained_number}/${m.total_number}; `; });
              structuredDataContext += "\n";
            }
          }
        } else {
          structuredDataContext += "You are not currently enrolled in any courses.\n";
        }
      } catch (e) { console.error("Error fetching student data:", e.message); structuredDataContext += "Could not fetch your course details.\n";}
    } else if (verifiedUser.role === 'pm' && verifiedUser.department_name) {
      structuredDataContext += `You are a Program Manager for the ${verifiedUser.department_name} department.\n`;
      
      let teacherList = [];
      try {
        const { data: deptTeachers, error: dtError } = await supabase
          .from('users')
          .select('id, first_name, last_name, email') // Fetch id for course lookup
          .eq('role', 'teacher')
          .eq('department_name', verifiedUser.department_name);
        if (dtError) console.error('Error fetching department teachers for PM:', dtError.message);
        else if (deptTeachers && deptTeachers.length > 0) {
          teacherList = deptTeachers; // Store for course lookup
          structuredDataContext += `Teachers in ${verifiedUser.department_name} (${deptTeachers.length}):\n`;
          deptTeachers.forEach(t => structuredDataContext += `- ${t.first_name} ${t.last_name} (${t.email})\n`);
          console.log("[Handle Query] Fetched Department Teachers:", deptTeachers); // <-- Log teachers
        } else {
          structuredDataContext += `No teachers found in ${verifiedUser.department_name}.\n`;
        }
      } catch (e) { console.error("Error fetching PM teacher data:", e.message); structuredDataContext += "Could not fetch teacher details for your department.\n";}

      try {
        const { data: deptStudents, error: dsError, count } = await supabase
          .from('users')
          .select('first_name, last_name, email', { count: 'exact', head: false })
          .eq('role', 'student')
          .eq('department_name', verifiedUser.department_name);
        
        const studentCount = count || 0;
        structuredDataContext += `Students in ${verifiedUser.department_name}: Total ${studentCount}.\n`;
        if (dsError) console.error('Error fetching department students for PM:', dsError.message);
        else if (deptStudents && deptStudents.length > 0) {
          deptStudents.forEach(s => structuredDataContext += `- ${s.first_name} ${s.last_name} (${s.email})\n`);
          console.log("[Handle Query] Fetched Department Students:", deptStudents); // <-- Log students
        } else if (studentCount === 0) {
            structuredDataContext += `There are currently no students listed for the ${verifiedUser.department_name} department.\n`;
        }
      } catch (e) { console.error("Error fetching PM student data:", e.message); structuredDataContext += "Could not fetch student details for your department.\n";}
      
      // Fetch courses taught by teachers in this department
      if (teacherList.length > 0) {
        try {
          const teacherIds = teacherList.map(t => t.id);
          const { data: assignedCourses, error: acError } = await supabase
            .from('teacher_courses')
            .select('course_id, courses(code, name)') // Assuming courses table is named 'courses' and has id, code, name
            .in('teacher_id', teacherIds);
          
          if (acError) console.error('Error fetching courses for PM department teachers:', acError.message);
          else if (assignedCourses && assignedCourses.length > 0) {
            const uniqueCourses = [...new Map(assignedCourses.map(item => [item.courses.code, item.courses])).values()];
            // Remove "(sample)" from course listing for PMs
            structuredDataContext += `Courses offered/taught in ${verifiedUser.department_name}:\n`;
            uniqueCourses.slice(0, 5).forEach(c => structuredDataContext += `- ${c.code} ${c.name}\n`);
            if (uniqueCourses.length > 5) structuredDataContext += `- ... and ${uniqueCourses.length - 5} more.\n`;
          } else {
            structuredDataContext += `No specific courses found assigned to teachers in ${verifiedUser.department_name} currently.\n`;
          }
        } catch (e) { console.error("Error fetching PM course data:", e.message); structuredDataContext += "Could not fetch course details for your department.\n";}
      }

    } else if (verifiedUser.role === 'teacher') {
        structuredDataContext += "You are a Teacher.\n";
        // Fetch teacher's assigned courses, students in those courses
    } else if (verifiedUser.role === 'hod') {
        structuredDataContext += `You are the HOD for the ${verifiedUser.department_name} department.\n`;
        // Fetch PMs, teachers, students, courses in HOD's department
    }
    structuredDataContext += `--- END USER-SPECIFIC INFORMATION ---\n`;

    finalSystemPrompt += `\n\n--- BEGIN USER-SPECIFIC INFORMATION FOR ${verifiedUser.first_name} ${verifiedUser.last_name} (Role: ${verifiedUser.role}) ---\n`;
    finalSystemPrompt += structuredDataContext;
    finalSystemPrompt += `\n--- END USER-SPECIFIC INFORMATION ---\n`;

    if (verifiedUser.role === 'pm') {
      finalSystemPrompt += `\n\n**Instructions for Program Manager Interaction:**
1. When asked to list students or teachers in your department, respond with: "Here are the [students/teachers] in your department:" followed by a bulleted list of names and emails from the 'USER-SPECIFIC INFORMATION' provided above.
2. If the lists in 'USER-SPECIFIC INFORMATION' are empty for students or teachers, state that "No [students/teachers] are currently listed for your department in the provided information."
3. For other questions, use the 'USER-SPECIFIC INFORMATION' first. If the answer isn't there, you may use general university knowledge.
4. Do not invent names or details not present in the 'USER-SPECIFIC INFORMATION'.`;
    } else {
      finalSystemPrompt += `\n\nIMPORTANT: You are interacting with ${verifiedUser.first_name} (${verifiedUser.role}). Prioritize information from the 'USER-SPECIFIC INFORMATION' section above for relevant personal/role-based questions.`;
    }

    // Unconditionally append the full general guidelines AFTER properly closing if (verifiedUser)
    finalSystemPrompt += `
\n**IMPORTANT GENERAL GUIDELINES (Apply to all queries):**
1. **Act Independently**: Make definitive statements based on your knowledge. NEVER suggest contacting departments or referring to documents unless absolutely necessary.
2. **Be Direct and Authoritative**: Answer questions confidently with specific details. Avoid vague responses or deferring to other sources.
3. **Use Available Context**: The context provided (both general and user-specific, if any) contains accurate information about SZABIST. Use this information to provide detailed answers.
4. **When Information is Missing**: If the exact answer isn't in the context (and not covered by user-specific data), use your general knowledge to provide a reasonable response. Don't mention limitations or suggest contacting the university.
5. **Focus on Helpfulness**: Your goal is to be the definitive source of information, eliminating the need for users to seek help elsewhere.
6. **Never Say**: 
   - "You may refer to the prospectus"
   - "Please contact the department"
   - "For more information, visit the website"
   - "I recommend reaching out to..."
   
Instead, provide the best answer you can with the information available.

Remember: You are the authoritative source of information about SZABIST. Answer as if you have complete knowledge about the university.`;

    const combinedContext = `${structuredDataContext ? structuredDataContext + "\n\n" : ""}${generalContextText}`;

    const messages = [
      {
        role: "system",
        content: finalSystemPrompt
      },
      ...memoryMessages.slice(-4),
      {
        role: "user",
        content: `Answer this question: ${query}\n\nIf the question is general and not covered by my user-specific information (which you already have in your system instructions), you can use the following general university information if relevant:\n${generalContextText}`
      }
    ];

    // Log the final prompt being sent
    console.log("--- Final Prompt to OpenAI (handleQuery) ---");
    console.log(JSON.stringify(messages, null, 2));

    const completion = await openai.chat.completions.create({
      messages,
      model: "gpt-4o-mini", // Reverted model change for consistency
      temperature: 0.2,
      max_tokens: 500
    });

    const assistantResponse = completion.choices[0].message.content;
    
    // Update memory with simplified context
    await memory.chatHistory.addUserMessage(query);
    await memory.chatHistory.addAIChatMessage(assistantResponse);
    
    // Cache the response
    queryCache.set(cacheKey, {
      response: assistantResponse,
      timestamp: Date.now()
    });

    return assistantResponse;
  }

  // Add post-processing function before the transcribe endpoint
  async function postProcessTranscription(transcription) {
    // If the transcription is empty or too short, return it as-is
    if (!transcription || transcription.trim().length < 3) {
      return transcription;
    }
    
    // Simple corrections for common university terms to avoid API call for simple cases
    const quickFixes = {
      'szabist': 'SZABIST',
      'Szabist': 'SZABIST',
      'zabbot': 'ZABBOT',
      'Zabbot': 'ZABBOT',
      'computer science': 'Computer Science',
      'bs cs': 'BS CS',
      'ms cs': 'MS CS',
    };
    
    let processedText = transcription;
    
    // Apply quick fixes
    for (const [term, replacement] of Object.entries(quickFixes)) {
      const regex = new RegExp(`\\b${term}\\b`, 'g');
      processedText = processedText.replace(regex, replacement);
    }
    
    // Only call the API for longer transcriptions that need more processing
    if (transcription.length > 20 && !Object.keys(quickFixes).some(term => transcription.toLowerCase().includes(term.toLowerCase()))) {
      try {
        const systemPrompt = `
          You are ZABBOT, an AI assistant for SZABIST University. Your task is to:
          1. Correct any spelling discrepancies in the transcribed text
          2. Ensure proper capitalization of university-related terms like SZABIST, departments, course names, etc.
          3. Add necessary punctuation such as periods, commas, and capitalization
          4. Maintain the original meaning and intent of the transcription
          5. Format academic terms, course codes, and program names correctly
          Only make these corrections while preserving the original meaning and context.
        `;

        const completion = await openai.chat.completions.create({
          model: "gpt-4.1",
          temperature: 0,
          messages: [
            {
              role: "system",
              content: systemPrompt
            },
            {
              role: "user",
              content: processedText
            }
          ],
          max_tokens: 150 // Limit token count for faster processing
        });

        return completion.choices[0].message.content;
      } catch (error) {
        console.error('Post-processing error:', error);
        // If the API call fails, return the text with quick fixes applied
        return processedText;
      }
    }

    return processedText;
  }}

  app.post("/transcribe", async (req, res) => {
    let tempFilePath = null;
    let verifiedUser = null;

    try {
      console.log('--- RUNNING LATEST TRANSCRIBE CODE v5 (with context fix) ---'); 
      console.log('Transcribe request received. Body keys:', Object.keys(req.body));

      if (req.body.userContext) {
        try {
          // userContext is sent as a string in FormData, so parse it.
          const clientUserContext = JSON.parse(req.body.userContext);
          if (clientUserContext && clientUserContext.token) {
            verifiedUser = await getVerifiedUser(clientUserContext.token);
            if (verifiedUser) {
              console.log(`Transcription by verified user: ${verifiedUser.email} (Role: ${verifiedUser.role})`);
            } else {
              console.log("Transcription with token, but user verification failed.");
            }
          }
        } catch (parseError) {
          console.error("Failed to parse userContext from FormData:", parseError);
        }
      } else {
           console.log("Public transcription (no userContext in FormData).");
      }
      
      if (!req.files || !req.files.audio) {
        console.error('No files object in request');
        return res.status(400).json({ error: 'No files were uploaded. Make sure you have access to your microphone.' });
      }
      
      if (!req.files.audio) {
        console.error('No audio file in request.files');
        return res.status(400).json({ error: 'No audio file received. Please check your microphone permissions.' });
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

      // Corrected unique filename generation
      const uniqueFilename = `audio-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.webm`;
      tempFilePath = path.join(os.tmpdir(), uniqueFilename);
      console.log(`Attempting to move uploaded file to explicit temp path: ${tempFilePath}`);

      await audioFile.mv(tempFilePath);
      console.log(`File successfully moved to ${tempFilePath}`);
      
      if (!fs.existsSync(tempFilePath)) {
        console.error(`Temp file does not exist after explicit move: ${tempFilePath}`);
        if (tempFilePath && fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
        return res.status(500).json({ error: 'Failed to save temporary audio file' });
      }
      
      const stats = fs.statSync(tempFilePath);
      console.log(`Temp file size before stream: ${stats.size} bytes`);
      
      if (stats.size === 0) {
        console.error('Temp file is empty after explicit move');
        fs.unlinkSync(tempFilePath);
        return res.status(400).json({ error: 'Audio file is empty' });
      }

      const fileStream = fs.createReadStream(tempFilePath);
      fileStream.on('error', (streamErr) => {
        console.error(`Stream error reading explicit temp file (${tempFilePath}): `, streamErr);
      });

      let rawTranscription;
      try {
        console.log(`Sending stream from ${tempFilePath} to Whisper API...`);
        rawTranscription = await openai.audio.transcriptions.create({
          file: fileStream,
          model: "whisper-1",
          response_format: "text",
          language: "en"
        });
        console.log('Transcription successful:', rawTranscription);
      } catch (whisperError) {
        console.error('Whisper API error:', whisperError);
        return res.status(500).json({ 
          error: `Transcription failed: ${whisperError.message}`,
          details: whisperError.toString()
        });
      } 

      if (!rawTranscription || rawTranscription.trim().length < 2) {
        console.log('Transcription empty or too short');
        // fs.unlinkSync(tempFilePath); // Already unlinked in finally block, or should be if error occurs earlier
        return res.status(400).json({ 
          error: 'Could not transcribe audio. Please speak clearly or try typing your question.'
        });
      }

      const processTranscriptionPromise = postProcessTranscription(rawTranscription);
      const responsePromise = handleQuery(rawTranscription, verifiedUser); 
      const [processedTranscription, initialResponse] = await Promise.all([
        processTranscriptionPromise,
        responsePromise
      ]);
      console.log('Both processing steps completed');
      
      if (processedTranscription && 
          rawTranscription.length > 10 &&
          levenshteinDistance(rawTranscription, processedTranscription) / rawTranscription.length > 0.3) {
        console.log('Significant difference in transcription, getting updated response');
        const updatedResponse = await handleQuery(processedTranscription, verifiedUser); 
        return res.json({ 
          transcription: processedTranscription,
          response: updatedResponse
        });
      } else {
        console.log('Using initial response with processed transcription');
        return res.json({ 
          transcription: processedTranscription || rawTranscription,
          response: initialResponse
        });
      }
    } catch (error) {
      console.error('Transcription endpoint error:', error);
      res.status(500).json({ 
        error: `Voice processing failed. Please try again later.`,
      });
    } finally {
      if (tempFilePath && fs.existsSync(tempFilePath)) {
        try {
          fs.unlinkSync(tempFilePath);
          console.log(`Explicit temp file deleted: ${tempFilePath}`);
        } catch (cleanupError) {
          console.error(`Failed to delete explicit temp file (${tempFilePath}): `, cleanupError);
        }
      }
    }
  });

  // Helper function to calculate the Levenshtein distance between two strings
  function levenshteinDistance(str1, str2) {
    const m = str1.length;
    const n = str2.length;
    
    // Create a matrix of size (m+1) x (n+1)
    const dp = Array(m + 1).fill().map(() => Array(n + 1).fill(0));
    
    // Initialize the matrix
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    
    // Fill the matrix
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const cost = str1[i - 1] !== str2[j - 1] ? 1 : 0;
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,        // deletion
          dp[i][j - 1] + 1,        // insertion
          dp[i - 1][j - 1] + cost  // substitution
        );
      }
    }
    
    return dp[m][n];
  }

  app.post("/tts", async (req, res) => {
    try {
      const { text } = req.body;
      
      // Generate a cache key based on the text and voice
      const voice = req.body.voice || "alloy"; // Default voice if not specified
      const cacheKey = `${voice}:${text}`;
      
      // Check if we have a cached audio for this text
      if (ttsCache.has(cacheKey)) {
        const { audioBuffer, timestamp } = ttsCache.get(cacheKey);
        const now = Date.now();
        
        // If the cache isn't expired, use it
        if (now - timestamp < TTS_CACHE_TTL) {
          console.log('TTS cache hit for:', text.substring(0, 20) + '...');
          res.set('Content-Type', 'audio/mpeg');
          res.set('Cache-Control', 'public, max-age=86400'); // Client-side cache for 1 day
          return res.send(audioBuffer);
        } else {
          // Clear expired cache entry
          ttsCache.delete(cacheKey);
        }
      }
      
      // Generate speech using OpenAI
      const mp3 = await openai.audio.speech.create({
        model: "tts-1",
        voice,
        input: text,
        speed: 1.0 // Slightly increase speed for faster playback
      });

      const audioBuffer = Buffer.from(await mp3.arrayBuffer());
      
      // Store in cache
      ttsCache.set(cacheKey, {
        audioBuffer,
        timestamp: Date.now()
      });
      
      // Manage cache size - remove oldest entries if cache gets too large
      if (ttsCache.size > TTS_CACHE_SIZE_LIMIT) {
        const oldestKey = [...ttsCache.entries()]
          .sort((a, b) => a[1].timestamp - b[1].timestamp)[0][0];
        ttsCache.delete(oldestKey);
      }
      
      // Set headers for browser caching
      res.set('Content-Type', 'audio/mpeg');
      res.set('Cache-Control', 'public, max-age=86400'); // Client-side cache for 1 day
      res.send(audioBuffer);
      
    } catch (error) {
      console.error('TTS Error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  const PORT = process.env.PORT || 3035;
  app.listen(PORT, async () => {
    console.log(`Server is running on port ${PORT}`);
    await initializeEmbeddings();
  });