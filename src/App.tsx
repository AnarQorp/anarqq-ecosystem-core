
import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';

// Auth components
import SessionValidator from '@/components/auth/SessionValidator';
import { useIdentityStore } from '@/state/identity';

// Pages
import EntryGate from '@/pages/EntryGate';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import Home from '@/pages/Home';

// Modules
import QmailPage from '@/pages/QmailPage';
import Qchat from '@/pages/Qchat';
import Qdrive from '@/pages/Qdrive';
import Qpic from '@/pages/Qpic';
import QwalletPage from '@/pages/QwalletPage';
import QonsentPage from '@/pages/QonsentPage';

// Identity Management
import SquidIdentity from '@/pages/SquidIdentity';
import SquidDashboard from '@/pages/SquidDashboard';
import IdentityManagement from '@/pages/IdentityManagement';

// Qmarket
import { qmarketRoutes } from '@/modules/qmarket/routes';

// Storage cleanup
import { initializeStorageCleanup } from '@/utils/storage/cleanup';

// Protected Route wrapper
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useIdentityStore();
  
  if (!isAuthenticated) {
    return <Navigate to="/entry" replace />;
  }
  
  return (
    <SessionValidator>
      {children}
    </SessionValidator>
  );
};

function App() {
  useEffect(() => {
    // Limpiar storage obsoleto al iniciar la app
    initializeStorageCleanup();
    
    // Inicializar store de identidad
    const { initializeFromStorage } = useIdentityStore.getState();
    initializeFromStorage();
  }, []);

  return (
    <Router>
      <div className="min-h-screen bg-background">
        <Routes>
          {/* Public routes */}
          <Route path="/entry" element={<EntryGate />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          {/* Protected routes */}
          <Route path="/home" element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          } />
          
          {/* Module routes */}
          <Route path="/qmail" element={
            <ProtectedRoute>
              <QmailPage />
            </ProtectedRoute>
          } />
          
          <Route path="/qchat" element={
            <ProtectedRoute>
              <Qchat />
            </ProtectedRoute>
          } />
          
          <Route path="/qdrive" element={
            <ProtectedRoute>
              <Qdrive />
            </ProtectedRoute>
          } />
          
          <Route path="/qpic" element={
            <ProtectedRoute>
              <Qpic />
            </ProtectedRoute>
          } />
          
          <Route path="/qwallet/*" element={
            <ProtectedRoute>
              <QwalletPage />
            </ProtectedRoute>
          } />
          <Route path="/qonsent/*" element={
            <ProtectedRoute>
              <QonsentPage />
            </ProtectedRoute>
          } />
          
          {/* Identity Management Routes */}
          <Route path="/identity" element={
            <ProtectedRoute>
              <SquidIdentity />
            </ProtectedRoute>
          } />
          
          <Route path="/identity/dashboard" element={
            <ProtectedRoute>
              <SquidDashboard />
            </ProtectedRoute>
          } />
          
          <Route path="/squid-dashboard" element={
            <ProtectedRoute>
              <SquidDashboard />
            </ProtectedRoute>
          } />
          
          <Route path="/identity/management" element={
            <ProtectedRoute>
              <IdentityManagement />
            </ProtectedRoute>
          } />
          
          {/* Qmarket Routes */}
          {qmarketRoutes.map((route, index) => (
            <Route
              key={index}
              path={route.path}
              element={
                route.path.includes('edit') || route.path.includes('my-items') ? (
                  <ProtectedRoute>
                    <React.Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
                      {route.element}
                    </React.Suspense>
                  </ProtectedRoute>
                ) : (
                  <React.Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
                    {route.element}
                  </React.Suspense>
                )
              }
            />
          ))}
          
          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/entry" replace />} />
          
          {/* Fallback for unknown routes */}
          <Route path="*" element={<Navigate to="/entry" replace />} />
        </Routes>
        
        <Toaster />
      </div>
    </Router>
  );
}

export default App;
