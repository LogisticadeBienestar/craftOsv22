import React, { useState, useEffect } from 'react';
import { Search, ArrowUpRight, ArrowDownLeft, CircleAlert, CheckCircle2, AlertCircle, Plus, X, Download, MessageCircle } from 'lucide-react';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getRoundImageBase64 } from '../utils/logo';
import { logoBase64 } from '../utils/logoData';

export default function Accounts() {
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [clientData, setClientData] = useState<any>(null);
  const [initialObservation, setInitialObservation] = useState<string | null>(null);
  const [movements, setMovements] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredClients = clients.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (c.notes && c.notes.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Payment Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'EFECTIVO' | 'TRANSFERENCIA'>('EFECTIVO');
  const [paymentOrderId, setPaymentOrderId] = useState<string | null>(null);

  const fetchClients = () => {
    fetch('/api/clients')
      .then(res => res.json())
      .then(data => setClients(data));
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchAccountData = async () => {
    if (selectedClient) {
      const res = await fetch(`/api/clients/${selectedClient}/account?_t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        setClientData(data);
        setMovements(data.movements || []);
        setInitialObservation(data.initialObservation || null);
      } else {
        setClientData(null);
        setMovements([]);
        setInitialObservation(null);
      }
    } else {
      setClientData(null);
      setMovements([]);
      setInitialObservation(null);
    }
  };

  useEffect(() => {
    fetchAccountData();
  }, [selectedClient]);

  const getStatusColor = (balance: number) => {
    if (balance <= 0) return 'text-emerald-500'; // Al día
    if (balance > 0 && balance <= 10000) return 'text-yellow-500'; // Con demora
    return 'text-red-500'; // En mora
  };

  const getStatusIcon = (balance: number) => {
    if (balance <= 0) return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
    if (balance > 0 && balance <= 10000) return <CircleAlert className="w-4 h-4 text-yellow-500" />;
    return <AlertCircle className="w-4 h-4 text-red-500" />;
  };

  const getStatusText = (balance: number) => {
    if (balance <= 0) return 'Al día';
    if (balance > 0 && balance <= 10000) return 'Con demora';
    return 'En mora';
  };

  const handleOpenPaymentModal = (orderId: string | null = null, defaultAmount: number = 0) => {
    setPaymentOrderId(orderId);
    setPaymentAmount(defaultAmount > 0 ? defaultAmount.toString() : '');
    setPaymentMethod('EFECTIVO');
    setIsPaymentModalOpen(true);
  };

  const handleRegisterPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient || !paymentAmount) return;

    const paymentData = {
      id: crypto.randomUUID(),
      client_id: selectedClient,
      order_id: paymentOrderId,
      amount: parseFloat(paymentAmount),
      method: paymentMethod,
      date: new Date().toISOString()
    };

    await fetch('/api/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(paymentData)
    });

    setIsPaymentModalOpen(false);
    fetchAccountData();
    fetchClients(); // Refresh client list to update balances
  };

  const generateWhatsAppMessage = (type: 'report' | 'reminder') => {
    if (!selectedClient || !clientData) return null;
    const client = clients.find(c => c.id === selectedClient);
    if (!client) return null;

    const sortedMovements = [...movements].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    let sumOfMovements = 0;
    for (const mov of sortedMovements) {
      if (mov.type === 'order') sumOfMovements += mov.total_amount;
      else sumOfMovements -= mov.amount;
    }
    const initialBalance = clientData.balance - sumOfMovements;
    let runningBalance = initialBalance;

    let text = '';
    
    if (type === 'reminder') {
      text += `Hola *${client.name}* 👋\n`;
      text += `Te escribimos para recordarte que tenés un saldo pendiente de pago de *$${Math.abs(clientData.balance).toLocaleString()}*.\n\n`;
      text += `Para tu control, te compartimos el detalle de cómo está compuesto:\n\n`;
    } else {
      text += `*Reporte de Cuenta Corriente*\n`;
      text += `👤 *Cliente:* ${client.name}\n`;
      text += `💰 *Saldo Pendiente:* $${Math.abs(clientData.balance).toLocaleString()}\n\n`;
      text += `*Detalle de Movimientos:*\n\n`;
    }

    if (initialBalance !== 0 || initialObservation) {
      text += `🔸 *Saldo Inicial:* $${initialBalance.toLocaleString()} ${initialObservation ? `(${initialObservation})` : ''}\n`;
    }

    const recentMovements = sortedMovements.slice(-15);
    if (sortedMovements.length > 15) {
      text += `_(Mostrando últimos 15 movimientos...)_\n`;
      const previousMovements = sortedMovements.slice(0, sortedMovements.length - 15);
      for (const mov of previousMovements) {
        const debit = mov.type === 'order' ? mov.total_amount : 0;
        const credit = mov.type !== 'order' ? mov.amount : 0;
        runningBalance += debit - credit;
      }
    }

    for (const mov of recentMovements) {
      const isOrder = mov.type === 'order';
      const date = format(new Date(mov.date), 'dd/MM');
      
      let detail = '';
      if (isOrder) {
        detail = `Remito ${mov.serial_number ? `#${mov.serial_number}` : ''}`;
      } else {
        detail = `Pago (${mov.method})`;
      }

      const debit = isOrder ? mov.total_amount : 0;
      const credit = !isOrder ? mov.amount : 0;
      runningBalance += debit - credit;

      if (isOrder) {
        text += `🔴 ${date} - ${detail}: +$${debit.toLocaleString()}\n`;
      } else {
        text += `🟢 ${date} - ${detail}: -$${credit.toLocaleString()}\n`;
      }
    }

    if (recentMovements.length > 0) {
      text += `\n*Saldo Actual: $${Math.abs(clientData.balance).toLocaleString()}*\n`;
    }

    if (type === 'reminder') {
      text += `\nAvisanos cuando puedas realizar el pago o si tenés alguna duda. ¡Gracias!`;
    }

    return text;
  };

  const handleWhatsAppShare = (type: 'report' | 'reminder') => {
    const text = generateWhatsAppMessage(type);
    if (!text) return;
    
    // Copy to clipboard
    navigator.clipboard.writeText(text).then(() => {
      alert('Texto copiado al portapapeles. Listo para pegar en WhatsApp.');
    }).catch(err => {
      console.error('Failed to copy', err);
      // Fallback: open whatsapp link
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    });
  };

  const generateReport = async () => {
    if (!selectedClient || !clientData) return;

    const client = clients.find(c => c.id === selectedClient);
    if (!client) return;

    const doc = new jsPDF();

    // Background color
    doc.setFillColor(255, 255, 255); // White
    doc.rect(0, 0, 210, 297, 'F');
    doc.setTextColor(0, 0, 0); // Black text

    // Header
    const roundLogoData = await getRoundImageBase64(logoBase64);
    doc.addImage(roundLogoData, 'PNG', 14, 14, 16, 16);

    doc.setFontSize(20);
    doc.text('Reporte de Cuenta Corriente', 34, 22);

    doc.setFontSize(12);
    doc.text(`Cliente: ${client.name}`, 34, 32);
    doc.text(`Fecha: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 34, 38);

    const balanceText = `Saldo pendiente de pago: $${Math.abs(clientData.balance).toLocaleString()}`;
    doc.setFont(undefined, 'bold');
    doc.text(balanceText, 34, 46);
    doc.setFont(undefined, 'normal');

    // Table data
    const sortedMovements = [...movements].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let sumOfMovements = 0;
    for (const mov of sortedMovements) {
      if (mov.type === 'order') {
        sumOfMovements += mov.total_amount;
      } else {
        sumOfMovements -= mov.amount;
      }
    }

    const initialBalance = clientData.balance - sumOfMovements;
    let runningBalance = initialBalance;

    const tableData = [];

    // Add initial balance row
    tableData.push([
      '-',
      initialObservation || 'Saldo Inicial / Arrastre',
      '-',
      '-',
      `$${initialBalance.toLocaleString()}`
    ]);

    for (const mov of sortedMovements) {
      const isOrder = mov.type === 'order';
      const linkedOrder = !isOrder && mov.order_id ? movements.find(m => m.type === 'order' && m.id === mov.order_id) : null;

      const date = format(new Date(mov.date), 'dd/MM/yyyy HH:mm');

      let detail = '';
      if (isOrder) {
        detail = `Remito / Factura ${mov.serial_number ? `#${mov.serial_number}` : ''}\n`;
        detail += `Total Remito: $${mov.total_amount.toLocaleString()}\n`;
        detail += `Envases Devueltos: ${mov.containers_returned || 0}`;
        if (mov.container_total > 0) {
          detail += `\nEnvases: ${mov.container_quantity || 0} ($${mov.container_total.toLocaleString()})`;
        }
      } else {
        detail = `Pago (${mov.method})${linkedOrder ? ` a Remito #${linkedOrder.serial_number || linkedOrder.id.substring(0, 8)}` : ''}`;
      }

      const debit = isOrder ? mov.total_amount : 0;
      const credit = !isOrder ? mov.amount : 0;

      runningBalance += debit - credit;

      tableData.push([
        date,
        detail,
        isOrder ? `$${debit.toLocaleString()}` : '-',
        !isOrder ? `$${credit.toLocaleString()}` : '-',
        `$${runningBalance.toLocaleString()}`
      ]);
    }

    autoTable(doc, {
      startY: 54,
      head: [['Fecha', 'Detalle', 'Debe', 'Haber', 'Saldo']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [40, 40, 40], textColor: [255, 255, 255] },
      bodyStyles: { textColor: [40, 40, 40] },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      styles: { fontSize: 9, cellPadding: 3, lineColor: [200, 200, 200], lineWidth: 0.1 },
      columnStyles: {
        1: { cellWidth: 80 } // Give more width to detail column
      }
    });

    doc.save(`Cuenta_Corriente_${client.name.replace(/\s+/g, '_')}.pdf`);
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight">Cuenta Corriente</h2>
        {selectedClient && (
          <div className="flex gap-2">
            <button
              onClick={() => handleWhatsAppShare('reminder')}
              className="bg-emerald-600/20 text-emerald-500 px-3 py-2 rounded-lg text-xs font-bold tracking-wider uppercase flex items-center gap-1 hover:bg-emerald-600/30 transition-colors"
              title="Copiar Recordatorio de Pago para WhatsApp"
            >
              <MessageCircle className="w-4 h-4" /> Cobrar
            </button>
            <button
              onClick={() => handleWhatsAppShare('report')}
              className="bg-zinc-800 text-white px-3 py-2 rounded-lg text-xs font-bold tracking-wider uppercase flex items-center gap-1 hover:bg-zinc-700 transition-colors"
              title="Copiar Reporte para WhatsApp"
            >
              <MessageCircle className="w-4 h-4" /> Reporte WA
            </button>
            <button
              onClick={generateReport}
              className="bg-zinc-800 text-white px-3 py-2 rounded-lg text-xs font-bold tracking-wider uppercase flex items-center gap-1 hover:bg-zinc-700 transition-colors"
            >
              <Download className="w-4 h-4" /> PDF
            </button>
            <button
              onClick={() => handleOpenPaymentModal(null, clientData?.balance || 0)}
              className="bg-white text-black px-3 py-2 rounded-lg text-xs font-bold tracking-wider uppercase flex items-center gap-1 hover:bg-zinc-200 transition-colors"
            >
              <Plus className="w-4 h-4" /> Pago
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Client List */}
        <div className="lg:col-span-1 bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden flex flex-col h-[calc(100vh-12rem)]">
          <div className="p-4 border-b border-zinc-800">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                placeholder="Buscar cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredClients.map(client => (
              <button
                key={client.id}
                onClick={() => setSelectedClient(client.id)}
                className={`w-full text-left p-4 border-b border-zinc-800/50 hover:bg-zinc-900/50 transition-colors ${selectedClient === client.id ? 'bg-zinc-900 border-l-2 border-l-white' : ''
                  }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <div className="font-medium text-white">{client.name} {client.notes ? <span className="text-zinc-500 font-normal text-xs ml-1">({client.notes})</span> : ''}</div>
                  <div title={getStatusText(client.balance)}>
                    {getStatusIcon(client.balance)}
                  </div>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-500 truncate max-w-[120px]">{client.email}</span>
                  <span className={`font-mono font-bold ${getStatusColor(client.balance)}`}>
                    ${Math.abs(client.balance).toLocaleString()}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Account Details */}
        <div className="lg:col-span-2 bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden flex flex-col h-[calc(100vh-12rem)]">
          {selectedClient && clientData ? (
            <>
              <div className="p-6 border-b border-zinc-800 bg-zinc-900/50 flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-bold text-white mb-1">
                    {clients.find(c => c.id === selectedClient)?.name}
                  </h3>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(clientData.balance)}
                    <span className={`text-xs font-bold tracking-wider uppercase ${getStatusColor(clientData.balance)}`}>
                      Estado: {getStatusText(clientData.balance)}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-zinc-500 tracking-wider uppercase mb-1">Saldo Pendiente de Pago</div>
                  <div className={`text-3xl font-bold tracking-tighter ${getStatusColor(clientData.balance)}`}>
                    ${Math.abs(clientData.balance).toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden mt-6">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-zinc-900 text-xs font-bold text-zinc-500 uppercase tracking-wider">
                      <tr>
                        <th className="px-6 py-4">Fecha</th>
                        <th className="px-6 py-4">Detalle</th>
                        <th className="px-6 py-4 text-right">Débito / Crédito</th>
                        <th className="px-6 py-4 text-right border-l border-zinc-800">Saldo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/50">
                      <tr>
                        <td className="px-6 py-4 text-zinc-500">-</td>
                        <td className="px-6 py-4 text-zinc-400 italic font-medium whitespace-pre-wrap">{initialObservation || 'Saldo Inicial / Arrastre'}</td>
                        <td className="px-6 py-4 text-right text-zinc-500">-</td>
                        <td className="px-6 py-4 text-right font-mono font-bold text-white border-l border-zinc-800/50">
                          ${(() => {
                            const sortedMovements = [...movements].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                            let sumOfMovements = 0;
                            for (const mov of sortedMovements) {
                              if (mov.type === 'order') {
                                sumOfMovements += mov.total_amount;
                              } else {
                                sumOfMovements -= mov.amount;
                              }
                            }
                            return (clientData.balance - sumOfMovements).toLocaleString();
                          })()}
                        </td>
                      </tr>
                      {(() => {
                        const sortedMovementsForBalance = [...movements].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                        let totalSumOfAllMovements = 0;
                        for (const m of sortedMovementsForBalance) {
                          if (m.type === 'order') {
                            totalSumOfAllMovements += m.total_amount;
                          } else {
                            totalSumOfAllMovements -= m.amount;
                          }
                        }
                        let runningBal = clientData.balance - totalSumOfAllMovements;

                        return sortedMovementsForBalance.map((mov, idx) => {
                          const isOrder = mov.type === 'order';
                          const linkedOrder = !isOrder && mov.order_id ? movements.find(m => m.type === 'order' && m.id === mov.order_id) : null;

                          const debit = isOrder ? mov.total_amount : 0;
                          const credit = !isOrder ? mov.amount : 0;

                          runningBal += debit - credit;

                          return (
                            <tr key={mov.id || idx}>
                              <td className="px-6 py-4 text-zinc-500">
                                {format(new Date(mov.date), 'dd MMM yyyy HH:mm')}
                              </td>
                              <td className="px-6 py-4">
                                <div className="font-bold text-white mb-1">
                                  {isOrder ? `Remito / Factura ${mov.serial_number ? `#${mov.serial_number}` : ''}` : `Pago (${mov.method})${linkedOrder ? ` a Remito #${linkedOrder.serial_number || linkedOrder.id.substring(0, 8)}` : ''}`}
                                </div>
                                <div className="text-xs text-zinc-500 font-mono">
                                  {format(new Date(mov.date), 'dd MMM yyyy HH:mm')}
                                </div>
                                {isOrder && mov.payment_status && (
                                  <div className="mt-1">
                                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${mov.payment_status === 'paid' ? 'bg-emerald-500/10 text-emerald-500' :
                                      mov.payment_status === 'partially_paid' ? 'bg-blue-500/10 text-blue-500' :
                                        mov.payment_status === 'cancelled' ? 'bg-red-500/10 text-red-500' :
                                          'bg-amber-500/10 text-amber-500'
                                      }`}>
                                      {mov.payment_status === 'paid' ? 'Pagado' :
                                        mov.payment_status === 'partially_paid' ? 'Pagado Parcial' :
                                          mov.payment_status === 'cancelled' ? 'Cancelado' : 'Pendiente'}
                                    </span>
                                  </div>
                                )}
                              </td>
                              <td className="px-6 py-4 text-right flex flex-col items-end gap-2">
                                <div className={`font-mono font-bold text-lg ${isOrder ? 'text-red-400' : 'text-emerald-400'}`}>
                                  {isOrder ? '+' : '-'}${Math.abs(isOrder ? mov.total_amount : mov.amount).toLocaleString()}
                                </div>
                                {isOrder && mov.containers_returned > 0 && (
                                  <div className="text-xs text-zinc-500">
                                    {mov.containers_returned} envases devueltos
                                  </div>
                                )}
                                {isOrder && mov.payment_status !== 'paid' && mov.payment_status !== 'cancelled' && (
                                  <button
                                    onClick={() => {
                                      const paymentsForOrder = movements.filter(m => m.type === 'payment' && m.order_id === mov.id);
                                      const totalPaid = paymentsForOrder.reduce((sum, p) => sum + p.amount, 0);
                                      const remaining = mov.total_amount - totalPaid;
                                      handleOpenPaymentModal(mov.id, remaining);
                                    }}
                                    className="text-xs font-bold text-zinc-400 hover:text-white transition-colors uppercase tracking-wider mt-1"
                                  >
                                    Registrar Pago
                                  </button>
                                )}
                                {!isOrder && !mov.order_id && (
                                  <button
                                    onClick={async () => {
                                      if (confirm('¿Estás seguro de que deseas eliminar este pago? El saldo del cliente se revertirá.')) {
                                        try {
                                          const res = await fetch(`/api/payments/${mov.id}`, { method: 'DELETE' });
                                          if (!res.ok) throw new Error('Error al eliminar el pago');
                                          fetchAccountData();
                                          fetchClients();
                                        } catch (error) {
                                          console.error(error);
                                          alert('Hubo un error al eliminar el pago.');
                                        }
                                      }
                                    }}
                                    className="text-xs font-bold text-red-500 hover:text-red-400 transition-colors uppercase tracking-wider mt-1"
                                  >
                                    Eliminar Pago
                                  </button>
                                )}
                              </td>
                              <td className="px-6 py-4 text-right font-mono font-bold text-white border-l border-zinc-800/50">
                                ${runningBal.toLocaleString()}
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                  {movements.length === 0 && (
                    <div className="text-center text-zinc-500 py-12">
                      No hay movimientos registrados para este cliente.
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-zinc-500">
              Selecciona un cliente para ver su cuenta corriente.
            </div>
          )}
        </div>
      </div>

      {/* Payment Modal */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
              <h3 className="text-lg font-bold text-white">
                {paymentOrderId ? 'Registrar Pago de Remito' : 'Registrar Pago a Cuenta'}
              </h3>
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="text-zinc-500 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleRegisterPayment} className="p-6 space-y-6">
              <div>
                <label className="block text-xs font-bold text-zinc-500 tracking-wider uppercase mb-2">
                  Monto a Pagar ($)
                </label>
                <input
                  type="number"
                  required
                  min="0.01"
                  step="0.01"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-white focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 text-xl font-medium"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-500 tracking-wider uppercase mb-2">
                  Medio de Cobro
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('EFECTIVO')}
                    className={`py-3 rounded-xl text-sm font-bold tracking-wider transition-all ${paymentMethod === 'EFECTIVO'
                      ? 'bg-zinc-800 text-white border border-zinc-700'
                      : 'bg-zinc-900 text-zinc-500 border border-zinc-800 hover:border-zinc-700'
                      }`}
                  >
                    EFECTIVO
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('TRANSFERENCIA')}
                    className={`py-3 rounded-xl text-sm font-bold tracking-wider transition-all ${paymentMethod === 'TRANSFERENCIA'
                      ? 'bg-zinc-800 text-white border border-zinc-700'
                      : 'bg-zinc-900 text-zinc-500 border border-zinc-800 hover:border-zinc-700'
                      }`}
                  >
                    TRANSFERENCIA
                  </button>
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={!paymentAmount || parseFloat(paymentAmount) <= 0}
                  className="w-full bg-white text-black rounded-xl py-4 text-sm font-bold tracking-widest uppercase hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Confirmar Pago
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
