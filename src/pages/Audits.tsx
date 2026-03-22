import { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Search, FileText, Trash2, LayoutDashboard, Truck, Droplets, Car, DollarSign, Briefcase, CheckSquare, X, Printer, Receipt, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import { format, parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import toast from 'react-hot-toast';
import { getRoundImageBase64 } from '../utils/logo';
import { logoBase64 } from '../utils/logoData';

// Utility: parse date safely in local time
const parseLocalDate = (dateStr: string) => {
  if (!dateStr) return new Date();
  if (dateStr.includes('T')) return parseISO(dateStr);
  return new Date(dateStr + 'T12:00:00');
};

// Utility: format date
const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  if (dateStr.includes('T')) return format(parseISO(dateStr), 'dd/MM/yyyy');
  const [year, month, day] = dateStr.split('-');
  if (year && month && day) return `${day}/${month}/${year}`;
  return format(parseLocalDate(dateStr), 'dd/MM/yyyy');
};

// Filter controls component reused across tabs
function FilterBar({
  dateFrom, setDateFrom,
  dateTo, setDateTo,
  userId, setUserId,
  sortDir, setSortDir,
  users,
  showUser = true
}: {
  dateFrom: string; setDateFrom: (v: string) => void;
  dateTo: string; setDateTo: (v: string) => void;
  userId: string; setUserId: (v: string) => void;
  sortDir: 'desc' | 'asc'; setSortDir: (v: 'desc' | 'asc') => void;
  users: any[]; showUser?: boolean;
}) {
  return (
    <div className="p-4 border-b border-zinc-800 bg-zinc-900/30 flex flex-wrap gap-3 items-end">
      <div>
        <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Desde</label>
        <input
          type="date"
          value={dateFrom}
          onChange={e => setDateFrom(e.target.value)}
          className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-600"
        />
      </div>
      <div>
        <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Hasta</label>
        <input
          type="date"
          value={dateTo}
          onChange={e => setDateTo(e.target.value)}
          className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-600"
        />
      </div>
      {showUser && (
        <div>
          <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Usuario</label>
          <select
            value={userId}
            onChange={e => setUserId(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-600"
          >
            <option value="">Todos</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>
      )}
      <div>
        <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Orden</label>
        <select
          value={sortDir}
          onChange={e => setSortDir(e.target.value as 'asc' | 'desc')}
          className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-600"
        >
          <option value="desc">Más recientes</option>
          <option value="asc">Más antiguos</option>
        </select>
      </div>
      {(dateFrom || dateTo || userId) && (
        <button
          onClick={() => { setDateFrom(''); setDateTo(''); setUserId(''); }}
          className="text-xs text-zinc-400 hover:text-white border border-zinc-700 hover:border-zinc-500 rounded-lg px-3 py-2 transition-colors"
        >
          Limpiar filtros
        </button>
      )}
    </div>
  );
}

// Utility to filter records by date range and user
function applyFilters<T extends { date: string }>(
  records: T[],
  dateFrom: string,
  dateTo: string,
  userIdFilter: string,
  userKey: keyof T = 'user_id' as keyof T,
  sortDir: 'asc' | 'desc' = 'desc'
): T[] {
  let result = [...records];
  if (dateFrom) {
    const from = startOfDay(parseLocalDate(dateFrom));
    result = result.filter(r => parseLocalDate(r.date) >= from);
  }
  if (dateTo) {
    const to = endOfDay(parseLocalDate(dateTo));
    result = result.filter(r => parseLocalDate(r.date) <= to);
  }
  if (userIdFilter) {
    result = result.filter(r => (r as any)[userKey] === userIdFilter);
  }
  result.sort((a, b) => {
    const ta = parseLocalDate(a.date).getTime();
    const tb = parseLocalDate(b.date).getTime();
    return sortDir === 'desc' ? tb - ta : ta - tb;
  });
  return result;
}

export default function Audits() {
  const [activeTab, setActiveTab] = useState<'deliveries' | 'washing' | 'vehicle' | 'advances' | 'tasks' | 'settlements' | 'expenses'>('deliveries');
  const [orders, setOrders] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [orderPayments, setOrderPayments] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  const [washingRecords, setWashingRecords] = useState<any[]>([]);
  const [vehicleRecords, setVehicleRecords] = useState<any[]>([]);
  const [advances, setAdvances] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [settlements, setSettlements] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);

  // Delivery summary panel state
  const [deliveryAllPayments, setDeliveryAllPayments] = useState<{ [orderId: string]: any[] }>({});
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [showSummary, setShowSummary] = useState(false);

  // Per-tab filter states
  const [delDateFrom, setDelDateFrom] = useState('');
  const [delDateTo, setDelDateTo] = useState('');
  const [delUserId, setDelUserId] = useState('');
  const [delSortDir, setDelSortDir] = useState<'asc' | 'desc'>('desc');

  const [washDateFrom, setWashDateFrom] = useState('');
  const [washDateTo, setWashDateTo] = useState('');
  const [washUserId, setWashUserId] = useState('');
  const [washSortDir, setWashSortDir] = useState<'asc' | 'desc'>('desc');

  const [vehDateFrom, setVehDateFrom] = useState('');
  const [vehDateTo, setVehDateTo] = useState('');
  const [vehUserId, setVehUserId] = useState('');
  const [vehSortDir, setVehSortDir] = useState<'asc' | 'desc'>('desc');

  const [advDateFrom, setAdvDateFrom] = useState('');
  const [advDateTo, setAdvDateTo] = useState('');
  const [advUserId, setAdvUserId] = useState('');
  const [advSortDir, setAdvSortDir] = useState<'asc' | 'desc'>('desc');

  const [taskDateFrom, setTaskDateFrom] = useState('');
  const [taskDateTo, setTaskDateTo] = useState('');
  const [taskUserId, setTaskUserId] = useState('');
  const [taskSortDir, setTaskSortDir] = useState<'asc' | 'desc'>('desc');

  const [setlDateFrom, setSetlDateFrom] = useState('');
  const [setlDateTo, setSetlDateTo] = useState('');
  const [setlUserId, setSetlUserId] = useState('');
  const [setlSortDir, setSetlSortDir] = useState<'asc' | 'desc'>('desc');

  const [expDateFrom, setExpDateFrom] = useState('');
  const [expDateTo, setExpDateTo] = useState('');
  const [expUserId, setExpUserId] = useState('');
  const [expSortDir, setExpSortDir] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = () => {
    fetch('/api/orders').then(res => res.json()).then(data => setOrders(data));
    fetch('/api/tasks').then(res => res.json()).then(data => setTasks(data));
    fetch('/api/users').then(res => res.json()).then(data => setUsers(data));
    fetch('/api/clients').then(res => res.json()).then(data => setClients(data));
    fetch('/api/products').then(res => res.json()).then(data => setProducts(data));
    fetch('/api/washing-records').then(res => res.json()).then(data => setWashingRecords(data));
    fetch('/api/vehicle-usage').then(res => res.json()).then(data => setVehicleRecords(data));
    fetch('/api/advances').then(res => res.json()).then(data => setAdvances(data));
    fetch('/api/settlements').then(res => res.json()).then(data => setSettlements(data));
    fetch('/api/company-expenses').then(res => res.json()).then(data => setExpenses(data));
  };

  const getClientName = (id: string) => clients.find(c => c.id === id)?.name || 'Desconocido';
  const getUserName = (id: string) => users.find(u => u.id === id)?.name || 'Desconocido';
  const getProductName = (id: string) => products.find(p => p.id === id)?.name || 'Desconocido';
  const getSettlementSummary = (details: string) => {
    try { return JSON.parse(details).summary || details; } catch { return details; }
  };

  const handleViewDetails = async (order: any) => {
    setSelectedOrder(order);
    try {
      const [itemsRes, paymentsRes] = await Promise.all([
        fetch(`/api/orders/${order.id}/items`),
        fetch(`/api/orders/${order.id}/payments`)
      ]);
      setOrderItems(await itemsRes.json());
      setOrderPayments(await paymentsRes.json());
    } catch (error) {
      console.error('Error fetching order details:', error);
    }
  };

  const handleDeleteRecord = async (type: string, id: string) => {
    if (!confirm('¿Estás seguro de eliminar este registro? Esta acción revierte los pagos a pendiente si es una liquidación.')) return;
    try {
      const res = await fetch(`/api/${type}/${id}`, { method: 'DELETE' });
      if (res.ok) { fetchData(); toast.success('Registro eliminado'); }
      else toast.error('Error al eliminar');
    } catch (e) {
      console.error(e);
      toast.error('Ocurrió un error al eliminar');
    }
  };

  const handlePrintSettlement = async (settlement: any) => {
    try {
      const doc = new jsPDF();
      doc.setFontSize(20);
      const roundLogoData = await getRoundImageBase64(logoBase64);
      doc.addImage(roundLogoData, 'PNG', 14, 14, 16, 16);

      let parsedDetails: any = null;
      let summaryText = settlement.details;
      try { parsedDetails = JSON.parse(settlement.details); summaryText = parsedDetails.summary || summaryText; } catch (e) { }

      if (settlement.type === 'vehicle') {
        doc.text('Liquidación de Uso de Vehículo', 34, 22);
        doc.setFontSize(12);
        doc.text(`Beneficiario: ${getUserName(settlement.user_id)}`, 34, 32);
        doc.text(`Fecha de Emisión: ${formatDate(settlement.date)}`, 34, 40);
        doc.setFontSize(10);
        const splitDetails = doc.splitTextToSize(`Detalles: ${summaryText}`, 180);
        doc.text(splitDetails, 14, 52);
        if (parsedDetails?.tableData) {
          autoTable(doc, { startY: Math.max(64, 52 + splitDetails.length * 5), head: [['Detalle Operativo', 'Cant.', 'Unitario', 'Total (ARS)']], body: parsedDetails.tableData, theme: 'grid', headStyles: { fillColor: [24, 24, 27] } });
        } else {
          doc.setFontSize(14);
          doc.text(`Total Liquidado: $${settlement.amount.toLocaleString()}`, 14, 80);
        }
        doc.save(`Liquidacion_Vehiculo_${settlement.date.replace(/-/g, '')}.pdf`);
      } else {
        doc.text('Liquidación de Lavado de Envases', 34, 22);
        doc.setFontSize(12);
        doc.text(`Beneficiario: ${getUserName(settlement.user_id)}`, 34, 32);
        doc.text(`Fecha de Emisión: ${formatDate(settlement.date)}`, 34, 40);
        doc.setFontSize(10);
        const splitDetails = doc.splitTextToSize(`Detalles: ${summaryText}`, 180);
        doc.text(splitDetails, 14, 52);
        if (parsedDetails?.tableData) {
          autoTable(doc, { startY: Math.max(64, 52 + splitDetails.length * 5), head: [['Detalle Operativo', 'Cant.', 'Unitario', 'Total (ARS)']], body: parsedDetails.tableData, theme: 'grid', headStyles: { fillColor: [24, 24, 27] } });
        } else {
          doc.setFontSize(14);
          doc.text(`Total Liquidado: $${settlement.amount.toLocaleString()}`, 14, 80);
        }
        doc.save(`Liquidacion_Lavado_${settlement.date.replace(/-/g, '')}.pdf`);
      }
    } catch (error) {
      console.error('Error printing settlement:', error);
      toast.error('No se pudo generar el PDF');
    }
  };

  // Delivery-specific data
  const auditedOrders = orders.filter(o => o.delivered_by || o.fulfillment_status === 'delivered');
  const filteredDeliveries = applyFilters(auditedOrders, delDateFrom, delDateTo, delUserId, 'delivered_by', delSortDir).filter(o => {
    if (!delUserId) return true;
    return o.delivered_by === delUserId;
  });

  // Load payments for all filtered deliveries for summary
  const loadSummaryPayments = async () => {
    setSummaryLoading(true);
    const paymentsMap: { [orderId: string]: any[] } = {};
    const baseOrders = applyFilters(auditedOrders, delDateFrom, delDateTo, delUserId, 'delivered_by', delSortDir);
    await Promise.all(baseOrders.map(async (order) => {
      try {
        const res = await fetch(`/api/orders/${order.id}/payments`);
        paymentsMap[order.id] = await res.json();
      } catch { paymentsMap[order.id] = []; }
    }));
    setDeliveryAllPayments(paymentsMap);
    setSummaryLoading(false);
    setShowSummary(true);
  };

  // Summary calculations
  const summaryOrders = Object.keys(deliveryAllPayments).length > 0
    ? applyFilters(auditedOrders, delDateFrom, delDateTo, delUserId, 'delivered_by', delSortDir)
    : [];
  const summaryTotalContainers = summaryOrders.reduce((sum, o) => sum + (o.containers_returned || 0), 0);
  const summaryPaymentsFlat = Object.values(deliveryAllPayments).flat();
  const summaryTotalEfectivo = summaryPaymentsFlat.filter(p => p.method === 'EFECTIVO').reduce((s, p) => s + p.amount, 0);
  const summaryTotalTransferencia = summaryPaymentsFlat.filter(p => p.method === 'TRANSFERENCIA').reduce((s, p) => s + p.amount, 0);
  const summaryTotalCobrado = summaryTotalEfectivo + summaryTotalTransferencia;

  // Per-user breakdown for deliveries
  const userSummaryMap: Record<string, { name: string; containers: number; efectivo: number; transferencia: number }> = {};
  for (const order of summaryOrders) {
    const uid = order.delivered_by || 'unknown';
    if (!userSummaryMap[uid]) userSummaryMap[uid] = { name: getUserName(uid), containers: 0, efectivo: 0, transferencia: 0 };
    userSummaryMap[uid].containers += order.containers_returned || 0;
    const payments = deliveryAllPayments[order.id] || [];
    userSummaryMap[uid].efectivo += payments.filter((p: any) => p.method === 'EFECTIVO').reduce((s: number, p: any) => s + p.amount, 0);
    userSummaryMap[uid].transferencia += payments.filter((p: any) => p.method === 'TRANSFERENCIA').reduce((s: number, p: any) => s + p.amount, 0);
  }

  const filteredWashing = applyFilters(washingRecords, washDateFrom, washDateTo, washUserId, 'user_id', washSortDir);
  const filteredVehicle = applyFilters(vehicleRecords, vehDateFrom, vehDateTo, vehUserId, 'user_id', vehSortDir);
  const filteredAdvances = applyFilters(advances, advDateFrom, advDateTo, advUserId, 'user_id', advSortDir);
  const filteredTasks = applyFilters(tasks, taskDateFrom, taskDateTo, taskUserId, 'user_id', taskSortDir);
  const filteredSettlements = applyFilters(settlements, setlDateFrom, setlDateTo, setlUserId, 'user_id', setlSortDir);
  const filteredExpenses = applyFilters(expenses, expDateFrom, expDateTo, expUserId, 'user_id', expSortDir);

  const tabs = [
    { key: 'deliveries', label: 'Entregas', icon: <Truck className="w-4 h-4" /> },
    { key: 'washing', label: 'Lavado de Envases', icon: <Droplets className="w-4 h-4" /> },
    { key: 'vehicle', label: 'Uso de Vehículo', icon: <Car className="w-4 h-4" /> },
    { key: 'advances', label: 'Adelantos de Dinero', icon: <DollarSign className="w-4 h-4" /> },
    { key: 'tasks', label: 'Tareas Adicionales', icon: <Briefcase className="w-4 h-4" /> },
    { key: 'settlements', label: 'Liquidaciones Cerradas', icon: <CheckSquare className="w-4 h-4" /> },
    { key: 'expenses', label: 'Gastos', icon: <Receipt className="w-4 h-4" /> },
  ] as const;

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight">Auditoría</h2>
      </div>

      <div className="flex gap-4 border-b border-zinc-800 overflow-x-auto pb-0">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`pb-4 px-2 text-sm font-bold tracking-wider uppercase transition-colors relative whitespace-nowrap ${activeTab === tab.key ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            <div className="flex items-center gap-2">{tab.icon} {tab.label}</div>
            {activeTab === tab.key && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-white rounded-t-full" />}
          </button>
        ))}
      </div>

      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden">

        {/* DELIVERIES TAB */}
        {activeTab === 'deliveries' && (
          <>
            <FilterBar
              dateFrom={delDateFrom} setDateFrom={setDelDateFrom}
              dateTo={delDateTo} setDateTo={setDelDateTo}
              userId={delUserId} setUserId={setDelUserId}
              sortDir={delSortDir} setSortDir={setDelSortDir}
              users={users}
            />

            {/* Summary Panel Trigger */}
            <div className="px-4 py-3 border-b border-zinc-800 flex items-center gap-3">
              <button
                onClick={() => {
                  if (showSummary) { setShowSummary(false); setDeliveryAllPayments({}); }
                  else loadSummaryPayments();
                }}
                className="flex items-center gap-2 text-sm font-bold text-zinc-400 hover:text-white border border-zinc-700 hover:border-zinc-500 rounded-lg px-4 py-2 transition-colors"
              >
                <Filter className="w-4 h-4" />
                {showSummary ? 'Ocultar Resumen' : 'Ver Resumen / Cuadro'}
                {summaryLoading && <span className="text-xs text-zinc-500 ml-1">Cargando...</span>}
              </button>
              {showSummary && (
                <span className="text-xs text-zinc-500">
                  {summaryOrders.length} entrega{summaryOrders.length !== 1 ? 's' : ''} en el rango
                </span>
              )}
            </div>

            {/* Summary Panel */}
            {showSummary && !summaryLoading && (
              <div className="border-b border-zinc-800 bg-zinc-900/50 p-6 space-y-6">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Resumen del Período</h3>

                {/* Global totals */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                    <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Envases Devueltos</div>
                    <div className="text-2xl font-bold text-white">{summaryTotalContainers}</div>
                  </div>
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                    <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">💵 Efectivo Cobrado</div>
                    <div className="text-2xl font-bold text-amber-400">${summaryTotalEfectivo.toLocaleString()}</div>
                  </div>
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                    <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">💳 Transferencias</div>
                    <div className="text-2xl font-bold text-blue-400">${summaryTotalTransferencia.toLocaleString()}</div>
                  </div>
                  <div className="bg-zinc-900 border border-emerald-500/30 rounded-xl p-4">
                    <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Total Cobrado</div>
                    <div className="text-2xl font-bold text-emerald-400">${summaryTotalCobrado.toLocaleString()}</div>
                  </div>
                </div>

                {/* Per-user breakdown */}
                {Object.keys(userSummaryMap).length > 1 && (
                  <div>
                    <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Por Repartidor</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                          <tr>
                            <th className="text-left py-2 pr-4">Repartidor</th>
                            <th className="text-right py-2 px-4">Envases</th>
                            <th className="text-right py-2 px-4">💵 Efectivo</th>
                            <th className="text-right py-2 px-4">💳 Transferencia</th>
                            <th className="text-right py-2 pl-4">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800">
                          {Object.entries(userSummaryMap).map(([uid, data]) => (
                            <tr key={uid}>
                              <td className="py-2 pr-4 font-medium text-white">{data.name}</td>
                              <td className="py-2 px-4 text-right text-zinc-400">{data.containers}</td>
                              <td className="py-2 px-4 text-right text-amber-400">${data.efectivo.toLocaleString()}</td>
                              <td className="py-2 px-4 text-right text-blue-400">${data.transferencia.toLocaleString()}</td>
                              <td className="py-2 pl-4 text-right font-bold text-emerald-400">${(data.efectivo + data.transferencia).toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-900/50 text-xs font-bold text-zinc-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4 font-medium">ID / Nº Serie</th>
                    <th className="px-6 py-4 font-medium">Fecha</th>
                    <th className="px-6 py-4 font-medium">Cliente</th>
                    <th className="px-6 py-4 font-medium">Repartidor</th>
                    <th className="px-6 py-4 font-medium">Total</th>
                    <th className="px-6 py-4 font-medium">Envases Dev.</th>
                    <th className="px-6 py-4 font-medium text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {filteredDeliveries.map((order) => (
                    <tr key={order.id} className="hover:bg-zinc-900/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-white">
                        {order.id}
                        {order.serial_number && <span className="ml-2 text-xs text-zinc-500">#{order.serial_number}</span>}
                      </td>
                      <td className="px-6 py-4 text-zinc-400">{formatDate(order.date)}</td>
                      <td className="px-6 py-4 font-medium text-white">{getClientName(order.client_id)}</td>
                      <td className="px-6 py-4 text-zinc-300">
                        {order.delivered_by ? (
                          <span className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                            {getUserName(order.delivered_by)}
                          </span>
                        ) : <span className="text-zinc-600 italic">No registrado</span>}
                      </td>
                      <td className="px-6 py-4 font-mono text-white">${order.total_amount.toLocaleString()}</td>
                      <td className="px-6 py-4 text-zinc-400">{order.containers_returned || 0}</td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => handleViewDetails(order)} className="text-zinc-500 hover:text-white transition-colors" title="Ver Detalles">
                          <FileText className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredDeliveries.length === 0 && (
                    <tr><td colSpan={7} className="px-6 py-8 text-center text-zinc-500">No se encontraron entregas auditables.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* WASHING TAB */}
        {activeTab === 'washing' && (
          <>
            <FilterBar
              dateFrom={washDateFrom} setDateFrom={setWashDateFrom}
              dateTo={washDateTo} setDateTo={setWashDateTo}
              userId={washUserId} setUserId={setWashUserId}
              sortDir={washSortDir} setSortDir={setWashSortDir}
              users={users}
            />
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-900/50 text-xs font-bold text-zinc-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4 font-medium">ID</th>
                    <th className="px-6 py-4 font-medium">Fecha</th>
                    <th className="px-6 py-4 font-medium">Usuario</th>
                    <th className="px-6 py-4 font-medium">200cc</th>
                    <th className="px-6 py-4 font-medium">500cc</th>
                    <th className="px-6 py-4 font-medium">800cc</th>
                    <th className="px-6 py-4 font-medium">910cc</th>
                    <th className="px-6 py-4 font-medium">Bidones</th>
                    <th className="px-6 py-4 font-medium">Estado</th>
                    <th className="px-6 py-4 font-medium text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {filteredWashing.map((record) => (
                    <tr key={record.id} className="hover:bg-zinc-900/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-white">#{record.id.slice(0, 8)}</td>
                      <td className="px-6 py-4 text-zinc-400">{formatDate(record.date)}</td>
                      <td className="px-6 py-4 font-medium text-white">{getUserName(record.user_id)}</td>
                      <td className="px-6 py-4 text-zinc-400">{record.qty_200cc || 0}</td>
                      <td className="px-6 py-4 text-zinc-400">{record.qty_500cc || 0}</td>
                      <td className="px-6 py-4 text-zinc-400">{record.qty_800cc || 0}</td>
                      <td className="px-6 py-4 text-zinc-400">{record.qty_910cc || 0}</td>
                      <td className="px-6 py-4 text-zinc-400">{record.qty_bidones || 0}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${record.status === 'liquidated' ? 'bg-blue-500/10 text-blue-500' : 'bg-amber-500/10 text-amber-500'}`}>
                          {record.status === 'liquidated' ? 'Liquidado' : 'Pendiente'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => handleDeleteRecord('washing-records', record.id)} className="text-red-500 hover:text-red-400 transition-colors bg-red-500/10 p-2 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                      </td>
                    </tr>
                  ))}
                  {filteredWashing.length === 0 && <tr><td colSpan={9} className="px-6 py-8 text-center text-zinc-500">No se encontraron registros de lavado.</td></tr>}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* VEHICLE TAB */}
        {activeTab === 'vehicle' && (
          <>
            <FilterBar
              dateFrom={vehDateFrom} setDateFrom={setVehDateFrom}
              dateTo={vehDateTo} setDateTo={setVehDateTo}
              userId={vehUserId} setUserId={setVehUserId}
              sortDir={vehSortDir} setSortDir={setVehSortDir}
              users={users}
            />
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-900/50 text-xs font-bold text-zinc-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4 font-medium">ID</th>
                    <th className="px-6 py-4 font-medium">Fecha</th>
                    <th className="px-6 py-4 font-medium">Usuario</th>
                    <th className="px-6 py-4 font-medium">Estado</th>
                    <th className="px-6 py-4 font-medium text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {filteredVehicle.map((record) => (
                    <tr key={record.id} className="hover:bg-zinc-900/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-white">#{record.id.slice(0, 8)}</td>
                      <td className="px-6 py-4 text-zinc-400">{formatDate(record.date)}</td>
                      <td className="px-6 py-4 font-medium text-white">{getUserName(record.user_id)}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${record.status === 'liquidated' ? 'bg-blue-500/10 text-blue-500' : 'bg-amber-500/10 text-amber-500'}`}>
                          {record.status === 'liquidated' ? 'Liquidado' : 'Pendiente'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => handleDeleteRecord('vehicle-usage', record.id)} className="text-red-500 hover:text-red-400 transition-colors bg-red-500/10 p-2 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                      </td>
                    </tr>
                  ))}
                  {filteredVehicle.length === 0 && <tr><td colSpan={4} className="px-6 py-8 text-center text-zinc-500">No se encontraron registros de uso de vehículo.</td></tr>}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ADVANCES TAB */}
        {activeTab === 'advances' && (
          <>
            <FilterBar
              dateFrom={advDateFrom} setDateFrom={setAdvDateFrom}
              dateTo={advDateTo} setDateTo={setAdvDateTo}
              userId={advUserId} setUserId={setAdvUserId}
              sortDir={advSortDir} setSortDir={setAdvSortDir}
              users={users}
            />
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-900/50 text-xs font-bold text-zinc-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4 font-medium">ID</th>
                    <th className="px-6 py-4 font-medium">Fecha</th>
                    <th className="px-6 py-4 font-medium">Usuario</th>
                    <th className="px-6 py-4 font-medium">Descripción</th>
                    <th className="px-6 py-4 font-medium">Monto</th>
                    <th className="px-6 py-4 font-medium">Estado</th>
                    <th className="px-6 py-4 font-medium text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {filteredAdvances.map((record) => (
                    <tr key={record.id} className="hover:bg-zinc-900/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-white">#{record.id.slice(0, 8)}</td>
                      <td className="px-6 py-4 text-zinc-400">{formatDate(record.date)}</td>
                      <td className="px-6 py-4 font-medium text-white">{getUserName(record.user_id)}</td>
                      <td className="px-6 py-4 text-zinc-400">{record.description || 'Adelanto de dinero'}</td>
                      <td className="px-6 py-4 font-medium text-red-400">${record.amount.toLocaleString()}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${record.status === 'liquidated' ? 'bg-blue-500/10 text-blue-500' : 'bg-amber-500/10 text-amber-500'}`}>
                          {record.status === 'liquidated' ? 'Liquidado' : 'Pendiente'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => handleDeleteRecord('advances', record.id)} className="text-red-500 hover:text-red-400 transition-colors bg-red-500/10 p-2 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                      </td>
                    </tr>
                  ))}
                  {filteredAdvances.length === 0 && <tr><td colSpan={6} className="px-6 py-8 text-center text-zinc-500">No se encontraron adelantos de dinero.</td></tr>}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* TASKS TAB */}
        {activeTab === 'tasks' && (
          <>
            <FilterBar
              dateFrom={taskDateFrom} setDateFrom={setTaskDateFrom}
              dateTo={taskDateTo} setDateTo={setTaskDateTo}
              userId={taskUserId} setUserId={setTaskUserId}
              sortDir={taskSortDir} setSortDir={setTaskSortDir}
              users={users}
            />
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-900/50 text-xs font-bold text-zinc-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4 font-medium">ID</th>
                    <th className="px-6 py-4 font-medium">Fecha</th>
                    <th className="px-6 py-4 font-medium">Usuario</th>
                    <th className="px-6 py-4 font-medium">Descripción</th>
                    <th className="px-6 py-4 font-medium">Monto Asignado</th>
                    <th className="px-6 py-4 font-medium">Liquidación ID</th>
                    <th className="px-6 py-4 font-medium text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {filteredTasks.map((record) => (
                    <tr key={record.id} className="hover:bg-zinc-900/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-zinc-500">#{record.id.slice(0, 8)}</td>
                      <td className="px-6 py-4 text-zinc-400">{formatDate(record.date)}</td>
                      <td className="px-6 py-4 font-medium text-white">{getUserName(record.user_id)}</td>
                      <td className="px-6 py-4 text-white max-w-sm truncate" title={record.description}>{record.description}</td>
                      <td className="px-6 py-4 font-medium text-emerald-400">${(record.amount || 0).toLocaleString()}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${record.status === 'liquidated' ? 'bg-blue-500/10 text-blue-500' : 'bg-amber-500/10 text-amber-500'}`}>
                          {record.status === 'liquidated' ? 'Liquidado' : 'Pendiente'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => handleDeleteRecord('tasks', record.id)} className="text-red-500 hover:text-red-400 transition-colors bg-red-500/10 p-2 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                      </td>
                    </tr>
                  ))}
                  {filteredTasks.length === 0 && <tr><td colSpan={7} className="px-6 py-8 text-center text-zinc-500">No se encontraron tareas registradas.</td></tr>}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* SETTLEMENTS TAB */}
        {activeTab === 'settlements' && (
          <>
            <FilterBar
              dateFrom={setlDateFrom} setDateFrom={setSetlDateFrom}
              dateTo={setlDateTo} setDateTo={setSetlDateTo}
              userId={setlUserId} setUserId={setSetlUserId}
              sortDir={setlSortDir} setSortDir={setSetlSortDir}
              users={users}
            />
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-900/50 text-xs font-bold text-zinc-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4 font-medium">ID</th>
                    <th className="px-6 py-4 font-medium">Fecha</th>
                    <th className="px-6 py-4 font-medium">Usuario</th>
                    <th className="px-6 py-4 font-medium">Tipo</th>
                    <th className="px-6 py-4 font-medium">Detalles</th>
                    <th className="px-6 py-4 font-medium">Total</th>
                    <th className="px-6 py-4 font-medium text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {filteredSettlements.map((record) => (
                    <tr key={record.id} className="hover:bg-zinc-900/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-white">#{record.id.slice(0, 8)}</td>
                      <td className="px-6 py-4 text-zinc-400">{formatDate(record.date)}</td>
                      <td className="px-6 py-4 font-medium text-white">{getUserName(record.user_id)}</td>
                      <td className="px-6 py-4 text-zinc-400">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${record.type === 'vehicle' ? 'bg-amber-500/10 text-amber-500' : 'bg-blue-500/10 text-blue-500'}`}>
                          {record.type === 'vehicle' ? 'V. Kangoo' : 'Lav. Envases'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-zinc-400 text-xs max-w-xs truncate" title={getSettlementSummary(record.details)}>{getSettlementSummary(record.details)}</td>
                      <td className="px-6 py-4 font-medium text-emerald-400">${record.amount.toLocaleString()}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => handlePrintSettlement(record)} className="text-blue-500 hover:text-blue-400 transition-colors bg-blue-500/10 p-2 rounded-lg"><FileText className="w-4 h-4" /></button>
                          <button onClick={() => handleDeleteRecord('settlements', record.id)} className="text-red-500 hover:text-red-400 transition-colors bg-red-500/10 p-2 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredSettlements.length === 0 && <tr><td colSpan={7} className="px-6 py-8 text-center text-zinc-500">No se encontraron liquidaciones cerradas.</td></tr>}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* EXPENSES TAB */}
        {activeTab === 'expenses' && (
          <>
            <FilterBar
              dateFrom={expDateFrom} setDateFrom={setExpDateFrom}
              dateTo={expDateTo} setDateTo={setExpDateTo}
              userId={expUserId} setUserId={setExpUserId}
              sortDir={expSortDir} setSortDir={setExpSortDir}
              users={users}
            />
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-900/50 text-xs font-bold text-zinc-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4 font-medium">ID</th>
                    <th className="px-6 py-4 font-medium">Fecha</th>
                    <th className="px-6 py-4 font-medium">Usuario</th>
                    <th className="px-6 py-4 font-medium">Descripción Corta</th>
                    <th className="px-6 py-4 font-medium">Comprobante</th>
                    <th className="px-6 py-4 font-medium">Monto</th>
                    <th className="px-6 py-4 font-medium text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {filteredExpenses.map((record) => (
                    <tr key={record.id} className="hover:bg-zinc-900/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-white">#{record.id.slice(0, 8)}</td>
                      <td className="px-6 py-4 text-zinc-400">{formatDate(record.date)}</td>
                      <td className="px-6 py-4 font-medium text-white">{getUserName(record.user_id)}</td>
                      <td className="px-6 py-4 text-zinc-300">{record.description}</td>
                      <td className="px-6 py-4">
                        <span className="text-xs text-blue-400 bg-blue-500/10 px-2 py-1 rounded-full whitespace-nowrap">Ver en Google Drive</span>
                      </td>
                      <td className="px-6 py-4 font-medium text-emerald-400">${record.amount.toLocaleString()}</td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => handleDeleteRecord('company-expenses', record.id)} className="text-red-500 hover:text-red-400 transition-colors bg-red-500/10 p-2 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                      </td>
                    </tr>
                  ))}
                  {filteredExpenses.length === 0 && <tr><td colSpan={7} className="px-6 py-8 text-center text-zinc-500">No se encontraron gastos de empresa.</td></tr>}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg">
                  <CheckSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Detalles de Entrega</h3>
                  <p className="text-xs text-zinc-500">Remito #{selectedOrder.serial_number || selectedOrder.id}</p>
                </div>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="text-zinc-500 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Cliente</h4>
                    <p className="text-white font-medium">{getClientName(selectedOrder.client_id)}</p>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Fecha de Emisión</h4>
                    <p className="text-white">{formatDate(selectedOrder.date)}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Repartidor (Usuario)</h4>
                    <p className="text-emerald-400 font-medium">{selectedOrder.delivered_by ? getUserName(selectedOrder.delivered_by) : 'No registrado'}</p>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Estado de Entrega</h4>
                    <p className="text-white capitalize">{selectedOrder.fulfillment_status === 'delivered' ? 'Entregado' : selectedOrder.fulfillment_status}</p>
                  </div>
                </div>
              </div>

              <div className="border border-zinc-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-zinc-900 text-xs font-bold text-zinc-500 uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Producto</th>
                      <th className="px-4 py-3 text-right">Cant.</th>
                      <th className="px-4 py-3 text-right">Precio</th>
                      <th className="px-4 py-3 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {orderItems.map((item, idx) => (
                      <tr key={idx}>
                        <td className="px-4 py-3 text-white">{getProductName(item.product_id)}</td>
                        <td className="px-4 py-3 text-right text-zinc-400">{item.quantity}</td>
                        <td className="px-4 py-3 text-right font-mono text-zinc-400">${item.price.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right font-mono text-white">${(item.quantity * item.price).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="bg-zinc-900/50 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Subtotal Productos:</span>
                  <span className="text-white font-mono">${selectedOrder.subtotal?.toLocaleString() || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Envases Devueltos:</span>
                  <span className="text-white font-mono">{selectedOrder.containers_returned || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Valor Envases:</span>
                  <span className="text-red-400 font-mono">-${selectedOrder.container_total?.toLocaleString() || 0}</span>
                </div>
                <div className="pt-2 border-t border-zinc-800 flex justify-between items-center">
                  <span className="font-bold text-white">Total Final:</span>
                  <span className="text-xl font-bold text-emerald-500 font-mono">${selectedOrder.total_amount?.toLocaleString() || 0}</span>
                </div>
              </div>

              <div className="border border-zinc-800 rounded-xl overflow-hidden mt-6">
                <div className="bg-zinc-900 px-4 py-3 border-b border-zinc-800">
                  <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Detalle de Cobros Registrados</h4>
                </div>
                {orderPayments.length > 0 ? (
                  <table className="w-full text-left text-sm">
                    <thead className="bg-zinc-900/50 text-xs font-bold text-zinc-500 uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-3">Fecha</th>
                        <th className="px-4 py-3">Método</th>
                        <th className="px-4 py-3 text-right">Monto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800">
                      {orderPayments.map((payment, idx) => (
                        <tr key={idx}>
                          <td className="px-4 py-3 text-zinc-400">{formatDate(payment.date)}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${payment.method === 'EFECTIVO' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-500/10 text-blue-500'}`}>
                              {payment.method}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-emerald-400 font-bold">${payment.amount.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="p-4 text-center text-sm text-zinc-500 italic">Sin cobros registrados para esta entrega.</div>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-zinc-800 flex justify-end bg-zinc-900/30">
              <button onClick={() => setSelectedOrder(null)} className="px-6 py-2 bg-white text-black text-sm font-bold rounded-lg hover:bg-zinc-200 transition-colors">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
