import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import { Calendar, Receipt, ExternalLink, Trash2, Edit2, Check, X, Plus, Tag } from 'lucide-react';
import toast from 'react-hot-toast';

const RUBRO_COLORS: Record<string, string> = {
  'General':     'bg-zinc-500/10 text-zinc-400',
  'Combustible': 'bg-amber-500/10 text-amber-400',
  'Tambo':       'bg-emerald-500/10 text-emerald-400',
  'Peaje':       'bg-blue-500/10 text-blue-400',
  'Limpieza':    'bg-cyan-500/10 text-cyan-400',
  'Envases':     'bg-purple-500/10 text-purple-400',
  'Etiquetas':   'bg-pink-500/10 text-pink-400',
  'Fermentos':   'bg-orange-500/10 text-orange-400',
  'EPEC':        'bg-yellow-500/10 text-yellow-400',
  'Agua':        'bg-sky-500/10 text-sky-400',
  'Personal':    'bg-rose-500/10 text-rose-400',
  'Librería':    'bg-indigo-500/10 text-indigo-400',
};

function rubroColor(rubro: string) {
  return RUBRO_COLORS[rubro] || 'bg-zinc-500/10 text-zinc-400';
}

export default function CompanyExpenses() {
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'admin';

  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [rubro, setRubro] = useState('General');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  // Re-imputation state (admin only)
  const [editingRubroId, setEditingRubroId] = useState<string | null>(null);
  const [editingRubroValue, setEditingRubroValue] = useState('');

  // New category state (admin)
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const fetchData = async () => {
    if (!currentUser) return;
    try {
      const [expRes, catRes] = await Promise.all([
        fetch('/api/company-expenses'),
        fetch('/api/expense-categories')
      ]);
      const expData = await expRes.json();
      const catData = await catRes.json();
      setHistory(expData.filter((r: any) => r.user_id === currentUser.id));
      setCategories(catData);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const fetchAllHistory = async () => {
    if (!currentUser) return;
    try {
      const [expRes, catRes] = await Promise.all([
        fetch('/api/company-expenses'),
        fetch('/api/expense-categories')
      ]);
      const expData = await expRes.json();
      const catData = await catRes.json();
      // Admin sees all, user sees only their own
      setHistory(isAdmin ? expData : expData.filter((r: any) => r.user_id === currentUser.id));
      setCategories(catData);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  useEffect(() => {
    fetchAllHistory();
  }, [currentUser]);

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !amount || !description) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/company-expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          user_id: currentUser.id,
          amount: parseFloat(amount),
          description,
          rubro
        })
      });

      if (res.ok) {
        toast.success('Gasto registrado exitosamente');
        setAmount('');
        setDescription('');
        setRubro('General');
        fetchAllHistory();
      } else {
        throw new Error('Error al guardar');
      }
    } catch (error) {
      console.error(error);
      toast.error('Hubo un error al registrar el gasto.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Seguro de eliminar este gasto?')) return;
    try {
      const res = await fetch(`/api/company-expenses/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Gasto eliminado');
        fetchAllHistory();
      } else {
        throw new Error();
      }
    } catch (error) {
      toast.error('Error al eliminar');
    }
  };

  const handleSaveRubro = async (id: string) => {
    try {
      const res = await fetch(`/api/company-expenses/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rubro: editingRubroValue })
      });
      if (res.ok) {
        toast.success('Rubro actualizado');
        setEditingRubroId(null);
        fetchAllHistory();
      } else throw new Error();
    } catch {
      toast.error('Error al actualizar rubro');
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      const res = await fetch('/api/expense-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCategoryName.trim() })
      });
      if (res.ok) {
        toast.success('Rubro creado');
        setNewCategoryName('');
        setShowAddCategory(false);
        fetchAllHistory();
      } else throw new Error();
    } catch {
      toast.error('Error al crear rubro');
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('¿Eliminar este rubro? Los gastos asociados quedarán como "General".')) return;
    try {
      const res = await fetch(`/api/expense-categories/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Rubro eliminado');
        fetchAllHistory();
      } else throw new Error();
    } catch {
      toast.error('Error al eliminar rubro');
    }
  };

  const categoryNames = categories.map((c: any) => c.name);

  return (
    <div className="space-y-8 max-w-3xl mx-auto pb-12">
      <div className="border-b border-zinc-800 pb-4">
        <h2 className="text-3xl font-bold tracking-tight text-white font-serif">Gastos de Empresa</h2>
        <div className="flex items-center gap-2 mt-2">
          <div className="w-2 h-2 rounded-full bg-zinc-500"></div>
          <p className="text-xs font-bold text-zinc-500 tracking-wider uppercase">Carga de Comprobantes</p>
        </div>
      </div>

      {/* Admin: Rubros management */}
      {isAdmin && (
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="border-b border-zinc-800 px-6 py-4 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-zinc-400" />
              <span className="text-sm font-bold text-white tracking-wider uppercase">Gestión de Rubros</span>
            </div>
            <button
              onClick={() => setShowAddCategory(!showAddCategory)}
              className="flex items-center gap-2 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg hover:bg-emerald-500/20 transition-colors"
            >
              <Plus className="w-3 h-3" /> Nuevo Rubro
            </button>
          </div>

          {showAddCategory && (
            <div className="px-6 py-4 border-b border-zinc-800 flex gap-3">
              <input
                type="text"
                value={newCategoryName}
                onChange={e => setNewCategoryName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddCategory()}
                placeholder="Nombre del rubro..."
                className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500"
                autoFocus
              />
              <button onClick={handleAddCategory} className="px-4 py-2 bg-white text-black rounded-lg text-sm font-bold hover:bg-zinc-200 transition-colors">
                Crear
              </button>
              <button onClick={() => setShowAddCategory(false)} className="px-3 py-2 text-zinc-500 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="p-4 flex flex-wrap gap-2">
            {categories.map((cat: any) => (
              <div key={cat.id} className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold ${rubroColor(cat.name)}`}>
                {cat.name}
                {isAdmin && cat.id !== 'general' && (
                  <button
                    onClick={() => handleDeleteCategory(cat.id)}
                    className="opacity-50 hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-8">
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="border-b border-zinc-800 flex justify-between items-center pr-6">
            <div className="px-6 py-4 border-b-2 border-white flex items-center gap-2">
              <Receipt className="w-4 h-4 text-white" />
              <span className="text-sm font-bold text-white tracking-wider uppercase">Nuevo Gasto</span>
            </div>
            <a
              href="https://docs.google.com/forms/d/e/1FAIpQLScflhbga5QpG-koGuTGFH4cwF64gje57yQG6QfEdHzXIJ_M-g/viewform?usp=publish-editor"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-bold bg-blue-500/10 text-blue-400 px-3 py-1.5 rounded-lg flex items-center gap-2 hover:bg-blue-500/20 transition-colors"
            >
              <ExternalLink className="w-3 h-3" /> Subir Comprobante
            </a>
          </div>

          <form onSubmit={handleSaveExpense} className="p-8 flex flex-col items-center justify-center">
            <div className="w-full max-w-md space-y-6">
              <div>
                <label className="block text-xs font-bold text-zinc-500 tracking-wider uppercase mb-2">
                  Fecha del Comprobante
                </label>
                <div className="relative">
                  <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 pointer-events-none" />
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 appearance-none"
                    required
                  />
                </div>
              </div>

              {/* Rubro selector */}
              <div>
                <label className="block text-xs font-bold text-zinc-500 tracking-wider uppercase mb-2">
                  Rubro
                </label>
                <select
                  value={rubro}
                  onChange={e => setRubro(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 appearance-none"
                >
                  {categoryNames.length > 0 ? (
                    categoryNames.map((name: string) => (
                      <option key={name} value={name}>{name}</option>
                    ))
                  ) : (
                    <>
                      <option value="General">General</option>
                      <option value="Combustible">Combustible</option>
                      <option value="Tambo">Tambo</option>
                      <option value="Peaje">Peaje</option>
                      <option value="Limpieza">Limpieza</option>
                      <option value="Envases">Envases</option>
                      <option value="Etiquetas">Etiquetas</option>
                      <option value="Fermentos">Fermentos</option>
                      <option value="EPEC">EPEC</option>
                      <option value="Agua">Agua</option>
                      <option value="Personal">Personal</option>
                      <option value="Librería">Librería</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-500 tracking-wider uppercase mb-2">
                  Descripción
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600"
                  placeholder="Ej. Peaje Río Cuarto, Almuerzo cliente, Insumos..."
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-500 tracking-wider uppercase mb-2">
                  Monto Final ($ ARS)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">$</span>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-white text-lg font-bold focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600"
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>

              <div className="pt-2">
                <p className="text-xs text-zinc-500 mb-4 text-center">
                  Asegúrate de haber adjuntado el comprobante fotográfico en el botón de Google Forms.
                </p>
                <button
                  type="submit"
                  disabled={isSubmitting || !amount || !description}
                  className="w-full bg-white text-black py-4 rounded-xl text-sm font-bold tracking-wider uppercase hover:bg-zinc-200 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Receipt className="w-5 h-5" /> Registrar Gasto
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* History */}
        {history.length > 0 && (
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden">
            <div className="border-b border-zinc-800 px-6 py-4 flex justify-between items-center">
              <span className="text-sm font-bold text-white tracking-wider uppercase">
                {isAdmin ? 'Todos los Gastos' : 'Mis Gastos'}
              </span>
              <span className="text-xs text-zinc-500">{history.length} registro{history.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="divide-y divide-zinc-800/50">
              {history.map(item => (
                <div key={item.id} className="p-4 flex items-center justify-between hover:bg-zinc-900/50 transition-colors gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-white truncate">{item.description}</p>
                      {/* Rubro badge */}
                      {editingRubroId === item.id ? (
                        <div className="flex items-center gap-2">
                          <select
                            value={editingRubroValue}
                            onChange={e => setEditingRubroValue(e.target.value)}
                            className="bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none"
                            autoFocus
                          >
                            {categoryNames.length > 0 ? (
                              categoryNames.map((name: string) => (
                                <option key={name} value={name}>{name}</option>
                              ))
                            ) : (
                              ['General','Combustible','Tambo','Peaje','Limpieza','Envases','Etiquetas','Fermentos','EPEC','Agua','Personal','Librería'].map(n => (
                                <option key={n} value={n}>{n}</option>
                              ))
                            )}
                          </select>
                          <button onClick={() => handleSaveRubro(item.id)} className="text-emerald-400 hover:text-emerald-300">
                            <Check className="w-4 h-4" />
                          </button>
                          <button onClick={() => setEditingRubroId(null)} className="text-zinc-500 hover:text-white">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${rubroColor(item.rubro || 'General')}`}>
                            {item.rubro || 'General'}
                          </span>
                          {isAdmin && (
                            <button
                              onClick={() => { setEditingRubroId(item.id); setEditingRubroValue(item.rubro || 'General'); }}
                              className="text-zinc-600 hover:text-zinc-400 transition-colors"
                              title="Re-imputar rubro"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <p className="text-xs text-zinc-500">{format(new Date(item.date + 'T12:00:00'), 'dd/MM/yyyy')}</p>
                      {isAdmin && item.user_name && (
                        <p className="text-xs text-zinc-600">• {item.user_name}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <span className="font-bold text-lg text-emerald-400">${item.amount.toLocaleString()}</span>
                    <button onClick={() => handleDelete(item.id)} className="p-2 text-zinc-500 hover:text-red-500 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
