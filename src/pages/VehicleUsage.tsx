import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import { Calendar, Truck, DollarSign, Briefcase } from 'lucide-react';
import toast from 'react-hot-toast';

export default function VehicleUsage() {
  const { currentUser } = useAuth();

  // Tab/Section states
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isSubmittingJornada, setIsSubmittingJornada] = useState(false);

  const [advanceDate, setAdvanceDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [advanceAmount, setAdvanceAmount] = useState('');
  const [advanceDescription, setAdvanceDescription] = useState('');
  const [isSubmittingAdvance, setIsSubmittingAdvance] = useState(false);

  const [taskDate, setTaskDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [taskDescription, setTaskDescription] = useState('');
  const [taskOtherDescription, setTaskOtherDescription] = useState('');
  const [isSubmittingTask, setIsSubmittingTask] = useState(false);

  const handleSaveJornada = async () => {
    if (!currentUser) return;

    setIsSubmittingJornada(true);
    try {
      const res = await fetch('/api/vehicle-usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          user_id: currentUser.id,
        })
      });

      if (res.ok) {
        toast.success('Jornada guardada');
      } else {
        throw new Error('Error al guardar');
      }
    } catch (error) {
      console.error(error);
      toast.error('Hubo un error al guardar la jornada.');
    } finally {
      setIsSubmittingJornada(false);
    }
  };

  const handleSaveAdvance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !advanceAmount) return;

    setIsSubmittingAdvance(true);
    try {
      const res = await fetch('/api/advances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: advanceDate,
          user_id: currentUser.id,
          amount: parseFloat(advanceAmount),
          description: advanceDescription || 'Adelanto de dinero'
        })
      });

      if (res.ok) {
        toast.success('Adelanto registrado exitosamente');
        setAdvanceAmount('');
        setAdvanceDescription('');
      } else {
        throw new Error('Error al guardar');
      }
    } catch (error) {
      console.error(error);
      toast.error('Hubo un error al registrar el adelanto.');
    } finally {
      setIsSubmittingAdvance(false);
    }
  };

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !taskDescription) return;

    setIsSubmittingTask(true);
    const finalDescription = taskDescription === 'Otros' ? taskOtherDescription : taskDescription;

    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: taskDate,
          user_id: currentUser.id,
          description: finalDescription
        })
      });

      if (res.ok) {
        toast.success('Tarea registrada exitosamente');
        setTaskDescription('');
        setTaskOtherDescription('');
      } else {
        throw new Error('Error al guardar');
      }
    } catch (error) {
      console.error(error);
      toast.error('Hubo un error al registrar la tarea.');
    } finally {
      setIsSubmittingTask(false);
    }
  };

  return (
    <div className="space-y-8 max-w-3xl mx-auto pb-12">
      <div className="border-b border-zinc-800 pb-4">
        <h2 className="text-3xl font-bold tracking-tight text-white font-serif">Otros Registros (Charly)</h2>
        <div className="flex items-center gap-2 mt-2">
          <div className="w-2 h-2 rounded-full bg-zinc-500"></div>
          <p className="text-xs font-bold text-zinc-500 tracking-wider uppercase">Sesión Operativa Activa</p>
        </div>
      </div>

      <div className="grid gap-8">
        {/* Jornada Tracker */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="border-b border-zinc-800 flex">
            <div className="px-6 py-4 border-b-2 border-white flex items-center gap-2">
              <Truck className="w-4 h-4 text-white" />
              <span className="text-sm font-bold text-white tracking-wider uppercase">Otros Registros (Charly)</span>
            </div>
          </div>

          <div className="p-8 flex flex-col items-center justify-center min-h-[200px]">
            <div className="w-full max-w-md space-y-6">
              <div>
                <label className="block text-xs font-bold text-zinc-500 tracking-wider uppercase mb-2">
                  Alquiler de Vehículo
                </label>
                <div className="relative">
                  <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 pointer-events-none" />
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-4 text-white text-lg font-bold focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 appearance-none"
                  />
                </div>
              </div>

              <button
                onClick={handleSaveJornada}
                disabled={isSubmittingJornada}
                className="w-full bg-white text-black py-4 rounded-xl text-sm font-bold tracking-wider uppercase hover:bg-zinc-200 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Truck className="w-5 h-5" /> Registrar Uso de Vehículo
              </button>
            </div>
          </div>
        </div>

        {/* Money Advances */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="border-b border-zinc-800 flex">
            <div className="px-6 py-4 border-b-2 border-white flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-white" />
              <span className="text-sm font-bold text-white tracking-wider uppercase">Adelantos de Dinero</span>
            </div>
          </div>

          <form onSubmit={handleSaveAdvance} className="p-8 flex flex-col items-center justify-center">
            <div className="w-full max-w-md space-y-6">
              <div>
                <label className="block text-xs font-bold text-zinc-500 tracking-wider uppercase mb-2">
                  Fecha del Adelanto
                </label>
                <div className="relative">
                  <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 pointer-events-none" />
                  <input
                    type="date"
                    value={advanceDate}
                    onChange={(e) => setAdvanceDate(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 appearance-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-500 tracking-wider uppercase mb-2">
                  Monto Requerido ($ ARS)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">$</span>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    value={advanceAmount}
                    onChange={(e) => setAdvanceAmount(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-white text-lg font-bold focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600"
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-500 tracking-wider uppercase mb-2">
                  Motivo / Concepto (Opcional)
                </label>
                <input
                  type="text"
                  value={advanceDescription}
                  onChange={(e) => setAdvanceDescription(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600"
                  placeholder="Ej. Combustible extra, reparaciones..."
                />
              </div>

              <button
                type="submit"
                disabled={isSubmittingAdvance || !advanceAmount}
                className="w-full bg-white text-black py-4 rounded-xl text-sm font-bold tracking-wider uppercase hover:bg-zinc-200 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <DollarSign className="w-5 h-5" /> Registrar Adelanto
              </button>
            </div>
          </form>
        </div>

        {/* Tasks (Tareas Adicionales) */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="border-b border-zinc-800 flex">
            <div className="px-6 py-4 border-b-2 border-white flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-white" />
              <span className="text-sm font-bold text-white tracking-wider uppercase">Tareas Adicionales</span>
            </div>
          </div>

          <form onSubmit={handleSaveTask} className="p-8 flex flex-col items-center justify-center">
            <div className="w-full max-w-md space-y-6">
              <div>
                <label className="block text-xs font-bold text-zinc-500 tracking-wider uppercase mb-2">
                  Fecha de la Tarea
                </label>
                <div className="relative">
                  <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 pointer-events-none" />
                  <input
                    type="date"
                    value={taskDate}
                    onChange={(e) => setTaskDate(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 appearance-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-500 tracking-wider uppercase mb-2">
                  Descripción (Detalle de la Tarea)
                </label>
                <select
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 appearance-none"
                  required
                >
                  <option value="" disabled>Seleccionar tarea...</option>
                  <option value="Mantenimiento">Mantenimiento</option>
                  <option value="Producción">Producción</option>
                  <option value="Tambo">Tambo</option>
                  <option value="Otros">Otros</option>
                </select>
              </div>

              {taskDescription === 'Otros' && (
                <div>
                  <label className="block text-xs font-bold text-zinc-500 tracking-wider uppercase mb-2">
                    Detallar Tarea
                  </label>
                  <input
                    type="text"
                    value={taskOtherDescription}
                    onChange={(e) => setTaskOtherDescription(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600"
                    placeholder="Escriba el detalle de la tarea..."
                    required
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmittingTask || !taskDescription || (taskDescription === 'Otros' && !taskOtherDescription)}
                className="w-full bg-white text-black py-4 rounded-xl text-sm font-bold tracking-wider uppercase hover:bg-zinc-200 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Briefcase className="w-5 h-5" /> Registrar Tarea
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
