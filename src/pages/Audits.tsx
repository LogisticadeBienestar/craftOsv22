import { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Search, FileText, Trash2, LayoutDashboard, Truck, Droplets, Car, DollarSign, Briefcase, CheckSquare, X, Printer, Receipt } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function Audits() {
  const [activeTab, setActiveTab] = useState<'deliveries' | 'washing' | 'vehicle' | 'advances' | 'tasks' | 'settlements' | 'expenses'>('deliveries');
  const [orders, setOrders] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  const [washingRecords, setWashingRecords] = useState<any[]>([]);
  const [vehicleRecords, setVehicleRecords] = useState<any[]>([]);
  const [advances, setAdvances] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [settlements, setSettlements] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);

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

  const getClientName = (id: string) => {
    const client = clients.find(c => c.id === id);
    return client ? client.name : 'Desconocido';
  };

  const getUserName = (id: string) => {
    const user = users.find(u => u.id === id);
    return user ? user.name : 'Desconocido';
  };

  const getSettlementSummary = (details: string) => {
    try {
      const parsed = JSON.parse(details);
      return parsed.summary || details;
    } catch {
      return details;
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    if (dateStr.includes('T')) return format(new Date(dateStr), 'dd/MM/yyyy');
    const [year, month, day] = dateStr.split('-');
    if (year && month && day) return `${day}/${month}/${year}`;
    return format(new Date(dateStr), 'dd/MM/yyyy');
  };

  const getProductName = (id: string) => {
    const product = products.find(p => p.id === id);
    return product ? product.name : 'Desconocido';
  };

  const handleViewDetails = async (order: any) => {
    setSelectedOrder(order);
    try {
      const res = await fetch(`/api/orders/${order.id}/items`);
      const items = await res.json();
      setOrderItems(items);
    } catch (error) {
      console.error('Error fetching order items:', error);
    }
  };

  const handleDeleteRecord = async (type: string, id: string) => {
    if (!confirm('¿Estás seguro de eliminar este registro? Esta acción revierte los pagos a pendiente si es una liquidación.')) return;
    try {
      const res = await fetch(`/api/${type}/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchData();
        toast.success('Registro eliminado');
      } else {
        toast.error('Error al eliminar');
      }
    } catch (e) {
      console.error(e);
      toast.error('Ocurrió un error al eliminar');
    }
  };

  const handlePrintSettlement = async (settlement: any) => {
    try {
      const doc = new jsPDF();
      doc.setFontSize(20);

      let parsedDetails: any = null;
      let summaryText = settlement.details;
      try {
        parsedDetails = JSON.parse(settlement.details);
        summaryText = parsedDetails.summary || summaryText;
      } catch (e) { }

      if (settlement.type === 'vehicle') {
        doc.text('Liquidación de Uso de Vehículo', 14, 22);
        doc.setFontSize(12);
        doc.text(`Beneficiario: ${getUserName(settlement.user_id)}`, 14, 32);
        doc.text(`Fecha de Emisión: ${formatDate(settlement.date)}`, 14, 40);

        doc.setFontSize(10);
        const splitDetails = doc.splitTextToSize(`Detalles: ${summaryText}`, 180);
        doc.text(splitDetails, 14, 52);

        if (parsedDetails?.tableData) {
          autoTable(doc, {
            startY: Math.max(64, 52 + splitDetails.length * 5),
            head: [['Detalle Operativo', 'Cant.', 'Unitario', 'Total (ARS)']],
            body: parsedDetails.tableData,
            theme: 'grid',
            headStyles: { fillColor: [24, 24, 27] }
          });
        } else {
          doc.setFontSize(14);
          doc.text(`Total Liquidado: $${settlement.amount.toLocaleString()}`, 14, 80);
        }

        doc.save(`Liquidacion_Vehiculo_${settlement.date.replace(/-/g, '')}.pdf`);
      } else {
        doc.text('Liquidación de Lavado de Envases', 14, 22);
        doc.setFontSize(12);
        doc.text(`Beneficiario: ${getUserName(settlement.user_id)}`, 14, 32);
        doc.text(`Fecha de Emisión: ${formatDate(settlement.date)}`, 14, 40);

        doc.setFontSize(10);
        const splitDetails = doc.splitTextToSize(`Detalles: ${summaryText}`, 180);
        doc.text(splitDetails, 14, 52);

        if (parsedDetails?.tableData) {
          autoTable(doc, {
            startY: Math.max(64, 52 + splitDetails.length * 5),
            head: [['Detalle Operativo', 'Cant.', 'Unitario', 'Total (ARS)']],
            body: parsedDetails.tableData,
            theme: 'grid',
            headStyles: { fillColor: [24, 24, 27] }
          });
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

  // Filter orders that have been delivered or have a delivered_by user
  const auditedOrders = orders.filter(o => o.delivered_by || o.fulfillment_status === 'delivered');

  const filteredOrders = auditedOrders.filter(o => {
    const searchLower = searchTerm.toLowerCase();
    const clientName = getClientName(o.client_id).toLowerCase();
    const userName = o.delivered_by ? getUserName(o.delivered_by).toLowerCase() : '';
    return (
      o.id.toLowerCase().includes(searchLower) ||
      (o.serial_number && o.serial_number.toString().includes(searchLower)) ||
      clientName.includes(searchLower) ||
      userName.includes(searchLower)
    );
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight">Auditoría</h2>
      </div>

      <div className="flex gap-4 border-b border-zinc-800">
        <button
          onClick={() => setActiveTab('deliveries')}
          className={`pb-4 px-2 text-sm font-bold tracking-wider uppercase transition-colors relative ${activeTab === 'deliveries' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
            }`}
        >
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4" /> Entregas
          </div>
          {activeTab === 'deliveries' && (
            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-white rounded-t-full" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('washing')}
          className={`pb-4 px-2 text-sm font-bold tracking-wider uppercase transition-colors relative ${activeTab === 'washing' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
            }`}
        >
          <div className="flex items-center gap-2">
            <Droplets className="w-4 h-4" /> Lavado de Envases
          </div>
          {activeTab === 'washing' && (
            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-white rounded-t-full" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('vehicle')}
          className={`pb-4 px-2 text-sm font-bold tracking-wider uppercase transition-colors relative ${activeTab === 'vehicle' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
            }`}
        >
          <div className="flex items-center gap-2">
            <Car className="w-4 h-4" /> Uso de Vehículo
          </div>
          {activeTab === 'vehicle' && (
            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-white rounded-t-full" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('advances')}
          className={`pb-4 px-2 text-sm font-bold tracking-wider uppercase transition-colors relative ${activeTab === 'advances' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
            }`}
        >
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4" /> Adelantos de Dinero
          </div>
          {activeTab === 'advances' && (
            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-white rounded-t-full" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('tasks')}
          className={`pb-4 px-2 text-sm font-bold tracking-wider uppercase transition-colors relative ${activeTab === 'tasks' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
            }`}
        >
          <div className="flex items-center gap-2">
            <Briefcase className="w-4 h-4" /> Tareas Adicionales
          </div>
          {activeTab === 'tasks' && (
            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-white rounded-t-full" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('settlements')}
          className={`pb-4 px-2 text-sm font-bold tracking-wider uppercase transition-colors relative ${activeTab === 'settlements' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
            }`}
        >
          <div className="flex items-center gap-2">
            <CheckSquare className="w-4 h-4" /> Liquidaciones Cerradas
          </div>
          {activeTab === 'settlements' && (
            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-white rounded-t-full" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('expenses')}
          className={`pb-4 px-2 text-sm font-bold tracking-wider uppercase transition-colors relative ${activeTab === 'expenses' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
            }`}
        >
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4" /> Gastos
          </div>
          {activeTab === 'expenses' && (
            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-white rounded-t-full" />
          )}
        </button>
      </div>

      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden">
        {activeTab === 'deliveries' && (
          <>
            <div className="p-4 border-b border-zinc-800 flex gap-4 items-center">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Buscar por remito, cliente o repartidor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600"
                />
              </div>
            </div>

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
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-zinc-900/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-white">
                        {order.id}
                        {order.serial_number && (
                          <span className="ml-2 text-xs text-zinc-500">#{order.serial_number}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-zinc-400">
                        {formatDate(order.date)}
                      </td>
                      <td className="px-6 py-4 font-medium text-white">
                        {getClientName(order.client_id)}
                      </td>
                      <td className="px-6 py-4 text-zinc-300">
                        {order.delivered_by ? (
                          <span className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                            {getUserName(order.delivered_by)}
                          </span>
                        ) : (
                          <span className="text-zinc-600 italic">No registrado</span>
                        )}
                      </td>
                      <td className="px-6 py-4 font-mono text-white">
                        ${order.total_amount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-zinc-400">
                        {order.containers_returned || 0}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleViewDetails(order)}
                          className="text-zinc-500 hover:text-white transition-colors"
                          title="Ver Detalles"
                        >
                          <FileText className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredOrders.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-zinc-500">
                        No se encontraron entregas auditables.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
        {activeTab === 'washing' && (
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
                {washingRecords.map((record) => (
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
                      <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${record.status === 'liquidated' ? 'bg-blue-500/10 text-blue-500' : 'bg-amber-500/10 text-amber-500'
                        }`}>
                        {record.status === 'liquidated' ? 'Liquidado' : 'Pendiente'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDeleteRecord('washing-records', record.id)}
                        className="text-red-500 hover:text-red-400 transition-colors bg-red-500/10 p-2 rounded-lg"
                        title="Eliminar Registro"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {washingRecords.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-6 py-8 text-center text-zinc-500">
                      No se encontraron registros de lavado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'vehicle' && (
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
                {vehicleRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-zinc-900/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-white">#{record.id.slice(0, 8)}</td>
                    <td className="px-6 py-4 text-zinc-400">{formatDate(record.date)}</td>
                    <td className="px-6 py-4 font-medium text-white">{getUserName(record.user_id)}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${record.status === 'liquidated' ? 'bg-blue-500/10 text-blue-500' : 'bg-amber-500/10 text-amber-500'
                        }`}>
                        {record.status === 'liquidated' ? 'Liquidado' : 'Pendiente'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDeleteRecord('vehicle-usage', record.id)}
                        className="text-red-500 hover:text-red-400 transition-colors bg-red-500/10 p-2 rounded-lg"
                        title="Eliminar Registro"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {vehicleRecords.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-zinc-500">
                      No se encontraron registros de uso de vehículo.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'advances' && (
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
                {advances.map((record) => (
                  <tr key={record.id} className="hover:bg-zinc-900/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-white">#{record.id.slice(0, 8)}</td>
                    <td className="px-6 py-4 text-zinc-400">{formatDate(record.date)}</td>
                    <td className="px-6 py-4 font-medium text-white">{getUserName(record.user_id)}</td>
                    <td className="px-6 py-4 text-zinc-400">{record.description || 'Adelanto de dinero'}</td>
                    <td className="px-6 py-4 font-medium text-red-400">${record.amount.toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${record.status === 'liquidated' ? 'bg-blue-500/10 text-blue-500' : 'bg-amber-500/10 text-amber-500'
                        }`}>
                        {record.status === 'liquidated' ? 'Liquidado' : 'Pendiente'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDeleteRecord('advances', record.id)}
                        className="text-red-500 hover:text-red-400 transition-colors bg-red-500/10 p-2 rounded-lg"
                        title="Eliminar Registro"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {advances.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-zinc-500">
                      No se encontraron adelantos de dinero.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'tasks' && (
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
                {tasks.map((record) => (
                  <tr key={record.id} className="hover:bg-zinc-900/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-zinc-500">#{record.id.slice(0, 8)}</td>
                    <td className="px-6 py-4 text-zinc-400">{formatDate(record.date)}</td>
                    <td className="px-6 py-4 font-medium text-white">{getUserName(record.user_id)}</td>
                    <td className="px-6 py-4 text-white max-w-sm truncate" title={record.description}>
                      {record.description}
                    </td>
                    <td className="px-6 py-4 font-medium text-emerald-400">
                      ${(record.amount || 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${record.status === 'liquidated' ? 'bg-blue-500/10 text-blue-500' : 'bg-amber-500/10 text-amber-500'
                        }`}>
                        {record.status === 'liquidated' ? 'Liquidado' : 'Pendiente'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDeleteRecord('tasks', record.id)}
                        className="text-red-500 hover:text-red-400 transition-colors bg-red-500/10 p-2 rounded-lg"
                        title="Eliminar Registro"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {tasks.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-zinc-500">
                      No se encontraron tareas registradas.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'settlements' && (
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
                {settlements.map((record) => (
                  <tr key={record.id} className="hover:bg-zinc-900/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-white">#{record.id.slice(0, 8)}</td>
                    <td className="px-6 py-4 text-zinc-400">{formatDate(record.date)}</td>
                    <td className="px-6 py-4 font-medium text-white">{getUserName(record.user_id)}</td>
                    <td className="px-6 py-4 text-zinc-400">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${record.type === 'vehicle' ? 'bg-amber-500/10 text-amber-500' : 'bg-blue-500/10 text-blue-500'
                        }`}>
                        {record.type === 'vehicle' ? 'V. Kangoo' : 'Lav. Envases'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-zinc-400 text-xs max-w-xs truncate" title={getSettlementSummary(record.details)}>
                      {getSettlementSummary(record.details)}
                    </td>
                    <td className="px-6 py-4 font-medium text-emerald-400">${record.amount.toLocaleString()}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handlePrintSettlement(record)}
                          className="text-blue-500 hover:text-blue-400 transition-colors bg-blue-500/10 p-2 rounded-lg flex items-center gap-1"
                          title="Imprimir Comprobante"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteRecord('settlements', record.id)}
                          className="text-red-500 hover:text-red-400 transition-colors bg-red-500/10 p-2 rounded-lg"
                          title="Eliminar Liquidación y Revertir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {settlements.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-zinc-500">
                      No se encontraron liquidaciones cerradas.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'expenses' && (
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
                {expenses.map((record) => (
                  <tr key={record.id} className="hover:bg-zinc-900/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-white">#{record.id.slice(0, 8)}</td>
                    <td className="px-6 py-4 text-zinc-400">{formatDate(record.date)}</td>
                    <td className="px-6 py-4 font-medium text-white">{getUserName(record.user_id)}</td>
                    <td className="px-6 py-4 text-zinc-300">{record.description}</td>
                    <td className="px-6 py-4">
                      {/* Just a visual prompt, as the form has photos in Google Drive */}
                      <span className="text-xs text-blue-400 bg-blue-500/10 px-2 py-1 rounded-full whitespace-nowrap">Ver en Google Drive</span>
                    </td>
                    <td className="px-6 py-4 font-medium text-emerald-400">${record.amount.toLocaleString()}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDeleteRecord('company-expenses', record.id)}
                        className="text-red-500 hover:text-red-400 transition-colors bg-red-500/10 p-2 rounded-lg"
                        title="Eliminar Gasto"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {expenses.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-zinc-500">
                      No se encontraron gastos de empresa.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
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
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-zinc-500 hover:text-white transition-colors"
              >
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
                    <p className="text-emerald-400 font-medium">
                      {selectedOrder.delivered_by ? getUserName(selectedOrder.delivered_by) : 'No registrado'}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Estado de Entrega</h4>
                    <p className="text-white capitalize">
                      {selectedOrder.fulfillment_status === 'delivered' ? 'Entregado' : selectedOrder.fulfillment_status}
                    </p>
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
            </div>

            <div className="p-6 border-t border-zinc-800 flex justify-end bg-zinc-900/30">
              <button
                onClick={() => setSelectedOrder(null)}
                className="px-6 py-2 bg-white text-black text-sm font-bold rounded-lg hover:bg-zinc-200 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
