import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { useAuthStore } from './store/authStore';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { FarmerDashboard } from './pages/FarmerDashboard';
import { BuyerDashboard } from './pages/BuyerDashboard';
import { Home } from './pages/Home';

// Protected route wrapper component
const ProtectedRoute: React.FC<{ element: React.ReactNode }> = ({ element }) => {
  const { isAuthenticated, user } = useAuthStore();
  
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{element}</>;
};

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const { user, isAuthenticated, initialize, isInitialized } = useAuthStore();

  useEffect(() => {
    let mounted = true;

    const initApp = async () => {
      if (!isInitialized) {
        console.log('Initializing app...');
        try {
          await initialize();
        } catch (error) {
          console.error('Initialization error:', error);
        }
      }
      
      if (mounted) {
        setIsLoading(false);
      }
    };

    initApp();

    return () => {
      mounted = false;
    };
  }, [initialize, isInitialized]);

  // Set up auth state listener
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event, !!session);
      
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        initialize();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [initialize]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected routes */}
        <Route
          path="/farmer/*"
          element={
            <ProtectedRoute
              element={
                user?.role === 'farmer' ? (
                  <FarmerDashboard />
                ) : (
                  <Navigate to={`/${user?.role || ''}`} replace />
                )
              }
            />
          }
        />
        <Route
          path="/buyer/*"
          element={
            <ProtectedRoute
              element={
                user?.role === 'buyer' ? (
                  <BuyerDashboard />
                ) : (
                  <Navigate to={`/${user?.role || ''}`} replace />
                )
              }
            />
          }
        />

        {/* Catch all route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;