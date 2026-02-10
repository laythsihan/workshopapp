import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useWorkshopData } from '../hooks/useWorkshopData';

// Components
import { ProtectedRoute } from '../components/auth/ProtectedRoute';
import DashboardShell from '../components/layout/DashboardShell';

// Pages
import Login from './Login';
import Dashboard from './dashboard';
import Workshop from './workshop';
import Upload from './upload';
import Profile from './profile';

/**
 * Main router component
 * Loads all shared data once via useWorkshopData
 * Passes data down to all pages via props
 */
export default function Pages() {
  // Load ALL shared data once at the top level
  const { user, pieces, activity, isLoading, refresh } = useWorkshopData();

  return (
    <Routes>
      {/* Public Route */}
      <Route path="/login" element={<Login />} />

      {/* Protected Routes Wrapped in DashboardShell */}
      <Route element={<ProtectedRoute />}>
        <Route 
          path="/dashboard" 
          element={
            <DashboardShell 
              user={user}
              pieces={pieces} 
              activity={activity} 
              isLoading={isLoading}
            >
              <Dashboard 
                pieces={pieces} 
                isLoading={isLoading} 
                onRefresh={refresh}
              />
            </DashboardShell>
          } 
        />
        
        <Route 
          path="/upload" 
          element={
            <DashboardShell 
              user={user}
              pieces={pieces} 
              activity={activity} 
              isLoading={isLoading}
            >
              <Upload onRefresh={refresh} />
            </DashboardShell>
          } 
        />

        <Route 
          path="/profile" 
          element={
            <DashboardShell 
              user={user}
              pieces={pieces} 
              activity={activity} 
              isLoading={isLoading}
            >
              <Profile 
                user={user}
                pieces={pieces}
                onRefresh={refresh}
              />
            </DashboardShell>
          } 
        />

        {/* Workshop has its own distraction-free layout */}
        <Route 
          path="/workshop" 
          element={<Workshop allPieces={pieces} />} 
        />
      </Route>

      {/* Redirects */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}