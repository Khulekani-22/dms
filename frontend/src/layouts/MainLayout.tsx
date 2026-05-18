import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  FolderOpen, Share2, ClipboardList,
  LogOut, Moon, Sun, User, Menu
} from 'lucide-react';
import { useState } from 'react';

const NAV_SECTIONS = [
  {
    label: 'Documents',
    items: [{ to: '/folders', icon: <FolderOpen size={16} />, label: 'Folders' }],
  },
  {
    label: 'Sharing',
    items: [{ to: '/share', icon: <Share2 size={16} />, label: 'Share Links' }],
  },
  {
    label: 'Admin',
    items: [{ to: '/logs', icon: <ClipboardList size={16} />, label: 'Access Logs' }],
  },
];

const MainLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [dark, setDark] = useState(() =>
    document.documentElement.classList.contains('dark')
  );
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleDark = () => {
    document.documentElement.classList.toggle('dark');
    setDark((v) => !v);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/auth/login');
  };

  const SidebarInner = () => (
    <>
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-[18px] border-b border-neutral-100 dark:border-neutral-800">
        <img src="/logo-22.png" alt="22 On Sloane" className="h-8 w-auto object-contain shrink-0" />
        <span className="font-bold text-neutral-800 dark:text-white text-sm tracking-tight">DMS</span>
      </div>

      {/* Nav sections */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 dark:text-neutral-600 px-2 mb-1.5">
              {section.label}
            </p>
            {section.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all
                  ${isActive
                    ? 'text-white'
                    : 'text-neutral-600 dark:text-neutral-400 hover:bg-orange-50 dark:hover:bg-[#1e2d40] hover:text-[#E85D04]'
                  }`
                }
                style={({ isActive }) => isActive ? { backgroundColor: '#E85D04' } : {}}
              >
                {item.icon}
                {item.label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-4 border-t border-neutral-100 dark:border-neutral-800 space-y-0.5">
        <button
          onClick={toggleDark}
          className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm text-neutral-500 dark:text-neutral-400 hover:bg-orange-50 dark:hover:bg-[#1e2d40] hover:text-[#E85D04] transition"
        >
          {dark ? <Sun size={16} /> : <Moon size={16} />}
          {dark ? 'Light mode' : 'Dark mode'}
        </button>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 transition"
        >
          <LogOut size={16} /> Logout
        </button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-[#F5F6FA] dark:bg-[#0d1523] text-neutral-800 dark:text-white overflow-hidden">

      {/* Sidebar — desktop */}
      <aside className="hidden md:flex flex-col w-52 shrink-0 bg-white dark:bg-[#16202e] border-r border-neutral-100 dark:border-neutral-800">
        <SidebarInner />
      </aside>

      {/* Sidebar — mobile overlay */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <aside className="relative flex flex-col w-52 bg-white dark:bg-[#16202e] h-full shadow-2xl">
            <SidebarInner />
          </aside>
        </div>
      )}

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Header */}
        <header className="flex items-center justify-between px-5 py-3 bg-white dark:bg-[#16202e] border-b border-neutral-100 dark:border-neutral-800 gap-4">
          <div className="flex items-center gap-3">
            <button
              className="md:hidden p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 dark:hover:bg-[#1e2d40] transition"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={18} />
            </button>
            <span className="text-sm font-semibold text-neutral-400 dark:text-neutral-500 hidden sm:block">
              | Document Management
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Theme toggle pill */}
            <button
              onClick={toggleDark}
              className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-neutral-500 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700 rounded-full px-3 py-1.5 hover:border-[#E85D04] hover:text-[#E85D04] transition"
            >
              {dark ? <Sun size={13} /> : <Moon size={13} />}
              {dark ? 'Light' : 'Dark'}
            </button>

            {/* User name */}
            <span className="flex items-center gap-1.5 text-sm text-neutral-600 dark:text-neutral-300 font-medium px-2">
              <User size={14} className="text-neutral-400" />
              <span className="hidden sm:block">{user?.full_name || user?.email}</span>
            </span>

            {/* Logout button — orange outlined */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition"
              style={{ borderColor: '#E85D04', color: '#E85D04', backgroundColor: 'transparent' }}
              onMouseEnter={(e) => {
                const b = e.currentTarget as HTMLButtonElement;
                b.style.backgroundColor = '#E85D04'; b.style.color = '#fff';
              }}
              onMouseLeave={(e) => {
                const b = e.currentTarget as HTMLButtonElement;
                b.style.backgroundColor = 'transparent'; b.style.color = '#E85D04';
              }}
            >
              <LogOut size={13} /> Logout
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
