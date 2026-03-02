import { useState, useEffect, type FormEvent } from 'react';
import { Map, Plus, Save, Edit2, X, Trash2 } from 'lucide-react';

export default function Zones() {
  const [zones, setZones] = useState<any[]>([]);
  const [editingZone, setEditingZone] = useState<any | null>(null);

  useEffect(() => {
    fetchZones();
  }, []);

  const fetchZones = () => {
    fetch('/api/zones')
      .then(res => res.json())
      .then(data => setZones(data));
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingZone) return;

    if (editingZone.id === 'new') {
      await fetch('/api/zones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editingZone,
          id: crypto.randomUUID()
        })
      });
    } else {
      await fetch(`/api/zones/${editingZone.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingZone)
      });
    }

    setEditingZone(null);
    fetchZones();
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Estás seguro de que deseas eliminar esta zona?')) {
      await fetch(`/api/zones/${id}`, { method: 'DELETE' });
      fetchZones();
    }
  };

  if (editingZone) {
    return (
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold tracking-tight">
            {editingZone.id === 'new' ? 'Nueva Zona' : 'Editar Zona'}
          </h2>
          <button 
            onClick={() => setEditingZone(null)}
            className="text-zinc-500 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSave} className="bg-zinc-950 border border-zinc-800 rounded-2xl p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-zinc-500 tracking-wider uppercase mb-2">Código (ID)</label>
              <input
                type="text"
                required
                placeholder="Ej: Z01"
                value={editingZone.code}
                onChange={(e) => setEditingZone({ ...editingZone, code: e.target.value })}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-500 tracking-wider uppercase mb-2">Nombre de la Zona</label>
              <input
                type="text"
                required
                placeholder="Ej: Norte"
                value={editingZone.name}
                onChange={(e) => setEditingZone({ ...editingZone, name: e.target.value })}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-500 tracking-wider uppercase mb-2">Precio Comisionista ($)</label>
            <input
              type="number"
              required
              min="0"
              step="0.01"
              value={editingZone.commissioner_price}
              onChange={(e) => setEditingZone({ ...editingZone, commissioner_price: parseFloat(e.target.value) || 0 })}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600"
            />
          </div>

          <div className="flex justify-end gap-4 pt-4 border-t border-zinc-800">
            <button
              type="button"
              onClick={() => setEditingZone(null)}
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
        <h2 className="text-2xl font-bold tracking-tight">Zonas</h2>
        <button 
          onClick={() => setEditingZone({ id: 'new', code: '', name: '', commissioner_price: 0 })}
          className="bg-white text-black px-4 py-2 rounded-lg text-sm font-bold tracking-wider uppercase flex items-center gap-2 hover:bg-zinc-200 transition-colors"
        >
          <Plus className="w-4 h-4" /> Nueva Zona
        </button>
      </div>

      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-900/50 text-xs font-bold text-zinc-500 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 font-medium">Código</th>
                <th className="px-6 py-4 font-medium">Nombre</th>
                <th className="px-6 py-4 font-medium text-right">Precio Comisionista</th>
                <th className="px-6 py-4 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {zones.map((zone) => (
                <tr key={zone.id} className="hover:bg-zinc-900/50 transition-colors">
                  <td className="px-6 py-4 font-mono text-zinc-400">{zone.code}</td>
                  <td className="px-6 py-4 font-medium text-white">{zone.name}</td>
                  <td className="px-6 py-4 text-right font-mono text-white">
                    ${zone.commissioner_price.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => setEditingZone(zone)}
                        className="p-1.5 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(zone.id)}
                        className="p-1.5 text-zinc-500 hover:text-red-500 hover:bg-zinc-800 rounded-lg transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {zones.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-zinc-500">
                    No se encontraron zonas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
