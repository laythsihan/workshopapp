import React from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { 
  BookOpen, 
  PlusCircle, 
  LogOut, 
  User, 
  LayoutDashboard 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import SidebarRecentActivity from "../sidebar/RecentActivity";

export default function DashboardShell({ children, pieces = [], activity = [], isLoading = false }) {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await signOut();
    // Redirect to login and clear navigation history
    navigate("/login", { replace: true });
  };

  // Helper to highlight the active page in the sidebar
  const isActive = (path) => location.pathname === path;

  return (
    <div className="flex min-h-screen bg-stone-50 font-sans">
      {/* --- LEFT SIDEBAR --- */}
      <aside className="w-72 bg-white border-r border-stone-200 flex flex-col fixed h-full z-30">
        {/* Logo Area */}
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center text-white shadow-lg">
            <BookOpen className="w-6 h-6" />
          </div>
          <div className="flex flex-col">
            <span className="font-serif font-bold text-xl tracking-tight leading-none">Workshop</span>
            <span className="text-[10px] text-stone-400 uppercase tracking-widest mt-1">Sovereign v1.0</span>
          </div>
        </div>

        <div className="px-4 py-2">
          <Separator className="bg-stone-100" />
        </div>

        {/* Primary Navigation */}
        <nav className="flex-1 px-4 py-4 space-y-1">
          <Link to="/dashboard">
            <Button 
              variant="ghost" 
              className={`w-full justify-start gap-3 py-6 px-4 transition-all ${
                isActive('/dashboard') ? 'bg-stone-100 text-black font-semibold' : 'text-stone-500 hover:bg-stone-50'
              }`}
            >
              <LayoutDashboard className="w-5 h-5" />
              Dashboard
            </Button>
          </Link>

          <Link to="/upload">
            <Button 
              variant="ghost" 
              className={`w-full justify-start gap-3 py-6 px-4 transition-all ${
                isActive('/upload') ? 'bg-stone-100 text-black font-semibold' : 'text-stone-500 hover:bg-stone-50'
              }`}
            >
              <PlusCircle className="w-5 h-5" />
              New Manuscript
            </Button>
          </Link>

          {/* Activity Feed Section */}
          <div className="mt-8">
            <SidebarRecentActivity 
              comments={activity} 
              allPieces={pieces} 
              userId={user?.id} 
              isLoading={isLoading} 
            />
          </div>
        </nav>

        {/* User Account & Logout Section */}
        <div className="p-4 mt-auto border-t border-stone-100 bg-stone-50/50">
          <Link to="/profile">
            <div className="flex items-center gap-3 px-3 py-3 mb-2 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer">
              <div className="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center text-stone-500">
                <User className="w-4 h-4" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-medium text-stone-900 truncate">
                  {user?.email?.split('@')[0]}
                </span>
                <span className="text-[10px] text-stone-400 truncate tracking-tight">View Profile</span>
              </div>
            </div>
          </Link>
          
          <Button 
            variant="ghost" 
            onClick={handleLogout}
            className="w-full justify-start gap-3 text-stone-500 hover:text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-sm font-medium">Sign Out</span>
          </Button>
        </div>
      </aside>

      {/* --- MAIN CONTENT AREA --- */}
      <main className="flex-1 ml-72 min-h-screen relative">
        <div className="max-w-6xl mx-auto p-10">
          {children}
        </div>
      </main>
    </div>
  );
}