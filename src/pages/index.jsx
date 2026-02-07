import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useWorkshopData } from '../hooks/useWorkshopData';

// Components
import { ProtectedRoute } from '../components/auth/ProtectedRoute';
import DashboardShell from '../components/layout/DashboardShell';

// Pages
import Login from './login';
import Dashboard from './dashboard';
import Workshop from './workshop';
import Upload from './upload';

export default function Pages() {
  const { user } = useAuth();
  // Fetch data once at the top level
  const { pieces, activity, isLoading } = useWorkshopData(user);

  return (
    <Routes>
      {/* Public Route */}
      <Route path="/login" element={<Login />} />

      {/* Protected Routes Wrapped in Shell */}
      <Route element={<ProtectedRoute />}>
        <Route 
          path="/dashboard" 
          element={
            <DashboardShell pieces={pieces} activity={activity} isLoading={isLoading}>
              <Dashboard pieces={pieces} isLoading={isLoading} />
            </DashboardShell>
          } 
        />
        
        <Route 
          path="/upload" 
          element={
            <DashboardShell pieces={pieces} activity={activity} isLoading={isLoading}>
              <Upload />
            </DashboardShell>
          } 
        />

        {/* Workshop usually gets its own distraction-free layout, 
            but we still pass the pieces for navigation if needed */}
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