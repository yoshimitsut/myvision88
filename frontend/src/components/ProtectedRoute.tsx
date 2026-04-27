// components/ProtectedRoute.jsx
import { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const location = useLocation();

  useEffect(() => {
    const token = localStorage.getItem('store_token');
    const authStatus = sessionStorage.getItem('store_authenticated') === 'true';
    
    // Se temos o token, consideramos autenticado (o backend validará o resto)
    setIsAuthenticated(!!token || authStatus);
  }, []);

  if (isAuthenticated === null) {
    return <div>読み込み中...</div>;
  }

  // Se não está autenticado, redireciona para o login MAS guarda a localização atual
  if (!isAuthenticated) {
    return (
      <Navigate 
        to="/store-login" 
        replace 
        state={{ from: location }} // 🔥 IMPORTANTE: Passa a localização atual
      />
    );
  }

  return <>{children}</>;
}