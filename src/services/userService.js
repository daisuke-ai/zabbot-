import { supabase } from './supabaseService';

// User roles
export const USER_ROLES = {
  HOD: 'hod',
  PM: 'pm',
  TEACHER: 'teacher',
  STUDENT: 'student'
};

/**
 * Get the current user's profile including role information
 */
export const getCurrentUserProfile = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return null;
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*, departments(*)')
      .eq('id', user.id)
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error getting user profile:', error);
    throw error;
  }
};

/**
 * Create a new user account (for HOD creating PM, or PM creating Teacher/Student)
 */
export const createUserAccount = async (userData) => {
  try {
    const { email, password, firstName, lastName, role, departmentId } = userData;
    
    // First check if the current user has permission to create this type of user
    const currentProfile = await getCurrentUserProfile();
    
    if (!currentProfile) {
      throw new Error('You must be logged in to create users');
    }
    
    // Check permissions based on role hierarchy
    if (
      (currentProfile.role === USER_ROLES.HOD && role !== USER_ROLES.PM) ||
      (currentProfile.role === USER_ROLES.PM && 
       (role !== USER_ROLES.TEACHER && role !== USER_ROLES.STUDENT)) ||
      (currentProfile.role === USER_ROLES.TEACHER || currentProfile.role === USER_ROLES.STUDENT)
    ) {
      throw new Error('You do not have permission to create this type of user');
    }
    
    // Create the user with the Supabase auth API
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          role: role,
          department_id: departmentId || currentProfile.department_id
        }
      }
    });
    
    if (error) throw error;
    
    // Create the profile record
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: data.user.id,
        email,
        first_name: firstName,
        last_name: lastName,
        role,
        department_id: departmentId || currentProfile.department_id
      });
    
    if (profileError) throw profileError;
    
    return data.user;
  } catch (error) {
    console.error('Error creating user account:', error);
    throw error;
  }
};

/**
 * Get all departments
 */
export const getAllDepartments = async () => {
  try {
    const { data, error } = await supabase
      .from('departments')
      .select('*')
      .order('name');
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error getting departments:', error);
    throw error;
  }
};

/**
 * Get users by role (for PM to view teachers or students)
 */
export const getUsersByRole = async (role, departmentId = null) => {
  try {
    const currentProfile = await getCurrentUserProfile();
    
    if (!currentProfile) {
      throw new Error('You must be logged in to view users');
    }
    
    // If no department ID is provided, use the current user's department
    const deptId = departmentId || currentProfile.department_id;
    
    let query = supabase
      .from('profiles')
      .select('*, departments(*)')
      .eq('role', role);
    
    // Filter by department if applicable
    if (deptId) {
      query = query.eq('department_id', deptId);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error(`Error getting ${role} users:`, error);
    throw error;
  }
};

/**
 * Get courses for a department
 */
export const getDepartmentCourses = async (departmentId = null) => {
  try {
    const currentProfile = await getCurrentUserProfile();
    
    if (!currentProfile) {
      throw new Error('You must be logged in to view courses');
    }
    
    // If no department ID is provided, use the current user's department
    const deptId = departmentId || currentProfile.department_id;
    
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('department_id', deptId);
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error getting department courses:', error);
    throw error;
  }
};

/**
 * Assign a teacher to a course
 */
export const assignTeacherToCourse = async (teacherId, courseId) => {
  try {
    const { data, error } = await supabase
      .from('teacher_courses')
      .insert({
        teacher_id: teacherId,
        course_id: courseId
      });
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error assigning teacher to course:', error);
    throw error;
  }
};

/**
 * Enroll a student in a course
 */
export const enrollStudentInCourse = async (studentId, courseId) => {
  try {
    const { data, error } = await supabase
      .from('student_courses')
      .insert({
        student_id: studentId,
        course_id: courseId
      });
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error enrolling student in course:', error);
    throw error;
  }
};

/**
 * Get student marks
 */
export const getStudentMarks = async (studentId = null, courseId = null) => {
  try {
    const currentProfile = await getCurrentUserProfile();
    
    if (!currentProfile) {
      throw new Error('You must be logged in to view marks');
    }
    
    let query = supabase
      .from('marks')
      .select(`
        *,
        courses(*),
        student:profiles!student_id(*),
        created_by:profiles!created_by(*),
        updated_by:profiles!updated_by(*)
      `);
    
    // If viewing as a student, only show their own marks
    if (currentProfile.role === USER_ROLES.STUDENT) {
      query = query.eq('student_id', currentProfile.id);
    } 
    // If viewing as a teacher, only show marks for their courses
    else if (currentProfile.role === USER_ROLES.TEACHER) {
      const { data: teacherCourses } = await supabase
        .from('teacher_courses')
        .select('course_id')
        .eq('teacher_id', currentProfile.id);
      
      const courseIds = teacherCourses.map(tc => tc.course_id);
      query = query.in('course_id', courseIds);
    }
    
    // Apply additional filters if provided
    if (studentId) {
      query = query.eq('student_id', studentId);
    }
    
    if (courseId) {
      query = query.eq('course_id', courseId);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error getting student marks:', error);
    throw error;
  }
};

/**
 * Add or update a student mark
 */
export const saveStudentMark = async (markData) => {
  try {
    const currentProfile = await getCurrentUserProfile();
    
    if (!currentProfile) {
      throw new Error('You must be logged in to manage marks');
    }
    
    if (currentProfile.role !== USER_ROLES.TEACHER) {
      throw new Error('Only teachers can manage marks');
    }
    
    const { studentId, courseId, assessmentName, score, maxScore } = markData;
    
    // Check if the mark already exists
    const { data: existingMarks } = await supabase
      .from('marks')
      .select('id')
      .eq('student_id', studentId)
      .eq('course_id', courseId)
      .eq('assessment_name', assessmentName);
    
    let result;
    
    if (existingMarks && existingMarks.length > 0) {
      // Update existing mark
      const { data, error } = await supabase
        .from('marks')
        .update({
          score,
          max_score: maxScore,
          updated_by: currentProfile.id
        })
        .eq('id', existingMarks[0].id);
      
      if (error) throw error;
      result = data;
    } else {
      // Insert new mark
      const { data, error } = await supabase
        .from('marks')
        .insert({
          student_id: studentId,
          course_id: courseId,
          assessment_name: assessmentName,
          score,
          max_score: maxScore,
          created_by: currentProfile.id,
          updated_by: currentProfile.id
        });
      
      if (error) throw error;
      result = data;
    }
    
    return result;
  } catch (error) {
    console.error('Error saving student mark:', error);
    throw error;
  }
}; 