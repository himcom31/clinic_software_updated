import React from 'react';
import { Routes, Route, Navigate } from "react-router-dom";

// Pages aur Components import
import LoginPage from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import Doctors from './components/Doctors';
import DoctorLogin from './pages/DoctorLogin';
import DoctorDashboard from './components/Doctor/DoctorDashboard';
import StaffLogin from './pages/StaffLogin';
// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('adminToken');
  if (!token) {
    return <Navigate to="admin/login" replace />;
  }
  return children;
};

const DoctorProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('doctorToken'); // Doctor ke liye alag token
  const staffToken = localStorage.getItem('staffToken');
  if (!token && !staffToken) {
    // Agar token nahi hai, toh usi clinic ke login page pe wapas bhej do
    const slug = window.location.pathname.split('/')[1]; 
    return <Navigate to={`/${slug}/login`} replace />;
  }
  return children;
};

function App() {

  
  return (
    <div className="App">
      <Routes>
        {/* 1. Default Route */}
        <Route path="/" element={<Navigate to="admin/login" replace />} />

        {/* 2. Public Routes */}
        <Route path="admin/login" element={<LoginPage />} />
        
        {/* Agar ye Doctors page dashboard se bahar hai toh thik hai */}
        <Route path="/doctors" element={<Doctors />} />

        {/* 3. Protected Admin Routes 🔥 (Note the '/*' at the end) */}
        <Route
          path="/admin/*" 
          element={
            <ProtectedRoute>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        {/* --- 3. 🔥 DOCTOR PORTAL DYNAMIC ROUTES 🔥 --- */}
        <Route path="/:slug/login" element={<DoctorLogin />} />
                <Route path="/:slug/staff-login" element={<StaffLogin />} />


        {/* Doctor Dashboard (e.g. /chaudhary-web-clinic/dashboard) */}
        <Route
          path="/:slug/dashboard/*"
          element={
            <DoctorProtectedRoute>
               <DoctorDashboard /> 
            </DoctorProtectedRoute>
          }
        />

        {/* 4. 404 Page */}
        <Route path="*" element={<div className="flex items-center justify-center h-screen font-bold text-2xl text-slate-400">404 - Page Not Found</div>} />
      </Routes>
    </div>
  );
}

export default App;




  