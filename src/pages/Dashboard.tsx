import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, Cell } from 'recharts';
import { DollarSign, Package, Users, Truck, AlertTriangle, ArrowRightLeft, Droplets, Calendar as CalendarIcon } from 'lucide-react';
import { ConfirmModal } from '../components/ConfirmModal';
import { AlertModal } from '../components/AlertModal';
import { format } from 'date-fns';

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalSales: 0,
    totalCollections: 0,
    pendingCollections: 0,
    activeClients: 0,
    pendingDeliveries: 0,
    totalDeliveredContainers: 0,
    totalReturnedContainers: 0,
    washedContainersStats: {
      qty200cc: 0,
      qty500cc: 0,
      qty800cc: 0,
      qty910cc: 0,
      qtyBidones: 0,
      total: 0
    },
    chartData: []
  });

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{ isOpen: boolean, title: string, message: string }>({ isOpen: false, title: '', message: '' });

  const fetchDashboardData = async () => {
    try {
      const res = await fetch('/api/dashboard');
      const data = await res.json();
      setStats({
        ...data,
        washedContainersStats: data.washedContainersStats || { total: 0 }
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const executeReset = async () => {
    setIsConfirmOpen(false);
    try {
      const res = await fetch('/api/reset', { method: 'POST' });
      if (!res.ok) throw new Error('Error al reiniciar los datos');
      setAlertConfig({ isOpen: true, title: 'Éxito', message: 'Todos los datos transaccionales han sido eliminados correctamente.' });
      fetchDashboardData();
    } catch (error) {
      console.error(error);
      setAlertConfig({ isOpen: true, title: 'Error', message: 'Hubo un error al reiniciar los datos.' });
    }
  };

  const handleResetData = () => {
    setIsConfirmOpen(true);
  };

  return (
    <div className="space-y-8">
      <ConfirmModal
        isOpen={isConfirmOpen}
        title="Resetear Movimientos"
        message="¡ATENCIÓN! ¿Estás seguro de que deseas eliminar TODOS los remitos, pagos y movimientos? Los clientes y productos se mantendrán, pero los saldos volverán a cero. Esta acción NO se puede deshacer."
        onConfirm={executeReset}
        onCancel={() => setIsConfirmOpen(false)}
      />
      <AlertModal
        isOpen={alertConfig.isOpen}
        title={alertConfig.title}
        message={alertConfig.message}
        onClose={() => setAlertConfig({ ...alertConfig, isOpen: false })}
      />
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
        <button
          onClick={handleResetData}
          className="bg-red-500/10 text-red-500 hover:bg-red-500/20 px-4 py-2 rounded-lg text-sm font-bold tracking-wider uppercase flex items-center gap-2 transition-colors"
        >
          <AlertTriangle className="w-4 h-4" /> Resetear Movimientos
        </button>
      </div>

      {/* Primary Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <StatCard title="Ventas del Mes" value={`$${(stats.totalSales || 0).toLocaleString()}`} icon={DollarSign} trend="" />
        <StatCard title="Cobranzas" value={`$${(stats.totalCollections || 0).toLocaleString()}`} icon={Wallet} trend="" />
        <StatCard title="Deuda Pendiente" value={`$${(stats.pendingCollections || 0).toLocaleString()}`} icon={AlertTriangle} trend="" />
        <StatCard title="Clientes Activos" value={(stats.activeClients || 0).toString()} icon={Users} trend="" />
        <StatCard title="Entregas Pendientes" value={(stats.pendingDeliveries || 0).toString()} icon={Truck} trend="" />
      </div>

      {/* Secondary Metrics Row (Containers) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Returned vs Delivered Containers */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-indigo-500/10 rounded-xl">
              <ArrowRightLeft className="w-5 h-5 text-indigo-400" />
            </div>
            <span className="text-xs font-bold px-2 py-1 rounded-full bg-zinc-800 text-zinc-400 tracking-wider">
              MES ACTUAL
            </span>
          </div>
          <div>
            <div className="flex gap-4 items-end mb-1">
              <div>
                <h3 className="text-3xl font-bold tracking-tighter text-emerald-400">{stats.totalReturnedContainers || 0}</h3>
                <p className="text-xs font-bold text-zinc-500 tracking-wider uppercase">Vueltos</p>
              </div>
              <div className="text-2xl text-zinc-700 pb-1">/</div>
              <div>
                <h3 className="text-3xl font-bold tracking-tighter text-zinc-300">{stats.totalDeliveredContainers || 0}</h3>
                <p className="text-xs font-bold text-zinc-500 tracking-wider uppercase">Entregados</p>
              </div>
            </div>
            <p className="text-xs font-bold text-zinc-500 tracking-wider uppercase mt-4">Balance Envases (Reparto)</p>
          </div>
        </div>

        {/* Washed Containers */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-blue-500/10 rounded-xl">
              <Droplets className="w-5 h-5 text-blue-400" />
            </div>
            <span className="text-xs font-bold px-2 py-1 rounded-full bg-zinc-800 text-zinc-400 tracking-wider">
              MES ACTUAL
            </span>
          </div>
          <div>
            <h3 className="text-3xl font-bold tracking-tighter text-blue-400 mb-1">{stats.washedContainersStats?.total || 0}</h3>
            <p className="text-xs font-bold text-zinc-500 tracking-wider uppercase">Envases Lavados</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6">
          <h3 className="text-sm font-bold text-zinc-400 tracking-wider uppercase mb-6">Ventas vs Cobranzas (Últimos 7 días)</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.chartData}>
                <XAxis dataKey="name" stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                <Tooltip
                  cursor={{ fill: '#27272a' }}
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }}
                />
                <Bar dataKey="ventas" fill="#ffffff" radius={[4, 4, 0, 0]} />
                <Bar dataKey="cobranzas" fill="#52525b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6">
          <h3 className="text-sm font-bold text-zinc-400 tracking-wider uppercase mb-6">Evolución de Ventas</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.chartData}>
                <XAxis dataKey="name" stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }}
                />
                <Line type="monotone" dataKey="ventas" stroke="#ffffff" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top 10 Products Section */}
      <TopProductsSection />
    </div>
  );
}

