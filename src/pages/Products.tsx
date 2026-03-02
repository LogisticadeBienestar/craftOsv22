import { useState, useEffect } from 'react';
import { Search, Plus, Save, Edit2, X } from 'lucide-react';

export default function Products() {
  const [products, setProducts] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', price: 0, sku: '', category: '' });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = () => {
    fetch('/api/products')
      .then(res => res.json())
      .then(data => setProducts(data));
  };

  const handleEditClick = (product: any) => {
    setEditingId(product.id);
    setEditForm({ name: product.name, price: product.price, sku: product.sku || '', category: product.category || '' });
    setIsAdding(false);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setIsAdding(false);
  };

  const handleSave = async (id: string) => {
    if (isAdding) {
      await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: crypto.randomUUID(),
          ...editForm
        })
      });
    } else {
      await fetch(`/api/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });
    }
    setEditingId(null);
    setIsAdding(false);
    fetchProducts();
  };

  const handleAddNew = () => {
    setIsAdding(true);
    setEditingId('new');
    setEditForm({ name: '', price: 0, sku: '', category: 'Mayorista' });
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight">Productos (Lista Mayorista)</h2>
        <button
          onClick={handleAddNew}
          disabled={isAdding}
          className="bg-white text-black px-4 py-2 rounded-lg text-sm font-bold tracking-wider uppercase flex items-center gap-2 hover:bg-zinc-200 transition-colors disabled:opacity-50">
          <Plus className="w-4 h-4" /> Nuevo Producto
        </button>
      </div>

      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-zinc-800 flex gap-4 items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Buscar productos..."
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
                <th className="px-6 py-4 font-medium">SKU</th>
                <th className="px-6 py-4 font-medium">Nombre</th>
                <th className="px-6 py-4 font-medium">Categoría</th>
                <th className="px-6 py-4 font-medium text-right">Precio</th>
                <th className="px-6 py-4 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {isAdding && (
                <tr className="bg-zinc-900/50 transition-colors border-b-2 border-emerald-500/20">
                  <td className="px-6 py-4">
                    <input
                      type="text"
                      placeholder="SKU"
                      value={editForm.sku}
                      onChange={(e) => setEditForm({ ...editForm, sku: e.target.value })}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1 font-mono text-white focus:outline-none focus:border-emerald-500"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <input
                      type="text"
                      placeholder="Nombre del producto"
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1 text-white focus:outline-none focus:border-emerald-500"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <input
                      type="text"
                      placeholder="Categoría"
                      value={editForm.category}
                      onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1 text-white focus:outline-none focus:border-emerald-500"
                    />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <span className="text-zinc-500">$</span>
                      <input
                        type="number"
                        placeholder="Precio"
                        value={editForm.price}
                        onChange={(e) => setEditForm({ ...editForm, price: parseFloat(e.target.value) || 0 })}
                        className="w-24 bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1 text-white text-right focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleSave('new')}
                        disabled={!editForm.name || !editForm.sku}
                        className="p-1.5 bg-emerald-500/10 text-emerald-500 rounded-lg hover:bg-emerald-500/20 disabled:opacity-50 transition-colors"
                        title="Guardar"
                      >
                        <Save className="w-4 h-4" />
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="p-1.5 bg-zinc-800 text-zinc-400 rounded-lg hover:bg-zinc-700 hover:text-white transition-colors"
                        title="Cancelar"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              )}
              {filteredProducts.map((product) => {
                const isEditing = editingId === product.id;

                return (
                  <tr key={product.id} className="hover:bg-zinc-900/50 transition-colors">
                    <td className="px-6 py-4 font-mono text-zinc-400">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editForm.sku}
                          onChange={(e) => setEditForm({ ...editForm, sku: e.target.value })}
                          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1 text-white focus:outline-none focus:border-zinc-500"
                        />
                      ) : product.sku}
                    </td>
                    <td className="px-6 py-4 font-medium text-white">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editForm.name}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1 text-white focus:outline-none focus:border-zinc-500"
                        />
                      ) : (
                        <div className="flex items-center gap-3">
                          {product.image && (
                            <img src={product.image} alt={product.name} className="w-8 h-8 rounded-full object-cover border border-zinc-800" referrerPolicy="no-referrer" />
                          )}
                          {product.name}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-zinc-400">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editForm.category}
                          onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1 text-white focus:outline-none focus:border-zinc-500"
                        />
                      ) : (product.category || '-')}
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-white">
                      {isEditing ? (
                        <div className="flex items-center justify-end gap-1">
                          <span className="text-zinc-500">$</span>
                          <input
                            type="number"
                            value={editForm.price}
                            onChange={(e) => setEditForm({ ...editForm, price: parseFloat(e.target.value) || 0 })}
                            className="w-24 bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1 text-white text-right focus:outline-none focus:border-zinc-500"
                          />
                        </div>
                      ) : (
                        `$${product.price.toLocaleString()}`
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {isEditing ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleSave(product.id)}
                            className="p-1.5 bg-emerald-500/10 text-emerald-500 rounded-lg hover:bg-emerald-500/20 transition-colors"
                            title="Guardar"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="p-1.5 bg-zinc-800 text-zinc-400 rounded-lg hover:bg-zinc-700 hover:text-white transition-colors"
                            title="Cancelar"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleEditClick(product)}
                          className="p-1.5 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-zinc-500">
                    No se encontraron productos.
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
