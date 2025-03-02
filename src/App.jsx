import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { ChakraProvider, extendTheme } from '@chakra-ui/react';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import About from './pages/About';
import Academics from './pages/Academics';
import Admissions from './pages/Admissions';
import Research from './pages/Research';
import Login from './pages/Login';
import ChatbotPage from './pages/ChatbotPage';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import BlogPage from './pages/BlogPage';
import BlogPostPage from './pages/BlogPostPage';
import Signup from './pages/Signup';
import AdminPortal from './pages/AdminPortal';
import ProgramManagerDashboard from './pages/ProgramManagerDashboard';
import ProtectedRoleRoute from './components/ProtectedRoleRoute';
import StudentDashboard from './pages/StudentDashboard';
import TeacherDashboard from './pages/TeacherDashboard';

const theme = extendTheme({
  colors: {
    szabist: {
      50: '#e3f2fd',
      100: '#bbdefb',
      200: '#90caf9',
      300: '#64b5f6',
      400: '#42a5f5',
      500: '#2196f3',
      600: '#1e88e5',
      700: '#1976d2',
      800: '#1565c0',
      900: '#0d47a1',
    },
  },
  fonts: {
    heading: 'Poppins, sans-serif',
    body: 'Open Sans, sans-serif',
  },
});

// Wrapper component to access the location
function AppContent() {
  const location = useLocation();

  return (
    <>
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/academics" element={<Academics />} />
        <Route path="/admissions" element={<Admissions />} />
        <Route path="/research" element={<Research />} />
        <Route path="/login" element={<Login />} />
        <Route path="/chatbot" element={<ChatbotPage />} />
        <Route path="/blog" element={<BlogPage />} />
        <Route path="/blog/:id" element={<BlogPostPage />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/admin" element={
          <ProtectedRoleRoute allowedRoles={['admin']}>
            <AdminPortal />
          </ProtectedRoleRoute>
        }/>
        <Route path="/pm-dashboard" element={
          <ProtectedRoleRoute allowedRoles={['program_manager']}>
            <ProgramManagerDashboard />
          </ProtectedRoleRoute>
        }/>
        <Route path="/student-dashboard" element={
          <ProtectedRoleRoute allowedRoles={['student']}>
            <StudentDashboard />
          </ProtectedRoleRoute>
        }/>
        <Route path="/teacher-dashboard" element={
          <ProtectedRoleRoute allowedRoles={['teacher']}>
            <TeacherDashboard />
          </ProtectedRoleRoute>
        }/>
        <Route path="/portal-redirect" element={
          <ProtectedRoute>
            <PortalRedirectHandler />
          </ProtectedRoute>
        }/>
      </Routes>
      {/* Conditionally render Footer */}
      {location.pathname !== '/chatbot' && <Footer />}
    </>
  );
}

function PortalRedirectHandler() {
  const { user } = useAuth();
  return (
    <Navigate to={
      user?.role === 'admin' ? '/admin' :
      user?.role === 'student' ? '/student-dashboard' :
      user?.role === 'teacher' ? '/teacher-dashboard' : 
      '/pm-dashboard'
    } replace />
  );
}

function App() {
  return (
    <ChakraProvider theme={theme}>
      <Router>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </Router>
    </ChakraProvider>
  );
}

export default App;