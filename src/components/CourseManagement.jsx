import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  getCurrentUserProfile, 
  getDepartmentCourses,
  getUsersByRole,
  assignTeacherToCourse,
  enrollStudentInCourse,
  USER_ROLES 
} from '../services/userService';
import { supabase } from '../services/supabaseService';

const CourseManagement = () => {
  const { user } = useAuth();
  const [currentProfile, setCurrentProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Data state
  const [courses, setCourses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [teacherCourses, setTeacherCourses] = useState([]);
  const [studentCourses, setStudentCourses] = useState([]);
  
  // Form state
  const [courseForm, setCourseForm] = useState({
    code: '',
    name: '',
    departmentId: ''
  });
  
  const [assignForm, setAssignForm] = useState({
    teacherId: '',
    courseId: ''
  });
  
  const [enrollForm, setEnrollForm] = useState({
    studentId: '',
    courseId: ''
  });
  
  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);
        
        // Get current user profile
        const profile = await getCurrentUserProfile();
        setCurrentProfile(profile);
        
        if (profile) {
          // Get courses for the department
          const coursesList = await getDepartmentCourses(profile.department_id);
          setCourses(coursesList);
          
          // Set default department ID for course creation
          setCourseForm(prev => ({
            ...prev,
            departmentId: profile.department_id
          }));
          
          // Only load teachers and students if user is PM
          if (profile.role === USER_ROLES.PM) {
            // Get teachers for the department
            const teachersList = await getUsersByRole(USER_ROLES.TEACHER, profile.department_id);
            setTeachers(teachersList);
            
            // Get students for the department
            const studentsList = await getUsersByRole(USER_ROLES.STUDENT, profile.department_id);
            setStudents(studentsList);
            
            // Get teacher-course assignments
            const { data: teacherCoursesData, error: teacherCoursesError } = await supabase
              .from('teacher_courses')
              .select('*, teacher:profiles(*), course:courses(*)')
              .eq('course.department_id', profile.department_id);
            
            if (!teacherCoursesError) {
              setTeacherCourses(teacherCoursesData);
            }
            
            // Get student enrollments
            const { data: studentCoursesData, error: studentCoursesError } = await supabase
              .from('student_courses')
              .select('*, student:profiles(*), course:courses(*)')
              .eq('course.department_id', profile.department_id);
            
            if (!studentCoursesError) {
              setStudentCourses(studentCoursesData);
            }
          }
        }
        
      } catch (err) {
        console.error('Error loading initial data:', err);
        setError('Failed to load data. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    if (user) {
      loadInitialData();
    }
  }, [user]);
  
  // Handle course form input changes
  const handleCourseFormChange = (e) => {
    const { name, value } = e.target;
    setCourseForm(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Handle assign form input changes
  const handleAssignFormChange = (e) => {
    const { name, value } = e.target;
    setAssignForm(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Handle enroll form input changes
  const handleEnrollFormChange = (e) => {
    const { name, value } = e.target;
    setEnrollForm(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Handle course form submission
  const handleCourseSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      // Validate form
      if (!courseForm.code || !courseForm.name || !courseForm.departmentId) {
        setError('All fields are required');
        return;
      }
      
      // Create course
      const { data, error } = await supabase
        .from('courses')
        .insert({
          code: courseForm.code,
          name: courseForm.name,
          department_id: courseForm.departmentId
        });
      
      if (error) throw error;
      
      // Clear form
      setCourseForm({
        code: '',
        name: '',
        departmentId: currentProfile.department_id
      });
      
      // Show success message
      setSuccess('Course created successfully');
      
      // Reload courses
      const coursesList = await getDepartmentCourses(currentProfile.department_id);
      setCourses(coursesList);
      
    } catch (err) {
      console.error('Error creating course:', err);
      setError(err.message || 'Failed to create course. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle assign form submission
  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      // Validate form
      if (!assignForm.teacherId || !assignForm.courseId) {
        setError('All fields are required');
        return;
      }
      
      // Check if teacher is already assigned to this course
      const isAlreadyAssigned = teacherCourses.some(
        tc => tc.teacher_id === assignForm.teacherId && tc.course_id === assignForm.courseId
      );
      
      if (isAlreadyAssigned) {
        setError('Teacher is already assigned to this course');
        return;
      }
      
      // Assign teacher to course
      await assignTeacherToCourse(assignForm.teacherId, assignForm.courseId);
      
      // Clear form
      setAssignForm({
        teacherId: '',
        courseId: ''
      });
      
      // Show success message
      setSuccess('Teacher assigned to course successfully');
      
      // Reload teacher-course assignments
      const { data: teacherCoursesData } = await supabase
        .from('teacher_courses')
        .select('*, teacher:profiles(*), course:courses(*)')
        .eq('course.department_id', currentProfile.department_id);
      
      setTeacherCourses(teacherCoursesData);
      
    } catch (err) {
      console.error('Error assigning teacher to course:', err);
      setError(err.message || 'Failed to assign teacher to course. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle enroll form submission
  const handleEnrollSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      // Validate form
      if (!enrollForm.studentId || !enrollForm.courseId) {
        setError('All fields are required');
        return;
      }
      
      // Check if student is already enrolled in this course
      const isAlreadyEnrolled = studentCourses.some(
        sc => sc.student_id === enrollForm.studentId && sc.course_id === enrollForm.courseId
      );
      
      if (isAlreadyEnrolled) {
        setError('Student is already enrolled in this course');
        return;
      }
      
      // Enroll student in course
      await enrollStudentInCourse(enrollForm.studentId, enrollForm.courseId);
      
      // Clear form
      setEnrollForm({
        studentId: '',
        courseId: ''
      });
      
      // Show success message
      setSuccess('Student enrolled in course successfully');
      
      // Reload student enrollments
      const { data: studentCoursesData } = await supabase
        .from('student_courses')
        .select('*, student:profiles(*), course:courses(*)')
        .eq('course.department_id', currentProfile.department_id);
      
      setStudentCourses(studentCoursesData);
      
    } catch (err) {
      console.error('Error enrolling student in course:', err);
      setError(err.message || 'Failed to enroll student in course. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  if (loading && !currentProfile) {
    return <div className="p-4">Loading...</div>;
  }
  
  if (!user || !currentProfile) {
    return <div className="p-4">Please log in to access this page.</div>;
  }
  
  // Only PM can access full course management
  const isPM = currentProfile.role === USER_ROLES.PM;
  
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Course Management</h1>
      
      {/* Course List */}
      <div className="bg-white p-4 rounded shadow mb-6">
        <h2 className="text-xl font-semibold mb-4">Courses</h2>
        
        {courses.length === 0 ? (
          <p>No courses found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white">
              <thead>
                <tr>
                  <th className="py-2 px-4 border-b text-left">Code</th>
                  <th className="py-2 px-4 border-b text-left">Name</th>
                </tr>
              </thead>
              <tbody>
                {courses.map(course => (
                  <tr key={course.id}>
                    <td className="py-2 px-4 border-b">{course.code}</td>
                    <td className="py-2 px-4 border-b">{course.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      {/* Create Course Form (Only for PM) */}
      {isPM && (
        <div className="bg-white p-4 rounded shadow mb-6">
          <h2 className="text-xl font-semibold mb-4">Create New Course</h2>
          
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}
          
          {success && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
              {success}
            </div>
          )}
          
          <form onSubmit={handleCourseSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block mb-1">Course Code</label>
                <input
                  type="text"
                  name="code"
                  value={courseForm.code}
                  onChange={handleCourseFormChange}
                  className="w-full p-2 border rounded"
                  placeholder="e.g. CS101"
                  required
                />
              </div>
              
              <div>
                <label className="block mb-1">Course Name</label>
                <input
                  type="text"
                  name="name"
                  value={courseForm.name}
                  onChange={handleCourseFormChange}
                  className="w-full p-2 border rounded"
                  placeholder="e.g. Introduction to Computer Science"
                  required
                />
              </div>
            </div>
            
            <div className="mt-4">
              <button
                type="submit"
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                disabled={loading}
              >
                {loading ? 'Creating...' : 'Create Course'}
              </button>
            </div>
          </form>
        </div>
      )}
      
      {/* Assign Teacher to Course (Only for PM) */}
      {isPM && (
        <div className="bg-white p-4 rounded shadow mb-6">
          <h2 className="text-xl font-semibold mb-4">Assign Teacher to Course</h2>
          
          <form onSubmit={handleAssignSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block mb-1">Teacher</label>
                <select
                  name="teacherId"
                  value={assignForm.teacherId}
                  onChange={handleAssignFormChange}
                  className="w-full p-2 border rounded"
                  required
                >
                  <option value="">Select Teacher</option>
                  {teachers.map(teacher => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.first_name} {teacher.last_name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block mb-1">Course</label>
                <select
                  name="courseId"
                  value={assignForm.courseId}
                  onChange={handleAssignFormChange}
                  className="w-full p-2 border rounded"
                  required
                >
                  <option value="">Select Course</option>
                  {courses.map(course => (
                    <option key={course.id} value={course.id}>
                      {course.code} - {course.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="mt-4">
              <button
                type="submit"
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                disabled={loading}
              >
                {loading ? 'Assigning...' : 'Assign Teacher'}
              </button>
            </div>
          </form>
          
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-2">Current Teacher Assignments</h3>
            
            {teacherCourses.length === 0 ? (
              <p>No teacher assignments found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white">
                  <thead>
                    <tr>
                      <th className="py-2 px-4 border-b text-left">Teacher</th>
                      <th className="py-2 px-4 border-b text-left">Course</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teacherCourses.map(tc => (
                      <tr key={tc.id}>
                        <td className="py-2 px-4 border-b">
                          {tc.teacher?.first_name} {tc.teacher?.last_name}
                        </td>
                        <td className="py-2 px-4 border-b">
                          {tc.course?.code} - {tc.course?.name}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Enroll Student in Course (Only for PM) */}
      {isPM && (
        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-xl font-semibold mb-4">Enroll Student in Course</h2>
          
          <form onSubmit={handleEnrollSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block mb-1">Student</label>
                <select
                  name="studentId"
                  value={enrollForm.studentId}
                  onChange={handleEnrollFormChange}
                  className="w-full p-2 border rounded"
                  required
                >
                  <option value="">Select Student</option>
                  {students.map(student => (
                    <option key={student.id} value={student.id}>
                      {student.first_name} {student.last_name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block mb-1">Course</label>
                <select
                  name="courseId"
                  value={enrollForm.courseId}
                  onChange={handleEnrollFormChange}
                  className="w-full p-2 border rounded"
                  required
                >
                  <option value="">Select Course</option>
                  {courses.map(course => (
                    <option key={course.id} value={course.id}>
                      {course.code} - {course.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="mt-4">
              <button
                type="submit"
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                disabled={loading}
              >
                {loading ? 'Enrolling...' : 'Enroll Student'}
              </button>
            </div>
          </form>
          
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-2">Current Student Enrollments</h3>
            
            {studentCourses.length === 0 ? (
              <p>No student enrollments found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white">
                  <thead>
                    <tr>
                      <th className="py-2 px-4 border-b text-left">Student</th>
                      <th className="py-2 px-4 border-b text-left">Course</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentCourses.map(sc => (
                      <tr key={sc.id}>
                        <td className="py-2 px-4 border-b">
                          {sc.student?.first_name} {sc.student?.last_name}
                        </td>
                        <td className="py-2 px-4 border-b">
                          {sc.course?.code} - {sc.course?.name}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseManagement; 