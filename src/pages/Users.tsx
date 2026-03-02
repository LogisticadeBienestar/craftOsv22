import { useState, useEffect, type FormEvent } from 'react';
import { Plus, Edit2, Trash2, Search, X, DownloadCloud } from 'lucide-react';
import { ConfirmModal } from '../components/ConfirmModal';
import { AlertModal } from '../components/AlertModal';

export default function Users() {
  const [users, setUsers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [alertConfig, setAlertConfig] = useState<{ isOpen: boolean, title: string, message: string }>({ isOpen: false, title: '', message: '' });

  // Form State
  const [name, setName] = useState('');
  const [role, setRole] = useState('DELIVERY');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = () => {
    fetch('/api/users')
      .then(res => res.json())
      .then(data => setUsers(data));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const userData = {
      id: editingUser ? editingUser.id : crypto.randomUUID(),
      name,
      role
    };

    try {
      const res = await fetch(`/api/users${editingUser ? `/${editingUser.id}` : ''}`, {
        method: editingUser ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });

      if (!res.ok) throw new Error('Error al guardar el usuario');

      fetchUsers();
      setIsModalOpen(false);
      setEditingUser(null);
      setName('');
      setRole('DELIVERY');
      setAlertConfig({ isOpen: true, title: 'Éxito', message: 'Usuario guardado correctamente.' });
    } catch (error) {
      console.error(error);
      setAlertConfig({ isOpen: true, title: 'Error', message: 'Hubo un error al guardar el usuario.' });
    }
  };

  const handleEdit = (user: any) => {
    setEditingUser(user);
    setName(user.name);
    setRole(user.role);
    setIsModalOpen(true);
  };

  const executeDelete = async () => {
    if (!userToDelete) return;
    setIsConfirmOpen(false);

    try {
      const res = await fetch(`/api/users/${userToDelete}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al eliminar el usuario');
      fetchUsers();
      setAlertConfig({ isOpen: true, title: 'Éxito', message: 'Usuario eliminado correctamente.' });
    } catch (error) {
      console.error(error);
      setAlertConfig({ isOpen: true, title: 'Error', message: 'Hubo un error al eliminar el usuario.' });
    } finally {
      setUserToDelete(null);
    }
  };

  const handleDelete = (id: string) => {
    setUserToDelete(id);
    setIsConfirmOpen(true);
  };

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <ConfirmModal
        isOpen={isConfirmOpen}
        title="Eliminar Usuario"
        message="¿Estás seguro de que deseas eliminar este usuario? Esta acción no se puede deshacer."
        onConfirm={executeDelete}
        onCancel={() => {
          setIsConfirmOpen(false);
          setUserToDelete(null);
        }}
      />
      <AlertModal
        isOpen={alertConfig.isOpen}
        title={alertConfig.title}
        message={alertConfig.message}
        onClose={() => setAlertConfig({ ...alertConfig, isOpen: false })}
      />

      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight">Usuarios</h2>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              // Construct the backup URL. In a real scenario, this secret should be requested or managed securely.
              const secret = 'craftos-backup-2026'; // Default from server.ts
              window.location.href = `/api/backup?secret=${secret}`;
            }}
            className="bg-zinc-800 text-white px-4 py-2 rounded-lg text-sm font-bold tracking-wider uppercase flex items-center gap-2 hover:bg-zinc-700 transition-colors"
          >
            <DownloadCloud className="w-4 h-4" /> Respaldar BD
          </button>
          <button
            onClick={() => {
              setEditingUser(null);
              setName('');
              setRole('DELIVERY');
              setIsModalOpen(true);
            }}
            className="bg-white text-black px-4 py-2 rounded-lg text-sm font-bold tracking-wider uppercase flex items-center gap-2 hover:bg-zinc-200 transition-colors"
          >
            <Plus className="w-4 h-4" /> Nuevo Usuario
          </button>
        </div>
      </div>

      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-zinc-800 flex gap-4 items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Buscar usuarios..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-900/50 text-xs font-bold text-zinc-500 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 font-medium">Nombre</th>
                <th className="px-6 py-4 font-medium">Rol</th>
                <th className="px-6 py-4 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-zinc-900/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-white">{user.name}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${user.role === 'ADMIN' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-500/10 text-blue-500'
                      }`}>
                      {user.role === 'ADMIN' ? 'Administrador' : 'Usuario General'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleEdit(user)}
                      className="text-zinc-500 hover:text-white transition-colors mr-3"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(user.id)}
                      className="text-zinc-500 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-zinc-500">
                    No se encontraron usuarios.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
              <h3 className="text-lg font-bold text-white">
                {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-500 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div>
                <label className="block text-xs font-bold text-zinc-500 tracking-wider uppercase mb-2">
                  Nombre
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600"
                  placeholder="Ej. Juan Pérez"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 tracking-wider uppercase mb-2">
                  Rol
                </label>
                <select
                  required
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600"
                >
                  <option value="DELIVERY">Usuario General</option>
                  <option value="ADMIN">Administrador</option>
                </select>
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-bold text-zinc-400 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-white text-black text-sm font-bold rounded-lg hover:bg-zinc-200 transition-colors"
                >
                  Guardar Usuario
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
