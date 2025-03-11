# SZABIST University Portal

A comprehensive university management system built with React and Supabase, featuring role-based access control, database management, and AI assistance.

## Features

- **Role-Based Access Control**: Admin, HOD, Program Manager, Teacher, and Student roles
- **User Management**: Create and manage user accounts for different roles
- **Department & Course Management**: Organize academic programs
- **Admin Portal**: Complete administration interface for managing departments and HOD accounts
- **HOD Portal**: Manage program managers and department resources
- **AI Chatbot**: Integrated AI assistance for users

## Setup Instructions

### Prerequisites

1. Node.js (v14+)
2. Supabase account and project
3. Environment variables configured

### Environment Setup

1. Clone the repository
2. Copy `.env.example` to `.env` in both root and `src/backend` directories
3. Fill in your Supabase URL and API keys

```bash
# Example .env file
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### Database Setup

1. Run the database schema setup script in the Supabase SQL Editor
   - Navigate to your Supabase dashboard > SQL Editor
   - Copy and paste the contents of `src/backend/db/create_user_function.sql`
   - Execute the SQL script to create the necessary database functions

2. Run the fixed admin user script
   - Copy and paste the contents of `src/backend/db/add_admin_user.sql`
   - This script has been fixed to avoid the `IF NOT EXISTS` syntax error
   - Execute the script to create the admin account with email `ammarv67@gmail.com`

3. Ensure the "Row Level Security" settings are properly configured in Supabase:
   - Enable RLS on all tables
   - Set up policies that match the documentation

### Installation

```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd src/backend
npm install
```

### Running the Application

```bash
# Start the backend server
cd src/backend
npm run dev

# In a separate terminal, start the frontend
npm run dev
```

## User Access

### Admin Portal Access
The Admin Portal provides centralized administrative functions:

1. **Access the Admin Portal**
   - Click the "Admin Portal" button in the header
   - Login with the admin credentials:
     - Email: `ammarv67@gmail.com`
     - Password: `12345678`

2. **Admin Dashboard Features**
   - **Create HOD Accounts**: Create department head accounts for any department
   - **Manage Departments**: View and create academic departments
   - **Pre-populated CS Departments**: Computer Science, Artificial Intelligence, Data Science, and Software Engineering

### HOD Portal
- Log in with a HOD account
- Navigate to the HOD Portal
- Create Program Manager accounts
- Manage departmental functions

## Development

### Adding New Features

1. Frontend components are in `src/components/`
2. Pages are in `src/pages/`
3. API routes are in `src/backend/server.js`

### Database Changes

If you need to modify the database schema:
1. Update the SQL scripts in `src/backend/db/`
2. Run the updated scripts in the Supabase SQL Editor

## Troubleshooting

### SQL Syntax Errors
If you encounter SQL syntax errors:

1. **For "IF NOT EXISTS" errors:**
   - PostgreSQL in Supabase may not support `IF NOT EXISTS` for policies
   - Use the updated script in `src/backend/db/add_admin_user.sql` which includes a workaround
   - The script now drops existing policies before creating new ones

2. **Database connection errors:**
   - Verify your environment variables are correct
   - Check Supabase project status and policies

### UUID Format Errors 

If you encounter errors like `"invalid input syntax for type uuid: "Artificial Intelligence (AI)""` when creating HOD accounts:

1. **Database Connection**:
   - Verify your database connection by opening browser console (F12)
   - Type `window.checkDatabase()` to run diagnostics
   - Check that departments have valid UUIDs

2. **Department Creation**:
   - Make sure departments were created properly with valid IDs
   - The system should automatically create CS-related departments if none exist
   - If automatic creation fails, navigate to the "Manage Departments" tab and add them manually

3. **Manual Solutions**:
   - If the error persists, you can insert departments directly in the Supabase SQL Editor:
     ```sql
     INSERT INTO departments (name, code) 
     VALUES 
     ('Computer Science', 'CS'),
     ('Artificial Intelligence', 'AI'),
     ('Data Science', 'DS'),
     ('Software Engineering', 'SE');
     ```

4. **Browser Refresh**:
   - After adding departments, refresh your browser to load the latest data
   - The departments should now have valid UUIDs and be selectable in the HOD creation form

## Contributing

Please follow the project's coding standards and submit pull requests for review.

## License

[MIT License](LICENSE)
