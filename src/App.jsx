import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import Pages from './pages/index'; 
import { AuthProvider } from './contexts/AuthContext';
import { Toaster } from './components/ui/toaster';

function App() {
  return (
    <Router> {/* Keep this one */}
      <AuthProvider>
        <Pages />
        <Toaster />
      </AuthProvider>
    </Router>
  );
}

export default App;