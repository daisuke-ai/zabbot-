import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  getCurrentUserProfile, 
  getDepartmentCourses,
  getUsersByRole,
  getStudentMarks,
  saveStudentMark,
  USER_ROLES 
} from '../services/userService';

const MarksManagement = () => {
  const { user } = useAuth();
  const [currentProfile, setCurrentProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Data state
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [marks, setMarks] = useState([]);
  
  // Filter state
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');
  
  // Form state
  const [formData, setFormData] = useState({
    studentId: '',
    courseId: '',
    assessmentName: '',
    score: '',
    maxScore: '100'
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
          
          // Get students for the department
          const studentsList = await getUsersByRole(USER_ROLES.STUDENT, profile.department_id);
          setStudents(studentsList);
          
          // Get marks (will be filtered by the API based on user role)
          const marksList = await getStudentMarks();
          setMarks(marksList);
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
  
  // Handle form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Handle filter changes
  const handleFilterChange = async (e) => {
    const { name, value } = e.target;
    
    try {
      setLoading(true);
      
      if (name === 'selectedCourse') {
        setSelectedCourse(value);
      } else if (name === 'selectedStudent') {
        setSelectedStudent(value);
      }
      
      // Reload marks with filters
      const marksList = await getStudentMarks(
        name === 'selectedStudent' ? value : selectedStudent,
        name === 'selectedCourse' ? value : selectedCourse
      );
      
      setMarks(marksList);
      
    } catch (err) {
      console.error('Error filtering marks:', err);
      setError('Failed to filter marks. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      // Validate form
      if (!formData.studentId || !formData.courseId || !formData.assessmentName || !formData.score || !formData.maxScore) {
        setError('All fields are required');
        return;
      }
      
      // Validate score
      const score = parseFloat(formData.score);
      const maxScore = parseFloat(formData.maxScore);
      
      if (isNaN(score) || isNaN(maxScore)) {
        setError('Score and Max Score must be numbers');
        return;
      }
      
      if (score < 0 || score > maxScore) {
        setError(`Score must be between 0 and ${maxScore}`);
        return;
      }
      
      // Save mark
      await saveStudentMark({
        studentId: formData.studentId,
        courseId: formData.courseId,
        assessmentName: formData.assessmentName,
        score,
        maxScore
      });
      
      // Clear form
      setFormData({
        studentId: '',
        courseId: '',
        assessmentName: '',
        score: '',
        maxScore: '100'
      });
      
      // Show success message
      setSuccess('Mark saved successfully');
      
      // Reload marks
      const marksList = await getStudentMarks(selectedStudent, selectedCourse);
      setMarks(marksList);
      
    } catch (err) {
      console.error('Error saving mark:', err);
      setError(err.message || 'Failed to save mark. Please try again.');
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
  
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Marks Management</h1>
      
      {/* Filters */}
      <div className="bg-white p-4 rounded shadow mb-6">
        <h2 className="text-xl font-semibold mb-4">Filter Marks</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block mb-1">Course</label>
            <select
              name="selectedCourse"
              value={selectedCourse}
              onChange={handleFilterChange}
              className="w-full p-2 border rounded"
            >
              <option value="">All Courses</option>
              {courses.map(course => (
                <option key={course.id} value={course.id}>
                  {course.code} - {course.name}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block mb-1">Student</label>
            <select
              name="selectedStudent"
              value={selectedStudent}
              onChange={handleFilterChange}
              className="w-full p-2 border rounded"
            >
              <option value="">All Students</option>
              {students.map(student => (
                <option key={student.id} value={student.id}>
                  {student.first_name} {student.last_name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
      
      {/* Add/Edit Mark Form (Only for Teachers) */}
      {currentProfile.role === USER_ROLES.TEACHER && (
        <div className="bg-white p-4 rounded shadow mb-6">
          <h2 className="text-xl font-semibold mb-4">Add/Edit Mark</h2>
          
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
          
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block mb-1">Student</label>
                <select
                  name="studentId"
                  value={formData.studentId}
                  onChange={handleChange}
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
                  value={formData.courseId}
                  onChange={handleChange}
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
              
              <div>
                <label className="block mb-1">Assessment Name</label>
                <input
                  type="text"
                  name="assessmentName"
                  value={formData.assessmentName}
                  onChange={handleChange}
                  className="w-full p-2 border rounded"
                  placeholder="e.g. Midterm, Final, Assignment 1"
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block mb-1">Score</label>
                  <input
                    type="number"
                    name="score"
                    value={formData.score}
                    onChange={handleChange}
                    className="w-full p-2 border rounded"
                    min="0"
                    max={formData.maxScore}
                    step="0.01"
                    required
                  />
                </div>
                
                <div>
                  <label className="block mb-1">Max Score</label>
                  <input
                    type="number"
                    name="maxScore"
                    value={formData.maxScore}
                    onChange={handleChange}
                    className="w-full p-2 border rounded"
                    min="1"
                    step="0.01"
                    required
                  />
                </div>
              </div>
            </div>
            
            <div className="mt-4">
              <button
                type="submit"
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save Mark'}
              </button>
            </div>
          </form>
        </div>
      )}
      
      {/* Marks Table */}
      <div className="bg-white p-4 rounded shadow">
        <h2 className="text-xl font-semibold mb-4">Marks</h2>
        
        {marks.length === 0 ? (
          <p>No marks found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white">
              <thead>
                <tr>
                  <th className="py-2 px-4 border-b text-left">Student</th>
                  <th className="py-2 px-4 border-b text-left">Course</th>
                  <th className="py-2 px-4 border-b text-left">Assessment</th>
                  <th className="py-2 px-4 border-b text-left">Score</th>
                  <th className="py-2 px-4 border-b text-left">Percentage</th>
                  {currentProfile.role !== USER_ROLES.STUDENT && (
                    <th className="py-2 px-4 border-b text-left">Last Updated</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {marks.map(mark => (
                  <tr key={mark.id}>
                    <td className="py-2 px-4 border-b">
                      {mark.student?.first_name} {mark.student?.last_name}
                    </td>
                    <td className="py-2 px-4 border-b">
                      {mark.courses?.code} - {mark.courses?.name}
                    </td>
                    <td className="py-2 px-4 border-b">{mark.assessment_name}</td>
                    <td className="py-2 px-4 border-b">
                      {mark.score} / {mark.max_score}
                    </td>
                    <td className="py-2 px-4 border-b">
                      {((mark.score / mark.max_score) * 100).toFixed(2)}%
                    </td>
                    {currentProfile.role !== USER_ROLES.STUDENT && (
                      <td className="py-2 px-4 border-b">
                        {new Date(mark.updated_at).toLocaleString()}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default MarksManagement; 