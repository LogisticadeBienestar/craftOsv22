import { useState, useEffect } from 'react';
import { format, isWithinInterval, parseISO } from 'date-fns';
import { CheckSquare, Droplets, Car, DollarSign, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function Settlements() {
  const [activeTab, setActiveTab] = useState<'vehicle' | 'washing'>('vehicle');
  const [vehicleRecords, setVehicleRecords] = useState<any[]>([]);
  const [washingRecords, setWashingRecords] = useState<any[]>([]);
  const [advances, setAdvances] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({});
  const [washingPrices, setWashingPrices] = useState<any[]>([]);
  const [settlements, setSettlements] = useState<any[]>([]);
  const [isLiquidating, setIsLiquidating] = useState(false);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [exchangeRate, setExchangeRate] = useState('1150');

  // Custom Items
  const [customItems, setCustomItems] = useState<Array<{ description: string, amount: number }>>([]);
  const [newCustomDescription, setNewCustomDescription] = useState('');
  const [newCustomAmount, setNewCustomAmount] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = () => {
    fetch('/api/vehicle-usage').then(res => res.json()).then(data => setVehicleRecords(data));
    fetch('/api/washing-records').then(res => res.json()).then(data => setWashingRecords(data));
    fetch('/api/advances').then(res => res.json()).then(data => setAdvances(data));
    fetch('/api/tasks').then(res => res.json()).then(data => {
      // Auto-assign prices if 0 and type matches
      fetch('/api/settings').then(sRes => sRes.json()).then(settingsData => {
        const updatedTasks = data.map((t: any) => {
          if (t.amount === 0) {
            if (t.description === 'Mantenimiento') return { ...t, amount: parseFloat(settingsData.task_price_mantenimiento || 0) };
            if (t.description === 'Producción') return { ...t, amount: parseFloat(settingsData.task_price_produccion || 0) };
            if (t.description === 'Tambo') return { ...t, amount: parseFloat(settingsData.task_price_tambo || 0) };
          }
          return t;
        });
        setTasks(updatedTasks);
      });
    });
    fetch('/api/users').then(res => res.json()).then(data => setUsers(data));
    fetch('/api/settings').then(res => res.json()).then(data => setSettings(data));
    fetch('/api/washing-prices').then(res => res.json()).then(data => setWashingPrices(data));
    fetch('/api/settlements').then(res => res.json()).then(data => setSettlements(data));
  };

  const getUserName = (id: string) => {
    const user = users.find(u => u.id === id);
    return user ? user.name : 'Desconocido';
  };

  const filterByDate = (records: any[]) => {
    return records.filter(record => {
      if (!startDate && !endDate) return true;
      const recordDate = parseISO(record.date);
      const start = startDate ? parseISO(startDate) : new Date(0);
      const end = endDate ? parseISO(endDate) : new Date(8640000000000000);
      return isWithinInterval(recordDate, { start, end });
    });
  };

  const pendingVehicleRecords = filterByDate(vehicleRecords.filter(r => r.status === 'pending'));
  const pendingWashingRecords = filterByDate(washingRecords.filter(r => r.status === 'pending'));
  const pendingAdvances = filterByDate(advances.filter(r => r.status === 'pending'));
  const pendingTasks = filterByDate(tasks.filter(r => r.status === 'pending'));

  const vehiclePrice = parseFloat(settings.vehicle_usage_price || '0');

  const baseVehicleTotal = pendingVehicleRecords.length * vehiclePrice * 0.6;
  const companyTotal = pendingVehicleRecords.length * vehiclePrice * 0.4;
  const companyTotalUSD = companyTotal / (parseFloat(exchangeRate) || 1);

  const advancesTotal = pendingAdvances.reduce((sum, adv) => sum + (adv.amount || 0), 0);
  const tasksTotal = pendingTasks.reduce((sum, task) => sum + (task.amount || 0), 0);
  const customItemsTotal = customItems.reduce((sum, item) => sum + (item.amount || 0), 0);

  const vehicleTotal = baseVehicleTotal - advancesTotal + tasksTotal + customItemsTotal;

  const getWashingPrice = (type: string) => {
    const priceObj = washingPrices.find(p => p.container_type === type);
    return priceObj ? priceObj.price : 0;
  };

  const calculateWashingTotal = (record: any) => {
    return (
      (record.qty_200cc || 0) * getWashingPrice('200cc') +
      (record.qty_500cc || 0) * getWashingPrice('500cc') +
      (record.qty_800cc || 0) * getWashingPrice('800cc') +
      (record.qty_910cc || 0) * getWashingPrice('910cc') +
      (record.qty_bidones || 0) * getWashingPrice('bidones')
    );
  };

  const washingTotal = pendingWashingRecords.reduce((sum, record) => sum + calculateWashingTotal(record), 0);

  const generateVehiclePDF = (tableData: any[]) => {
    const doc = new jsPDF();

    doc.setFontSize(20);
    doc.text('Liquidación de Uso de Vehículo', 14, 22);

    doc.setFontSize(12);
    doc.text(`Beneficiario: Charly`, 14, 32);
    doc.text(`Fecha de Emisión: ${format(new Date(), 'dd/MM/yyyy')}`, 14, 40);
    doc.text(`Periodo: ${pendingVehicleRecords.length > 0 ? format(new Date(pendingVehicleRecords[pendingVehicleRecords.length - 1].date + 'T12:00:00'), 'dd/MM/yyyy') : '-'} al ${pendingVehicleRecords.length > 0 ? format(new Date(pendingVehicleRecords[0].date + 'T12:00:00'), 'dd/MM/yyyy') : '-'}`, 14, 48);
    doc.text(`Tasa de Cambio: $${exchangeRate} ARS`, 14, 56);

    autoTable(doc, {
      startY: 64,
      head: [['Detalle Operativo', 'Cant.', 'Unitario', 'Total (ARS)']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [24, 24, 27] }
    });

    doc.save(`Liquidacion_Vehiculo_${format(new Date(), 'yyyyMMdd')}.pdf`);
  };

  const generateWashingPDF = (tableData: any[]) => {
    const doc = new jsPDF();

    doc.setFontSize(20);
    doc.text('Liquidación de Lavado de Envases', 14, 22);

    doc.setFontSize(12);
    doc.text(`Beneficiario: Belén`, 14, 32);
    doc.text(`Fecha de Emisión: ${format(new Date(), 'dd/MM/yyyy')}`, 14, 40);
    doc.text(`Periodo: ${pendingWashingRecords.length > 0 ? format(new Date(pendingWashingRecords[pendingWashingRecords.length - 1].date + 'T12:00:00'), 'dd/MM/yyyy') : '-'} al ${pendingWashingRecords.length > 0 ? format(new Date(pendingWashingRecords[0].date + 'T12:00:00'), 'dd/MM/yyyy') : '-'}`, 14, 48);

    autoTable(doc, {
      startY: 56,
      head: [['Detalle Operativo', 'Cant.', 'Unitario', 'Total (ARS)']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [24, 24, 27] }
    });

    doc.save(`Liquidacion_Lavado_${format(new Date(), 'yyyyMMdd')}.pdf`);
  };

  const handleLiquidateVehicle = async () => {
    if (pendingVehicleRecords.length === 0 && advancesTotal === 0 && customItemsTotal === 0) return;
    if (!confirm('¿Estás seguro de liquidar los registros de uso de vehículo pendientes?')) return;

    setIsLiquidating(true);
    try {
      const tableData = [
        ['Uso Vehículo Kangoo (60%)', `${pendingVehicleRecords.length} d`, `$${(vehiclePrice * 0.6).toLocaleString()}`, `$${baseVehicleTotal.toLocaleString()}`]
      ];

      if (tasksTotal > 0) {
        tableData.push(['Tareas Adicionales', `${pendingTasks.length} un`, '-', `$${tasksTotal.toLocaleString()}`]);
      }

      if (advancesTotal > 0) {
        tableData.push(['Adelantos de Dinero', '-', '-', `-$${advancesTotal.toLocaleString()}`]);
      }

      customItems.forEach(item => {
        tableData.push([item.description, '-', '-', `$${item.amount.toLocaleString()}`]);
      });

      tableData.push(['Total a Liquidar', '', '', `$${vehicleTotal.toLocaleString()}`]);
      tableData.push(['Empresa (40%)', `${pendingVehicleRecords.length} d`, `$${(vehiclePrice * 0.4).toLocaleString()}`, `$${companyTotal.toLocaleString()} (USD ${companyTotalUSD.toFixed(2)})`]);

      // Create settlement record
      const charlie = users.find(u => u.name === 'Charlie' || u.name === 'Charly');
      if (!charlie) throw new Error('Usuario Charly no encontrado');

      const res = await fetch('/api/settlements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: format(new Date(), 'yyyy-MM-dd'),
          user_id: charlie.id,
          type: 'vehicle',
          amount: vehicleTotal,
          details: JSON.stringify({
            summary: `Liquidación: ${pendingVehicleRecords.length} días. Adelantos: -$${advancesTotal}. Tareas: $${tasksTotal}. Extra: $${customItemsTotal}.`,
            tableData
          })
        })
      });

      if (!res.ok) throw new Error('Error al crear liquidación');
      const settlementData = await res.json();
      const settlementId = settlementData.id;

      // Update vehicle records status and link
      for (const record of pendingVehicleRecords) {
        await fetch(`/api/vehicle-usage/${record.id}/status`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'liquidated', settlement_id: settlementId })
        });
      }

      // Update advances status and link
      for (const adv of pendingAdvances) {
        await fetch(`/api/advances/${adv.id}/status`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'liquidated', settlement_id: settlementId })
        });
      }

      // Update tasks status and link
      for (const task of pendingTasks) {
        await fetch(`/api/tasks/${task.id}/status`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'liquidated', settlement_id: settlementId })
        });
      }

      generateVehiclePDF(tableData);
      toast.success('Liquidación registrada con éxito');
      setCustomItems([]);
      fetchData();
    } catch (error) {
      console.error(error);
      toast.error('Hubo un error al realizar la liquidación');
    } finally {
      setIsLiquidating(false);
    }
  };

  const handleLiquidateWashing = async () => {
    if (pendingWashingRecords.length === 0) return;
    if (!confirm('¿Estás seguro de liquidar los registros de lavado pendientes?')) return;

    setIsLiquidating(true);
    try {
      const tableData = ['200cc', '500cc', '800cc', '910cc', 'bidones'].map(type => {
        const qty = pendingWashingRecords.reduce((sum, record) => sum + (record[`qty_${type}`] || 0), 0);
        if (qty === 0) return null;
        const price = getWashingPrice(type);
        return [`Lavado Envases ${type.toUpperCase()}`, `${qty} u`, `$${price.toLocaleString()}`, `$${(qty * price).toLocaleString()}`];
      }).filter(Boolean) as string[][];

      tableData.push(['', '', 'Total a Liquidar', `$${washingTotal.toLocaleString()}`]);

      // Create settlement record
      const belen = users.find(u => u.name === 'Belén');
      if (!belen) throw new Error('Usuario Belén no encontrado');

      const res = await fetch('/api/settlements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: format(new Date(), 'yyyy-MM-dd'),
          user_id: belen.id,
          type: 'washing',
          amount: washingTotal,
          details: JSON.stringify({
            summary: `Liquidación de ${pendingWashingRecords.length} registros de lavado`,
            tableData
          })
        })
      });

      if (!res.ok) throw new Error('Error al crear liquidación');
      const settlementData = await res.json();
      const settlementId = settlementData.id;

      // Update records status
      for (const record of pendingWashingRecords) {
        await fetch(`/api/washing-records/${record.id}/status`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'liquidated', settlement_id: settlementId })
        });
      }

      generateWashingPDF(tableData);
      toast.success('Liquidación registrada con éxito');
      fetchData();
    } catch (error) {
      console.error(error);
      toast.error('Hubo un error al realizar la liquidación');
    } finally {
      setIsLiquidating(false);
    }
  };

  // Calculate accumulated 40% company retention from vehicle settlements
  const pastVehicleSettlements = settlements.filter(s => s.type === 'vehicle');
  const pastCompanyRetentions = pastVehicleSettlements.map(s => {
    let companyPartStr = '$0';
    let companyPartNum = 0;
    try {
      const details = JSON.parse(s.details);
      const companyRow = details.tableData?.find((row: any[]) => row[0] === 'Empresa (40%)');
      if (companyRow) {
        companyPartStr = companyRow[3] || '$0';
        companyPartNum = parseFloat(companyPartStr.replace(/[^0-9.-]+/g, '')) || 0;
      }
    } catch (e) { }
    return {
      id: s.id,
      date: s.date,
      total_settlement_amount: s.amount,
      company_retention_str: companyPartStr,
      company_retention_amount: companyPartNum
    };
  }).filter(s => s.company_retention_amount > 0);

  const accumulatedCompanyRetention = pastCompanyRetentions.reduce((sum, s) => sum + s.company_retention_amount, 0);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight">Liquidaciones</h2>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2">
            <Calendar className="w-4 h-4 text-zinc-500" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent text-sm text-white focus:outline-none"
            />
            <span className="text-zinc-500">-</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent text-sm text-white focus:outline-none"
            />
          </div>
        </div>
      </div>

      <div className="flex gap-4 border-b border-zinc-800">
        <button
          onClick={() => setActiveTab('vehicle')}
          className={`pb-4 px-2 text-sm font-bold tracking-wider uppercase transition-colors relative ${activeTab === 'vehicle' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
            }`}
        >
          <div className="flex items-center gap-2">
            <Car className="w-4 h-4" /> Uso de Vehículo (Charlie)
          </div>
          {activeTab === 'vehicle' && (
            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-white rounded-t-full" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('washing')}
          className={`pb-4 px-2 text-sm font-bold tracking-wider uppercase transition-colors relative ${activeTab === 'washing' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
            }`}
        >
          <div className="flex items-center gap-2">
            <Droplets className="w-4 h-4" /> Lavado de Envases (Belén)
          </div>
          {activeTab === 'washing' && (
            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-white rounded-t-full" />
          )}
        </button>
      </div>

      {activeTab === 'vehicle' ? (
        <div className="space-y-6">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-8">
            <div className="flex justify-between items-start mb-12 border-b border-zinc-800 pb-8">
              <div>
                <p className="text-[10px] font-bold text-zinc-500 tracking-widest uppercase mb-4">Beneficiario</p>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-zinc-900 rounded-full flex items-center justify-center">
                    <Car className="w-5 h-5 text-zinc-500" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white tracking-tight uppercase">Charly</h3>
                    <p className="text-[10px] font-bold text-zinc-500 tracking-widest uppercase mt-1">Operador Logístico</p>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-zinc-500 tracking-widest uppercase mb-4">Periodo Vigente</p>
                <div className="flex items-center justify-end gap-2 text-white font-bold mb-1">
                  <span>📅</span>
                  <span>{pendingVehicleRecords.length > 0 ? format(new Date(pendingVehicleRecords[pendingVehicleRecords.length - 1].date + 'T12:00:00'), 'dd/MM/yyyy') : '-'} — {pendingVehicleRecords.length > 0 ? format(new Date(pendingVehicleRecords[0].date + 'T12:00:00'), 'dd/MM/yyyy') : '-'}</span>
                </div>
                <div className="flex items-center justify-end gap-2 mt-2">
                  <p className="text-[10px] font-bold text-zinc-500 tracking-widest uppercase">Tasa de Cambio:</p>
                  <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded px-2 py-1">
                    <span className="text-xs text-zinc-400">$</span>
                    <input
                      type="number"
                      value={exchangeRate}
                      onChange={(e) => setExchangeRate(e.target.value)}
                      className="bg-transparent text-xs text-white w-16 focus:outline-none"
                    />
                    <span className="text-xs text-zinc-400">ARS</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-1 h-4 bg-white"></div>
                <h4 className="text-[10px] font-bold text-white tracking-widest uppercase">Desglose de Conceptos</h4>
              </div>

              <table className="w-full text-left text-sm">
                <thead className="border-b border-zinc-800">
                  <tr>
                    <th className="pb-4 font-bold text-[10px] text-zinc-500 uppercase tracking-widest">Detalle Operativo</th>
                    <th className="pb-4 font-bold text-[10px] text-zinc-500 uppercase tracking-widest text-center">Cant.</th>
                    <th className="pb-4 font-bold text-[10px] text-zinc-500 uppercase tracking-widest text-right">Unitario</th>
                    <th className="pb-4 font-bold text-[10px] text-zinc-500 uppercase tracking-widest text-right">Total (ARS)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  <tr className="group">
                    <td className="py-6">
                      <p className="font-bold text-white uppercase text-sm mb-1">Uso Vehículo Kangoo (60%)</p>
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Participación en rentabilidad del vehículo</p>
                    </td>
                    <td className="py-6 text-center font-bold text-zinc-400">
                      {pendingVehicleRecords.length} d
                    </td>
                    <td className="py-6 text-right font-bold text-zinc-400">
                      ${(vehiclePrice * 0.6).toLocaleString()}
                    </td>
                    <td className="py-6 text-right font-bold text-white text-lg">
                      ${vehicleTotal.toLocaleString()}
                    </td>
                  </tr>
                  <tr className="group">
                    <td className="py-6">
                      <p className="font-bold text-white uppercase text-sm mb-1">Empresa (40%)</p>
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Retención de la empresa</p>
                    </td>
                    <td className="py-6 text-center font-bold text-zinc-400">
                      {pendingVehicleRecords.length} d
                    </td>
                    <td className="py-6 text-right font-bold text-zinc-400">
                      ${(vehiclePrice * 0.4).toLocaleString()}
                    </td>
                    <td className="py-6 text-right font-bold text-white text-lg">
                      ${companyTotal.toLocaleString()}
                      <div className="text-xs text-zinc-500 mt-1">USD {companyTotalUSD.toFixed(2)}</div>
                    </td>
                  </tr>

                  {/* Rendering Advances */}
                  {pendingAdvances.length > 0 && (
                    <tr className="group">
                      <td className="py-6" colSpan={3}>
                        <p className="font-bold text-red-500 uppercase text-sm mb-1">Adelantos de Dinero Pendientes ({pendingAdvances.length})</p>
                        <ul className="text-xs text-zinc-500 list-disc list-inside">
                          {pendingAdvances.map(a => <li key={a.id}>{format(new Date(a.date + 'T12:00:00'), 'dd/MM')} - {a.description || 'Sin descripción'}</li>)}
                        </ul>
                      </td>
                      <td className="py-6 text-right font-bold text-red-500 text-lg">
                        -${advancesTotal.toLocaleString()}
                      </td>
                    </tr>
                  )}

                  {/* Rendering Tasks */}
                  {pendingTasks.map((task) => (
                    <tr key={task.id} className="group border-t border-zinc-800/50">
                      <td className="py-6" colSpan={2}>
                        <p className="font-bold text-blue-400 uppercase text-sm mb-1">Tarea: {task.description}</p>
                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{format(new Date(task.date + 'T12:00:00'), 'dd/MM/yyyy')}</p>
                      </td>
                      <td className="py-6 text-right">
                        <div className="flex justify-end items-center gap-2">
                          <span className="text-xs text-zinc-500 font-bold">$</span>
                          <input
                            type="number"
                            className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 w-24 text-right"
                            value={task.amount || ''}
                            placeholder="Valor"
                            onChange={async (e) => {
                              const newAmount = parseFloat(e.target.value) || 0;

                              // Update local state instantly
                              setTasks(prev => prev.map(t => t.id === task.id ? { ...t, amount: newAmount } : t));

                              // Save to DB via PUT fetch
                              try {
                                await fetch(`/api/tasks/${task.id}`, {
                                  method: 'PUT',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ amount: newAmount })
                                });
                              } catch (err) {
                                console.error('Error updating task amount:', err);
                              }
                            }}
                          />
                        </div>
                      </td>
                      <td className="py-6 text-right font-bold text-emerald-400 text-lg">
                        ${(task.amount || 0).toLocaleString()}
                      </td>
                    </tr>
                  ))}

                  {/* Rendering Custom Items */}
                  {customItems.map((item, index) => (
                    <tr key={index} className="group">
                      <td className="py-6" colSpan={3}>
                        <p className="font-bold text-blue-400 uppercase text-sm mb-1">{item.description}</p>
                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Item Adicional</p>
                      </td>
                      <td className={`py-6 text-right font-bold text-lg ${item.amount < 0 ? 'text-red-500' : 'text-emerald-400'}`}>
                        ${item.amount.toLocaleString()}
                      </td>
                    </tr>
                  ))}

                  <tr className="border-t border-zinc-800">
                    <td colSpan={4} className="py-4">
                      <div className="flex items-center gap-4 bg-zinc-900/50 p-4 rounded-xl border border-dashed border-zinc-700">
                        <input
                          type="text"
                          placeholder="Descripción del ítem..."
                          value={newCustomDescription}
                          onChange={e => setNewCustomDescription(e.target.value)}
                          className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600"
                        />
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">$</span>
                          <input
                            type="number"
                            placeholder="Monto"
                            value={newCustomAmount}
                            onChange={e => setNewCustomAmount(e.target.value)}
                            className="w-32 bg-zinc-900 border border-zinc-800 rounded-lg pl-7 pr-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600"
                          />
                        </div>
                        <button
                          onClick={() => {
                            if (newCustomDescription && newCustomAmount) {
                              setCustomItems([...customItems, { description: newCustomDescription, amount: parseFloat(newCustomAmount) }]);
                              setNewCustomDescription('');
                              setNewCustomAmount('');
                            }
                          }}
                          className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors"
                        >
                          + Agregar
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* Total to Liquidate */}
                  <tr className="border-t-2 border-zinc-800">
                    <td colSpan={3} className="py-6 text-right font-bold text-white uppercase text-sm">
                      Total a Liquidar (Charly)
                    </td>
                    <td className="py-6 text-right font-bold text-emerald-400 text-2xl">
                      ${vehicleTotal.toLocaleString()}
                    </td>
                  </tr>

                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-6 border-t border-zinc-800">
              <button
                onClick={handleLiquidateVehicle}
                disabled={isLiquidating || (pendingVehicleRecords.length === 0 && advancesTotal === 0 && customItemsTotal === 0)}
                className="bg-white text-black px-8 py-3 rounded-xl text-sm font-bold tracking-wider uppercase flex items-center gap-2 hover:bg-zinc-200 transition-colors disabled:opacity-50"
              >
                <DollarSign className="w-4 h-4" /> Registrar Liquidación
              </button>
            </div>
          </div>

          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-8">
            <h3 className="text-xl font-bold tracking-tight mb-6">Informe Acumulado Empresa (40%)</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-zinc-800">
                  <tr>
                    <th className="pb-4 font-bold text-[10px] text-zinc-500 uppercase tracking-widest">Fecha Liquidación</th>
                    <th className="pb-4 font-bold text-[10px] text-zinc-500 uppercase tracking-widest text-right">Retención (ARS)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {pastCompanyRetentions.map(s => (
                    <tr key={s.id} className="hover:bg-zinc-900/50 transition-colors">
                      <td className="py-4 font-medium text-white">{format(new Date(s.date + 'T12:00:00'), 'dd/MM/yyyy')}</td>
                      <td className="py-4 text-right font-mono text-zinc-400">${s.company_retention_amount.toLocaleString()}</td>
                    </tr>
                  ))}
                  {pastCompanyRetentions.length === 0 && (
                    <tr>
                      <td colSpan={2} className="py-8 text-center text-zinc-500">
                        Aún no hay liquidaciones históricas con retenciones del 40%.
                      </td>
                    </tr>
                  )}
                  {pastCompanyRetentions.length > 0 && (
                    <tr className="border-t-2 border-zinc-800">
                      <td className="py-4 font-bold text-white uppercase text-sm">Total Acumulado</td>
                      <td className="py-4 text-right font-bold text-emerald-400 text-xl">${accumulatedCompanyRetention.toLocaleString()}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-8">
            <div className="flex justify-between items-start mb-12 border-b border-zinc-800 pb-8">
              <div>
                <p className="text-[10px] font-bold text-zinc-500 tracking-widest uppercase mb-4">Beneficiario</p>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-zinc-900 rounded-full flex items-center justify-center">
                    <Droplets className="w-5 h-5 text-zinc-500" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white tracking-tight uppercase">Belén</h3>
                    <p className="text-[10px] font-bold text-zinc-500 tracking-widest uppercase mt-1">Operador de Lavado</p>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-zinc-500 tracking-widest uppercase mb-4">Periodo Vigente</p>
                <div className="flex items-center justify-end gap-2 text-white font-bold mb-1">
                  <span>📅</span>
                  <span>{pendingWashingRecords.length > 0 ? format(new Date(pendingWashingRecords[pendingWashingRecords.length - 1].date + 'T12:00:00'), 'dd/MM/yyyy') : '-'} — {pendingWashingRecords.length > 0 ? format(new Date(pendingWashingRecords[0].date + 'T12:00:00'), 'dd/MM/yyyy') : '-'}</span>
                </div>
              </div>
            </div>

            <div className="mb-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-1 h-4 bg-white"></div>
                <h4 className="text-[10px] font-bold text-white tracking-widest uppercase">Desglose de Conceptos</h4>
              </div>

              <table className="w-full text-left text-sm">
                <thead className="border-b border-zinc-800">
                  <tr>
                    <th className="pb-4 font-bold text-[10px] text-zinc-500 uppercase tracking-widest">Detalle Operativo</th>
                    <th className="pb-4 font-bold text-[10px] text-zinc-500 uppercase tracking-widest text-center">Cant.</th>
                    <th className="pb-4 font-bold text-[10px] text-zinc-500 uppercase tracking-widest text-right">Unitario</th>
                    <th className="pb-4 font-bold text-[10px] text-zinc-500 uppercase tracking-widest text-right">Total (ARS)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {['200cc', '500cc', '800cc', '910cc', 'bidones'].map(type => {
                    const qty = pendingWashingRecords.reduce((sum, record) => sum + (record[`qty_${type}`] || 0), 0);
                    if (qty === 0) return null;
                    const price = getWashingPrice(type);
                    const total = qty * price;
                    return (
                      <tr key={type} className="group">
                        <td className="py-6">
                          <p className="font-bold text-white uppercase text-sm mb-1">Lavado Envases {type.toUpperCase()}</p>
                          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Servicio de lavado de envases</p>
                        </td>
                        <td className="py-6 text-center font-bold text-zinc-400">
                          {qty} u
                        </td>
                        <td className="py-6 text-right font-bold text-zinc-400">
                          ${price.toLocaleString()}
                        </td>
                        <td className="py-6 text-right font-bold text-white text-lg">
                          ${total.toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                  {pendingWashingRecords.length > 0 && (
                    <tr className="border-t-2 border-zinc-800">
                      <td colSpan={3} className="py-6 text-right font-bold text-white uppercase text-sm">
                        Total a Liquidar
                      </td>
                      <td className="py-6 text-right font-bold text-emerald-400 text-2xl">
                        ${washingTotal.toLocaleString()}
                      </td>
                    </tr>
                  )}
                  {pendingWashingRecords.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-zinc-500">
                        No hay registros de lavado pendientes.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-6 border-t border-zinc-800">
              <button
                onClick={handleLiquidateWashing}
                disabled={isLiquidating || pendingWashingRecords.length === 0}
                className="bg-white text-black px-8 py-3 rounded-xl text-sm font-bold tracking-wider uppercase flex items-center gap-2 hover:bg-zinc-200 transition-colors disabled:opacity-50"
              >
                <DollarSign className="w-4 h-4" /> Registrar Liquidación
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
