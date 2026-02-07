import React from 'react';
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';

// 1. Correctly capitalized imports
import Login from "./Login.jsx";
import Layout from "./Layout.jsx";
import Dashboard from "./dashboard"; // Pointing to your dashboard file
import Upload from "./upload";
import Profile from "./profile";
import Workshop from "./workshop";
import Analytics from "./analytics";

const PAGES = {
    dashboard: Dashboard,
    upload: Upload,
    profile: Profile,
    workshop: Workshop,
    analytics: Analytics,
};

function _getCurrentPage(url) {
    let path = url.toLowerCase();
    if (path.endsWith('/')) path = path.slice(0, -1);
    const parts = path.split('/');
    const lastPart = parts[parts.length - 1];
    
    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === lastPart);
    return pageName || 'dashboard';
}

function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);
    
    // 2. Logic to hide the Sidebar/Layout on the Login page
    const isLoginPage = location.pathname === "/login";

    if (isLoginPage) {
        return (
            <Routes>
                <Route path="/login" element={<Login />} />
            </Routes>
        );
    }

    return (
        <Layout currentPageName={currentPage}>
            <Routes>            
                <Route path="/" element={<Dashboard />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/upload" element={<Upload />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/workshop" element={<Workshop />} />
                <Route path="/analytics" element={<Analytics />} />
                {/* Fallback for authenticated routes */}
                <Route path="*" element={<Dashboard />} />
            </Routes>
        </Layout>
    );
}

export default function Pages() {
    return (
        <Router>
            <PagesContent />
        </Router>
    );
}