/**
 * HOD role migration script
 * Run this script to update the database with HOD role and related schema changes
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY // Use service key for migrations
);

async function runMigration() {
  console.log('Starting HOD role migration...');

  try {
    // 1. Add 'hod' role to roles table
    console.log('Adding HOD role...');
    const { data: roleData, error: roleError } = await supabase
      .from('roles')
      .insert([{ name: 'hod', description: 'Head of Department' }])
      .select();

    if (roleError) {
      console.error('Error adding HOD role:', roleError);
      return;
    }

    console.log('HOD role added:', roleData);

    // 2. Add department and major columns to users table if they don't exist
    console.log('Adding department and major columns to users table...');
    
    // Use raw SQL for column operations
    const { error: deptColumnError } = await supabase.rpc(
      'add_department_column_if_not_exists'
    );

    if (deptColumnError) {
      console.error('Error adding department column:', deptColumnError);
      return;
    }

    const { error: majorColumnError } = await supabase.rpc(
      'add_major_column_if_not_exists'
    );

    if (majorColumnError) {
      console.error('Error adding major column:', majorColumnError);
      return;
    }

    // 3. Create department_majors table
    console.log('Creating department_majors table if not exists...');
    
    const { error: depMajorError } = await supabase.rpc(
      'create_department_majors_table_if_not_exists'
    );

    if (depMajorError) {
      console.error('Error creating department_majors table:', depMajorError);
      return;
    }

    // 4. Insert department data
    console.log('Inserting department data...');
    
    const departments = [
      { name: 'Computer Science', majors: ['Computer Science', 'Software Engineering', 'Artificial Intelligence', 'Robotics'] },
      { name: 'Management Sciences', majors: ['MBA', 'BBA', 'Finance', 'Marketing'] },
      { name: 'Social Sciences', majors: ['Psychology', 'International Relations', 'Sociology', 'Economics'] },
      { name: 'Media Sciences', majors: ['Journalism', 'Film & TV', 'Advertising', 'Digital Media'] }
    ];

    for (const dept of departments) {
      const { data: deptData, error: deptError } = await supabase
        .from('departments')
        .upsert({ name: dept.name })
        .select();

      if (deptError) {
        console.error(`Error inserting department ${dept.name}:`, deptError);
        continue;
      }

      const deptId = deptData[0].id;

      for (const major of dept.majors) {
        const { error: majorError } = await supabase
          .from('department_majors')
          .upsert({ 
            department_id: deptId,
            major_name: major
          });

        if (majorError) {
          console.error(`Error inserting major ${major}:`, majorError);
        }
      }
    }

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

runMigration(); 