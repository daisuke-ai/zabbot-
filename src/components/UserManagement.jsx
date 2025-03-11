import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  createUserAccount, 
  getCurrentUserProfile, 
  getAllDepartments, 
  getUsersByRole,
  USER_ROLES 
} from '../services/userService';

const UserManagement = () => {
  const { user } = useAuth();
  const [currentProfile, setCurrentProfile] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    role: '',
    departmentId: ''
  });
  
  // Users list state
  const [pms, setPms] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  
  // Load current user profile and departments
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);
        
        // Get current user profile
        const profile = await getCurrentUserProfile();
        setCurrentProfile(profile);
        
        // Get all departments
        const depts = await getAllDepartments();
        setDepartments(depts);
        
        // Set default department if user has one
        if (profile && profile.department_id) {
          setFormData(prev => ({
            ...prev,
            departmentId: profile.department_id
          }));
        }
        
        // Load users based on role
        if (profile) {
          if (profile.role === USER_ROLES.HOD) {
            const pmList = await getUsersByRole(USER_ROLES.PM, profile.department_id);
            setPms(pmList);
          } else if (profile.role === USER_ROLES.PM) {
            const teacherList = await getUsersByRole(USER_ROLES.TEACHER, profile.department_id);
            setTeachers(teacherList);
            
            const studentList = await getUsersByRole(USER_ROLES.STUDENT, profile.department_id);
            setStudents(studentList);
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
  
  // Handle form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      // Validate form
      if (!formData.email || !formData.password || !formData.firstName || !formData.lastName || !formData.role) {
        setError('All fields are required');
        return;
      }
      
      // Create user account
      await createUserAccount(formData);
      
      // Clear form
      setFormData({
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        role: '',
        departmentId: currentProfile?.department_id || ''
      });
      
      // Show success message
      setSuccess('User created successfully');
      
      // Reload users list
      if (currentProfile.role === USER_ROLES.HOD) {
        const pmList = await getUsersByRole(USER_ROLES.PM, currentProfile.department_id);
        setPms(pmList);
      } else if (currentProfile.role === USER_ROLES.PM) {
        if (formData.role === USER_ROLES.TEACHER) {
          const teacherList = await getUsersByRole(USER_ROLES.TEACHER, currentProfile.department_id);
          setTeachers(teacherList);
        } else if (formData.role === USER_ROLES.STUDENT) {
          const studentList = await getUsersByRole(USER_ROLES.STUDENT, currentProfile.department_id);
          setStudents(studentList);
        }
      }
      
    } catch (err) {
      console.error('Error creating user:', err);
      setError(err.message || 'Failed to create user. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Determine which roles the current user can create
  const getAvailableRoles = () => {
    if (!currentProfile) return [];
    
    switch (currentProfile.role) {
      case USER_ROLES.HOD:
        return [{ value: USER_ROLES.PM, label: 'Program Manager' }];
      case USER_ROLES.PM:
        return [
          { value: USER_ROLES.TEACHER, label: 'Teacher' },
          { value: USER_ROLES.STUDENT, label: 'Student' }
        ];
      default:
        return [];
    }
  };
  
  if (loading && !currentProfile) {
    return <div className="p-4">Loading...</div>;
  }
  
  if (!user || !currentProfile) {
    return <div className="p-4">Please log in to access this page.</div>;
  }
  
  // Only HOD and PM can access this page
  if (currentProfile.role !== USER_ROLES.HOD && currentProfile.role !== USER_ROLES.PM) {
    return <div className="p-4">You do not have permission to access this page.</div>;
  }
  
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">User Management</h1>
      
      {/* Create User Form */}
      <div className="bg-white p-4 rounded shadow mb-6">
        <h2 className="text-xl font-semibold mb-4">Create New User</h2>
        
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
              <label className="block mb-1">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full p-2 border rounded"
                required
              />
            </div>
            
            <div>
              <label className="block mb-1">Password</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full p-2 border rounded"
                required
              />
            </div>
            
            <div>
              <label className="block mb-1">First Name</label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                className="w-full p-2 border rounded"
                required
              />
            </div>
            
            <div>
              <label className="block mb-1">Last Name</label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                className="w-full p-2 border rounded"
                required
              />
            </div>
            
            <div>
              <label className="block mb-1">Role</label>
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="w-full p-2 border rounded"
                required
              >
                <option value="">Select Role</option>
                {getAvailableRoles().map(role => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
            </div>
            
            {currentProfile.role === USER_ROLES.HOD && (
              <div>
                <label className="block mb-1">Department</label>
                <select
                  name="departmentId"
                  value={formData.departmentId}
                  onChange={handleChange}
                  className="w-full p-2 border rounded"
                  required
                >
                  <option value="">Select Department</option>
                  {departments.map(dept => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          
          <div className="mt-4">
            <button
              type="submit"
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
      
      {/* User Lists */}
      {currentProfile.role === USER_ROLES.HOD && (
        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-xl font-semibold mb-4">Program Managers</h2>
          
          {pms.length === 0 ? (
            <p>No program managers found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white">
                <thead>
                  <tr>
                    <th className="py-2 px-4 border-b text-left">Name</th>
                    <th className="py-2 px-4 border-b text-left">Email</th>
                    <th className="py-2 px-4 border-b text-left">Department</th>
                  </tr>
                </thead>
                <tbody>
                  {pms.map(pm => (
                    <tr key={pm.id}>
                      <td className="py-2 px-4 border-b">{`${pm.first_name} ${pm.last_name}`}</td>
                      <td className="py-2 px-4 border-b">{pm.email}</td>
                      <td className="py-2 px-4 border-b">{pm.departments?.name || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      
      {currentProfile.role === USER_ROLES.PM && (
        <>
          <div className="bg-white p-4 rounded shadow mb-6">
            <h2 className="text-xl font-semibold mb-4">Teachers</h2>
            
            {teachers.length === 0 ? (
              <p>No teachers found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white">
                  <thead>
                    <tr>
                      <th className="py-2 px-4 border-b text-left">Name</th>
                      <th className="py-2 px-4 border-b text-left">Email</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teachers.map(teacher => (
                      <tr key={teacher.id}>
                        <td className="py-2 px-4 border-b">{`${teacher.first_name} ${teacher.last_name}`}</td>
                        <td className="py-2 px-4 border-b">{teacher.email}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          
          <div className="bg-white p-4 rounded shadow">
            <h2 className="text-xl font-semibold mb-4">Students</h2>
            
            {students.length === 0 ? (
              <p>No students found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white">
                  <thead>
                    <tr>
                      <th className="py-2 px-4 border-b text-left">Name</th>
                      <th className="py-2 px-4 border-b text-left">Email</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map(student => (
                      <tr key={student.id}>
                        <td className="py-2 px-4 border-b">{`${student.first_name} ${student.last_name}`}</td>
                        <td className="py-2 px-4 border-b">{student.email}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default UserManagement; 