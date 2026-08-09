import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Plus, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  Eye, 
  Edit2, 
  X, 
  Phone, 
  Mail, 
  Building, 
  MapPin, 
  Calendar, 
  FileCheck,
  Send,
  MessageSquare
} from 'lucide-react';

interface Customer {
  id: number;
  name: string;
  mobile: string;
  email: string;
  businessName: string;
  gstNumber: string | null;
  type: string;
  address: string;
  status: string;
  followUpDate: string | null;
  notes: string | null;
  createdAt: string;
}

export const Customers: React.FC = () => {
  const { user, apiFetch } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  // Modal States
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [type, setType] = useState('RETAIL');
  const [address, setAddress] = useState('');
  const [status, setStatus] = useState('LEAD');
  const [followUpDate, setFollowUpDate] = useState('');
  const [notes, setNotes] = useState('');

  // Follow up Notes input
  const [newNote, setNewNote] = useState('');

  const isSalesOrAdmin = ['ADMIN', 'SALES'].includes(user?.role || '');

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const endpoint = `/customers?page=${page}&limit=8&search=${search}&type=${typeFilter}&status=${statusFilter}`;
      const data = await apiFetch(endpoint);
      setCustomers(data.customers);
      setTotalPages(data.pagination.totalPages);
    } catch (err) {
      console.error('Error fetching customers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [page, search, typeFilter, statusFilter]);

  const handleOpenAdd = () => {
    setEditingCustomer(null);
    setName('');
    setMobile('');
    setEmail('');
    setBusinessName('');
    setGstNumber('');
    setType('RETAIL');
    setAddress('');
    setStatus('LEAD');
    setFollowUpDate('');
    setNotes('');
    setShowAddEditModal(true);
  };

  const handleOpenEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setName(customer.name);
    setMobile(customer.mobile);
    setEmail(customer.email);
    setBusinessName(customer.businessName);
    setGstNumber(customer.gstNumber || '');
    setType(customer.type);
    setAddress(customer.address);
    setStatus(customer.status);
    setFollowUpDate(customer.followUpDate ? customer.followUpDate.split('T')[0] : '');
    setNotes(customer.notes || '');
    setShowAddEditModal(true);
  };

  const handleOpenDetail = async (customer: Customer) => {
    try {
      const data = await apiFetch(`/customers/${customer.id}`);
      setSelectedCustomer(data);
      setShowDetailModal(true);
    } catch (err) {
      console.error('Error fetching customer details:', err);
    }
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name,
      mobile,
      email,
      businessName,
      gstNumber: gstNumber || null,
      type,
      address,
      status,
      followUpDate: followUpDate || null,
      notes: notes || null
    };

    try {
      if (editingCustomer) {
        await apiFetch(`/customers/${editingCustomer.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch('/customers', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      setShowAddEditModal(false);
      fetchCustomers();
      if (selectedCustomer && editingCustomer?.id === selectedCustomer.id) {
        // Refresh details too
        const updatedDetail = await apiFetch(`/customers/${selectedCustomer.id}`);
        setSelectedCustomer(updatedDetail);
      }
    } catch (err: any) {
      alert(err.message || 'Error saving customer record');
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    try {
      const added = await apiFetch(`/customers/${selectedCustomer.id}/notes`, {
        method: 'POST',
        body: JSON.stringify({ note: newNote }),
      });

      setSelectedCustomer({
        ...selectedCustomer,
        followUpNotes: [added, ...selectedCustomer.followUpNotes]
      });
      setNewNote('');
    } catch (err: any) {
      alert(err.message || 'Error posting follow-up note');
    }
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-title-group">
          <h1>Customer CRM Module</h1>
          <p>Manage prospects, clients, follow-up schedules, and logs</p>
        </div>
        {isSalesOrAdmin && (
          <button className="btn-primary" onClick={handleOpenAdd} style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={16} />
            <span>Add Customer</span>
          </button>
        )}
      </div>

      <div className="card-section">
        {/* Filters Bar */}
        <div className="filters-bar">
          <div className="search-wrapper">
            <Search className="search-icon" size={16} />
            <input 
              type="text" 
              className="search-input" 
              placeholder="Search by name, company, email, mobile..." 
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>

          <select 
            className="form-select" 
            style={{ width: 'auto', minWidth: '160px' }}
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
          >
            <option value="">All Types</option>
            <option value="RETAIL">Retail</option>
            <option value="WHOLESALE">Wholesale</option>
            <option value="DISTRIBUTOR">Distributor</option>
          </select>

          <select 
            className="form-select" 
            style={{ width: 'auto', minWidth: '160px' }}
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          >
            <option value="">All Statuses</option>
            <option value="LEAD">Lead</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>

        {/* Customer Table */}
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Customer Name</th>
                <th>Business Name</th>
                <th>Mobile</th>
                <th>Type</th>
                <th>Status</th>
                <th>Follow-up</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {customers.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                    No customer records matching filters.
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 600 }}>{c.name}</td>
                    <td>{c.businessName}</td>
                    <td>{c.mobile}</td>
                    <td>
                      <span className="badge badge-info">{c.type}</span>
                    </td>
                    <td>
                      <span className={`badge ${
                        c.status === 'ACTIVE' ? 'badge-success' : c.status === 'LEAD' ? 'badge-warning' : 'badge-danger'
                      }`}>
                        {c.status}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>
                      {c.followUpDate ? new Date(c.followUpDate).toLocaleDateString() : 'N/A'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                        <button className="btn-secondary btn-sm" onClick={() => handleOpenDetail(c)} title="View Detail">
                          <Eye size={14} />
                        </button>
                        {isSalesOrAdmin && (
                          <button className="btn-secondary btn-sm" onClick={() => handleOpenEdit(c)} title="Edit">
                            <Edit2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
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

      {/* Add / Edit Customer Modal */}
      {showAddEditModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title">{editingCustomer ? 'Edit Customer' : 'Add New Customer'}</h2>
              <button className="close-btn" onClick={() => setShowAddEditModal(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveCustomer}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div className="form-group">
                  <label className="form-label">Customer Name *</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    required 
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Business / Shop Name *</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={businessName} 
                    onChange={(e) => setBusinessName(e.target.value)} 
                    required 
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div className="form-group">
                  <label className="form-label">Mobile Number *</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={mobile} 
                    onChange={(e) => setMobile(e.target.value)} 
                    required 
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Email Address *</label>
                  <input 
                    type="email" 
                    className="form-input" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    required 
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div className="form-group">
                  <label className="form-label">GST Number (Optional)</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. 27AAAAA1111A1Z1" 
                    value={gstNumber} 
                    onChange={(e) => setGstNumber(e.target.value)} 
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Customer Type *</label>
                  <select 
                    className="form-select" 
                    value={type} 
                    onChange={(e) => setType(e.target.value)}
                  >
                    <option value="RETAIL">Retail</option>
                    <option value="WHOLESALE">Wholesale</option>
                    <option value="DISTRIBUTOR">Distributor</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Billing/Shipping Address *</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={address} 
                  onChange={(e) => setAddress(e.target.value)} 
                  required 
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div className="form-group">
                  <label className="form-label">Status *</label>
                  <select 
                    className="form-select" 
                    value={status} 
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <option value="LEAD">Lead</option>
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Follow-up Date</label>
                  <input 
                    type="date" 
                    className="form-input" 
                    value={followUpDate} 
                    onChange={(e) => setFollowUpDate(e.target.value)} 
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Notes / Description</label>
                <textarea 
                  className="form-input" 
                  style={{ minHeight: '80px', resize: 'vertical' }}
                  value={notes} 
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <button type="submit" className="btn-primary" style={{ marginTop: '10px' }}>
                Save Customer
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Customer Detail & Notes Timeline Modal */}
      {showDetailModal && selectedCustomer && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '800px' }}>
            <div className="modal-header">
              <h2 className="modal-title">{selectedCustomer.name} Profile</h2>
              <div style={{ display: 'flex', gap: '10px' }}>
                {isSalesOrAdmin && (
                  <button className="btn-secondary btn-sm" onClick={() => { setShowDetailModal(false); handleOpenEdit(selectedCustomer); }}>
                    Edit Profile
                  </button>
                )}
                <button className="close-btn" onClick={() => setShowDetailModal(false)}>
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="details-grid">
              {/* Left Column: Details Block */}
              <div>
                <div className="details-block">
                  <h4 style={{ fontFamily: 'var(--font-title)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Building size={16} color="var(--accent-indigo)" />
                    <span>Company Info</span>
                  </h4>
                  <div className="details-row">
                    <span className="details-label">Business Name</span>
                    <span className="details-value">{selectedCustomer.businessName}</span>
                  </div>
                  <div className="details-row">
                    <span className="details-label">Customer Type</span>
                    <span className="details-value">{selectedCustomer.type}</span>
                  </div>
                  <div className="details-row">
                    <span className="details-label">GSTIN</span>
                    <span className="details-value">{selectedCustomer.gstNumber || 'Not Provided'}</span>
                  </div>
                </div>

                <div className="details-block">
                  <h4 style={{ fontFamily: 'var(--font-title)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Phone size={16} color="var(--accent-indigo)" />
                    <span>Contact Info</span>
                  </h4>
                  <div className="details-row">
                    <span className="details-label">Mobile</span>
                    <span className="details-value">{selectedCustomer.mobile}</span>
                  </div>
                  <div className="details-row">
                    <span className="details-label">Email</span>
                    <span className="details-value" style={{ fontSize: '12px' }}>{selectedCustomer.email}</span>
                  </div>
                  <div className="details-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
                    <span className="details-label">Address</span>
                    <span className="details-value" style={{ textAlign: 'left', fontSize: '13px' }}>{selectedCustomer.address}</span>
                  </div>
                </div>

                <div className="details-block">
                  <h4 style={{ fontFamily: 'var(--font-title)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Calendar size={16} color="var(--accent-indigo)" />
                    <span>CRM Status</span>
                  </h4>
                  <div className="details-row">
                    <span className="details-label">Status</span>
                    <span className={`badge ${
                      selectedCustomer.status === 'ACTIVE' ? 'badge-success' : selectedCustomer.status === 'LEAD' ? 'badge-warning' : 'badge-danger'
                    }`}>
                      {selectedCustomer.status}
                    </span>
                  </div>
                  <div className="details-row">
                    <span className="details-label">Follow-up Date</span>
                    <span className="details-value" style={{ color: 'var(--accent-amber)' }}>
                      {selectedCustomer.followUpDate ? new Date(selectedCustomer.followUpDate).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Column: Follow-up Timeline */}
              <div>
                <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <MessageSquare size={18} color="var(--accent-indigo)" />
                  <span>Follow-up Logs</span>
                </h3>

                {/* Add Note Form */}
                <form onSubmit={handleAddNote} style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="Add follow-up notes here..." 
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      required
                    />
                    <button type="submit" className="btn-primary" style={{ width: 'auto', padding: '12px 18px' }}>
                      <Send size={16} />
                    </button>
                  </div>
                </form>

                {/* Notes List */}
                <div style={{ maxHeight: '380px', overflowY: 'auto', paddingRight: '4px' }}>
                  {selectedCustomer.followUpNotes.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No CRM follow-up logs found.</p>
                  ) : (
                    <div className="timeline">
                      {selectedCustomer.followUpNotes.map((note: any) => (
                        <div className="timeline-item" key={note.id}>
                          <div className="timeline-meta">
                            <span className="timeline-author">{note.createdBy}</span>
                            <span>{new Date(note.createdAt).toLocaleString()}</span>
                          </div>
                          <p style={{ fontSize: '13px', color: 'var(--text-main)', textAlign: 'left' }}>{note.note}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
