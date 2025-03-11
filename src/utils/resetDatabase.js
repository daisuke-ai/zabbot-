import { supabase } from '../services/supabaseService';
import fs from 'fs';
import path from 'path';

/**
 * Reset database utility - runs the SQL script to reset the database
 * This should be run from Node.js, not in the browser
 */
async function resetDatabase() {
  try {
    console.log('Starting database reset...');
    
    // Read the SQL file
    const sqlPath = path.resolve(__dirname, '../backend/db/reset_database.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Split the SQL into individual statements
    const statements = sql
      .split(';')
      .map(statement => statement.trim())
      .filter(statement => statement.length > 0);
    
    console.log(`Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`Executing statement ${i + 1}/${statements.length}`);
      
      const { error } = await supabase.rpc('exec_sql', { sql: statement });
      
      if (error) {
        console.error(`Error executing statement ${i + 1}:`, error);
      }
    }
    
    console.log('Database reset completed successfully');
  } catch (error) {
    console.error('Error resetting database:', error);
  }
}

// Execute if this file is run directly
if (require.main === module) {
  resetDatabase();
}

export default resetDatabase; 