function TopProductsSection() {
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [startDate, setStartDate] = useState(format(new Date(new Date().setDate(1)), 'yyyy-MM-dd')); // default to 1st of current month
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd')); // today

  const fetchTopProducts = async () => {
    try {
      const res = await fetch(`/api/dashboard/products?startDate=${startDate}&endDate=${endDate}`);
      const data = await res.json();
      setTopProducts(data);
    } catch (error) {
      console.error('Error fetching top products:', error);
    }
  };

  useEffect(() => {
    fetchTopProducts();
  }, [startDate, endDate]);

  const COLORS = ['#ffffff', '#f4f4f5', '#e4e4e7', '#d4d4d8', '#a1a1aa', '#71717a', '#52525b', '#3f3f46', '#27272a', '#18181b'];

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h3 className="text-sm font-bold text-zinc-400 tracking-wider uppercase">Top 10 Productos Más Vendidos</h3>

        <div className="flex items-center gap-2">
          <div className="relative">
            <CalendarIcon className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 text-xs text-white rounded-lg pl-9 pr-3 py-2 outline-none focus:border-zinc-700"
            />
          </div>
          <span className="text-zinc-500">-</span>
          <div className="relative">
            <CalendarIcon className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 text-xs text-white rounded-lg pl-9 pr-3 py-2 outline-none focus:border-zinc-700"
            />
          </div>
        </div>
      </div>

      <div className="h-80">
        {topProducts.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={topProducts} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <XAxis type="number" stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis dataKey="name" type="category" stroke="#a1a1aa" fontSize={11} tickLine={false} axisLine={false} width={150} />
              <Tooltip
                cursor={{ fill: '#27272a' }}
                contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }}
                formatter={(value: number) => [value, 'Unidades Vendidas']}
              />
              <Bar dataKey="total_quantity" radius={[0, 4, 4, 0]} barSize={20}>
                {topProducts.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <p className="text-zinc-500 text-sm">No hay datos de venta en el periodo seleccionado.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, trend }: { title: string, value: string, icon: any, trend: string }) {
  const isPositive = trend.startsWith('+');
  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 flex flex-col justify-between">
      <div className="flex justify-between items-start mb-4">
        <div className="p-3 bg-zinc-900 rounded-xl">
          <Icon className="w-5 h-5 text-zinc-400" />
        </div>
        {trend && (
          <span className={`text-xs font-bold px-2 py-1 rounded-full ${isPositive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
            {trend}
          </span>
        )}
      </div>
      <div>
        <h3 className="text-3xl font-bold tracking-tighter text-white mb-1">{value}</h3>
        <p className="text-xs font-bold text-zinc-500 tracking-wider uppercase">{title}</p>
      </div>
    </div>
  );
}

function Wallet(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
      <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
      <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
    </svg>
  )
}
