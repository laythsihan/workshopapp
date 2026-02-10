import React from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { 
  LayoutDashboard,
  PenSquare,
  LogOut, 
  UserRound
} from "lucide-react";
import { Button } from "@/components/ui/button";
import SidebarRecentActivity from "../sidebar/RecentActivity";
import { Badge } from "@/components/ui/badge";

export default function DashboardShell({ children, user: sharedUser, pieces = [], activity = [], isLoading = false }) {
  const { signOut, user: authUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const currentUser = sharedUser || authUser;

  const handleLogout = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  const isActive = (path) => location.pathname === path;

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-80 border-r border-stone-200 bg-white/95 backdrop-blur-sm flex-col z-20">
        <div className="p-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl border border-dashed border-stone-300 bg-stone-50 flex items-center justify-center text-stone-500">
              <span className="font-serif font-semibold text-lg">W</span>
            </div>
            <div>
              <h1 className="writer-heading text-2xl leading-none">Workshop</h1>
              <p className="text-xs uppercase tracking-[0.22em] text-stone-400 mt-1">Writing Studio</p>
            </div>
          </div>
        </div>

        <nav className="px-4 pt-2 space-y-2">
          <Link to="/dashboard" className="block">
            <Button 
              variant="ghost" 
              className={`h-11 w-full justify-start gap-3 rounded-xl px-4 text-sm transition-colors ${
                isActive('/dashboard')
                  ? 'bg-stone-900 text-white hover:bg-stone-800'
                  : 'text-stone-600 hover:bg-stone-100'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </Button>
          </Link>

          <Link to="/upload" className="block">
            <Button 
              variant="ghost" 
              className={`h-11 w-full justify-start gap-3 rounded-xl px-4 text-sm transition-colors ${
                isActive('/upload')
                  ? 'bg-stone-900 text-white hover:bg-stone-800'
                  : 'text-stone-600 hover:bg-stone-100'
              }`}
            >
              <PenSquare className="w-4 h-4" />
              New Manuscript
            </Button>
          </Link>
        </nav>

        <div className="px-4 py-4 flex-1 min-h-0">
          <SidebarRecentActivity 
            comments={activity} 
            allPieces={pieces} 
            userId={currentUser?.id} 
            isLoading={isLoading} 
          />
        </div>

        <div className="p-4 border-t border-stone-200 bg-stone-50/60">
          <Link to="/profile" className="block mb-3">
            <div className="rounded-xl border border-stone-200 bg-white px-3 py-3 hover:border-stone-300 transition-colors">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-stone-200 text-stone-700 flex items-center justify-center">
                  <UserRound className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-stone-900 truncate">
                    {currentUser?.full_name || currentUser?.email?.split("@")[0] || "Writer"}
                  </p>
                  <p className="text-xs text-stone-500 truncate">{currentUser?.email}</p>
                </div>
              </div>
            </div>
          </Link>

          <Button 
            variant="outline" 
            onClick={handleLogout}
            className="h-10 w-full justify-start gap-2 border-stone-300 bg-white text-stone-700 hover:bg-stone-100"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-sm font-medium">Sign Out</span>
          </Button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="lg:hidden sticky top-0 z-20 border-b border-stone-200 bg-white/95 backdrop-blur-sm">
        <div className="px-4 py-3 flex items-center justify-between gap-3">
          <div>
            <h1 className="writer-heading text-xl">Workshop</h1>
            <p className="text-[11px] text-stone-500">Writer workspace</p>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/dashboard">
              <Button variant={isActive('/dashboard') ? "default" : "outline"} size="sm" className="h-8">
                Dashboard
              </Button>
            </Link>
            <Link to="/upload">
              <Button variant={isActive('/upload') ? "default" : "outline"} size="sm" className="h-8">
                New
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="min-h-screen lg:ml-80">
        <div className="mx-auto w-full max-w-[1280px] px-4 py-8 md:px-8 md:py-10 xl:px-12 xl:py-12">
          {!isLoading && pieces.length > 0 && (
            <div className="mb-6 lg:hidden">
              <Badge variant="outline" className="rounded-full border-stone-300 bg-white">
                {pieces.length} manuscripts in your library
              </Badge>
            </div>
          )}
          {children}
        </div>
      </main>
    </div>
  );
}