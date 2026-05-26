import React from 'react';
import { LayoutDashboard, Users, LogOut, Stethoscope } from 'lucide-react';
import { NavLink } from 'react-router-dom';

const Sidebar = ({ isOpen, setIsSidebarOpen }) => {
  const handleLogout = () => {
    localStorage.clear();
    window.location.href = '/admin/login';
  };

  // NavLink ki active styling ka common function
  const navLinkClass = ({ isActive }) => `
    w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all
    ${isActive 
      ? 'text-blue-500 font-bold bg-blue-50/50 border-r-4 border-blue-500' 
      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}
  `;

  return (
    <aside className={`
      h-screen bg-white border-r border-slate-100 shadow-xl lg:shadow-none 
      transition-all duration-300 ease-in-out z-[100] overflow-hidden
      fixed top-0 left-0 
      ${isOpen ? 'w-72 translate-x-0' : 'w-0 -translate-x-full lg:translate-x-0'}
      lg:sticky lg:top-0
      ${isOpen ? 'lg:w-72' : 'lg:w-0'}
    `}>

      <div className="w-72 flex flex-col h-full">
        <div className="p-8">
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">
            DocEdge<span className="text-blue-500">+</span>
          </h2>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          {/* Dashboard Link */}
          <NavLink 
            to="/admin/Admindashboard" 
            className={navLinkClass}
            onClick={() => window.innerWidth < 1024 && setIsSidebarOpen(false)}
          >
            <LayoutDashboard size={20} /> <span className="text-sm">Dashboard</span>
          </NavLink>

          {/* Add Doctor Link */}
          <NavLink 
            to="/admin/add-doctor" 
            className={navLinkClass}
            onClick={() => window.innerWidth < 1024 && setIsSidebarOpen(false)}
          >
            <Users size={20} /> <span className="text-sm">Add New Doctor</span>
          </NavLink>

          {/* Doctors Data Link */}
          <NavLink 
            to="/admin/doctors-data" 
            className={navLinkClass}
            onClick={() => window.innerWidth < 1024 && setIsSidebarOpen(false)}
          >
            <Stethoscope size={20} /> <span className="text-sm">Dr. Data (All Clinics)</span>
          </NavLink>
        </nav>

        <div className="p-6 border-t border-slate-50">
          <button onClick={handleLogout} className="w-full flex items-center gap-4 text-slate-400 hover:text-red-500 transition-colors px-4 group">
            <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" /> 
            <span className="text-xs font-bold uppercase tracking-widest">Logout</span>
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;