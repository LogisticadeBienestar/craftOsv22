import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Deliveries() {
  const { currentUser } = useAuth();
  const [clients, setClients] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({});
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedOrder, setSelectedOrder] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'EFECTIVO' | 'TRANSFERENCIA'>('EFECTIVO');
  const [remitoAmount, setRemitoAmount] = useState('');
  const [containers, setContainers] = useState('0');
  const [collectedAmount, setCollectedAmount] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = () => {
    fetch('/api/clients')
      .then(res => res.json())
      .then(data => setClients(data));
    fetch('/api/orders')
      .then(res => res.json())
      .then(data => setOrders(data));
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => setSettings(data));
  };

  const handleClientChange = (clientId: string) => {
    setSelectedClient(clientId);
    setSelectedOrder('');
    setRemitoAmount('');
  };

  const handleOrderChange = (orderId: string) => {
    setSelectedOrder(orderId);
    const order = orders.find(o => o.id === orderId);
    if (order) {
      setRemitoAmount(order.total_amount.toString());
    } else {
      setRemitoAmount('');
    }
  };

  const handleConfirm = async () => {
    if (!selectedClient || !selectedOrder || !remitoAmount) return;

    const order = orders.find(o => o.id === selectedOrder);
    const finalAmount = parseFloat(remitoAmount);
    const collected = parseFloat(collectedAmount) || 0;
    const containersReturned = parseInt(containers) || 0;

    const containerPrice = parseFloat(settings.container_price) || 0;
    const containerValue = containersReturned * containerPrice;
    const discountedTotal = finalAmount - containerValue;

    await fetch(`/api/orders/${selectedOrder}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...order,
        total_amount: discountedTotal,
        containers_returned: containersReturned,
        fulfillment_status: 'delivered',
        delivered_by: currentUser?.id,
        payment_status: order.payment_status
      })
    });

    if (collected > 0) {
      const paymentData = {
        id: crypto.randomUUID(),
        client_id: selectedClient,
        order_id: selectedOrder,
        amount: collected,
        method: paymentMethod,
        date: new Date().toISOString()
      };

      await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentData)
      });
    }

    setSelectedClient('');
    setSelectedOrder('');
    setRemitoAmount('');
    setContainers('0');
    setCollectedAmount('');
    fetchData();
    alert('Operación confirmada exitosamente');
  };

  const parsedRemito = parseFloat(remitoAmount) || 0;
  const parsedContainers = parseInt(containers) || 0;
  const containerPrice = parseFloat(settings.container_price) || 0;
  const containerValue = parsedContainers * containerPrice;
  const parsedCollected = parseFloat(collectedAmount) || 0;

  const currentClientData = clients.find(c => c.id === selectedClient);
  const activeOrdersForClient = orders.filter(o =>
    o.client_id === selectedClient &&
    o.fulfillment_status !== 'delivered' &&
    o.fulfillment_status !== 'cancelled' &&
    o.fulfillment_status !== 'returned'
  );

  const totalActiveOrdersAmount = activeOrdersForClient.reduce((sum, order) => {
    return sum + (order.total_amount || 0);
  }, 0);

  const clientPreviousBalance = currentClientData ? (currentClientData.balance - totalActiveOrdersAmount) : 0;

  const aLiquidarResumen = parsedRemito - containerValue;
  const aLiquidarTotal = aLiquidarResumen + clientPreviousBalance;
  const saldoFinal = aLiquidarTotal - parsedCollected;

  const sortedClients = [...clients].sort((a, b) => a.name.localeCompare(b.name, 'es'));

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-8 tracking-tight">Registro de Entrega / Cobranza</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left Column */}
        <div className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-zinc-500 tracking-wider uppercase mb-2">Cliente / Local</label>
            <select
              value={selectedClient}
              onChange={(e) => handleClientChange(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-white focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 appearance-none"
            >
              <option value="" disabled>Seleccionar cliente...</option>
              {sortedClients.map(c => (
                <option key={c.id} value={c.id}>{c.name} {c.notes ? `(${c.notes})` : ''}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-500 tracking-wider uppercase mb-2">Remito Activo</label>
            <select
              value={selectedOrder}
              onChange={(e) => handleOrderChange(e.target.value)}
              disabled={!selectedClient}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-white focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 appearance-none disabled:opacity-50"
            >
              <option value="" disabled>
                {!selectedClient ? 'Seleccione un cliente primero' :
                  activeOrdersForClient.length === 0 ? 'No hay remitos activos para este cliente' :
                    'Seleccionar remito...'}
              </option>
              {activeOrdersForClient.map(o => (
                <option key={o.id} value={o.id}>
                  Remito #{o.serial_number || o.id.substring(0, 8)} - ${o.total_amount.toLocaleString()}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-500 tracking-wider uppercase mb-2">Monto Remito</label>
              <input
                type="number"
                value={remitoAmount}
                onChange={(e) => setRemitoAmount(e.target.value)}
                disabled={!selectedOrder}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-white focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 text-xl font-medium disabled:opacity-50"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-500 tracking-wider uppercase mb-2">Envases Devueltos</label>
              <input
                type="number"
                value={containers}
                onChange={(e) => setContainers(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-white focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 text-xl font-medium"
              />
            </div>
          </div>

          {/* Simplified Cobro Summary */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
            <div className="text-xs font-bold text-zinc-500 tracking-wider uppercase">Resumen de Cobro</div>

            <div className="flex justify-between items-center">
              <div>
                <div className="text-sm font-medium text-zinc-300">Este remito</div>
                {parsedContainers > 0 && (
                  <div className="text-[11px] text-zinc-500">
                    −{parsedContainers} envase{parsedContainers !== 1 ? 's' : ''} (−${containerValue.toLocaleString()})
                  </div>
                )}
              </div>
              <div className="text-xl font-bold text-white">${aLiquidarResumen.toLocaleString()}</div>
            </div>

            {clientPreviousBalance !== 0 && (
              <div className="flex justify-between items-center pt-3 border-t border-zinc-800">
                <div>
                  <div className={`text-sm font-medium ${clientPreviousBalance > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                    {clientPreviousBalance > 0 ? 'Deuda previa' : 'Saldo a favor'}
                  </div>
                  <div className="text-[11px] text-zinc-500">Cuenta corriente del cliente</div>
                </div>
                <div className={`text-xl font-bold ${clientPreviousBalance > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                  {clientPreviousBalance > 0 ? '+' : '−'}${Math.abs(clientPreviousBalance).toLocaleString()}
                </div>
              </div>
            )}

            <div className="flex justify-between items-center pt-3 border-t border-zinc-700">
              <div className="text-sm font-bold text-white uppercase tracking-wider">Total a Cobrar</div>
              <div className="text-4xl font-bold tracking-tighter text-emerald-400">
                ${aLiquidarTotal.toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-zinc-500 tracking-wider uppercase mb-2">Medio de Cobro</label>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setPaymentMethod('EFECTIVO')}
                className={`py-4 rounded-xl text-sm font-bold tracking-wider transition-all ${paymentMethod === 'EFECTIVO'
                  ? 'bg-zinc-800 text-white border border-zinc-700'
                  : 'bg-zinc-900 text-zinc-500 border border-zinc-800 hover:border-zinc-700'
                  }`}
              >
                💵 EFECTIVO
              </button>
              <button
                onClick={() => setPaymentMethod('TRANSFERENCIA')}
                className={`py-4 rounded-xl text-sm font-bold tracking-wider transition-all ${paymentMethod === 'TRANSFERENCIA'
                  ? 'bg-zinc-800 text-white border border-zinc-700'
                  : 'bg-zinc-900 text-zinc-500 border border-zinc-800 hover:border-zinc-700'
                  }`}
              >
                💳 TRANSFER.
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-500 tracking-wider uppercase mb-2">Cobrado ($)</label>
              <input
                type="number"
                value={collectedAmount}
                onChange={(e) => setCollectedAmount(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-white focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 text-xl font-medium"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-500 tracking-wider uppercase mb-2">Saldo Restante</label>
              <div className={`w-full bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-xl font-medium flex items-center justify-center ${saldoFinal > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                ${saldoFinal.toLocaleString()}
              </div>
              {saldoFinal > 0 && <p className="text-xs text-zinc-500 mt-2 text-center">A cuenta corriente del cliente</p>}
              {saldoFinal <= 0 && <p className="text-xs text-zinc-500 mt-2 text-center">Cuenta saldada o a favor</p>}
            </div>
          </div>

          {parsedCollected > 0 && (
            <div className={`rounded-xl p-4 border text-sm font-medium ${paymentMethod === 'EFECTIVO' ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 'bg-blue-500/10 border-blue-500/30 text-blue-400'}`}>
              Se registrará <span className="font-bold">${parsedCollected.toLocaleString()}</span> como <span className="font-bold">{paymentMethod}</span>
            </div>
          )}

          <div className="pt-4">
            <button
              onClick={handleConfirm}
              disabled={!selectedClient || !remitoAmount}
              className="w-full bg-white text-black rounded-xl py-5 text-sm font-bold tracking-widest uppercase hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Confirmar Operación
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
