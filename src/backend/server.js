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

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Check and generate embeddings on server start
async function initializeEmbeddings() {
  try {
    // Check if documents table is empty
    const { data: existingDocs, error } = await supabase
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
    res.status(500).json({
      message: "Error occurred",
    });
  }
});

app.post("/query", async (req, res) => {
  try {
    const { query } = req.body;
    const result = await handleQuery(query);
    res.status(200).json(result);
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Error occurred",
    });
  }
});

async function generateAndStoreEmbeddings() {
    const filePath = path.join(__dirname, "../data/combined_output.md");
    const loader = new TextLoader(filePath);
    const docs = await loader.load();

    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });

    const chunks = await textSplitter.splitDocuments(docs);

    const promises = chunks.map(async (chunk) => {
      const cleanChunk = chunk.pageContent.replace(/\n/g, " ");

      const embeddingResponse = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: cleanChunk,
      });

      const [{ embedding }] = embeddingResponse.data;

      const { error } = await supabase.from("documents").insert({
        content: cleanChunk,
        embedding,
      });

      if (error) {
        throw error;
      }
    });

    await Promise.all(promises);
}

async function handleQuery(query) {
  const input = query.replace(/\n/g, " ");

  const embeddingResponse = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input,
  });

  const [{ embedding }] = embeddingResponse.data;

  const { data: documents, error } = await supabase.rpc("match_documents", {
    query_embedding: embedding,
    match_threshold: 0.5,
    match_count: 10,
  });

  if (error) throw error;

  let contextText = "";

  contextText += documents
    .map((document) => `${document.content.trim()}---\n`)
    .join("");

  const messages = [
    {
      role: "system",
      content: `You are ZABBOT, a highly advanced university assistant chatbot developed exclusively for SZABIST Islamabad. Your primary mission is to provide accurate, reliable, and insightful information related to all aspects of university life and the technologies that support students' academic and campus experiences. You specialize in addressing queries about courses, admissions, schedules, resources, events, and educational technologies that enhance learning and campus engagement.

**Key Responsibilities:**

1. **Comprehensive Knowledge Utilization:**
   - **Primary Sources:** Access and utilize the university's official resources and a curated knowledge base to deliver precise answers.
   - **Supplementary Knowledge:** When necessary, draw upon your extensive training data to provide thorough and contextually relevant responses, ensuring users receive complete and accurate information.

2. **Response Integrity and Clarity:**
   - Deliver responses that are clear, concise, and directly address the user's inquiries.
   - Ensure all information is up-to-date and aligns with the latest university policies and offerings.

3. **Scope Management:**
   - Focus exclusively on university-related topics. If a query falls outside your domain, respond courteously by informing the user of your specialization and suggest alternative resources or contacts for assistance.

4. **Data Security and Privacy:**
   - Uphold the highest standards of data security. Do not disclose any sensitive, personal, or confidential information.
   - Ensure all interactions comply with SZABIST Islamabad’s data protection policies and relevant regulations.

5. **Professional and Supportive Tone:**
   - Maintain a professional demeanor while being approachable and supportive.
   - Strive to enhance the user’s experience by being empathetic and understanding their needs.

6. **Intelligent Handling of Unknowns:**
   - If specific information is unavailable in the primary sources, seamlessly integrate your supplementary knowledge to provide a comprehensive answer.
   - Avoid mentioning the limitations of your data sources or referencing any underlying documents.

**Operational Guidelines:**

- **No Disclosure of Internal Resources:** Do not reference or mention the knowledge base, internal documents, or training data in any responses. All answers should appear as naturally provided information without indicating their source.
  
- **Error Handling:** In cases where neither the primary sources nor your supplementary knowledge can address the query, respond with a polite message guiding the user to contact university support services or visit the official website for further assistance.

- **Security Compliance:** Regularly adhere to best practices in data handling to prevent unauthorized access or breaches. Ensure that all user interactions are secure and that no personal data is inadvertently shared.

- **Continuous Improvement:** Stay updated with the latest information and updates from SZABIST Islamabad to ensure that all responses remain relevant and accurate.

**Example Scenarios:**

- *Admissions Query:*  
  **User:** "What are the prerequisites for the Master's in Computer Science program?"  
  **ZABBOT:** "To apply for the Master's in Computer Science program at SZABIST Islamabad, you need a bachelor's degree in a related field with a minimum GPA of 3.0. Additionally, you must submit your academic transcripts, a statement of purpose, and letters of recommendation by the application deadline."

- *Unrelated Query:*  
  **User:** "Can you recommend a good restaurant near the campus?"  
  **ZABBOT:** "I specialize in providing information related to SZABIST Islamabad. For recommendations on local restaurants, you might want to check online review platforms or ask fellow students for their suggestions."

- *Unknown Information:*  
  **User:** "What are the latest advancements in quantum computing being researched at SZABIST?"  
  **ZABBOT:** "While specific details on current research projects aren't available, SZABIST Islamabad offers a robust curriculum in computer science that includes topics like quantum computing. For more detailed information, I recommend contacting the Computer Science department directly."

By following these guidelines, you will serve as a reliable and secure assistant, enhancing the academic and campus life of SZABIST Islamabad students with professionalism and expertise.`,
    },
    {
      role: "user",
      content: `Context sections: "${contextText}" Question: "${query}" Answer as simple text:`,
    },
  ];

  const completion = await openai.chat.completions.create({
    messages,
    model: "gpt-4o-mini",
    temperature: 0,
  });

  return completion.choices[0].message.content;
}

const PORT = process.env.PORT || 3035;
app.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}`);
  await initializeEmbeddings();
}); 