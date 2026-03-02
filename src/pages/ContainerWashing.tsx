import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import { Calendar, Save } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ContainerWashing() {
  const { currentUser } = useAuth();
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [quantities, setQuantities] = useState({
    '200cc': '',
    '500cc': '',
    '800cc': '',
    '910cc': '',
    'bidones': ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSave = async () => {
    if (!currentUser) return;
    
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/washing-records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          user_id: currentUser.id,
          qty_200cc: parseInt(quantities['200cc']) || 0,
          qty_500cc: parseInt(quantities['500cc']) || 0,
          qty_800cc: parseInt(quantities['800cc']) || 0,
          qty_910cc: parseInt(quantities['910cc']) || 0,
          qty_bidones: parseInt(quantities['bidones']) || 0,
        })
      });
      
      if (res.ok) {
        toast.success('Registro guardado');
        setQuantities({
          '200cc': '',
          '500cc': '',
          '800cc': '',
          '910cc': '',
          'bidones': ''
        });
      } else {
        throw new Error('Error al guardar');
      }
    } catch (error) {
      console.error(error);
      toast.error('Hubo un error al guardar el registro.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="flex justify-between items-center border-b border-zinc-800 pb-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Producción Diaria</h2>
          <p className="text-xs font-bold text-zinc-500 tracking-wider uppercase mt-1">Ingrese las cantidades por tamaño</p>
        </div>
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[
          { id: '200cc', label: '200 CM³' },
          { id: '500cc', label: '500 CM³' },
          { id: '800cc', label: '800 CM³' },
          { id: '910cc', label: '910 CM³' },
          { id: 'bidones', label: 'BIDONES' }
        ].map((type) => (
          <div key={type.id} className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6">
            <label className="block text-xs font-bold text-zinc-500 tracking-wider uppercase mb-4">
              {type.label}
            </label>
            <input
              type="number"
              min="0"
              value={quantities[type.id as keyof typeof quantities]}
              onChange={(e) => setQuantities({ ...quantities, [type.id]: e.target.value })}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-right text-white text-2xl font-bold focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600"
              placeholder="0"
            />
          </div>
        ))}
      </div>

      <div className="flex justify-end pt-4">
        <button
          onClick={handleSave}
          disabled={isSubmitting}
          className="bg-white text-black px-8 py-3 rounded-xl text-sm font-bold tracking-wider uppercase flex items-center gap-2 hover:bg-zinc-200 transition-colors disabled:opacity-50"
        >
          <Save className="w-4 h-4" /> Guardar Producción
        </button>
      </div>
    </div>
  );
}
