import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import DoctorForm from '../components/DoctorForm';
import { Menu } from 'lucide-react';
import Doctor from '../components/Doctors';
import LetterheadBuilder from '../components/Doctor/LetterheadForm';
import Builder from '../components/Doctor/Builder'

// Ek dummy component Dr. Data ke liye (Aap yahan apni list dikha sakte hain)
const DoctorsDataList = () => <div className="p-10 bg-white rounded-3xl border border-slate-100 shadow-sm"><h1>All Doctors List will appear here...</h1></div>;

const AdminDashboard = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <div className="flex min-h-screen bg-[#f8fafc]">

      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-[90] lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}

      {/* Sidebar Component - Passing State to control mobile close */}
      <Sidebar isOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />

      <div className="flex-1 flex flex-col min-w-0">

        {/* Top Header Section */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center px-4 lg:px-8 sticky top-0 z-40">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
          >
            <Menu size={24} />
          </button>

          <h1 className="ml-4 font-bold text-slate-700 uppercase text-[10px] tracking-[2px]">
            Super Admin Panel
          </h1>
        </header>

        {/* Page Content - Rendering based on URL */}
        <main className="flex-1 p-6 lg:p-10 overflow-y-auto">
          <Routes>
            {/* Default redirect inside admin */}
            <Route path="/" element={<Navigate to="Admindashboard" replace />} />

            {/* Dashboard Content */}
            <Route path="Admindashboard" element={
              <div className="p-10 bg-white rounded-3xl border border-slate-100 shadow-sm inline-block">
                <h1 className="text-2xl font-bold text-slate-800 italic">Welcome to DocEdge Dashboard!</h1>
                <p className="text-slate-500 mt-2">Manage your clinics and doctors efficiently.</p>
              </div>
            } />

            {/* Doctor Form Content */}
            <Route path="add-doctor" element={<DoctorForm />} />

            {/* Doctors Data Content */}
            <Route path="doctors-data" element={<Doctor />} />
            <Route path="setup-letterhead/:slug" element={<LetterheadBuilder />} />
            <Route path="setup-form/:slug" element={<Builder />} />



          </Routes>
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;