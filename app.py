from flask import Flask, request, jsonify
from flask_cors import CORS
from llama_index.llms.openai import OpenAI
from llama_index.embeddings.openai import OpenAIEmbedding
from llama_index.core import Settings, VectorStoreIndex, SimpleDirectoryReader
from llama_index.core.memory import ChatMemoryBuffer
from llama_index.core.chat_engine import CondensePlusContextChatEngine
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)
# Enable CORS for all routes and origins
CORS(app, resources={r"/*": {"origins": "*"}})

# Initialize OpenAI API key from environment variable
os.environ["OPENAI_API_KEY"] = os.getenv("OPENAI_API_KEY")

# Get the absolute path to the current directory
current_dir = os.path.dirname(os.path.abspath(__file__))

# Define directories for data and scraped pages
data_dir = os.path.join(current_dir, 'data')
scraped_pages_dir = os.path.join(current_dir, 'scraped_pages')

# Create data and scraped_pages directories if they don't exist
os.makedirs(data_dir, exist_ok=True)
os.makedirs(scraped_pages_dir, exist_ok=True)

# Initialize the models and settings
llm = OpenAI(model="gpt-4o-mini", temperature=0)
embed_model = OpenAIEmbedding(model="text-embedding-3-large")
Settings.llm = llm
Settings.embed_model = embed_model

# Check if Markdown files exist in both data and scraped_pages directories
def check_markdown_files():
    data_md_files = [f for f in os.listdir(data_dir) if f.endswith('.md')]
    scraped_md_files = [f for f in os.listdir(scraped_pages_dir) if f.endswith('.md')]
    if not data_md_files and not scraped_md_files:
        raise ValueError(
            f"No Markdown files found in {data_dir} and {scraped_pages_dir}. "
            "Please add your Markdown files to these directories."
        )

check_markdown_files()

# Load and initialize the index from Markdown files in both directories
def rebuild_index():
    data_dirs = [data_dir, scraped_pages_dir]
    all_documents = []
    for dir_path in data_dirs:
        reader = SimpleDirectoryReader(
            input_dir=dir_path,
            required_exts=[".md"]
        )
        documents = reader.load_data()
        all_documents.extend(documents)
    return VectorStoreIndex.from_documents(all_documents)

index = rebuild_index()  # Initialize the index
memory = ChatMemoryBuffer.from_defaults(token_limit=4500)

# Custom System Prompt
system_prompt = """
You are ZABBOT, a highly advanced university assistant chatbot developed exclusively for SZABIST Islamabad. Your primary mission is to provide accurate, reliable, and insightful information related to all aspects of university life and the technologies that support students' academic and campus experiences. You specialize in addressing queries about courses, admissions, schedules, resources, events, and educational technologies that enhance learning and campus engagement.

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

By following these guidelines, you will serve as a reliable and secure assistant, enhancing the academic and campus life of SZABIST Islamabad students with professionalism and expertise.
"""

chat_engine = CondensePlusContextChatEngine.from_defaults(
    retriever=index.as_retriever(),
    memory=memory,
    llm=llm,
    system_prompt=system_prompt
)

@app.route('/')
def home():
    return jsonify({"message": "SZABIST Chatbot API is running"})

@app.route('/api/chat', methods=['POST'])
def chat():
    try:
        data = request.json
        user_message = data.get('message')
        
        if not user_message:
            return jsonify({'error': 'No message provided'}), 400
        
        # Get response from chat engine
        response = chat_engine.chat(user_message)
        
        return jsonify({
            'response': str(response)
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/rebuild_index', methods=['POST'])
def rebuild_index_route():
    try:
        global index  # Use the global index variable
        index = rebuild_index()  # Rebuild the index from both directories
        # Reinitialize the retriever with the new index
        chat_engine.retriever = index.as_retriever()
        return jsonify({"message": "Index rebuilt successfully."}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
    rebuild_index()
