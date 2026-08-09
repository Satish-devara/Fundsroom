import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Plus, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  Edit2, 
  X, 
  AlertTriangle,
  History,
  Package,
  Layers,
  ArrowUpRight,
  ArrowDownLeft
} from 'lucide-react';

interface Product {
  id: number;
  name: string;
  sku: string;
  category: string;
  unitPrice: number;
  currentStock: number;
  minStockAlert: number;
  warehouseLocation: string;
  updatedAt: string;
}

interface StockMovement {
  id: number;
  productId: number;
  quantityChanged: number;
  type: string;
  reason: string;
  createdBy: string;
  createdAt: string;
  product: {
    name: string;
    sku: string;
  };
}

export const Inventory: React.FC = () => {
  const { user, apiFetch } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<'products' | 'movements'>('products');

  // Products State
  const [products, setProducts] = useState<Product[]>([]);
  const [prodSearch, setProdSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [lowStockFilter, setLowStockFilter] = useState(false);
  const [prodPage, setProdPage] = useState(1);
  const [prodTotalPages, setProdTotalPages] = useState(1);

  // Movements State
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [movePage, setMovePage] = useState(1);
  const [moveTotalPages, setMoveTotalPages] = useState(1);

  // Modals
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);

  // Add/Edit Product Fields
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState('');
  const [unitPrice, setUnitPrice] = useState(0);
  const [currentStock, setCurrentStock] = useState(0);
  const [minStockAlert, setMinStockAlert] = useState(0);
  const [warehouseLocation, setWarehouseLocation] = useState('');

  // Stock Adjustment Fields
  const [adjustType, setAdjustType] = useState('IN'); // IN or OUT
  const [adjustQty, setAdjustQty] = useState(1);
  const [adjustReason, setAdjustReason] = useState('');

  const [loading, setLoading] = useState(false);

  const isWarehouseOrAdmin = ['ADMIN', 'WAREHOUSE'].includes(user?.role || '');

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const endpoint = `/products?page=${prodPage}&limit=8&search=${prodSearch}&category=${catFilter}&lowStock=${lowStockFilter}`;
      const data = await apiFetch(endpoint);
      setProducts(data.products);
      setProdTotalPages(data.pagination.totalPages);
    } catch (err) {
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMovements = async () => {
    setLoading(true);
    try {
      const endpoint = `/products/movements?page=${movePage}&limit=10`;
      const data = await apiFetch(endpoint);
      setMovements(data.movements);
      setMoveTotalPages(data.pagination.totalPages);
    } catch (err) {
      console.error('Error fetching stock movements:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeSubTab === 'products') {
      fetchProducts();
    } else {
      fetchMovements();
    }
  }, [activeSubTab, prodPage, prodSearch, catFilter, lowStockFilter, movePage]);

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setName('');
    setSku('');
    setCategory('');
    setUnitPrice(0);
    setCurrentStock(0);
    setMinStockAlert(5);
    setWarehouseLocation('');
    setShowAddEditModal(true);
  };

  const handleOpenEdit = (prod: Product) => {
    setEditingProduct(prod);
    setName(prod.name);
    setSku(prod.sku);
    setCategory(prod.category);
    setUnitPrice(prod.unitPrice);
    setCurrentStock(prod.currentStock); // note: currentStock cannot be changed during normal edit, must be adjusted through Stock Adjustment
    setMinStockAlert(prod.minStockAlert);
    setWarehouseLocation(prod.warehouseLocation);
    setShowAddEditModal(true);
  };

  const handleOpenAdjust = (prod: Product) => {
    setAdjustingProduct(prod);
    setAdjustType('IN');
    setAdjustQty(1);
    setAdjustReason('');
    setShowAdjustModal(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (unitPrice < 0 || minStockAlert < 0 || (!editingProduct && currentStock < 0)) {
      alert('Values cannot be negative');
      return;
    }

    const payload: any = {
      name,
      sku,
      category,
      unitPrice,
      minStockAlert,
      warehouseLocation
    };

    if (!editingProduct) {
      payload.currentStock = currentStock;
    }

    try {
      if (editingProduct) {
        await apiFetch(`/products/${editingProduct.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
      } else {
        await apiFetch('/products', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
      }
      setShowAddEditModal(false);
      fetchProducts();
    } catch (err: any) {
      alert(err.message || 'Error saving product');
    }
  };

  const handleSaveAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingProduct || adjustQty <= 0) return;

    try {
      await apiFetch(`/products/${adjustingProduct.id}/stock`, {
        method: 'POST',
        body: JSON.stringify({
          quantityChanged: adjustQty,
          type: adjustType,
          reason: adjustReason
        })
      });
      setShowAdjustModal(false);
      fetchProducts();
    } catch (err: any) {
      alert(err.message || 'Error processing stock adjustment');
    }
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-title-group">
          <h1>Product & Inventory Module</h1>
          <p>Monitor warehouse shelves, track movement audit logs, manage items</p>
        </div>
        {activeSubTab === 'products' && isWarehouseOrAdmin && (
          <button className="btn-primary" onClick={handleOpenAdd} style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={16} />
            <span>Add Product</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '10px' }}>
        <button 
          className={`btn-secondary btn-sm ${activeSubTab === 'products' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('products')}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', border: activeSubTab === 'products' ? '1px solid var(--accent-indigo)' : '' }}
        >
          <Package size={14} />
          <span>Products Inventory</span>
        </button>
        <button 
          className={`btn-secondary btn-sm ${activeSubTab === 'movements' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('movements')}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', border: activeSubTab === 'movements' ? '1px solid var(--accent-indigo)' : '' }}
        >
          <History size={14} />
          <span>Stock Movement Log</span>
        </button>
      </div>

      {/* View 1: Products Tab */}
      {activeSubTab === 'products' && (
        <div className="card-section">
          {/* Filters */}
          <div className="filters-bar">
            <div className="search-wrapper">
              <Search className="search-icon" size={16} />
              <input 
                type="text" 
                className="search-input" 
                placeholder="Search products by Name or SKU..." 
                value={prodSearch}
                onChange={(e) => { setProdSearch(e.target.value); setProdPage(1); }}
              />
            </div>

            <input 
              type="text" 
              className="form-input" 
              placeholder="Category filter" 
              value={catFilter}
              onChange={(e) => { setCatFilter(e.target.value); setProdPage(1); }}
              style={{ width: 'auto', minWidth: '160px' }}
            />

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: 'var(--text-muted)' }}>
              <input 
                type="checkbox" 
                checked={lowStockFilter} 
                onChange={(e) => { setLowStockFilter(e.target.checked); setProdPage(1); }}
                style={{ width: '16px', height: '16px', accentColor: 'var(--accent-indigo)' }}
              />
              <span style={{ color: lowStockFilter ? 'var(--accent-rose)' : 'inherit', fontWeight: lowStockFilter ? 600 : 'normal' }}>
                Show Low Stock Alerts
              </span>
            </label>
          </div>

          {/* Table */}
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Product Name</th>
                  <th>Category</th>
                  <th>Unit Price</th>
                  <th>Current Stock</th>
                  <th>Warehouse Location</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                      No inventory items found matching search filters.
                    </td>
                  </tr>
                ) : (
                  products.map((p) => {
                    const isLowStock = p.currentStock <= p.minStockAlert;
                    return (
                      <tr key={p.id} className={isLowStock ? 'low-stock-row' : ''}>
                        <td><code>{p.sku}</code></td>
                        <td style={{ fontWeight: 600 }}>{p.name}</td>
                        <td>{p.category}</td>
                        <td>₹{p.unitPrice.toLocaleString()}</td>
                        <td>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: isLowStock ? 'var(--accent-rose)' : 'inherit' }}>
                            {isLowStock && <AlertTriangle size={14} />}
                            {p.currentStock}
                          </span>
                        </td>
                        <td>{p.warehouseLocation}</td>
                        <td>
                          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                            {isWarehouseOrAdmin && (
                              <>
                                <button className="btn-secondary btn-sm" onClick={() => handleOpenAdjust(p)} title="Adjust Stock">
                                  <Layers size={14} />
                                </button>
                                <button className="btn-secondary btn-sm" onClick={() => handleOpenEdit(p)} title="Edit Product">
                                  <Edit2 size={14} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Paginate */}
          {prodTotalPages > 1 && (
            <div className="pagination-controls">
              <span className="page-numbers">Page {prodPage} of {prodTotalPages}</span>
              <div className="pagination-buttons">
                <button 
                  className="btn-secondary btn-sm"
                  disabled={prodPage === 1}
                  onClick={() => setProdPage(p => p - 1)}
                >
                  <ChevronLeft size={16} />
                </button>
                <button 
                  className="btn-secondary btn-sm"
                  disabled={prodPage === prodTotalPages}
                  onClick={() => setProdPage(p => p + 1)}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* View 2: Movements Tab */}
      {activeSubTab === 'movements' && (
        <div className="card-section">
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>SKU</th>
                  <th>Product</th>
                  <th>Qty Changed</th>
                  <th>Type</th>
                  <th>Reason</th>
                  <th>Operator</th>
                </tr>
              </thead>
              <tbody>
                {movements.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                      No stock movement audits recorded.
                    </td>
                  </tr>
                ) : (
                  movements.map((m) => (
                    <tr key={m.id}>
                      <td style={{ color: 'var(--text-muted)' }}>{new Date(m.createdAt).toLocaleString()}</td>
                      <td><code>{m.product.sku}</code></td>
                      <td style={{ fontWeight: 500 }}>{m.product.name}</td>
                      <td>
                        <span style={{ 
                          fontWeight: 600, 
                          color: m.type === 'IN' ? 'var(--accent-emerald)' : 'var(--accent-rose)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          {m.type === 'IN' ? <ArrowUpRight size={12} /> : <ArrowDownLeft size={12} />}
                          {m.quantityChanged > 0 ? `+${m.quantityChanged}` : m.quantityChanged}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${m.type === 'IN' ? 'badge-success' : 'badge-danger'}`}>{m.type}</span>
                      </td>
                      <td>{m.reason}</td>
                      <td>{m.createdBy}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Paginate Movements */}
          {moveTotalPages > 1 && (
            <div className="pagination-controls">
              <span className="page-numbers">Page {movePage} of {moveTotalPages}</span>
              <div className="pagination-buttons">
                <button 
                  className="btn-secondary btn-sm"
                  disabled={movePage === 1}
                  onClick={() => setMovePage(p => p - 1)}
                >
                  <ChevronLeft size={16} />
                </button>
                <button 
                  className="btn-secondary btn-sm"
                  disabled={movePage === moveTotalPages}
                  onClick={() => setMovePage(p => p + 1)}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add / Edit Product Modal */}
      {showAddEditModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title">{editingProduct ? 'Edit Product' : 'Add New Product'}</h2>
              <button className="close-btn" onClick={() => setShowAddEditModal(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveProduct}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div className="form-group">
                  <label className="form-label">Product Name *</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    required 
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">SKU / Code *</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. SKU-BOX-101"
                    value={sku} 
                    onChange={(e) => setSku(e.target.value)} 
                    required 
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div className="form-group">
                  <label className="form-label">Category *</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. Accessories"
                    value={category} 
                    onChange={(e) => setCategory(e.target.value)} 
                    required 
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Unit Price (₹) *</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    value={unitPrice} 
                    onChange={(e) => setUnitPrice(parseFloat(e.target.value))} 
                    required 
                    min="0"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div className="form-group">
                  <label className="form-label">Min Stock Alert Quantity *</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    value={minStockAlert} 
                    onChange={(e) => setMinStockAlert(parseInt(e.target.value))} 
                    required 
                    min="0"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Warehouse Shelf / Location *</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. Aisle 2, Shelf B"
                    value={warehouseLocation} 
                    onChange={(e) => setWarehouseLocation(e.target.value)} 
                    required 
                  />
                </div>
              </div>

              {/* Set stock only for new products */}
              {!editingProduct && (
                <div className="form-group">
                  <label className="form-label">Initial Opening Stock *</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    value={currentStock} 
                    onChange={(e) => setCurrentStock(parseInt(e.target.value))} 
                    required 
                    min="0"
                  />
                </div>
              )}

              <button type="submit" className="btn-primary" style={{ marginTop: '10px' }}>
                Save Product
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Manual Stock Adjustment Modal */}
      {showAdjustModal && adjustingProduct && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title">Manual Stock Adjustment</h2>
              <button className="close-btn" onClick={() => setShowAdjustModal(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="details-block" style={{ marginBottom: '20px' }}>
              <div className="details-row">
                <span className="details-label">Product SKU / Name</span>
                <span className="details-value">[{adjustingProduct.sku}] {adjustingProduct.name}</span>
              </div>
              <div className="details-row">
                <span className="details-label">Current Physical Stock</span>
                <span className="details-value" style={{ fontWeight: 600 }}>{adjustingProduct.currentStock} units</span>
              </div>
            </div>

            <form onSubmit={handleSaveAdjustment}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div className="form-group">
                  <label className="form-label">Adjustment Type *</label>
                  <select 
                    className="form-select" 
                    value={adjustType}
                    onChange={(e) => setAdjustType(e.target.value)}
                  >
                    <option value="IN">Stock IN (Receive / Add)</option>
                    <option value="OUT">Stock OUT (Damage / Dispatch)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Quantity *</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    value={adjustQty}
                    onChange={(e) => setAdjustQty(parseInt(e.target.value))}
                    required
                    min="1"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Audit Note / Reason for adjustment *</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="e.g. Received shipment, Found damaged item on aisle" 
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="btn-primary" style={{ marginTop: '10px' }}>
                Submit Adjustment
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
