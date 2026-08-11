import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Code2,
  CreditCard,
  CalendarRange,
  BarChart3,
  Settings,
  Moon,
  Sun,
  Menu,
  X,
  LogOut,
  Sparkles,
  Boxes,
  Database,
  FileText,
  ListChecks,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { cn } from './ui.jsx';

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/problems', label: 'DSA Problems', icon: Code2 },
  { to: '/cards', label: 'Memory Cards', icon: CreditCard },
  { to: '/roadmap', label: 'Roadmap', icon: CalendarRange },
  { to: '/tutor', label: 'AI Tutor', icon: Sparkles },
  { to: '/quiz', label: 'Daily Quiz', icon: ListChecks },
  { to: '/design', label: 'System Design', icon: Boxes },
  { to: '/sql', label: 'SQL', icon: Database },
  { to: '/resumes', label: 'Resume', icon: FileText },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/settings', label: 'Settings', icon: Settings },
];

const COMING_SOON = [];

function SidebarContent({ onNavigate }) {
  const navigate = useNavigate();
  const { logout, profile } = useAuth();

  return (
    <div className="flex h-full flex-col">
      <button
        onClick={() => {
          onNavigate?.();
          navigate('/dashboard');
        }}
        className="flex items-center gap-2.5 px-5 py-5 text-left"
      >
        <div className="flex size-8 items-center justify-center rounded-lg bg-accent text-sm font-bold text-white shadow-sm shadow-accent/30">
          BP
        </div>
        <div>
          <p className="text-sm font-bold leading-none">BentoPrep</p>
          <p className="mt-0.5 text-[10px] text-muted">Interview Prep OS</p>
        </div>
      </button>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors',
                isActive
                  ? 'bg-accent-soft text-accent'
                  : 'text-muted hover:bg-surface-2 hover:text-ink'
              )
            }
          >
            <Icon className="size-4" />
            {label}
          </NavLink>
        ))}
        {COMING_SOON.length > 0 && (
          <>
            <div className="px-3 pt-4 pb-1 text-[10px] font-semibold tracking-wider text-muted/60 uppercase">
              AI — Phase 2
            </div>
            {COMING_SOON.map(({ label, icon: Icon }) => (
              <div
                key={label}
                className="flex cursor-not-allowed items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium text-muted/50"
              >
                <Icon className="size-4" />
                {label}
                <span className="ml-auto rounded-full border border-line px-1.5 py-0.5 text-[9px]">Soon</span>
              </div>
            ))}
          </>
        )}
      </nav>

      <div className="border-t border-line p-3">
        <div className="flex items-center gap-2.5 px-2 py-1">
          <div className="flex size-7 items-center justify-center rounded-full bg-surface-2 text-xs font-semibold uppercase">
            {(profile?.display_name || 'U').slice(0, 1)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium">{profile?.display_name || 'User'}</p>
            <p className="truncate text-[10px] text-muted">{profile?.target_role || 'No role set'}</p>
          </div>
          <button
            onClick={logout}
            title="Log out"
            className="rounded-md p-1.5 text-muted hover:bg-surface-2 hover:text-danger"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { dark, toggle } = useTheme();

  return (
    <div className="flex h-full">
      <aside className="hidden w-60 shrink-0 border-r border-line bg-surface/60 lg:block">
        <SidebarContent />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 border-r border-line bg-surface">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-3 rounded-md p-1 text-muted hover:text-ink"
            >
              <X className="size-4" />
            </button>
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-line bg-surface/60 px-4 backdrop-blur lg:px-6">
          <button
            onClick={() => setMobileOpen(true)}
            className="rounded-md p-1.5 text-muted hover:bg-surface-2 lg:hidden"
          >
            <Menu className="size-5" />
          </button>
          <div className="hidden items-center gap-2 text-xs text-muted lg:flex">
            <span className="size-1.5 rounded-full bg-ok" />
            Track → Remember → Identify → Practice → Interview
          </div>
          <button
            onClick={toggle}
            className="rounded-md p-1.5 text-muted hover:bg-surface-2 hover:text-ink"
            title="Toggle theme"
          >
            {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </button>
        </header>
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <div className="mx-auto max-w-5xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
