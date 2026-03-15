import React, { useState, useEffect } from 'react';
import { Search, Plus, MapPin, Phone, Mail, FileText, X, Save, Edit2, MoreHorizontal, Trash2, FileSpreadsheet, Eye, CheckSquare, Square } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Clients() {
  const [clients, setClients] = useState<any[]>([]);
  const [zones, setZones] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [newBalance, setNewBalance] = useState('');
  const [newBalanceObservation, setNewBalanceObservation] = useState('');
  const [isEditingBalance, setIsEditingBalance] = useState<string | null>(null);
  const [zoneFilter, setZoneFilter] = useState('');
  const [editingClient, setEditingClient] = useState<any | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [bulkZoneId, setBulkZoneId] = useState('');
  const [isUpdatingBulk, setIsUpdatingBulk] = useState(false);
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'admin';

  useEffect(() => {
    fetchClients();
    fetchZones();
  }, []);

  const fetchClients = () => {
    fetch('/api/clients')
      .then(res => res.json())
      .then(data => setClients(data));
  };

  const fetchZones = () => {
    fetch('/api/zones')
      .then(res => res.json())
      .then(data => setZones(data));
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Estás seguro de que deseas eliminar este cliente? Se eliminarán también todos sus pedidos y pagos.')) {
      await fetch(`/api/clients/${id}`, { method: 'DELETE' });
      fetchClients();
    }
  };

  const uniqueZones = [...new Set(clients.map(c => c.zone).filter(Boolean))].sort();

  const filteredClients = clients.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.zone && c.zone.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.notes && c.notes.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesZone = zoneFilter === '' || c.zone === zoneFilter;
    return matchesSearch && matchesZone;
  });

  const handleSelectAll = () => {
    if (selectedClients.length === filteredClients.length) {
      setSelectedClients([]);
    } else {
      setSelectedClients(filteredClients.map(c => c.id));
    }
  };

  const handleSelectClient = (id: string) => {
    if (selectedClients.includes(id)) {
      setSelectedClients(selectedClients.filter(clientId => clientId !== id));
    } else {
      setSelectedClients([...selectedClients, id]);
    }
  };

  const handleBulkUpdateZone = async () => {
    if (!bulkZoneId || selectedClients.length === 0) return;
    setIsUpdatingBulk(true);

    const zone = zones.find(z => z.id === bulkZoneId);

    await fetch('/api/clients/bulk-update-zone', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientIds: selectedClients,
        zone_id: zone.id,
        zone_name: zone.name
      })
    });

    setIsUpdatingBulk(false);
    setSelectedClients([]);
    setBulkZoneId('');
    fetchClients();
  };

  const handleBalanceUpdate = async (clientId: string) => {
    try {
      const response = await fetch(`/api/clients/${clientId}/balance`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          balance: parseFloat(newBalance),
          observation: newBalanceObservation
        }),
      });
      if (response.ok) {
        alert('Saldo y observaciones actualizados correctamente.');
        fetchClients();
      }
    } catch (error) {
      console.error('Error updating balance:', error);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClient) return;

    if (editingClient.id === 'new') {
      await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editingClient,
          id: crypto.randomUUID(),
          registered: new Date().toISOString(),
          accept_marketing: 0
        })
      });
    } else {
      await fetch(`/api/clients/${editingClient.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingClient)
      });
      
      if (isAdmin && newBalanceObservation !== 'Cargando...') {
        await fetch(`/api/clients/${editingClient.id}/balance`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            balance: parseFloat(newBalance || editingClient.balance?.toString() || '0'),
            observation: newBalanceObservation
          }),
        });
      }
    }

    setEditingClient(null);
    fetchClients();
  };

  if (editingClient) {
    return (
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold tracking-tight">
            {editingClient.id === 'new' ? 'Nuevo Cliente' : 'Editar Cliente'}
          </h2>
          <button
            onClick={() => setEditingClient(null)}
            className="text-zinc-500 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSave} className="bg-zinc-950 border border-zinc-800 rounded-2xl p-8 space-y-6">
          <div>
            <label className="block text-xs font-bold text-zinc-500 tracking-wider uppercase mb-2">Nombre / Local</label>
            <input
              type="text"
              required
              value={editingClient.name}
              onChange={(e) => setEditingClient({ ...editingClient, name: e.target.value })}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-zinc-500 tracking-wider uppercase mb-2">Zona</label>
              <select
                value={editingClient.zone_id || ''}
                onChange={(e) => {
                  const selectedZone = zones.find(z => z.id === e.target.value);
                  setEditingClient({
                    ...editingClient,
                    zone_id: selectedZone ? selectedZone.id : null,
                    zone: selectedZone ? selectedZone.name : ''
                  });
                }}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600"
              >
                <option value="">Sin zona asignada</option>
                {zones.map((zone: any) => (
                  <option key={zone.id} value={zone.id}>{zone.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-500 tracking-wider uppercase mb-2">Teléfono</label>
              <input
                type="text"
                value={editingClient.phone || ''}
                onChange={(e) => setEditingClient({ ...editingClient, phone: e.target.value })}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-500 tracking-wider uppercase mb-2">Domicilio</label>
            <input
              type="text"
              value={editingClient.address || ''}
              onChange={(e) => setEditingClient({ ...editingClient, address: e.target.value })}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-500 tracking-wider uppercase mb-2">Email</label>
            <input
              type="email"
              value={editingClient.email || ''}
              onChange={(e) => setEditingClient({ ...editingClient, email: e.target.value })}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-500 tracking-wider uppercase mb-2">Observaciones</label>
            <textarea
              value={editingClient.notes || ''}
              onChange={(e) => setEditingClient({ ...editingClient, notes: e.target.value })}
              rows={4}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 resize-none"
            />
          </div>

          {isAdmin && editingClient.id !== 'new' && (
            <div className="pt-4 border-t border-zinc-800">
              <label className="block text-xs font-bold text-amber-500 tracking-wider uppercase mb-2">Ajuste de Saldo (Solo Admin)</label>
              <div className="flex gap-4">
                <input
                  type="number"
                  step="0.01"
                  value={newBalance}
                  onChange={(e) => setNewBalance(e.target.value)}
                  className="w-full bg-zinc-900 border border-amber-900/50 rounded-xl p-3 text-amber-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 font-mono font-bold"
                />
                <button
                  type="button"
                  onClick={() => handleBalanceUpdate(editingClient.id)}
                  className="bg-amber-500/10 text-amber-500 px-6 py-3 rounded-xl text-sm font-bold tracking-wider uppercase hover:bg-amber-500/20 transition-colors whitespace-nowrap"
                >
                  Actualizar Saldo
                </button>
              </div>
              <div className="mt-4">
                <label className="block text-xs font-bold text-zinc-500 tracking-wider uppercase mb-2">Observaciones de Saldo</label>
                <textarea
                  value={newBalanceObservation}
                  onChange={(e) => setNewBalanceObservation(e.target.value)}
                  rows={4}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 resize-none"
                  placeholder="Ej: Arrastre año 2023..."
                />
              </div>
              <p className="text-xs text-zinc-500 mt-2">Atención: Este valor sobreescribe el balance actual del cliente sin generar un comprobante de pago. Úselo para cargar saldos de arrastre.</p>
            </div>
          )}

          <div className="flex justify-end gap-4 pt-4 border-t border-zinc-800">
            <button
              type="button"
              onClick={() => setEditingClient(null)}
              className="px-6 py-3 rounded-xl text-sm font-bold tracking-wider uppercase text-zinc-400 hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="bg-white text-black px-8 py-3 rounded-xl text-sm font-bold tracking-wider uppercase hover:bg-zinc-200 transition-colors flex items-center gap-2"
            >
              <Save className="w-4 h-4" /> Guardar
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight">Fichas de Clientes</h2>
        <button
          onClick={() => setEditingClient({ id: 'new', name: '', email: '', zone: '', address: '', phone: '', notes: '' })}
          className="bg-white text-black px-4 py-2 rounded-lg text-sm font-bold tracking-wider uppercase flex items-center gap-2 hover:bg-zinc-200 transition-colors"
        >
          <Plus className="w-4 h-4" /> Nuevo Cliente
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <div className="relative flex-1 max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Buscar por nombre o zona..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600"
          />
        </div>
        <select
          value={zoneFilter}
          onChange={(e) => setZoneFilter(e.target.value)}
          className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 w-full sm:w-auto"
        >
          <option value="">Todas las zonas</option>
          {uniqueZones.map((zone: any) => (
            <option key={zone} value={zone}>{zone}</option>
          ))}
        </select>
        <button
          onClick={handleSelectAll}
          className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors shrink-0"
        >
          {selectedClients.length === filteredClients.length && filteredClients.length > 0 ? (
            <CheckSquare className="w-5 h-5 text-white" />
          ) : (
            <Square className="w-5 h-5" />
          )}
          Seleccionar Todos
        </button>
      </div>

      {
        selectedClients.length > 0 && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 sticky top-4 z-20 shadow-2xl">
            <div className="text-sm font-bold text-white">
              {selectedClients.length} cliente(s) seleccionado(s)
            </div>
            <div className="flex items-center gap-4 w-full sm:w-auto">
              <select
                value={bulkZoneId}
                onChange={(e) => setBulkZoneId(e.target.value)}
                className="bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 flex-1 sm:flex-none"
              >
                <option value="" disabled>Asignar a Zona...</option>
                {zones.map((zone: any) => (
                  <option key={zone.id} value={zone.id}>{zone.name}</option>
                ))}
              </select>
              <button
                onClick={handleBulkUpdateZone}
                disabled={!bulkZoneId || isUpdatingBulk}
                className="bg-white text-black px-6 py-2 rounded-lg text-sm font-bold tracking-wider uppercase hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
              >
                {isUpdatingBulk ? 'Aplicando...' : 'Aplicar'}
              </button>
            </div>
          </div>
        )
      }

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredClients.map((client) => (
          <div
            key={client.id}
            className={`bg-zinc-950 border rounded-2xl p-6 flex flex-col transition-colors relative cursor-pointer ${selectedClients.includes(client.id) ? 'border-white' : 'border-zinc-800 hover:border-zinc-700'
              }`}
            onClick={(e) => {
              // Prevent selection when clicking buttons or dropdowns
              if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('.dropdown-menu')) return;
              handleSelectClient(client.id);
            }}
          >
            <div className="absolute top-6 left-6 z-10">
              {selectedClients.includes(client.id) ? (
                <CheckSquare className="w-5 h-5 text-white bg-zinc-950 rounded" />
              ) : (
                <Square className="w-5 h-5 text-zinc-600 bg-zinc-950 rounded" />
              )}
            </div>
            <div className="flex justify-between items-start mb-4 pl-8">
              <h3 className="text-lg font-bold text-white leading-tight pr-8">{client.name}</h3>
              <div className="relative dropdown-menu">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenDropdownId(openDropdownId === client.id ? null : client.id);
                  }}
                  className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-900 rounded-lg transition-colors shrink-0"
                >
                  <MoreHorizontal className="w-5 h-5" />
                </button>

                {openDropdownId === client.id && (
                  <div className="absolute right-0 mt-2 w-48 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl z-10 overflow-hidden">
                    <button
                      onClick={() => { 
                        setEditingClient(client); 
                        setOpenDropdownId(null); 
                        setNewBalance(client.balance ? client.balance.toString() : '0');
                        setNewBalanceObservation('Cargando...');
                        fetch(`/api/clients/${client.id}/account?_t=${Date.now()}`)
                          .then(res => res.json())
                          .then(data => {
                            setNewBalanceObservation(data.initialObservation || '');
                          })
                          .catch(() => setNewBalanceObservation(''));
                      }}
                      className="w-full text-left px-4 py-3 text-sm text-white hover:bg-zinc-800 flex items-center gap-2"
                    >
                      <Edit2 className="w-4 h-4 text-zinc-400" /> Editar cliente
                    </button>
                    <button
                      onClick={() => { navigate('/accounts'); setOpenDropdownId(null); }}
                      className="w-full text-left px-4 py-3 text-sm text-white hover:bg-zinc-800 flex items-center gap-2"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-zinc-400" /> Ver cuenta corriente
                    </button>
                    <div className="h-px bg-zinc-800 my-1"></div>
                    <button
                      onClick={() => { handleDelete(client.id); setOpenDropdownId(null); }}
                      className="w-full text-left px-4 py-3 text-sm text-red-500 hover:bg-zinc-800 flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" /> Eliminar cliente
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3 flex-1">
              <div className="flex items-start gap-3 text-sm">
                <MapPin className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
                <div>
                  <div className="text-white">{client.address || <span className="text-zinc-600 italic">Sin domicilio</span>}</div>
                  {client.zone && <div className="text-zinc-500 text-xs mt-0.5">{client.zone}</div>}
                </div>
              </div>

              <div className="flex items-center gap-3 text-sm">
                <Phone className="w-4 h-4 text-zinc-500 shrink-0" />
                <div className="text-zinc-300">{client.phone || <span className="text-zinc-600 italic">Sin teléfono</span>}</div>
              </div>

              <div className="flex items-center gap-3 text-sm">
                <Mail className="w-4 h-4 text-zinc-500 shrink-0" />
                <div className="text-zinc-300 truncate">{client.email || <span className="text-zinc-600 italic">Sin email</span>}</div>
              </div>

              {client.notes && (
                <div className="flex items-start gap-3 text-sm pt-2 border-t border-zinc-900 mt-2">
                  <FileText className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
                  <div className="text-zinc-400 text-xs leading-relaxed line-clamp-3">{client.notes}</div>
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-zinc-800 flex justify-between items-center">
              <span className="text-xs font-bold text-zinc-500 tracking-wider uppercase">Saldo Actual</span>
              <span className={`font-mono font-bold ${client.balance > 0 ? 'text-red-400' : client.balance < 0 ? 'text-emerald-400' : 'text-zinc-400'}`}>
                ${Math.abs(client.balance || 0).toLocaleString()}
              </span>
            </div>
          </div>
        ))}
        {filteredClients.length === 0 && (
          <div className="col-span-full text-center py-12 text-zinc-500 border border-dashed border-zinc-800 rounded-2xl">
            No se encontraron clientes.
          </div>
        )}
      </div>
    </div>
  );
}
