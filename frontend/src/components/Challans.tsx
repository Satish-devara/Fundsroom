import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Plus, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  Eye, 
  X, 
  Trash2, 
  ArrowLeft,
  FileCheck,
  Ban,
  Clock,
  Printer
} from 'lucide-react';

interface Challan {
  id: number;
  challanNumber: string;
  customerId: number;
  totalQuantity: number;
  status: string;
  createdBy: string;
  createdAt: string;
  customerSnapshot: {
    id: number;
    name: string;
    businessName: string;
    mobile: string;
    email: string;
    gstNumber: string | null;
    address: string;
    type: string;
  };
  productsSnapshot: Array<{
    id: number;
    name: string;
    sku: string;
    category: string;
    unitPrice: number;
    warehouseLocation: string;
    quantity: number;
  }>;
}

export const Challans: React.FC = () => {
  const { user, apiFetch } = useAuth();
  const [challans, setChallans] = useState<Challan[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  // View control
  const [currentView, setCurrentView] = useState<'list' | 'create' | 'detail'>('list');
  const [selectedChallan, setSelectedChallan] = useState<Challan | null>(null);

  // Form lists
  const [customerOptions, setCustomerOptions] = useState<any[]>([]);
  const [productOptions, setProductOptions] = useState<any[]>([]);

  // Form Fields
  const [formCustomerId, setFormCustomerId] = useState('');
  const [formItems, setFormItems] = useState<Array<{ id: string; quantity: number }>>([
    { id: '', quantity: 1 }
  ]);

  const isSalesOrAdmin = ['ADMIN', 'SALES'].includes(user?.role || '');
  const canUpdateStatus = ['ADMIN', 'SALES', 'WAREHOUSE'].includes(user?.role || '');

  const fetchChallans = async () => {
    setLoading(true);
    try {
      const data = await apiFetch(`/challans?page=${page}&limit=8&search=${search}&status=${statusFilter}`);
      setChallans(data.challans);
      setTotalPages(data.pagination.totalPages);
    } catch (err) {
      console.error('Error fetching challans:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadFormOptions = async () => {
    try {
      const custData = await apiFetch('/customers?limit=100');
      const prodData = await apiFetch('/products?limit=100');
      setCustomerOptions(custData.customers);
      setProductOptions(prodData.products);
    } catch (err) {
      console.error('Error loading challan form options:', err);
    }
  };

  useEffect(() => {
    if (currentView === 'list') {
      fetchChallans();
    } else if (currentView === 'create') {
      loadFormOptions();
    }
  }, [currentView, page, search, statusFilter]);

  const handleOpenCreate = () => {
    setFormCustomerId('');
    setFormItems([{ id: '', quantity: 1 }]);
    setCurrentView('create');
  };

  const handleOpenDetail = (challan: Challan) => {
    setSelectedChallan(challan);
    setCurrentView('detail');
  };

  const handleAddItemRow = () => {
    setFormItems([...formItems, { id: '', quantity: 1 }]);
  };

  const handleRemoveItemRow = (index: number) => {
    const updated = [...formItems];
    updated.splice(index, 1);
    setFormItems(updated);
  };

  const handleItemChange = (index: number, field: 'id' | 'quantity', value: any) => {
    const updated = [...formItems];
    if (field === 'id') {
      updated[index].id = value;
    } else {
      updated[index].quantity = parseInt(value) || 1;
    }
    setFormItems(updated);
  };

  // Submit Challan
  const handleSubmitChallan = async (statusType: 'DRAFT' | 'CONFIRMED') => {
    if (!formCustomerId) {
      alert('Please select a customer');
      return;
    }

    const invalidItems = formItems.filter(item => !item.id || item.quantity <= 0);
    if (invalidItems.length > 0) {
      alert('Please fill in all product lines with quantities greater than 0');
      return;
    }

    const payload = {
      customerId: parseInt(formCustomerId),
      products: formItems.map(i => ({ id: parseInt(i.id), quantity: i.quantity })),
      status: statusType
    };

    try {
      await apiFetch('/challans', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      setCurrentView('list');
    } catch (err: any) {
      alert(err.message || 'Error creating challan. If Confirmed, verify inventory levels.');
    }
  };

  // Transition Challan Status (Draft -> Confirmed / Cancelled, Confirmed -> Cancelled)
  const handleTransitionStatus = async (targetStatus: 'CONFIRMED' | 'CANCELLED') => {
    if (!selectedChallan) return;
    try {
      const updated = await apiFetch(`/challans/${selectedChallan.id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: targetStatus })
      });
      setSelectedChallan(updated);
      // Update local list too
      setChallans(challans.map(c => c.id === updated.id ? updated : c));
    } catch (err: any) {
      alert(err.message || 'Error transitioning challan status');
    }
  };

  // Helper: Get product stock details
  const getProductStock = (id: string) => {
    const p = productOptions.find(opt => String(opt.id) === id);
    return p ? p.currentStock : null;
  };

  // Compute live subtotals for new challan
  const calculateLiveSummary = () => {
    let totalItems = 0;
    let grandTotalValue = 0;
    formItems.forEach(item => {
      const p = productOptions.find(opt => String(opt.id) === item.id);
      if (p) {
        totalItems += item.quantity;
        grandTotalValue += p.unitPrice * item.quantity;
      }
    });
    return { totalItems, grandTotalValue };
  };

  const liveSummary = calculateLiveSummary();

  return (
    <div>
      {/* View 1: List View */}
      {currentView === 'list' && (
        <>
          <div className="page-header">
            <div className="page-title-group">
              <h1>Sales Challan Module</h1>
              <p>Generate, issue, and manage dispatch documents and inventories</p>
            </div>
            {isSalesOrAdmin && (
              <button className="btn-primary" onClick={handleOpenCreate} style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Plus size={16} />
                <span>Create Challan</span>
              </button>
            )}
          </div>

          <div className="card-section">
            <div className="filters-bar">
              <div className="search-wrapper">
                <Search className="search-icon" size={16} />
                <input 
                  type="text" 
                  className="search-input" 
                  placeholder="Search by Challan # or Creator..." 
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                />
              </div>

              <select 
                className="form-select" 
                style={{ width: 'auto', minWidth: '180px' }}
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              >
                <option value="">All Statuses</option>
                <option value="DRAFT">Draft</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>

            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Challan Number</th>
                    <th>Customer Name</th>
                    <th>Business Name</th>
                    <th>Total Qty</th>
                    <th>Created By</th>
                    <th>Status</th>
                    <th>Issue Date</th>
                    <th style={{ textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {challans.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                        No challan records found matching filters.
                      </td>
                    </tr>
                  ) : (
                    challans.map((c) => (
                      <tr key={c.id}>
                        <td style={{ fontWeight: 600 }}><code>{c.challanNumber}</code></td>
                        <td>{c.customerSnapshot.name}</td>
                        <td>{c.customerSnapshot.businessName}</td>
                        <td style={{ fontWeight: 600 }}>{c.totalQuantity} units</td>
                        <td>{c.createdBy}</td>
                        <td>
                          <span className={`badge ${
                            c.status === 'CONFIRMED' ? 'badge-success' : c.status === 'DRAFT' ? 'badge-warning' : 'badge-danger'
                          }`}>
                            {c.status}
                          </span>
                        </td>
                        <td style={{ color: 'var(--text-muted)' }}>{new Date(c.createdAt).toLocaleDateString()}</td>
                        <td>
                          <div style={{ display: 'flex', justifyContent: 'center' }}>
                            <button className="btn-secondary btn-sm" onClick={() => handleOpenDetail(c)} title="View Details">
                              <Eye size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="pagination-controls">
                <span className="page-numbers">Page {page} of {totalPages}</span>
                <div className="pagination-buttons">
                  <button 
                    className="btn-secondary btn-sm"
                    disabled={page === 1}
                    onClick={() => setPage(p => p - 1)}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button 
                    className="btn-secondary btn-sm"
                    disabled={page === totalPages}
                    onClick={() => setPage(p => p + 1)}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* View 2: Create Form */}
      {currentView === 'create' && (
        <>
          <div className="page-header">
            <div className="page-title-group" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <button className="btn-secondary btn-sm" onClick={() => setCurrentView('list')} style={{ display: 'flex', padding: '10px' }}>
                <ArrowLeft size={16} />
              </button>
              <div>
                <h1>New Sales Challan</h1>
                <p>Compile products list, attach client, and select checkout type</p>
              </div>
            </div>
          </div>

          <div className="card-section" style={{ maxWidth: '850px' }}>
            <div className="form-group">
              <label className="form-label">Attach CRM Customer *</label>
              <select 
                className="form-select"
                value={formCustomerId}
                onChange={(e) => setFormCustomerId(e.target.value)}
              >
                <option value="">-- Choose Customer --</option>
                {customerOptions.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.businessName})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginTop: '30px', marginBottom: '12px' }}>
              <h3 className="card-title" style={{ fontSize: '16px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '8px' }}>
                Product Dispatch Lines
              </h3>
            </div>

            <div className="challan-products-grid">
              {formItems.map((item, index) => {
                const stock = getProductStock(item.id);
                const isOverStock = stock !== null && item.quantity > stock;
                return (
                  <div className="challan-product-row" key={index}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <select 
                        className="form-select"
                        value={item.id}
                        onChange={(e) => handleItemChange(index, 'id', e.target.value)}
                      >
                        <option value="">-- Choose Product --</option>
                        {productOptions.map(p => (
                          <option key={p.id} value={p.id}>
                            [{p.sku}] {p.name} (Price: ₹{p.unitPrice})
                          </option>
                        ))}
                      </select>
                      {stock !== null && (
                        <div style={{ fontSize: '11px', color: isOverStock ? 'var(--accent-rose)' : 'var(--text-muted)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span>Warehouse Stock: {stock} units</span>
                          {isOverStock && <span style={{ fontWeight: 600 }}>[Insufficient stock alert!]</span>}
                        </div>
                      )}
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <input 
                        type="number"
                        className="form-input"
                        placeholder="Quantity"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                        min="1"
                      />
                    </div>

                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-muted)', minWidth: '80px' }}>
                      {(() => {
                        const p = productOptions.find(opt => String(opt.id) === item.id);
                        return p ? `₹${(p.unitPrice * item.quantity).toLocaleString()}` : '₹0';
                      })()}
                    </div>

                    <div>
                      {formItems.length > 1 && (
                        <button className="delete-row-btn" onClick={() => handleRemoveItemRow(index)}>
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <button className="btn-secondary btn-sm" onClick={handleAddItemRow} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '30px' }}>
              <Plus size={14} />
              <span>Add Line Item</span>
            </button>

            {/* Calculations summaries */}
            <div className="challan-total-summary">
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Total Items:</span>
                <span style={{ marginLeft: '10px', color: 'var(--text-main)' }}>{liveSummary.totalItems} units</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Estimated Value:</span>
                <span style={{ marginLeft: '10px', color: 'var(--accent-indigo)', fontSize: '18px' }}>
                  ₹{liveSummary.grandTotalValue.toLocaleString()}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '16px', marginTop: '40px' }}>
              <button 
                className="btn-secondary" 
                style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
                onClick={() => handleSubmitChallan('DRAFT')}
              >
                <Clock size={16} />
                <span>Save as Draft</span>
              </button>
              <button 
                className="btn-primary" 
                style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
                onClick={() => handleSubmitChallan('CONFIRMED')}
              >
                <FileCheck size={16} />
                <span>Issue & Confirm</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* View 3: Detail View */}
      {currentView === 'detail' && selectedChallan && (
        <>
          <div className="page-header">
            <div className="page-title-group" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <button className="btn-secondary btn-sm" onClick={() => setCurrentView('list')} style={{ display: 'flex', padding: '10px' }}>
                <ArrowLeft size={16} />
              </button>
              <div>
                <h1>Sales Challan details</h1>
                <p>Document audits, snapshots, and lifecycle workflow states</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              {selectedChallan.status === 'CONFIRMED' && (
                <button className="btn-secondary btn-sm" onClick={() => window.print()} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Printer size={14} />
                  <span>Print Challan</span>
                </button>
              )}
            </div>
          </div>

          <div className="details-grid">
            {/* Left Col: Challan Metadata & Status controls */}
            <div>
              <div className="card-section" style={{ padding: '20px' }}>
                <h3 className="card-title" style={{ fontSize: '16px', marginBottom: '16px' }}>Document Info</h3>
                
                <div className="details-row">
                  <span className="details-label">Challan Number</span>
                  <span className="details-value" style={{ fontWeight: 600 }}><code>{selectedChallan.challanNumber}</code></span>
                </div>

                <div className="details-row">
                  <span className="details-label">Lifecycle Status</span>
                  <span className={`badge ${
                    selectedChallan.status === 'CONFIRMED' ? 'badge-success' : selectedChallan.status === 'DRAFT' ? 'badge-warning' : 'badge-danger'
                  }`}>
                    {selectedChallan.status}
                  </span>
                </div>

                <div className="details-row">
                  <span className="details-label">Created By</span>
                  <span className="details-value">{selectedChallan.createdBy}</span>
                </div>

                <div className="details-row">
                  <span className="details-label">Issued Date</span>
                  <span className="details-value">{new Date(selectedChallan.createdAt).toLocaleString()}</span>
                </div>

                <div className="details-row">
                  <span className="details-label">Last Modified</span>
                  <span className="details-value">{new Date(selectedChallan.createdAt).toLocaleString()}</span>
                </div>
              </div>

              {/* Status transition panel */}
              {canUpdateStatus && selectedChallan.status !== 'CANCELLED' && (
                <div className="card-section" style={{ padding: '20px', border: '1px solid rgba(99,102,241,0.15)' }}>
                  <h3 className="card-title" style={{ fontSize: '16px', marginBottom: '12px' }}>Operational Controls</h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>
                    Trigger workflow changes. Confirming a draft locks invoice and reduces warehouse inventory.
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {selectedChallan.status === 'DRAFT' && (
                      <button 
                        className="btn-primary" 
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                        onClick={() => handleTransitionStatus('CONFIRMED')}
                      >
                        <FileCheck size={16} />
                        <span>Confirm Challan</span>
                      </button>
                    )}
                    <button 
                      className="btn-secondary btn-sm btn-danger" 
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#ffffff' }}
                      onClick={() => handleTransitionStatus('CANCELLED')}
                    >
                      <Ban size={16} />
                      <span>Cancel Challan</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Right Col: Client and Product snapshots */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
              
              {/* Customer Snapshot */}
              <div className="card-section" style={{ padding: '20px' }}>
                <h3 className="card-title" style={{ fontSize: '16px', marginBottom: '16px' }}>Customer Metadata Snapshot</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Name / Shop</div>
                    <div style={{ fontWeight: 600, fontSize: '14px', marginTop: '2px' }}>
                      {selectedChallan.customerSnapshot.name} ({selectedChallan.customerSnapshot.businessName})
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Customer Type</div>
                    <div style={{ fontWeight: 600, fontSize: '14px', marginTop: '2px' }}>{selectedChallan.customerSnapshot.type}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Contact Mobile</div>
                    <div style={{ fontWeight: 600, fontSize: '14px', marginTop: '2px' }}>{selectedChallan.customerSnapshot.mobile}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Email</div>
                    <div style={{ fontWeight: 600, fontSize: '12px', marginTop: '2px' }}>{selectedChallan.customerSnapshot.email}</div>
                  </div>
                </div>
                <div style={{ marginTop: '16px', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '12px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Billing Address</div>
                  <div style={{ fontWeight: 500, fontSize: '13px', marginTop: '2px', textAlign: 'left' }}>
                    {selectedChallan.customerSnapshot.address}
                  </div>
                </div>
                {selectedChallan.customerSnapshot.gstNumber && (
                  <div style={{ marginTop: '12px' }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>GSTIN</div>
                    <div style={{ fontWeight: 600, fontSize: '13px', marginTop: '2px' }}>{selectedChallan.customerSnapshot.gstNumber}</div>
                  </div>
                )}
              </div>

              {/* Products Snapshot */}
              <div className="card-section" style={{ padding: '20px' }}>
                <h3 className="card-title" style={{ fontSize: '16px', marginBottom: '16px' }}>Invoice Product Lines Snapshot</h3>
                <div className="table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>SKU</th>
                        <th>Product</th>
                        <th>Unit Price</th>
                        <th>Qty</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedChallan.productsSnapshot.map((p) => (
                        <tr key={p.id}>
                          <td><code>{p.sku}</code></td>
                          <td>{p.name}</td>
                          <td>₹{p.unitPrice.toLocaleString()}</td>
                          <td style={{ fontWeight: 600 }}>{p.quantity} units</td>
                          <td style={{ fontWeight: 600, color: 'var(--accent-indigo)' }}>
                            ₹{(p.unitPrice * p.quantity).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '16px', fontWeight: 600 }}>
                  <span style={{ color: 'var(--text-muted)' }}>Grand Total:</span>
                  <span style={{ marginLeft: '12px', color: 'var(--accent-indigo)', fontSize: '18px' }}>
                    ₹{selectedChallan.productsSnapshot.reduce((acc, p) => acc + (p.unitPrice * p.quantity), 0).toLocaleString()}
                  </span>
                </div>
              </div>

            </div>
          </div>
        </>
      )}
    </div>
  );
};
