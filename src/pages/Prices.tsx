import { useState, useEffect, type FormEvent } from 'react';
import { Settings, Save, Droplets, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function Prices() {
  const [settings, setSettings] = useState<any>({});
  const [washingPrices, setWashingPrices] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => setSettings(data));

    fetch('/api/washing-prices')
      .then(res => res.json())
      .then(data => setWashingPrices(data));
  }, []);

  const handleSaveSettings = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      if (!res.ok) throw new Error('Error al guardar ajustes');
      toast.success('Registro guardado');
    } catch (err) {
      toast.error('Error al guardar los ajustes generales');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveWashingPrice = async (type: string, price: string, date: string) => {
    try {
      const res = await fetch(`/api/washing-prices/${type}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ price: parseFloat(price) || 0, effective_date: date })
      });

      if (!res.ok) throw new Error('Error al guardar');
      toast.success('Registro guardado');
    } catch (e) {
      toast.error('Error al guardar el precio');
    }
  };

  const getWashingPrice = (type: string) => {
    return washingPrices.find(p => p.container_type === type) || { price: 0, effective_date: format(new Date(), 'yyyy-MM-dd') };
  };

  const washingTypes = [
    { id: '200cc', label: 'LAVADO 200CC' },
    { id: '500cc', label: 'LAVADO 500CC' },
    { id: '800cc', label: 'LAVADO 800CC' },
    { id: '910cc', label: 'LAVADO 910CC' },
    { id: 'bidones', label: 'LAVADO BIDONES' }
  ];

  return (
    <div className="space-y-12">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight">Precios y Configuración</h2>
      </div>

      <div className="max-w-2xl">
        <form onSubmit={handleSaveSettings} className="bg-zinc-950 border border-zinc-800 rounded-2xl p-8 space-y-6">
          <div className="flex items-center gap-4 mb-6 pb-6 border-b border-zinc-800">
            <div className="w-12 h-12 bg-zinc-900 rounded-full flex items-center justify-center">
              <Settings className="w-6 h-6 text-zinc-500" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Ajustes Generales</h3>
              <p className="text-sm text-zinc-400">Configura los precios globales del sistema.</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-500 tracking-wider uppercase mb-2">Precio por Envase ($)</label>
            <input
              type="number"
              required
              min="0"
              step="0.01"
              value={settings.container_price || ''}
              onChange={(e) => setSettings({ ...settings, container_price: e.target.value })}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600"
            />
            <p className="text-xs text-zinc-500 mt-2">Este valor se multiplicará por la cantidad de productos en cada remito.</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-500 tracking-wider uppercase mb-2">Próximo Número de Serie</label>
            <input
              type="number"
              required
              min="1"
              step="1"
              value={settings.next_serial_number || ''}
              onChange={(e) => setSettings({ ...settings, next_serial_number: e.target.value })}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600"
            />
            <p className="text-xs text-zinc-500 mt-2">El número de serie autoincremental para el próximo remito generado.</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-500 tracking-wider uppercase mb-2">Precio Uso Vehículo por Día ($)</label>
            <input
              type="number"
              required
              min="0"
              step="0.01"
              value={settings.vehicle_usage_price || ''}
              onChange={(e) => setSettings({ ...settings, vehicle_usage_price: e.target.value })}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600"
            />
            <p className="text-xs text-zinc-500 mt-2">Valor base para calcular la liquidación (60% para el usuario).</p>
          </div>

          <div className="pt-4 border-t border-zinc-800">
            <h4 className="text-sm font-bold text-white mb-4">Precios de Tareas (Charly)</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-zinc-500 tracking-wider uppercase mb-2">Mantenimiento</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={settings.task_price_mantenimiento || ''}
                    onChange={(e) => setSettings({ ...settings, task_price_mantenimiento: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-8 pr-3 py-2 text-white focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 tracking-wider uppercase mb-2">Producción</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={settings.task_price_produccion || ''}
                    onChange={(e) => setSettings({ ...settings, task_price_produccion: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-8 pr-3 py-2 text-white focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 tracking-wider uppercase mb-2">Tambo</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={settings.task_price_tambo || ''}
                    onChange={(e) => setSettings({ ...settings, task_price_tambo: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-8 pr-3 py-2 text-white focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-zinc-800">
            <button
              type="submit"
              disabled={isSaving}
              className="bg-white text-black px-8 py-3 rounded-xl text-sm font-bold tracking-wider uppercase hover:bg-zinc-200 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" /> {isSaving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>

      <div>
        <div className="flex items-center gap-3 mb-6">
          <Droplets className="w-6 h-6 text-zinc-500" />
          <h3 className="text-xl font-bold text-white tracking-tight uppercase">Costos de Lavado</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {washingTypes.map(type => {
            const currentData = getWashingPrice(type.id);
            return (
              <WashingPriceCard
                key={type.id}
                type={type.id}
                label={type.label}
                initialPrice={currentData.price}
                initialDate={currentData.effective_date}
                onSave={handleSaveWashingPrice}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

function WashingPriceCard({ type, label, initialPrice, initialDate, onSave }: any) {
  const [price, setPrice] = useState(initialPrice.toString());
  const [date, setDate] = useState(initialDate);

  // Update local state if props change (e.g. after fetch)
  useEffect(() => {
    setPrice(initialPrice.toString());
    setDate(initialDate);
  }, [initialPrice, initialDate]);

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 flex flex-col justify-between">
      <div className="mb-6 pb-4 border-b border-zinc-800">
        <h4 className="text-sm font-bold text-zinc-400 tracking-wider uppercase">{label}</h4>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-[10px] font-bold text-zinc-500 tracking-wider uppercase mb-2">Precio ($)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600"
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-zinc-500 tracking-wider uppercase mb-2">Vigencia</label>
          <div className="relative">
            <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-500 pointer-events-none" />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-3 pr-8 py-2 text-white text-sm focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 appearance-none"
            />
          </div>
        </div>
      </div>

      <button
        onClick={() => onSave(type, price, date)}
        className="w-full bg-white text-black py-2.5 rounded-lg text-xs font-bold tracking-wider uppercase hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2"
      >
        <Save className="w-3 h-3" /> Actualizar
      </button>
    </div>
  );
}
