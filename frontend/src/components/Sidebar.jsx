import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Microscope, Users, FileText, Cpu, Settings, LogOut, Activity, Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

export default function Sidebar() {
    const location = useLocation();
    const navigate = useNavigate();
    const { isDarkMode, toggleTheme } = useTheme();
    const { user, logout, isAdmin } = useAuth();

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const pathologistLinks = [
        { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { path: '/analysis', icon: Microscope, label: 'New Analysis' },
        { path: '/patients', icon: Users, label: 'Patient Records' },
        { path: '/reports', icon: FileText, label: 'Reports' },
        { path: '/settings', icon: Settings, label: 'Settings' },
    ];

    const adminLinks = [
        { path: '/admin/dashboard', icon: LayoutDashboard, label: 'Admin Dashboard' },
        { path: '/admin/users', icon: Users, label: 'User Management' },
        { path: '/admin/audit', icon: FileText, label: 'Audit Logs' },
        { path: '/settings', icon: Settings, label: 'System Config' },
    ];

    const navItems = isAdmin ? adminLinks : pathologistLinks;

    return (
        <aside className="w-[260px] h-screen shrink-0 border-r-[1.5px] border-[color:var(--border-subtle)] bg-[color:var(--bg-sidebar)] flex flex-col z-20 shadow-[2px_0_8px_rgba(15,23,42,0.05)] transition-all duration-300">
            {/* Header / Brand */}
            <div className="h-[72px] px-6 flex items-center justify-between border-b-[1.5px] border-[color:var(--border-subtle)]">
                <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-[color:var(--accent-teal-light)] rounded-lg">
                        <Microscope size={22} className="text-[color:var(--accent-teal)]" />
                    </div>
                    <h2 className="text-[18px] font-bold text-[color:var(--text-primary)] tracking-widest uppercase font-display">Cancer<span className="text-[color:var(--accent-teal)]">Scan</span></h2>
                </div>
            </div>

            {/* Navigation Menu */}
            <nav className="flex-1 overflow-y-auto mt-8 px-4 space-y-1.5 custom-scrollbar">
                {navItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    const Icon = item.icon;
                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-[12px] uppercase tracking-widest transition-all duration-300 group font-display ${isActive
                                ? 'bg-[color:var(--bg-nav-active)] text-[color:var(--accent-teal)] font-semibold border-l-4 border-[color:var(--accent-teal)] rounded-r-xl rounded-l-none pl-3'
                                : 'text-[color:var(--text-secondary)] font-medium hover:bg-[color:var(--bg-sidebar-hover)] hover:text-[color:var(--accent-teal)]'
                                }`}
                        >
                            <Icon size={18} className={isActive ? 'text-[color:var(--accent-teal)]' : 'text-[color:var(--text-muted)] group-hover:text-[color:var(--accent-teal)]'} />
                            {item.label}
                        </Link>
                    );
                })}
            </nav>

            {/* Bottom Controls */}
            <div className="p-6 border-t-[1.5px] border-[color:var(--border-subtle)] bg-[color:var(--bg-surface-alt)] space-y-4">
                {/* Theme Toggle */}
                <button
                    onClick={toggleTheme}
                    className="flex w-full items-center gap-3 px-4 py-3 rounded-xl text-[13px] font-bold text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-sidebar-hover)] hover:text-[color:var(--accent-teal)] transition-all cursor-pointer"
                >
                    {isDarkMode ? <Sun size={18} className="text-[color:var(--warning)]" /> : <Moon size={18} className="text-[color:var(--accent-teal)]" />}
                    {isDarkMode ? 'LIGHT MODE' : 'DARK MODE'}
                </button>

                {/* User Profile */}
                <div className="flex items-center gap-3 p-2 bg-[color:var(--bg-primary)] rounded-xl border border-[color:var(--border-subtle)]">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[color:var(--accent-teal)] to-[color:var(--accent-teal-light)] flex items-center justify-center text-white font-bold border-2 border-[color:var(--border-subtle)] shrink-0">
                        {user?.fullName?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div className="flex flex-col min-w-0 pr-2">
                        <p className="text-[13px] font-bold text-[color:var(--text-primary)] truncate font-ui" title={user?.fullName}>
                            {user?.fullName || 'Pathologist'}
                        </p>
                        <span className="text-[9px] font-extrabold text-[color:var(--accent-teal)] uppercase tracking-widest font-display truncate">
                            {isAdmin ? 'SYSTEM ARCHITECT' : (user?.specialization?.toUpperCase() || 'PATHOLOGY')}
                        </span>
                    </div>
                </div>

                {/* Logout */}
                <button
                    onClick={handleLogout}
                    className="flex w-full items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[12px] font-bold uppercase tracking-widest text-[color:var(--text-secondary)] border border-[color:var(--border-subtle)] hover:bg-[color:var(--status-danger)] hover:text-white hover:border-[color:var(--status-danger)] transition-all duration-300 cursor-pointer"
                >
                    <LogOut size={16} />
                    Terminal Exit
                </button>
            </div>
        </aside>
    );
}
