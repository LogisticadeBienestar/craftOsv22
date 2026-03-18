import { useState, useEffect, type FormEvent } from 'react';
import { Search, FileText, Download, Plus, X, Trash2, CheckSquare, Square, Edit2 } from 'lucide-react';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ConfirmModal } from '../components/ConfirmModal';
import { AlertModal } from '../components/AlertModal';
import { getRoundImageBase64 } from '../utils/logo';
import { logoBase64 } from '../utils/logoData';

export default function Invoices() {
  const [orders, setOrders] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [zones, setZones] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [zoneFilter, setZoneFilter] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successOrder, setSuccessOrder] = useState<any | null>(null);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
  const [alertConfig, setAlertConfig] = useState<{ isOpen: boolean, title: string, message: string }>({ isOpen: false, title: '', message: '' });

  // Form State
  const [selectedClient, setSelectedClient] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [items, setItems] = useState<{ product_id: string, quantity: number, price: number }[]>([]);
  const [hasIva, setHasIva] = useState(true);
  const [hasCommissioner, setHasCommissioner] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = () => {
    fetch('/api/orders').then(res => res.json()).then(data => setOrders(data));
    fetch('/api/clients').then(res => res.json()).then(data => setClients(data));
    fetch('/api/products').then(res => res.json()).then(data => setProducts(data));
    fetch('/api/zones').then(res => res.json()).then(data => setZones(data));
    fetch('/api/settings').then(res => res.json()).then(data => setSettings(data));
  };

  const getClientName = (id: string) => {
    const client = clients.find(c => c.id === id);
    return client ? client.name : 'Desconocido';
  };

  const getProductName = (id: string) => {
    const product = products.find(p => p.id === id);
    return product ? product.name : 'Desconocido';
  };

  const [sortOrder, setSortOrder] = useState<string>('date_desc');

  const filteredOrders = orders.filter(o => {
    const searchMatch = getClientName(o.client_id).toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (o.serial_number && o.serial_number.toLowerCase().includes(searchTerm.toLowerCase()));
      
    const client = clients.find(c => c.id === o.client_id);
    const clientZone = client?.zone_id || client?.zone || '';
    const zoneMatch = zoneFilter === '' || clientZone === zoneFilter || client?.zone === zoneFilter || (client?.zone_id && zones.find(z => z.id === client.zone_id)?.name === zoneFilter);

    return searchMatch && zoneMatch;
  }).sort((a, b) => {
    switch (sortOrder) {
      case 'date_asc':
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      case 'alpha_asc':
        return getClientName(a.client_id).localeCompare(getClientName(b.client_id));
      case 'alpha_desc':
        return getClientName(b.client_id).localeCompare(getClientName(a.client_id));
      case 'amount_desc':
        return b.total_amount - a.total_amount;
      case 'amount_asc':
        return a.total_amount - b.total_amount;
      case 'status_payment':
        if (a.payment_status === 'pending' && b.payment_status !== 'pending') return -1;
        if (a.payment_status !== 'pending' && b.payment_status === 'pending') return 1;
        return 0;
      case 'status_delivery':
        if (a.fulfillment_status === 'pending' && b.fulfillment_status !== 'pending') return -1;
        if (a.fulfillment_status !== 'pending' && b.fulfillment_status === 'pending') return 1;
        return 0;
      case 'date_desc':
      default:
        return new Date(b.date).getTime() - new Date(a.date).getTime();
    }
  });

  const handleSelectOrder = (id: string) => {
    if (selectedOrders.includes(id)) {
      setSelectedOrders(selectedOrders.filter(orderId => orderId !== id));
    } else {
      setSelectedOrders([...selectedOrders, id]);
    }
  };

  const handleSelectAllOrders = () => {
    if (selectedOrders.length === filteredOrders.length) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(filteredOrders.map(o => o.id)); // Note: this loses custom ordering
    }
  };

  const generateRouteSheetPDF = async () => {
    if (selectedOrders.length === 0) return;

    const doc = new jsPDF();

    try {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.src = "https://res.cloudinary.com/djmpnvt63/image/upload/v1773410896/Logos_Craft_YOGURT_dopntu.png";
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });
      doc.addImage(img, 'PNG', 160, 10, 36, 18);
    } catch (e) {
      console.warn("Could not load logo", e);
    }
    
    // Header
    doc.setFontSize(18);
    doc.text('Hoja de Ruta / Reparto', 14, 20);
    
    doc.setFontSize(10);
    doc.text(`Fecha de Emisión: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 28);
    
    // Sort selected orders based on the exact order they were clicked (array order)
    const ordersToReport = selectedOrders.map(id => orders.find(o => o.id === id)).filter(Boolean);

    const tableData: any[] = [];
    let totalCobrar = 0;

    ordersToReport.forEach((order, index) => {
      const client = clients.find(c => c.id === order.client_id);
      
      const nombre = client?.name || 'Desconocido';
      const domicilio = client?.address || 'Sin domicilio';
      // We calculate deuda anterior: current balance minus this order's total
      // NOTE: This assumes payment hasn't been made. A simplified approach:
      const deudaAnterior = client ? client.balance - order.total_amount : 0;
      const montoRemito = order.total_amount || 0;
      const envasesLlevar = order.container_quantity || 0;
      
      totalCobrar += montoRemito;

      tableData.push([
        (index + 1).toString(),
        `${nombre}\n${domicilio}`,
        `$${Math.max(0, deudaAnterior).toLocaleString()}`,
        `$${montoRemito.toLocaleString()}`,
        envasesLlevar > 0 ? envasesLlevar.toString() : '-',
        '' // Espacio vacío para que el chofer anote envases que retira u observaciones
      ]);
    });

    autoTable(doc, {
      startY: 35,
      head: [['#', 'Cliente y Domicilio', 'Deuda Ant.', 'Monto Remito', 'Envases', 'Retira / Observ.']],
      body: tableData,
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [40, 40, 40], textColor: [255, 255, 255] },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 60 },
        5: { cellWidth: 35 } // Ancho para escribir
      }
    });

    const finalY = (doc as any).lastAutoTable.finalY || 40;
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(`Total a Cobrar de Remitos: $${totalCobrar.toLocaleString()}`, 14, finalY + 10);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Firma del Repartidor: _________________________', 14, finalY + 25);

    doc.save(`Hoja_de_Ruta_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    setSelectedOrders([]); // Clear selection after generating
  };

  const handleAddItem = () => {
    setItems([...items, { product_id: '', quantity: 1, price: 0 }]);
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...items];
    if (field === 'product_id') {
      const product = products.find(p => p.id === value);
      newItems[index] = { ...newItems[index], product_id: value, price: product ? product.price : 0 };
    } else {
      newItems[index] = { ...newItems[index], [field]: value };
    }
    setItems(newItems);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  // Calculations
  const client = clients.find(c => c.id === selectedClient);
  const zone = zones.find(z => z.id === client?.zone_id || z.name === client?.zone); // Fallback to name if zone_id not set yet

  const productQuantity = items.reduce((sum, item) => sum + (item.price > 0 ? item.quantity : 0), 0);
  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
  const ivaAmount = hasIva ? subtotal * 0.21 : 0;

  const containerPrice = parseFloat(settings.container_price) || 0;
  const containerTotal = productQuantity * containerPrice;

  const commissionerPrice = zone ? zone.commissioner_price : 0;
  const commissionerTotal = hasCommissioner ? commissionerPrice : 0;

  const totalAmount = subtotal + ivaAmount + containerTotal + commissionerTotal;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const validItems = items.filter(item => item.product_id !== '');
    if (!selectedClient || validItems.length === 0) return;

    setIsSubmitting(true);

    const orderData = {
      client_id: selectedClient,
      user_id: 'admin-1',
      total_amount: totalAmount,
      containers_returned: 0,
      status: 'completed',
      date: new Date(date).toISOString(),
      items: validItems,
      zone_id: zone?.id || null,
      subtotal,
      iva_amount: ivaAmount,
      container_quantity: productQuantity,
      container_price: containerPrice,
      container_total: containerTotal,
      commissioner_amount: commissionerTotal,
      has_iva: hasIva,
      has_commissioner: hasCommissioner
    };

    try {
      if (editingOrderId) {
        await fetch(`/api/orders/${editingOrderId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(orderData)
        });

        // Refetch to get updated order
        const res = await fetch('/api/orders');
        const updatedOrders = await res.json();
        setOrders(updatedOrders);

        const updatedOrder = updatedOrders.find((o: any) => o.id === editingOrderId);
        if (updatedOrder) {
          setSuccessOrder(updatedOrder);
        }
      } else {
        const res = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(orderData)
        });
        const result = await res.json();

        if (result.success) {
          // Refetch to get the full order object
          const ordersRes = await fetch('/api/orders');
          const newOrders = await ordersRes.json();
          setOrders(newOrders);

          const newOrder = newOrders.find((o: any) => o.id === result.id);
          if (newOrder) {
            setSuccessOrder(newOrder);
          }
        }
      }

      setIsGenerating(false);
      setEditingOrderId(null);
      setSelectedClient('');
      setItems([]);
      setHasIva(true);
      setHasCommissioner(true);
    } catch (error) {
      console.error('Error saving order:', error);
      setAlertConfig({ isOpen: true, title: 'Error', message: 'Hubo un error al guardar el remito.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const executeDeleteOrder = async () => {
    if (!orderToDelete) return;
    setIsConfirmOpen(false);

    try {
      const res = await fetch(`/api/orders/${orderToDelete}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al eliminar el remito');
      }

      fetchData();
      setAlertConfig({ isOpen: true, title: 'Éxito', message: 'El remito ha sido eliminado correctamente.' });
    } catch (error: any) {
      console.error('Error deleting order:', error);
      setAlertConfig({ isOpen: true, title: 'Error', message: `Hubo un error al eliminar el remito: ${error.message}` });
    } finally {
      setOrderToDelete(null);
    }
  };

  const handleDeleteOrder = (id: string) => {
    setOrderToDelete(id);
    setIsConfirmOpen(true);
  };

  const updateOrderStatus = async (id: string, field: 'payment_status' | 'fulfillment_status', value: string) => {
    const order = orders.find(o => o.id === id);
    if (!order) return;

    const updatedOrder = { ...order, [field]: value };

    await fetch(`/api/orders/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedOrder)
    });

    fetchData();
  };

  const handleEditOrder = async (order: any) => {
    setEditingOrderId(order.id);
    setSelectedClient(order.client_id);
    setDate(format(new Date(order.date), 'yyyy-MM-dd'));
    setHasIva(order.has_iva === 1);
    setHasCommissioner(order.has_commissioner === 1);

    // Fetch order items
    const res = await fetch(`/api/orders/${order.id}/items`);
    const orderItems = await res.json();

    setItems(orderItems.map((item: any) => ({
      product_id: item.product_id,
      quantity: item.quantity,
      price: item.price
    })));

    setIsGenerating(true);
  };

  const generatePDF = async (order: any) => {
    const doc = new jsPDF();
    const client = clients.find(c => c.id === order.client_id);

    // Fetch order items and payments
    const [itemsRes, paymentsRes, clientRes] = await Promise.all([
      fetch(`/api/orders/${order.id}/items`),
      fetch(`/api/orders/${order.id}/payments`),
      fetch(`/api/clients`) // We already have clients in state, but let's use the state
    ]);

    const orderItems = await itemsRes.json();
    const payments = await paymentsRes.json();
    const totalPaid = payments.reduce((sum: number, p: any) => sum + p.amount, 0);

    try {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.src = "https://res.cloudinary.com/djmpnvt63/image/upload/v1773410896/Logos_Craft_YOGURT_dopntu.png";
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });
      doc.addImage(img, 'PNG', 160, 10, 36, 18);
    } catch (e) {
      console.warn("Could not load logo", e);
    }

    // Header
    const roundLogoData = await getRoundImageBase64(logoBase64);
    doc.addImage(roundLogoData, 'PNG', 14, 14, 16, 16);

    doc.setFontSize(20);
    doc.text('Craft Yogurt - Yogurteria Artesanal', 34, 22);

    doc.setFontSize(10);
    doc.text('www.craftyogurt.com.ar', 34, 30);
    doc.text('Craft Yogurt', 14, 36);
    doc.text('Las Violetas SN', 14, 42);
    doc.text('Los Cocos, Córdoba 5182', 14, 48);
    doc.text('Argentina', 14, 54);

    doc.text('Atención al cliente', 120, 30);
    doc.text('+54 3548 40-9540', 120, 36);
    doc.text('pedidoscraftyogurt@gmail.com', 120, 42);

    doc.line(14, 60, 196, 60);

    // Order Info
    doc.setFontSize(10);
    doc.text(format(new Date(order.date), 'MMM dd, yyyy, hh:mm a'), 14, 68);

    if (client) {
      doc.text(client.name, 14, 76);
      doc.text(client.address || '', 14, 82);
      doc.text(client.email || '', 14, 88);
    }

    doc.line(14, 94, 196, 94);

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`Remito / Factura #${order.serial_number || order.id.substring(0, 8)}`, 14, 102);
    doc.setFont('helvetica', 'normal');

    // Items Table
    const tableData: any[] = [];

    orderItems.forEach((item: any) => {
      const product = products.find(p => p.id === item.product_id);
      const productName = product ? product.name : 'Producto Desconocido';
      tableData.push([productName, item.quantity.toString(), `$${item.price.toLocaleString()}`, `$${(item.quantity * item.price).toLocaleString()}`]);
    });

    tableData.push(['SUBTOTAL', '', '', `$${order.subtotal?.toLocaleString() || '0'}`]);

    if (order.has_iva) {
      tableData.push(['IVA (21%)', '', '', `$${order.iva_amount?.toLocaleString() || '0'}`]);
    }

    if (order.container_quantity > 0) {
      const containerUnitPrice = order.container_quantity > 0 ? (order.container_total / order.container_quantity) : 0;
      tableData.push(['ENVASES', order.container_quantity.toString(), `$${containerUnitPrice.toLocaleString()}`, `$${order.container_total?.toLocaleString() || '0'}`]);
    }

    if (order.containers_returned > 0) {
      const containerPrice = parseFloat(settings.container_price) || 0;
      const returnedValue = order.containers_returned * containerPrice;
      tableData.push(['ENVASES DEVUELTOS', order.containers_returned.toString(), `$${containerPrice.toLocaleString()}`, `-$${returnedValue.toLocaleString()}`]);
    }

    if (order.has_commissioner) {
      tableData.push(['COMISIONISTA', '1', '', `$${order.commissioner_amount?.toLocaleString() || '0'}`]);
    }

    autoTable(doc, {
      startY: 110,
      head: [['Descripción', 'Cantidad', 'Precio Unit.', 'Valor Total']],
      body: tableData,
      theme: 'plain',
      styles: { fontSize: 10 },
      headStyles: { fontStyle: 'bold' }
    });

    let finalY = (doc as any).lastAutoTable.finalY || 150;

    doc.line(14, finalY + 5, 196, finalY + 5);

    doc.setFont('helvetica', 'bold');
    doc.text('Total Remito', 120, finalY + 15);
    doc.text(`$${order.total_amount.toLocaleString()}`, 170, finalY + 15);

    finalY += 25;

    // Payments Section
    if (payments.length > 0) {
      doc.setFontSize(10);
      doc.text('Pagos Registrados:', 14, finalY);
      finalY += 5;

      payments.forEach((p: any) => {
        doc.setFont('helvetica', 'normal');
        doc.text(`${format(new Date(p.date), 'dd/MM/yyyy')} - ${p.method}`, 14, finalY);
        doc.text(`-$${p.amount.toLocaleString()}`, 170, finalY);
        finalY += 6;
      });

      doc.setFont('helvetica', 'bold');
      doc.text('Total Pagado', 120, finalY + 5);
      doc.text(`-$${totalPaid.toLocaleString()}`, 170, finalY + 5);
      finalY += 15;
    }

    // Balance
    doc.line(14, finalY, 196, finalY);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');

    const orderBalance = order.total_amount - totalPaid;
    doc.text('Saldo del Remito', 120, finalY + 10);
    doc.text(`$${orderBalance.toLocaleString()}`, 170, finalY + 10);

    if (client) {
      doc.setFontSize(10);
      doc.text('Saldo Total Cuenta Corriente', 120, finalY + 20);
      doc.text(`$${Math.abs(client.balance).toLocaleString()} ${client.balance > 0 ? '(D)' : client.balance < 0 ? '(A)' : ''}`, 170, finalY + 20);
    }

    doc.setFont('helvetica', 'normal');
    doc.text('¡Gracias por su pedido!', 105, finalY + 40, { align: 'center' });

    const safeClientName = client ? `${client.name.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_')}_` : '';
    doc.save(`Remito_${safeClientName}${order.serial_number || order.id}.pdf`);
  };

  if (isGenerating) {
    return (
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold tracking-tight">{editingOrderId ? 'Editar Remito / Factura' : 'Generar Remito / Factura'}</h2>
          <button
            onClick={() => {
              setIsGenerating(false);
              setEditingOrderId(null);
              setSelectedClient('');
              setItems([]);
              setHasIva(true);
              setHasCommissioner(true);
            }}
            className="text-zinc-500 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="bg-zinc-950 border border-zinc-800 rounded-2xl p-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-zinc-500 tracking-wider uppercase mb-2">Cliente</label>
              <select
                required
                value={selectedClient}
                onChange={(e) => setSelectedClient(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600"
              >
                <option value="" disabled>Seleccionar cliente...</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.name} {c.notes ? `(${c.notes})` : ''}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-500 tracking-wider uppercase mb-2">Fecha</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-4">
              <label className="text-xs font-bold text-zinc-500 tracking-wider uppercase">Productos</label>
              <button
                type="button"
                onClick={handleAddItem}
                className="text-xs font-bold text-white bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3 h-3" /> Agregar Producto
              </button>
            </div>

            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={index} className="flex gap-3 items-start">
                  <div className="flex-1">
                    <select
                      required
                      value={item.product_id}
                      onChange={(e) => handleItemChange(index, 'product_id', e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600"
                    >
                      <option value="" disabled>Seleccionar producto...</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="w-24">
                    <input
                      type="number"
                      required
                      min="1"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 0)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600"
                      placeholder="Cant."
                    />
                  </div>
                  <div className="w-32">
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={item.price}
                      onChange={(e) => handleItemChange(index, 'price', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600"
                      placeholder="Precio"
                    />
                  </div>
                  <div className="w-32 bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white font-mono text-right flex items-center justify-end">
                    ${(item.quantity * item.price).toLocaleString()}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(index)}
                    className="p-3 text-zinc-500 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
              {items.length === 0 && (
                <div className="text-center py-8 text-zinc-500 border border-dashed border-zinc-800 rounded-xl">
                  No hay productos agregados.
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-zinc-800 pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative flex items-center justify-center w-6 h-6">
                    <input
                      type="checkbox"
                      checked={hasIva}
                      onChange={(e) => setHasIva(e.target.checked)}
                      className="peer sr-only"
                    />
                    <div className="w-6 h-6 border-2 border-zinc-700 rounded bg-zinc-900 peer-checked:bg-white peer-checked:border-white transition-colors"></div>
                    <CheckSquare className="absolute w-4 h-4 text-black opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" />
                  </div>
                  <span className="text-sm font-bold text-zinc-300 group-hover:text-white transition-colors">
                    Agregar IVA (21%)
                  </span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative flex items-center justify-center w-6 h-6">
                    <input
                      type="checkbox"
                      checked={hasCommissioner}
                      onChange={(e) => setHasCommissioner(e.target.checked)}
                      className="peer sr-only"
                    />
                    <div className="w-6 h-6 border-2 border-zinc-700 rounded bg-zinc-900 peer-checked:bg-white peer-checked:border-white transition-colors"></div>
                    <CheckSquare className="absolute w-4 h-4 text-black opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" />
                  </div>
                  <span className="text-sm font-bold text-zinc-300 group-hover:text-white transition-colors">
                    Agregar Comisionista {zone ? `(${zone.name})` : ''}
                  </span>
                </label>
              </div>

              <div className="space-y-3 bg-zinc-900/50 p-6 rounded-xl border border-zinc-800/50">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Subtotal (Neto):</span>
                  <span className="text-white font-mono">${subtotal.toLocaleString()}</span>
                </div>
                {hasIva && (
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-400">IVA (21%):</span>
                    <span className="text-white font-mono">${ivaAmount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Envases ({productQuantity} x ${containerPrice}):</span>
                  <span className="text-white font-mono">${containerTotal.toLocaleString()}</span>
                </div>
                {hasCommissioner && (
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-400">Comisionista:</span>
                    <span className="text-white font-mono">${commissionerTotal.toLocaleString()}</span>
                  </div>
                )}
                <div className="pt-3 border-t border-zinc-800 flex justify-between items-end">
                  <span className="text-xs font-bold text-zinc-500 tracking-wider uppercase">Total a Pagar</span>
                  <span className="text-3xl font-bold tracking-tighter text-white">
                    ${totalAmount.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-4 pt-4">
            <button
              type="button"
              onClick={() => setIsGenerating(false)}
              className="px-6 py-3 rounded-xl text-sm font-bold tracking-wider uppercase text-zinc-400 hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!selectedClient || items.length === 0}
              className="bg-white text-black px-8 py-3 rounded-xl text-sm font-bold tracking-wider uppercase hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {editingOrderId ? 'Actualizar Remito' : 'Confirmar y Generar'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <ConfirmModal
        isOpen={isConfirmOpen}
        title="Eliminar Remito"
        message="¿Estás seguro de que deseas eliminar este remito completamente? Esta acción no se puede deshacer y revertirá los saldos."
        onConfirm={executeDeleteOrder}
        onCancel={() => {
          setIsConfirmOpen(false);
          setOrderToDelete(null);
        }}
      />
      <AlertModal
        isOpen={alertConfig.isOpen}
        title={alertConfig.title}
        message={alertConfig.message}
        onClose={() => setAlertConfig({ ...alertConfig, isOpen: false })}
      />
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight">Remitos y Facturas</h2>
        <div className="flex gap-2">
          {selectedOrders.length > 0 && (
            <button
              onClick={generateRouteSheetPDF}
              className="bg-emerald-600/20 text-emerald-500 px-4 py-2 rounded-lg text-sm font-bold tracking-wider uppercase flex items-center gap-2 hover:bg-emerald-600/30 transition-colors"
            >
              <Download className="w-4 h-4" /> Generar Hoja de Ruta ({selectedOrders.length})
            </button>
          )}
          <button
            onClick={() => {
              setIsGenerating(true);
              setEditingOrderId(null);
              setSelectedClient('');
              setItems([]);
              setHasIva(true);
              setHasCommissioner(true);
            }}
            className="bg-white text-black px-4 py-2 rounded-lg text-sm font-bold tracking-wider uppercase flex items-center gap-2 hover:bg-zinc-200 transition-colors"
          >
            <FileText className="w-4 h-4" /> Generar Remito
          </button>
        </div>
      </div>

      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-zinc-800 flex gap-4 items-center flex-col md:flex-row">
          <div className="relative flex-1 max-w-md w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Buscar remitos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600"
            />
          </div>
          <div className="flex gap-2 w-full md:w-auto overflow-x-auto">
            <select
              value={zoneFilter}
              onChange={(e) => setZoneFilter(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 shrink-0"
            >
              <option value="">Todas las zonas</option>
              {[...new Set(zones.map(z => z.name))].sort().map((zoneName: any) => (
                <option key={zoneName} value={zoneName}>{zoneName}</option>
              ))}
            </select>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 shrink-0"
            >
              <option value="date_desc">Más recientes</option>
              <option value="date_asc">Más antiguos</option>
              <option value="alpha_asc">Cliente (A-Z)</option>
              <option value="alpha_desc">Cliente (Z-A)</option>
              <option value="amount_desc">Monto (Mayor a menor)</option>
              <option value="amount_asc">Monto (Menor a mayor)</option>
              <option value="status_delivery">Pendientes de entrega</option>
              <option value="status_payment">Pendientes de pago</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-900/50 text-xs font-bold text-zinc-500 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 font-medium w-10 text-center">
                  <button onClick={handleSelectAllOrders} className="text-zinc-500 hover:text-white">
                    {selectedOrders.length === filteredOrders.length && filteredOrders.length > 0 ? (
                      <CheckSquare className="w-5 h-5" />
                    ) : (
                      <Square className="w-5 h-5" />
                    )}
                  </button>
                </th>
                <th className="px-6 py-4 font-medium">ID / Nº Serie</th>
                <th className="px-6 py-4 font-medium">Fecha</th>
                <th className="px-6 py-4 font-medium">Cliente</th>
                <th className="px-6 py-4 font-medium text-right">Monto</th>
                <th className="px-6 py-4 font-medium text-center">Envases</th>
                <th className="px-6 py-4 font-medium text-center">Estado de Pago</th>
                <th className="px-6 py-4 font-medium text-center">Estado de Cumplimiento</th>
                <th className="px-6 py-4 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {filteredOrders.map((order) => {
                const isSelected = selectedOrders.includes(order.id);
                // Also show a sequential number if selected to see order 
                const selectedIndex = selectedOrders.indexOf(order.id);
                
                return (
                <tr key={order.id} className={`hover:bg-zinc-900/50 transition-colors cursor-pointer ${isSelected ? 'bg-zinc-900/50' : ''}`} onClick={(e) => {
                  if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('select')) return;
                  handleSelectOrder(order.id);
                }}>
                  <td className="px-6 py-4 flex items-center justify-center relative">
                    {isSelected ? (
                      <div className="relative">
                        <CheckSquare className="w-5 h-5 text-white" />
                        <span className="absolute -top-2 -right-2 bg-emerald-500 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full font-bold">
                          {selectedIndex + 1}
                        </span>
                      </div>
                    ) : (
                      <Square className="w-5 h-5 text-zinc-600" />
                    )}
                  </td>
                  <td className="px-6 py-4 font-mono text-zinc-400">
                    {order.serial_number || order.id.substring(0, 8)}
                  </td>
                  <td className="px-6 py-4 text-zinc-400">{format(new Date(order.date), 'dd/MM/yyyy')}</td>
                  <td className="px-6 py-4 font-medium text-white">{getClientName(order.client_id)}</td>
                  <td className="px-6 py-4 text-right font-mono text-white">
                    ${order.total_amount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-center text-zinc-400">{order.containers_returned}</td>
                  <td className="px-6 py-4 text-center">
                    <select
                      value={order.payment_status || 'pending'}
                      onChange={(e) => updateOrderStatus(order.id, 'payment_status', e.target.value)}
                      className={`bg-transparent border-none text-xs font-bold uppercase tracking-wider focus:ring-0 cursor-pointer ${order.payment_status === 'paid' ? 'text-emerald-500' :
                        order.payment_status === 'partially_paid' ? 'text-blue-500' :
                          order.payment_status === 'cancelled' ? 'text-red-500' : 'text-amber-500'
                        }`}
                    >
                      <option value="pending" className="bg-zinc-900 text-amber-500">Pendiente de pago</option>
                      <option value="partially_paid" className="bg-zinc-900 text-blue-500">Pagado parcialmente</option>
                      <option value="paid" className="bg-zinc-900 text-emerald-500">Pagado</option>
                      <option value="cancelled" className="bg-zinc-900 text-red-500">Cancelado</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <select
                      value={order.fulfillment_status || 'pending'}
                      onChange={(e) => updateOrderStatus(order.id, 'fulfillment_status', e.target.value)}
                      className={`bg-transparent border-none text-xs font-bold uppercase tracking-wider focus:ring-0 cursor-pointer ${order.fulfillment_status === 'delivered' ? 'text-emerald-500' :
                        order.fulfillment_status === 'cancelled' || order.fulfillment_status === 'returned' ? 'text-red-500' :
                          order.fulfillment_status === 'shipped' ? 'text-blue-500' : 'text-amber-500'
                        }`}
                    >
                      <option value="pending" className="bg-zinc-900 text-amber-500">En espera de proceso</option>
                      <option value="processing" className="bg-zinc-900 text-amber-500">En proceso</option>
                      <option value="shipped" className="bg-zinc-900 text-blue-500">Enviado</option>
                      <option value="delivered" className="bg-zinc-900 text-emerald-500">Entregado</option>
                      <option value="cancelled" className="bg-zinc-900 text-red-500">Entrega cancelada</option>
                      <option value="returned" className="bg-zinc-900 text-red-500">Devuelto</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 text-right flex justify-end gap-2">
                    <button
                      onClick={() => handleEditOrder(order)}
                      className="text-zinc-500 hover:text-white transition-colors"
                      title="Editar Remito"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => generatePDF(order)}
                      className="text-zinc-500 hover:text-white transition-colors"
                      title="Descargar PDF"
                    >
                      <Download className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDeleteOrder(order.id)}
                      className="text-zinc-500 hover:text-red-500 transition-colors"
                      title="Eliminar Remito"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
                );
              })}
              {filteredOrders.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-zinc-500">
                    No se encontraron remitos.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Success Modal */}
      {successOrder && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-md overflow-hidden text-center p-8">
            <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckSquare className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Remito Confirmado</h3>
            <p className="text-zinc-400 mb-8">
              El remito #{successOrder.serial_number || successOrder.id.substring(0, 8)} se ha generado correctamente.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  generatePDF(successOrder);
                  setSuccessOrder(null);
                }}
                className="w-full bg-white text-black px-4 py-3 rounded-xl text-sm font-bold tracking-wider uppercase hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" /> Imprimir / Descargar PDF
              </button>
              <button
                onClick={() => setSuccessOrder(null)}
                className="w-full bg-zinc-900 text-white px-4 py-3 rounded-xl text-sm font-bold tracking-wider uppercase hover:bg-zinc-800 transition-colors"
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
