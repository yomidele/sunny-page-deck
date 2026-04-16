import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  BookOpen,
  Menu,
  X,
  LayoutDashboard,
  BookMarked,
  BarChart3,
  TrendingUp,
  Trophy,
  User,
  LogOut,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import FloatingWhatsApp from "@/components/FloatingWhatsApp";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { signOut } = useAuth();
  const location = useLocation();

  const navItems = [
    { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { path: "/practice", label: "Practice", icon: BookMarked },
    { path: "/cbt/setup", label: "CBT Exam", icon: BarChart3 },
    { path: "/analytics", label: "Analytics", icon: TrendingUp },
    { path: "/cbt/result/latest", label: "Results", icon: Trophy },
    { path: "/profile", label: "Profile", icon: User },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="flex min-h-screen bg-[#0B0B0B]">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 lg:hidden z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-screen w-64 bg-[#0B0B0B] border-r border-[#1A1A1A] z-40 transform transition-transform duration-300 lg:static lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="border-b border-[#1A1A1A] px-6 py-6">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#FFD700] rounded-lg flex items-center justify-center">
                <BookOpen className="h-6 w-6 text-[#0B0B0B]" />
              </div>
              <span className="font-heading text-xl font-bold text-[#FFD700]">
                MEEKAH
              </span>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg smooth-transition relative ${
                    active
                      ? "text-[#FFD700] bg-[#111111]"
                      : "text-[#B0B0B0] hover:text-white hover:bg-[#111111]"
                  }`}
                >
                  {active && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#FFD700] rounded-r-full"></div>
                  )}
                  <Icon className="h-5 w-5" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="border-t border-[#1A1A1A] p-4 space-y-2">
            <Link
              to="#"
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-[#B0B0B0] hover:text-white hover:bg-[#111111] smooth-transition"
            >
              <Settings className="h-5 w-5" />
              <span className="font-medium">Settings</span>
            </Link>
            <Button
              onClick={() => signOut()}
              variant="ghost"
              className="w-full justify-start gap-3 px-4 py-3 h-auto text-[#B0B0B0] hover:text-red-400 hover:bg-red-950/20"
            >
              <LogOut className="h-5 w-5" />
              <span className="font-medium">Sign Out</span>
            </Button>
          </div>

          {/* Close button for mobile */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden absolute top-6 right-6 p-2 hover:bg-[#111111] rounded-lg"
          >
            <X className="h-6 w-6 text-[#B0B0B0]" />
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="border-b border-[#1A1A1A] bg-[#0B0B0B] sticky top-0 z-20">
          <div className="flex items-center justify-between px-6 py-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 hover:bg-[#111111] rounded-lg text-[#B0B0B0]"
            >
              <Menu className="h-6 w-6" />
            </button>
            <div className="flex-1"></div>
            <Button
              onClick={() => signOut()}
              variant="ghost"
              size="sm"
              className="gap-2 text-[#B0B0B0] hover:text-white lg:hidden"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto">{children}</main>
      </div>

      {/* Floating WhatsApp Button */}
      <FloatingWhatsApp />
    </div>
  );
};

export default DashboardLayout;
