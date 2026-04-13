import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  onAuthRequired: () => void;
}

export function ProtectedRoute({ children, onAuthRequired }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-void flex items-center justify-center">
        <div className="animate-neon-pulse">
          <img 
            src="/static/logo-cat.png" 
            alt="Loading" 
            className="w-16 h-16"
            style={{ filter: 'drop-shadow(0 0 10px rgba(232,21,27,0.6))' }}
          />
        </div>
      </div>
    );
  }

  if (!user) {
    onAuthRequired();
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
