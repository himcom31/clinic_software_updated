import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  LayoutDashboard, Settings, Palette, LayoutTemplate,
  Users, Calendar, PlusCircle, Search, Microscope,
  Library, Receipt, BarChart3, UserCog, Sparkles,
  CreditCard, UserCircle, HelpCircle, LogOut, ChevronLeft,
  Menu, X, ShieldCheck, ChevronDown, User, Globe, Thermometer
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

  // Close mobile menu on route change
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  // ── Helper: checks a staff permission key with safe fallback ──
  // If the key doesn't exist on staffInfo.permissions yet (e.g. backend
  // hasn't been updated to send it), default to allowed (true) so existing
  // staff access doesn't silently break. Once doctor explicitly sets it to
  // false from the staff edit screen, it will correctly hide the item.
  const hasPermission = (permKey) => {
    if (!permKey || permKey === "doctorOnly") return false;
    const val = staffInfo?.permissions?.[permKey];
    return val === true || val === undefined;
  };

  // Parent-level item permission keys (unchanged from before)
  const permissionMap = {
    "Patients": "canAddPatients",
    "Appointments": "canManageAppointments",
    "Billing": "canEditBilling",
    "Reports": "canViewReports",
    "New Prescription": "canAddPrescription",
    "Prescriptions": "canAddPrescription",
    "Medicines": "canAddMedicine",
    "Investigations": "canAddTest",
    // "Advice Library": "canAddAdvice",
    "Clinic Setup": "doctorOnly",
    "Prescription Designer": "doctorOnly",
    "Staff Management": "doctorOnly",
    "Subscription": "doctorOnly",
    "Consultation Form Builder": "doctorOnly",
    "AI Assistant": "doctorOnly",
    "Account Settings": "doctorOnly",
    "Symptoms": "doctorOnly",
    "Notifications": "doctorOnly",
    "Vaccination": "doctorOnly",
    "Create Appointment": "canCreateAppointment",
  };

  // NEW: granular permission keys for individual subItems.
  // Keyed by subItem label. Add backend support for these keys whenever
  // ready — until then they default to "allowed" via hasPermission().
  const subItemPermissionMap = {
    "Create Appointment":     "canCreateAppointment",
    "Appointment History":    "canViewAppointmentHistory",
    "Create Prescription":    "canAddPrescription",
    "Prescription History":   "canViewPrescriptionHistory",
    "Doctor Profile":         "doctorOnly",
    // "Clinic Profile":         "doctorOnly",
    // "System Settings":        "doctorOnly",
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
      ]
    },
    {
      group: "Patient Care",
      items: [

{
  label: "Appointments",
  icon: <PlusCircle size={18} />,
  subItems: [
    { label: "Create Appointment",  path: `/${slug}/dashboard/appointment/new` },
    { label: "Appointment History", path: `/${slug}/dashboard/appTable` },
  ]
},
{
  label: "Prescriptions",
  icon: <Calendar size={18} />,
  subItems: [
    { label: "Create Prescription",  path: `/${slug}/dashboard/appointment` },
    { label: "Prescription History", path: `/${slug}/dashboard/prescription-history` },
  ]
},

        { label: "Patients", icon: <Users size={18} />, path: `/${slug}/dashboard/patients` },
        // { label: "Appointments", icon: <Calendar size={18} />, path: `/${slug}/dashboard/appointment` },
        // { label: "New Prescription", icon: <PlusCircle size={18} />, path: `/${slug}/dashboard/prescription` },
      ]
    },
    {
      group: "Clinical Tools",
      items: [
        { label: "Medicines", icon: <Search size={18} />, path: `/${slug}/dashboard/medicine` },
        { label: "Investigations", icon: <Microscope size={18} />, path: `/${slug}/dashboard/investigation` },
        // { label: "Advice Library", icon: <Library size={18} />, path: `/${slug}/dashboard/advice` },
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
        // { label: "AI Assistant", icon: <Sparkles size={18} className="text-amber-500" />, path: `/${slug}/ai-assistant` },
        // { label: "Subscription", icon: <CreditCard size={18} />, path: `/${slug}/subscription` },
        { label: "Notifications", icon: <CreditCard size={18} />, path: `/${slug}/dashboard/notification` },
      ]
    },
    {
      group: "System",
      items: [
        {
          label: "Account Settings",
          icon: <UserCircle size={18} />,
          subItems: [
            { label: "Doctor Profile", icon: <User size={14} />, path: `/${slug}/dashboard/account` },
            // { label: "Clinic Profile", icon: <ShieldCheck size={14} />, path: `/${slug}/dashboard/account/clinic-profile` },
            // { label: "System Settings", icon: <Settings size={14} />, path: `/${slug}/dashboard/account/settings` },
          ]
        },
        { label: "Support", icon: <HelpCircle size={18} />, path: `/${slug}/dashboard/support` },
      ]
    }
  ];

  // ── Filtering ──
  // Doctor: always sees everything, no filtering applied (unchanged behavior).
  // Staff: every parent item AND every individual subItem is checked against
  // its own permission key. A parent with subItems is kept only if at least
  // one of its subItems survives the filter; the subItems array itself is
  // trimmed down to just the allowed ones.
  const filteredSections = isDoctor
    ? menuSections
    : menuSections.map(section => ({
        ...section,
        items: section.items
          .map(item => {
            if (item.subItems) {
              const allowedSubItems = item.subItems.filter(sub => {
                const subPermKey = subItemPermissionMap[sub.label];
                // If a subItem has no explicit key, fall back to the parent's key.
                return hasPermission(subPermKey || permissionMap[item.label]);
              });
              if (allowedSubItems.length === 0) return null;
              return { ...item, subItems: allowedSubItems };
            }
            const permKey = permissionMap[item.label];
            return hasPermission(permKey) ? item : null;
          })
          .filter(Boolean)
      })).filter(section => section.items.length > 0);

  const handleLogout = () => {
    localStorage.clear();
    navigate(`/${slug}/login`);
  };

  return (
    <>
      {/* ── Mobile Top Header ── */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-2">
          <img
            src="/cghcgh.webp"
            alt="DocEdge Logo"
            className="h-10 w-auto object-contain"
          />
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
          aria-label="Toggle menu"
        >
          {isOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* ── Mobile Backdrop Overlay ── */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/40 z-30 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={`
          fixed top-0 left-0 h-screen z-40 bg-white border-r border-slate-200 flex flex-col
          transition-all duration-300 ease-in-out
          md:sticky md:translate-x-0
          ${isOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"}
          ${isCollapsed ? "md:w-[72px]" : "w-[280px]"}
        `}
      >
        {/* LOGO — hidden on mobile (shown in top bar instead) */}
        <div className="hidden md:flex p-5 items-center justify-between shrink-0">
          <div className="flex items-center gap-3 overflow-hidden">

            {!isCollapsed && (
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <img
                    src="/cghcgh.webp"
                    alt="DocEdge Logo"
                    className="h-10 w-auto object-contain"
                  />
                </div>
                <span className="text-[10px] text-blue-600 font-bold tracking-widest uppercase mt-1">
                  {isDoctor ? 'Doctor Portal' : 'Staff Portal'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Mobile logo inside sidebar (shown when open on mobile) */}
        <div className="md:hidden flex items-center justify-between p-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <img
                  src="/cghcgh.webp"
                  alt="DocEdge Logo"
                  className="h-10 w-auto object-contain"
                />
              </div>
              <span className="text-[10px] text-blue-600 font-bold tracking-widest uppercase mt-0.5">
                {isDoctor ? 'Doctor Portal' : 'Staff Portal'}
              </span>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X size={18} className="text-slate-500" />
          </button>
        </div>

        {/* NAVIGATION AREA */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5 pb-6 custom-scrollbar">
          {filteredSections.map((section, sIdx) => (
            <div key={sIdx} className="space-y-0.5">
              {!isCollapsed && (
                <h3 className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-[2px] mb-2">
                  {section.group}
                </h3>
              )}
              {section.items.map((item, iIdx) => (
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

          {/* Logout */}
          <div className="pt-3 border-t border-slate-100">
            <button
              onClick={handleLogout}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-500 hover:text-red-600 hover:bg-red-50 transition-all duration-200 group ${isCollapsed ? "justify-center" : ""}`}
            >
              <LogOut size={18} className="group-hover:translate-x-1 transition-transform shrink-0" />
              {!isCollapsed && <span className="text-[13px] font-semibold">Logout Session</span>}
            </button>
          </div>
        </div>

        {/* FOOTER */}
        <div className={`p-4 border-t border-slate-100 bg-slate-50/50 shrink-0 ${isCollapsed ? "flex flex-col items-center" : ""}`}>
          {!isCollapsed ? (
            <div className="bg-white px-3 py-2 rounded-2xl border border-slate-200 shadow-sm text-center">
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">Clinic ID</p>
              <p className="text-xs font-black text-blue-600 truncate uppercase">{slug}</p>
            </div>
          ) : (
            <div className="h-9 w-9 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
              <ShieldCheck size={18} />
            </div>
          )}

          {/* Collapse toggle — desktop only */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden md:flex mx-auto mt-3 h-8 w-8 items-center justify-center text-slate-400 hover:bg-white hover:shadow-sm rounded-full transition-all"
            aria-label="Toggle sidebar"
          >
            <ChevronLeft className={`transition-transform duration-300 ${isCollapsed ? "rotate-180" : ""}`} />
          </button>
        </div>
      </aside>
    </>
  );
}

// ── Collapsible Item ──
function CollapsibleSidebarItem({ icon, label, subItems, isCollapsed, isActive }) {
  const [isOpen, setIsOpen] = useState(false);
  const isAnySubActive = subItems.some(sub => isActive(sub.path));

  return (
    <div className="space-y-0.5">
      <button
        onClick={() => !isCollapsed && setIsOpen(!isOpen)}
        className={`
          w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group
          ${isAnySubActive ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-blue-50/50 hover:text-blue-700'}
          ${isCollapsed ? "justify-center" : ""}
        `}
      >
        <span className={`shrink-0 ${isAnySubActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-blue-600'}`}>
          {icon}
        </span>
        {!isCollapsed && (
          <>
            <span className="text-[13px] font-semibold tracking-tight flex-1 text-left">{label}</span>
            <ChevronDown
              size={14}
              className={`transition-transform duration-300 shrink-0 ${(isOpen || isAnySubActive) ? 'rotate-180' : ''}`}
            />
          </>
        )}
      </button>

      {!isCollapsed && (isOpen || isAnySubActive) && (
        <div className="ml-8 space-y-0.5 animate-in slide-in-from-top-2 duration-200">
          {subItems.map((sub, idx) => (
            <Link
              key={idx}
              to={sub.path}
              className={`
                flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] font-semibold tracking-tight transition-all
                ${isActive(sub.path) ? 'text-blue-600 bg-blue-50' : 'text-slate-500 hover:text-blue-600 hover:bg-slate-50'}
              `}
            >
              <span className="shrink-0">{sub.icon}</span>
              {sub.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Sidebar Item ──
function SidebarItem({ to, icon, label, active, collapsed }) {
  return (
    <Link
      to={to}
      title={collapsed ? label : ""}
      className={`
        flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative
        ${active
          ? 'bg-blue-600 text-white shadow-md shadow-blue-200 scale-[1.02]'
          : 'text-slate-600 hover:bg-blue-50/50 hover:text-blue-700'}
        ${collapsed ? "justify-center" : ""}
      `}
    >
      <span className={`shrink-0 ${active ? 'text-white' : 'text-slate-400 group-hover:text-blue-600'} transition-colors`}>
        {icon}
      </span>
      {!collapsed && (
        <span className="text-[13px] font-semibold tracking-tight whitespace-nowrap">
          {label}
        </span>
      )}
      {active && !collapsed && (
        <div className="absolute right-2.5 w-1.5 h-1.5 bg-white/40 rounded-full" />
      )}
    </Link>
  );
}