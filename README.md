# ZABBOT AI Assistant

## Project Description

ZABBOT is a full-stack web application designed as an AI assistant for SZABIST University. It features a React-based frontend built with Vite, offering various user portals (HOD, Student, Teacher) for managing academic data and interacting with an AI-powered database assistant. The Node.js backend, deployed as a Vercel serverless function, integrates OpenAI for general AI and embeddings, Supabase for database interactions and document storage (RAG), and Contentful for blog post management. The application aims to provide a unified platform for university information and administrative tasks, enhanced by AI capabilities.

## Getting Started

This document provides comprehensive instructions on how to set up and run the ZABBOT application, both locally and in a containerized environment with Docker.

### Prerequisites

Before you begin, ensure you have the following installed:

*   [Node.js](https://nodejs.org/en/) (v18 or later recommended)
*   [npm](https://www.npmjs.com/) (usually comes with Node.js)
*   [Docker Desktop](https://www.docker.com/products/docker-desktop) (if running with Docker)
    *   Ensure Docker Desktop is running and the Docker daemon is accessible. If on Windows, make sure [WSL](https://docs.microsoft.com/en-us/windows/wsl/install) is updated (`wsl --update` and `wsl --shutdown`).

### 1. Local Development Setup

To run the frontend and backend locally for development:

#### 1.1. Backend Setup

1.  **Navigate to the backend directory:**
    ```bash
    cd src/backend
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Create a `.env` file:** In the `src/backend` directory, create a file named `.env` and add your environment variables. These are crucial for the backend to connect to external services:
    ```
    OPENAI_API_KEY=your_openai_api_key_here
    SUPABASE_URL=your_supabase_url_here
    SUPABASE_ANON_KEY=your_supabase_anon_key_here
    FRONTEND_URL=http://localhost:5173 # Your frontend local development URL
    VITE_CONTENTFUL_SPACE_ID=your_contentful_space_id_here
    VITE_CONTENTFUL_ACCESS_TOKEN=your_contentful_access_token_here
    ```
    (Replace placeholders with your actual keys and URLs. Contentful variables are optional if you're not using blog post embedding).

4.  **Run the backend development server:**
    ```bash
    npm run dev:unified
    ```
    The backend server will typically run on `http://localhost:3001`.

#### 1.2. Frontend Setup

1.  **Navigate back to the project root directory:**
    ```bash
    cd ..
    cd .. # Assuming you are in src/backend, navigate up twice
    ```
    (Alternatively, open a new terminal directly in the project root: `G:\Projects\zabbot-`)

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Run the frontend development server:**
    ```bash
    npm run dev
    ```
    The frontend application will typically open in your browser at `http://localhost:5173`.

### 2. Docker Setup

To run the entire application using Docker Compose (recommended for local production-like environment):

1.  **Ensure Docker Desktop is running and healthy.**

2.  **Create a root `.env` file:** In the **root directory of your project** (`G:\Projects\zabbot-`), create a file named `.env` and add your environment variables. These will be picked up by Docker Compose for the backend service:
    ```
    OPENAI_API_KEY=your_openai_api_key_here
    SUPABASE_URL=your_supabase_url_here
    SUPABASE_ANON_KEY=your_supabase_anon_key_here
    VITE_CONTENTFUL_SPACE_ID=your_contentful_space_id_here
    VITE_CONTENTFUL_ACCESS_TOKEN=your_contentful_access_token_here
    ```
    (Replace placeholders with your actual keys and URLs. Contentful variables are optional.)

3.  **Build and run the Docker containers:** From the **root directory** of your project, execute:
    ```bash
    docker-compose up --build
    ```
    This command will build the Docker images for both frontend and backend and start them.

4.  **Access the application:**
    *   **Frontend:** Open your browser and navigate to `http://localhost:80`.
    *   **Backend API:** The backend will be accessible internally by the frontend at `http://backend:3001` (within the Docker network) and externally for testing at `http://localhost:3001`.

### 3. Vercel Deployment (Frontend and Backend as Separate Projects)

For production deployments on Vercel, it is recommended to deploy the frontend and backend as separate Vercel projects, especially in a monorepo structure like this one.

#### 3.1. Frontend Deployment

1.  **Vercel Project Creation:** Create a new Vercel project for your frontend.
2.  **Project Root:** Point the project root to your repository's root directory (`/`).
3.  **Build & Output Settings:** Vercel should automatically detect your Vite project and configure the build command (`npm run build`) and output directory (`dist`) correctly. No `vercel.json` is needed at the root.
4.  **Environment Variables:** In your Vercel frontend project settings, add the following environment variables:
    *   `VITE_DB_ASSISTANT_URL`: Set this to the URL of your deployed backend Vercel function (e.g., `https://your-backend-project.vercel.app`).
    *   `VITE_BACKEND_URL`: Set this to the URL of your deployed backend Vercel function (e.g., `https://your-backend-project.vercel.app`).

    The frontend is hosted at [https://zabbot-frontend.vercel.app/](https://zabbot-frontend.vercel.app/).

#### 3.2. Backend Deployment

1.  **Vercel Project Creation:** Create a new Vercel project for your backend.
2.  **Project Root:** Crucially, set the project's root directory to `src/backend`.
3.  **`vercel.json` Configuration:** The `src/backend/vercel.json` file is already configured for Vercel deployment of a serverless function:
    ```json
    {
        "version": 2,
        "routes": [
            {
                "src": "/(.*)",
                "dest": "api/unified-server.js/$1"
            }
        ],
        "functions": {
            "api/unified-server.js": {
                "memory": 1024,
                "maxDuration": 60
            }
        }
    }
    ```
4.  **Environment Variables:** In your Vercel backend project settings, add the following **critical** environment variables:
    *   `OPENAI_API_KEY`: Your OpenAI API key.
    *   `SUPABASE_URL`: Your Supabase project URL.
    *   `SUPABASE_ANON_KEY`: Your Supabase public anonymous key.
    *   `FRONTEND_URL`: The URL of your deployed frontend (e.g., `https://zabbot-frontend.vercel.app`). This is essential for CORS policies.
    *   `NODE_ENV`: Set to `production`.

### Database Schema

Refer to `schema.txt` in the root directory or the `databaseSchema` constant in `src/backend/api/unified-server.js` for the full database schema. This schema is used by the AI database assistant for role-based access control and query processing.

### Additional Notes

*   **CORS:** Ensure `FRONTEND_URL` in your backend `.env` (or Vercel environment variables) correctly matches the domain where your frontend is hosted to prevent CORS issues.
*   **RAG Data:** The RAG data (`src/data/rag_Data.md`) is automatically embedded during backend startup if the `documents` table in Supabase is empty. You can also train the AI via the HOD Portal's "Train AI" tab.
*   **Environment Variables:** Always double-check that all required environment variables are set correctly in the appropriate `.env` files (for local Docker) or Vercel project settings (for deployment).
