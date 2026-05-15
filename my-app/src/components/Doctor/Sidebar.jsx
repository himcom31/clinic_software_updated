import { useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  LayoutDashboard, Settings, Palette, LayoutTemplate,
  Users, Calendar, PlusCircle, Search, Microscope,
  Library, Receipt, BarChart3, UserCog, Sparkles,
  CreditCard, UserCircle, HelpCircle, LogOut, ChevronLeft,
  Menu, X, ShieldCheck, ChevronDown, User, Globe,Thermometer
} from "lucide-react";

export default function Sidebar() {
  const { slug } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const staffInfo = JSON.parse(localStorage.getItem('staffInfo')) || null;
  const isDoctor = localStorage.getItem('doctorToken') !== null;

  const isActive = (path) => location.pathname === path;

  // --- PERMISSION MAPPING ---
  const permissionMap = {
    "Patients": "canAddPatients",
    "Appointments": "canManageAppointments",
    "Billing": "canEditBilling",
    "Reports": "canViewReports",
    "New Prescription": "canAddPrescription",
    "Medicines": "canAddMedicine",
    "Investigations": "canAddTest",
    "Advice Library": "canAddAdvice",
    "Clinic Setup": "doctorOnly",
    "Prescription Designer": "doctorOnly",
    "Staff Management": "doctorOnly",
    "Subscription": "doctorOnly",
    "Consultation Form Builder": "doctorOnly",
    "AI Assistant": "doctorOnly",
    "Account Settings": "doctorOnly",
    "Symptoms": "doctorOnly"
  };

  const menuSections = [
    {
      group: "Main",
      items: [
        { label: "Dashboard", icon: <LayoutDashboard size={18} />, path: `/${slug}/dashboard/main` },
      ]
    },
    {
      group: "Configuration",
      items: [
        { label: "Clinic Setup", icon: <Settings size={18} />, path: `/${slug}/dashboard/settings/details` },
        // { label: "Prescription Designer", icon: <Palette size={18} />, path: `/${slug}/dashboard/settings/letterhead` },
        // { label: "Consultation Form Builder", icon: <LayoutTemplate size={18} />, path: `/${slug}/dashboard/consultation/builder` },
      ]
    },
    {
      group: "Patient Care",
      items: [
        { label: "Patients", icon: <Users size={18} />, path: `/${slug}/dashboard/patients` },
        { label: "Appointments", icon: <Calendar size={18} />, path: `/${slug}/dashboard/appointment` },
        { label: "New Prescription", icon: <PlusCircle size={18} />, path: `/${slug}/dashboard/prescription` },
      ]
    },
    {
      group: "Clinical Tools",
      items: [
        { label: "Medicines", icon: <Search size={18} />, path: `/${slug}/dashboard/medicine` },
        { label: "Investigations", icon: <Microscope size={18} />, path: `/${slug}/dashboard/investigation` },
        { label: "Advice Library", icon: <Library size={18} />, path: `/${slug}/dashboard/advice` },
        { label: "Symptoms", icon: <Thermometer size={18} />, path: `/${slug}/dashboard/symptoms` },
        { label: "Vaccination", icon: <Globe size={18} />, path: `/${slug}/dashboard/vaccination` },

      ]
    },
    {
      group: "Administration",
      items: [
        { label: "Billing", icon: <Receipt size={18} />, path: `/${slug}/dashboard/billing` },
        { label: "Reports", icon: <BarChart3 size={18} />, path: `/${slug}/dashboard/reports` },
        { label: "Staff Management", icon: <UserCog size={18} />, path: `/${slug}/dashboard/staff` },
      ]
    },
    {
      group: "Premium Features",
      items: [
        { label: "AI Assistant", icon: <Sparkles size={18} className="text-amber-500" />, path: `/${slug}/ai-assistant` },
        { label: "Subscription", icon: <CreditCard size={18} />, path: `/${slug}/subscription` },
                { label: "Notifications", icon: <CreditCard size={18} />, path: `/${slug}/dashboard/notification` },


      ]
    },
    {
      group: "System",
      items: [
        {
          label: "Account Settings",
          icon: <UserCircle size={18} />,
          // 🔥 SUB-ITEMS ADDED FOR COLLAPSIBLE MENU 🔥
          subItems: [
            { label: "Doctor Profile", icon: <User size={14} />, path: `/${slug}/dashboard/account` },
            { label: "Clinic Profile", icon: <ShieldCheck size={14} />, path: `/${slug}/dashboard/account/clinic-profile` },
            { label: "System Settings", icon: <Settings size={14} />, path: `/${slug}/dashboard/account/settings` },
          ]
        },
        { label: "Support", icon: <HelpCircle size={18} />, path: `/${slug}/dashboard/support` },
      ]
    }
  ];

  const filteredSections = menuSections.map(section => ({
    ...section,
    items: section.items.filter(item => {
      if (isDoctor) return true;
      const permKey = permissionMap[item.label];
      if (permKey === "doctorOnly") return false;
      if (permKey) return staffInfo?.permissions?.[permKey] === true;
      return true;
    })
  })).filter(section => section.items.length > 0);

  const handleLogout = () => {
    localStorage.clear();
    navigate(`/${slug}/login`);
  };

  return (
    <>
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-white border-b sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">D</div>
          <span className="font-bold text-slate-800 tracking-tighter">DOCEDGE</span>
        </div>
        <button onClick={() => setIsOpen(!isOpen)} className="p-2 hover:bg-slate-100 rounded-full">
          {isOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      <aside className={`
        fixed md:sticky top-0 left-0 h-screen z-40 bg-white border-r border-slate-200 flex flex-col
        transition-all duration-300 ease-in-out
        ${isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        ${isCollapsed ? "w-[80px]" : "w-[280px]"}
      `}>

        {/* LOGO SECTION */}
        <div className="p-6 mb-2 flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="h-10 w-10 bg-gradient-to-tr from-blue-700 to-blue-50 rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-blue-200 ring-2 ring-white">
              <span className="text-white font-black text-xl">D</span>
            </div>
            {!isCollapsed && (
              <div className="flex flex-col">
                <span className="font-extrabold text-slate-900 tracking-tight text-xl leading-none">DOCEDGE</span>
                <span className="text-[10px] text-blue-600 font-bold tracking-widest uppercase mt-1">
                  {isDoctor ? 'Doctor Portal' : 'Staff Portal'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* NAVIGATION AREA */}
        <div className="flex-1 overflow-y-auto px-4 custom-scrollbar space-y-6 pb-6">
          {filteredSections.map((section, sIdx) => (
            <div key={sIdx} className="space-y-1">
              {!isCollapsed && (
                <h3 className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-[2px] mb-2">
                  {section.group}
                </h3>
              )}
              {section.items.map((item, iIdx) => (
                // 🔥 CHECK IF ITEM HAS SUB-ITEMS 🔥
                item.subItems ? (
                  <CollapsibleSidebarItem
                    key={iIdx}
                    icon={item.icon}
                    label={item.label}
                    subItems={item.subItems}
                    isCollapsed={isCollapsed}
                    isActive={isActive}
                  />
                ) : (
                  <SidebarItem
                    key={iIdx}
                    to={item.path}
                    icon={item.icon}
                    label={item.label}
                    active={isActive(item.path)}
                    collapsed={isCollapsed}
                  />
                )
              ))}
            </div>
          ))}

          <div className="pt-4 border-t border-slate-100">
            <button
              onClick={handleLogout}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-500 hover:text-red-600 hover:bg-red-50 transition-all duration-200 group ${isCollapsed ? "justify-center" : ""}`}
            >
              <LogOut size={18} className="group-hover:translate-x-1 transition-transform" />
              {!isCollapsed && <span className="text-[13px] font-semibold">Logout Session</span>}
            </button>
          </div>
        </div>

        {/* FOOTER */}
        <div className={`p-4 border-t border-slate-50 bg-slate-50/50 ${isCollapsed ? "items-center" : ""}`}>
          {!isCollapsed ? (
            <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm text-center">
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Clinic ID</p>
              <p className="text-xs font-black text-blue-600 truncate uppercase">{slug}</p>
            </div>
          ) : (
            <div className="h-10 w-10 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
              <ShieldCheck size={20} />
            </div>
          )}

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden md:flex mx-auto mt-4 h-8 w-8 items-center justify-center text-slate-400 hover:bg-white hover:shadow-sm rounded-full transition-all"
          >
            <ChevronLeft className={`transition-transform duration-500 ${isCollapsed ? "rotate-180" : ""}`} />
          </button>
        </div>
      </aside>
    </>
  );
}

// --- 🔥 NEW COLLAPSIBLE ITEM COMPONENT 🔥 ---
function CollapsibleSidebarItem({ icon, label, subItems, isCollapsed, isActive }) {
  const [isOpen, setIsOpen] = useState(false);

  // Check if any child is active to keep parent highlighted/open
  const isAnySubActive = subItems.some(sub => isActive(sub.path));

  return (
    <div className="space-y-1">
      <button
        onClick={() => !isCollapsed && setIsOpen(!isOpen)}
        className={`
          w-full flex items-center gap-3 px-3 py-[10px] rounded-xl transition-all duration-300 group relative
          ${isAnySubActive ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-blue-50/50 hover:text-blue-700'}
          ${isCollapsed ? "justify-center px-0" : ""}
        `}
      >
        <span className={`${isAnySubActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-blue-600'}`}>
          {icon}
        </span>
        {!isCollapsed && (
          <>
            <span className="text-[13px] font-semibold tracking-tight flex-1 text-left">{label}</span>
            <ChevronDown size={14} className={`transition-transform duration-300 ${(isOpen || isAnySubActive) ? 'rotate-180' : ''}`} />
          </>
        )}
      </button>

      {/* RENDER SUB-MENU */}
      {!isCollapsed && (isOpen || isAnySubActive) && (
        <div className="ml-9 space-y-1 animate-in slide-in-from-top-2 duration-300">
          {subItems.map((sub, idx) => (
            <Link
              key={idx}
              to={sub.path}
              className={`
                flex items-center gap-3 p-2 rounded-lg text-[12px] font-bold tracking-tight transition-all
                ${isActive(sub.path) ? 'text-blue-600 bg-blue-50' : 'text-slate-500 hover:text-blue-600 hover:bg-slate-50'}
              `}
            >
              {sub.icon} {sub.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// Sidebar Item Component
function SidebarItem({ to, icon, label, active, collapsed }) {
  return (
    <Link to={to} title={collapsed ? label : ""} className={`
      flex items-center gap-3 px-3 py-[10px] rounded-xl transition-all duration-300 group relative
      ${active
        ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 scale-[1.02]'
        : 'text-slate-600 hover:bg-blue-50/50 hover:text-blue-700'}
      ${collapsed ? "justify-center px-0" : ""}
    `}>
      <span className={`${active ? 'text-white' : 'text-slate-400 group-hover:text-blue-600'} transition-colors`}>
        {icon}
      </span>
      {!collapsed && (
        <span className="text-[13px] font-semibold tracking-tight whitespace-nowrap">
          {label}
        </span>
      )}
      {active && !collapsed && (
        <div className="absolute right-2 w-1.5 h-1.5 bg-white/40 rounded-full" />
      )}
    </Link>
  );
}