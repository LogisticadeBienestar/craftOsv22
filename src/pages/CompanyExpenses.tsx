import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import { Calendar, Receipt, ExternalLink, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function CompanyExpenses() {
    const { currentUser } = useAuth();
    const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [history, setHistory] = useState<any[]>([]);

    const fetchHistory = async () => {
        if (!currentUser) return;
        try {
            const res = await fetch('/api/company-expenses');
            const data = await res.json();
            setHistory(data.filter((r: any) => r.user_id === currentUser.id));
        } catch (error) {
            console.error('Error fetching expenses:', error);
        }
    };

    useEffect(() => {
        fetchHistory();
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
                    description
                })
            });

            if (res.ok) {
                toast.success('Gasto registrado exitosamente');
                setAmount('');
                setDescription('');
                fetchHistory();
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
                fetchHistory();
            } else {
                throw new Error();
            }
        } catch (error) {
            toast.error('Error al eliminar');
        }
    };

    return (
        <div className="space-y-8 max-w-3xl mx-auto pb-12">
            <div className="border-b border-zinc-800 pb-4">
                <h2 className="text-3xl font-bold tracking-tight text-white font-serif">Gastos de Empresa</h2>
                <div className="flex items-center gap-2 mt-2">
                    <div className="w-2 h-2 rounded-full bg-zinc-500"></div>
                    <p className="text-xs font-bold text-zinc-500 tracking-wider uppercase">Carga de Comprobantes</p>
                </div>
            </div>

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

                            <div>
                                <label className="block text-xs font-bold text-zinc-500 tracking-wider uppercase mb-2">
                                    Descripción Corta
                                </label>
                                <input
                                    type="text"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600"
                                    placeholder="Ej. Peaje, Almuerzo cliente, Insumos..."
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
                        <div className="border-b border-zinc-800 px-6 py-4">
                            <span className="text-sm font-bold text-white tracking-wider uppercase">Historial de Gastos</span>
                        </div>
                        <div className="divide-y divide-zinc-800/50">
                            {history.map(item => (
                                <div key={item.id} className="p-4 flex items-center justify-between hover:bg-zinc-900/50 transition-colors">
                                    <div>
                                        <p className="text-sm font-bold text-white">{item.description}</p>
                                        <p className="text-xs text-zinc-500 mt-1">{format(new Date(item.date + 'T12:00:00'), 'dd/MM/yyyy')}</p>
                                    </div>
                                    <div className="flex items-center gap-4">
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
