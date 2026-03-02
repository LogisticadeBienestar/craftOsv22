import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

export type Role = 'ADMIN' | 'DELIVERY';

interface AuthContextType {
  role: Role;
  setRole: (role: Role) => void;
  currentUser: any;
  setCurrentUser: (user: any) => void;
  users: any[];
  isAdminAuthenticated: boolean;
  setIsAdminAuthenticated: (auth: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>('ADMIN');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);

  useEffect(() => {
    fetch('/api/users')
      .then(res => res.json())
      .then(data => {
        setUsers(data);
      });
  }, []);

  return (
    <AuthContext.Provider value={{ role, setRole, currentUser, setCurrentUser, users, isAdminAuthenticated, setIsAdminAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
