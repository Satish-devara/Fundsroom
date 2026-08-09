import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Users, 
  Package, 
  FileText, 
  TrendingUp, 
  AlertTriangle, 
  CalendarClock, 
  RefreshCw 
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { apiFetch } = useAuth();
  const [stats, setStats] = useState({
    customersCount: 0,
    productsCount: 0,
    challansCount: 0,
    totalSalesQty: 0,
  });
  const [lowStockProducts, setLowStockProducts] = useState<any[]>([]);
  const [upcomingFollowups, setUpcomingFollowups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Customers
      const custData = await apiFetch('/customers?limit=100');
      // 2. Fetch Products
      const prodData = await apiFetch('/products?limit=100');
      // 3. Fetch Challans
      const challanData = await apiFetch('/challans?limit=100');
      // 4. Fetch Low Stock Products
      const lowStockData = await apiFetch('/products?lowStock=true&limit=10');

      const confirmedChallans = challanData.challans.filter((c: any) => c.status === 'CONFIRMED');
      const totalSales = confirmedChallans.reduce((acc: number, c: any) => acc + c.totalQuantity, 0);

      // Filter upcoming followups (excluding past or null followUpDates)
      const followups = custData.customers
        .filter((c: any) => c.followUpDate && new Date(c.followUpDate) >= new Date())
        .sort((a: any, b: any) => new Date(a.followUpDate).getTime() - new Date(b.followUpDate).getTime())
        .slice(0, 5);

      setStats({
        customersCount: custData.pagination.totalCount || 0,
        productsCount: prodData.pagination.totalCount || 0,
        challansCount: challanData.pagination.totalCount || 0,
        totalSalesQty: totalSales,
      });

      setLowStockProducts(lowStockData.products || []);
      setUpcomingFollowups(followups);
    } catch (error) {
      console.error('Error fetching dashboard statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <RefreshCw className="animate-spin" size={32} color="var(--accent-indigo)" />
        <span style={{ marginLeft: '12px', color: 'var(--text-muted)' }}>Loading system insights...</span>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-title-group">
          <h1>Operations Dashboard</h1>
          <p>Real-time insights across your Mini ERP & CRM modules</p>
        </div>
        <button className="btn-secondary" onClick={fetchDashboardData} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <RefreshCw size={16} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Stats Summary Widgets */}
      <div className="dashboard-grid">
        <div className="stat-card">
          <div className="stat-icon-container" style={{ color: 'var(--accent-indigo)' }}>
            <Users size={24} />
          </div>
          <div>
            <div className="stat-label">Total Customers</div>
            <div className="stat-value">{stats.customersCount}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-container" style={{ color: 'var(--accent-amber)' }}>
            <Package size={24} />
          </div>
          <div>
            <div className="stat-label">Stock Items</div>
            <div className="stat-value">{stats.productsCount}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-container" style={{ color: 'var(--accent-blue)' }}>
            <FileText size={24} />
          </div>
          <div>
            <div className="stat-label">Sales Challans</div>
            <div className="stat-value">{stats.challansCount}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-container" style={{ color: 'var(--accent-emerald)' }}>
            <TrendingUp size={24} />
          </div>
          <div>
            <div className="stat-label">Items Sold (Qty)</div>
            <div className="stat-value">{stats.totalSalesQty} units</div>
          </div>
        </div>
      </div>

      <div className="details-grid">
        {/* Low Stock Alerts */}
        <div className="card-section">
          <div className="profile-info" style={{ marginBottom: '16px', color: 'var(--accent-rose)' }}>
            <AlertTriangle size={20} />
            <h3 className="card-title" style={{ margin: 0 }}>Stock Alerts (Minimum Levels)</h3>
          </div>
          {lowStockProducts.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>All product inventory levels are healthy.</p>
          ) : (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Product</th>
                    <th>Stock</th>
                    <th>Min Limit</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStockProducts.map((p) => (
                    <tr key={p.id} className="low-stock-row">
                      <td><code>{p.sku}</code></td>
                      <td>{p.name}</td>
                      <td style={{ fontWeight: 600, color: 'var(--accent-rose)' }}>{p.currentStock}</td>
                      <td>{p.minStockAlert}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* CRM Followups */}
        <div className="card-section">
          <div className="profile-info" style={{ marginBottom: '16px', color: 'var(--accent-blue)' }}>
            <CalendarClock size={20} />
            <h3 className="card-title" style={{ margin: 0 }}>Upcoming CRM Follow-ups</h3>
          </div>
          {upcomingFollowups.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>No pending customer follow-ups scheduled.</p>
          ) : (
            <div className="timeline">
              {upcomingFollowups.map((c) => (
                <div className="timeline-item" key={c.id}>
                  <div className="timeline-meta">
                    <span className="timeline-author">{c.name} ({c.businessName})</span>
                    <span style={{ color: 'var(--accent-amber)', fontWeight: 600 }}>
                      {new Date(c.followUpDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--text-main)' }}>{c.notes || 'No notes specified.'}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
