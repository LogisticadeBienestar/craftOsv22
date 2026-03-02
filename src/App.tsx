/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { LayoutDashboard, Users, Package, Truck, Wallet, FileText, UserCircle, Map, Settings, CheckSquare, Car, Droplets, DollarSign, Lock, Receipt } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ReactNode } from 'react';
import { Toaster } from 'react-hot-toast';

import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Clients from './pages/Clients';
import Deliveries from './pages/Deliveries';
import Accounts from './pages/Accounts';
import Invoices from './pages/Invoices';
import Zones from './pages/Zones';
import Prices from './pages/Prices';
import UsersPage from './pages/Users';
import Audits from './pages/Audits';
import VehicleUsage from './pages/VehicleUsage';
import ContainerWashing from './pages/ContainerWashing';
import Settlements from './pages/Settlements';
import CompanyExpenses from './pages/CompanyExpenses';
import { AuthProvider, useAuth } from './context/AuthContext';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

import { useNavigate } from 'react-router-dom';

function LoginScreen() {
  const { users, setCurrentUser, setRole, setIsAdminAuthenticated } = useAuth();
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleUserSelect = (user: any) => {
    const bypassUsers = ['Charlie', 'Sergio', 'Belén', 'Leo', 'Charly', 'Belen'];
    const isBypassed = bypassUsers.includes(user.name);

    if (user.role === 'ADMIN' && !isBypassed) {
      setSelectedUser(user);
      setPassword('');
      setError('');
    } else {
      // Direct login
      setCurrentUser(user);
      setRole(user.role);
      if (user.role === 'ADMIN') {
        setIsAdminAuthenticated(true);
      }

      // Redirect based on user
      if (['Charlie', 'Charly'].includes(user.name)) {
        navigate('/vehicle-usage');
      } else if (['Belén', 'Belen'].includes(user.name)) {
        navigate('/container-washing');
      } else if (user.role === 'DELIVERY') {
        navigate('/deliveries');
      } else {
        navigate('/');
      }
    }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'admin123') {
      setCurrentUser(selectedUser);
      setRole(selectedUser.role);
      setIsAdminAuthenticated(true);
      navigate('/');
    } else {
      setError('Contraseña incorrecta');
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock className="w-10 h-10 text-zinc-500" />
          </div>
          <h2 className="text-3xl font-bold text-white tracking-tight">Craft Admin</h2>
          <p className="text-zinc-500 mt-2">Seleccione su usuario para ingresar</p>
        </div>

        {!selectedUser ? (
          <div className="grid gap-3">
            {users.map(user => (
              <button
                key={user.id}
                onClick={() => handleUserSelect(user)}
                className="flex items-center gap-4 p-4 bg-zinc-900 border border-zinc-800 rounded-xl hover:bg-zinc-800 transition-colors text-left"
              >
                <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center">
                  <UserCircle className="w-6 h-6 text-zinc-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">{user.name}</h3>
                  <p className="text-sm text-zinc-500">{user.role === 'ADMIN' && !['Charlie', 'Sergio', 'Belén', 'Leo', 'Charly', 'Belen'].includes(user.name) ? 'Administrador' : 'Usuario General'}</p>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <form onSubmit={handlePasswordSubmit} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-white">Hola, {selectedUser.name}</h3>
              <p className="text-sm text-zinc-500 mt-1">Ingrese su contraseña para continuar</p>
            </div>

            <div>
              <input
                type="password"
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 text-center tracking-widest"
                autoFocus
              />
              {error && <p className="text-red-400 text-xs mt-2 text-center">{error}</p>}
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="flex-1 bg-zinc-800 text-white py-3 rounded-xl text-sm font-bold tracking-wider uppercase hover:bg-zinc-700 transition-colors"
              >
                Volver
              </button>
              <button
                type="submit"
                className="flex-1 bg-white text-black py-3 rounded-xl text-sm font-bold tracking-wider uppercase hover:bg-zinc-200 transition-colors"
              >
                Ingresar
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function Sidebar() {
  const location = useLocation();
  const { role, setRole, currentUser, setCurrentUser, users, setIsAdminAuthenticated } = useAuth();

  const allNavItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/', roles: ['ADMIN'] },
    { icon: FileText, label: 'Remitos/Facturas', path: '/invoices', roles: ['ADMIN'] },
    { icon: Package, label: 'Productos', path: '/products', roles: ['ADMIN'] },
    { icon: Users, label: 'Clientes', path: '/clients', roles: ['ADMIN'] },
    { icon: Wallet, label: 'Cta. Corriente', path: '/accounts', roles: ['ADMIN'] },
    { icon: DollarSign, label: 'Liquidaciones', path: '/settlements', roles: ['ADMIN'] },
    { icon: Map, label: 'Zonas', path: '/zones', roles: ['ADMIN'] },
    { icon: Settings, label: 'Precios', path: '/prices', roles: ['ADMIN'] },
    { icon: CheckSquare, label: 'Auditoría', path: '/audits', roles: ['ADMIN'] },
    { icon: UserCircle, label: 'Usuarios', path: '/users', roles: ['ADMIN'] },
    { icon: Truck, label: 'Entregas', path: '/deliveries', roles: ['ADMIN', 'DELIVERY'] },
    { icon: Car, label: 'Otros Registros (Charly)', path: '/vehicle-usage', roles: ['ADMIN'], users: ['Charlie', 'Charly'] },
    { icon: Droplets, label: 'Lavado de Envases', path: '/container-washing', roles: ['ADMIN'], users: ['Belén', 'Belen'] },
    { icon: Receipt, label: 'Gastos de Empresa', path: '/expenses', roles: ['ADMIN'], users: ['Charlie', 'Charly', 'Belén', 'Belen', 'Sergio', 'Leo'] },
  ];

  const navItems = allNavItems.filter(item => {
    const bypassUsers = ['Charlie', 'Sergio', 'Belén', 'Leo', 'Charly', 'Belen'];
    const isBypassed = currentUser && bypassUsers.includes(currentUser.name);

    if (isBypassed && item.users && currentUser && item.users.includes(currentUser.name)) return true;
    if (isBypassed && ['Charlie', 'Charly', 'Belén', 'Belen', 'Sergio', 'Leo'].includes(currentUser?.name) && item.path === '/deliveries') return true;

    if (item.roles.includes(role)) return true;
    if (item.users && currentUser && item.users.includes(currentUser.name)) return true;
    return false;
  });

  return (
    <div className="w-64 bg-zinc-950 border-r border-zinc-800 text-zinc-300 flex flex-col h-screen sticky top-0">
      <div className="p-6 border-b border-zinc-800">
        <h1 className="text-xl font-bold text-white tracking-tight">Craft Admin</h1>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-zinc-800 text-white"
                  : "hover:bg-zinc-800/50 hover:text-white"
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-zinc-800">
        <div className="flex items-center gap-3 mb-3 px-2">
          <UserCircle className="w-8 h-8 text-zinc-500" />
          <div>
            <div className="text-sm font-bold text-white">
              {currentUser ? currentUser.name : 'Seleccionar Usuario'}
            </div>
            <div className="text-xs text-zinc-500">
              {(() => {
                const bypassUsers = ['Charlie', 'Sergio', 'Belén', 'Leo', 'Charly', 'Belen'];
                const isBypassed = currentUser && bypassUsers.includes(currentUser.name);
                return role === 'ADMIN' && !isBypassed ? 'Administrador' : 'Usuario General';
              })()}
            </div>
          </div>
        </div>
        <button
          onClick={() => {
            setCurrentUser(null);
            setIsAdminAuthenticated(false);
          }}
          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white hover:bg-zinc-800 transition-colors"
        >
          Cerrar Sesión
        </button>
      </div>
    </div>
  );
}

function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-zinc-900 text-zinc-100 font-sans">
      <Sidebar />
      <main className="flex-1 overflow-auto p-8">
        {children}
      </main>
    </div>
  );
}

function ProtectedRoute({ children, allowedRoles, allowedUsers }: { children: ReactNode, allowedRoles: string[], allowedUsers?: string[] }) {
  const { role, currentUser, isAdminAuthenticated } = useAuth();
  const location = useLocation();
  const path = location.pathname;

  const bypassUsers = ['Charlie', 'Sergio', 'Belén', 'Leo', 'Charly', 'Belen'];
  const isBypassed = currentUser && bypassUsers.includes(currentUser.name);

  let isAllowed = allowedRoles.includes(role);

  if (!isAllowed && allowedUsers && currentUser && allowedUsers.includes(currentUser.name)) {
    isAllowed = true;
  }

  if (role === 'ADMIN' && !isAdminAuthenticated && !isBypassed) {
    isAllowed = false;
  }

  // Specific restrictions for bypassed users
  if (isBypassed && currentUser) {
    const name = currentUser.name;
    const isCharlie = ['Charlie', 'Charly'].includes(name);
    const isBelen = ['Belén', 'Belen'].includes(name);
    const isSergioOrLeo = ['Sergio', 'Leo'].includes(name);

    if (isCharlie) {
      isAllowed = path === '/deliveries' || path === '/vehicle-usage' || path === '/expenses';
    } else if (isBelen) {
      isAllowed = path === '/deliveries' || path === '/container-washing' || path === '/expenses';
    } else if (isSergioOrLeo) {
      isAllowed = path === '/deliveries' || path === '/expenses';
    } else {
      isAllowed = true;
    }
  }

  if (!isAllowed) {
    if (role === 'ADMIN' && !isAdminAuthenticated && !isBypassed) {
      // Allow them to stay on the current page while the modal is shown
      return <>{children}</>;
    }

    // Determine fallback route based on user
    let fallbackRoute = '/';
    if (isBypassed && currentUser) {
      const name = currentUser.name;
      if (['Charlie', 'Charly'].includes(name)) fallbackRoute = '/vehicle-usage';
      else if (['Belén', 'Belen'].includes(name)) fallbackRoute = '/container-washing';
      else if (['Sergio', 'Leo'].includes(name)) fallbackRoute = '/deliveries';
    } else if (role === 'DELIVERY') {
      fallbackRoute = '/deliveries';
    }

    return <Navigate to={fallbackRoute} replace />;
  }
  return <>{children}</>;
}

function AppContent() {
  const { currentUser } = useAuth();

  if (!currentUser) {
    return <LoginScreen />;
  }

  return (
    <>
      <Toaster position="top-right" toastOptions={{
        style: {
          background: '#18181b',
          color: '#fff',
          border: '1px solid #27272a',
        },
      }} />
      <Layout>
        <Routes>
          <Route path="/" element={<ProtectedRoute allowedRoles={['ADMIN']}><Dashboard /></ProtectedRoute>} />
          <Route path="/products" element={<ProtectedRoute allowedRoles={['ADMIN']}><Products /></ProtectedRoute>} />
          <Route path="/clients" element={<ProtectedRoute allowedRoles={['ADMIN']}><Clients /></ProtectedRoute>} />
          <Route path="/deliveries" element={<ProtectedRoute allowedRoles={['ADMIN', 'DELIVERY']}><Deliveries /></ProtectedRoute>} />
          <Route path="/vehicle-usage" element={<ProtectedRoute allowedRoles={['ADMIN']} allowedUsers={['Charlie', 'Charly']}><VehicleUsage /></ProtectedRoute>} />
          <Route path="/container-washing" element={<ProtectedRoute allowedRoles={['ADMIN']} allowedUsers={['Belén', 'Belen']}><ContainerWashing /></ProtectedRoute>} />
          <Route path="/expenses" element={<ProtectedRoute allowedRoles={['ADMIN']} allowedUsers={['Charlie', 'Charly', 'Belén', 'Belen', 'Sergio', 'Leo']}><CompanyExpenses /></ProtectedRoute>} />
          <Route path="/accounts" element={<ProtectedRoute allowedRoles={['ADMIN']}><Accounts /></ProtectedRoute>} />
          <Route path="/invoices" element={<ProtectedRoute allowedRoles={['ADMIN']}><Invoices /></ProtectedRoute>} />
          <Route path="/zones" element={<ProtectedRoute allowedRoles={['ADMIN']}><Zones /></ProtectedRoute>} />
          <Route path="/prices" element={<ProtectedRoute allowedRoles={['ADMIN']}><Prices /></ProtectedRoute>} />
          <Route path="/audits" element={<ProtectedRoute allowedRoles={['ADMIN']}><Audits /></ProtectedRoute>} />
          <Route path="/users" element={<ProtectedRoute allowedRoles={['ADMIN']}><UsersPage /></ProtectedRoute>} />
          <Route path="/settlements" element={<ProtectedRoute allowedRoles={['ADMIN']}><Settlements /></ProtectedRoute>} />
        </Routes>
      </Layout>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}
