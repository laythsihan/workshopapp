

import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { User } from "@/api/entities";
import { Piece } from "@/api/entities";
import { Comment } from "@/api/entities";
import {
  BookOpen,
  Upload,
  Blocks,
  Loader2,
  BarChart
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/toaster";
import SidebarRecentActivity from "../components/sidebar/RecentActivity";

const navigationItems = [
  {
    title: "My Writing",
    url: createPageUrl("dashboard"),
    icon: BookOpen,
  },
  {
    title: "Analytics & Insights",
    url: createPageUrl("analytics"),
    icon: BarChart,
  },
  {
    title: "Upload New Piece",
    url: createPageUrl("upload"),
    icon: Upload,
  },
];

function FullScreenLoader() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-stone-50">
      <div className="text-center text-stone-500">
        <Loader2 className="w-12 h-12 mx-auto animate-spin mb-4" />
        <p className="text-lg font-semibold">Loading Your Workshop...</p>
      </div>
    </div>
  );
}

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [comments, setComments] = useState([]);
  const [allPieces, setAllPieces] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuthAndLoadData = async () => {
      setIsLoading(true);
      try {
        // First, check for an authenticated user.
        const userData = await User.me();
        setUser(userData);

        // Redirect to dashboard if this is the first page after login and it's the profile page.
        // This handles cases where the auth system might redirect to a default profile page after login.
        const redirectFlag = sessionStorage.getItem('initialRedirectComplete');
        if (!redirectFlag && location.pathname === createPageUrl('profile')) {
            sessionStorage.setItem('initialRedirectComplete', 'true');
            navigate(createPageUrl('dashboard'));
            // Return early to prevent loading data for the profile page before redirecting
            return;
        }

        // If user exists, load the rest of the app data.
        const [piecesData, commentsData] = await Promise.all([
          Piece.list("-created_date", 100),
          Comment.list("-created_date", 3)
        ]);
        setAllPieces(piecesData);
        setComments(commentsData);
      } catch (error) {
        // If User.me() fails, it means the user is not logged in.
        // We will keep 'user' as null. The platform's default behavior
        // should handle the redirect to the login page.
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthAndLoadData();
  }, [location.pathname, navigate]);

  // While loading, or if no user is found, show the loader.
  // This gives the platform time to perform its authentication redirect
  // without showing a broken UI or a custom login button.
  if (isLoading || !user) {
    return <FullScreenLoader />;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-stone-50 font-sans">
        <Sidebar className="border-r border-stone-200 bg-white/80 backdrop-blur-sm">
          <SidebarHeader className="border-b border-stone-200 p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center">
                <Blocks className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-stone-800">Workshop</h2>
                <p className="text-xs text-stone-500 font-medium">Your writing community</p>
              </div>
            </div>
          </SidebarHeader>

          <SidebarContent className="p-4">
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs font-semibold text-stone-600 uppercase tracking-wider px-3 py-3">
                Workspace
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="space-y-1">
                  {navigationItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        className={`hover:bg-stone-100 hover:text-stone-900 transition-all duration-300 rounded-xl mb-1 group ${
                          location.pathname === item.url ? 'bg-stone-100 text-stone-900' : 'text-stone-600'
                        }`}
                      >
                        <Link to={item.url} className="flex items-center gap-3 px-4 py-3">
                          <item.icon className="w-5 h-5 transition-transform group-hover:scale-110" />
                          <span className="font-medium">{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
            <SidebarRecentActivity
              comments={comments}
              allPieces={allPieces}
              userEmail={user?.email}
              isLoading={isLoading}
            />
          </SidebarContent>

          <SidebarFooter className="border-t border-stone-200 p-6">
            <Link
              to={createPageUrl("profile")}
              className="flex items-center gap-3 hover:bg-stone-100 p-2 rounded-xl transition-colors duration-200 group"
            >
              {user?.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt="Profile"
                  className="w-10 h-10 rounded-full object-cover group-hover:scale-105 transition-transform duration-200"
                />
              ) : (
                <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
                  <span className="text-gray-700 font-semibold text-sm">
                    {user?.full_name?.[0] || user?.email?.[0] || 'U'}
                  </span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-stone-800 text-sm truncate group-hover:text-stone-900 transition-colors">
                  {user?.full_name || 'Writer'}
                </p>
                <p className="text-xs text-stone-500 truncate">
                  Craft your stories
                </p>
              </div>
            </Link>
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 flex flex-col">
          <header className="bg-white/90 backdrop-blur-sm border-b border-stone-200 px-6 py-4 md:hidden">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="hover:bg-stone-100 p-2 rounded-xl transition-colors duration-200" />
              <h1 className="text-xl font-bold text-stone-800">Workshop</h1>
            </div>
          </header>

          <div className="flex-1 overflow-auto">
            {children}
          </div>
        </main>
      </div>
      <Toaster />
    </SidebarProvider>
  );
}

