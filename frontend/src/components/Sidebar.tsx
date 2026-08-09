import React from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  Users, 
  Package, 
  FileText, 
  LogOut 
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const { user, logout } = useAuth();

  if (!user) return null;

  // Permissions helper
  const canAccessCRM = ['ADMIN', 'SALES', 'ACCOUNTS'].includes(user.role);
  const canAccessChallans = ['ADMIN', 'SALES', 'WAREHOUSE'].includes(user.role);

  return (
    <div className="sidebar">
      <div className="logo-section">
        <div className="logo-icon">
          <Package size={20} color="#ffffff" />
        </div>
        <span className="logo-text">FundsRoom</span>
      </div>

      <nav className="nav-menu">
        <div 
          className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          <LayoutDashboard size={18} />
          <span>Dashboard</span>
        </div>

        {canAccessCRM && (
          <div 
            className={`nav-item ${activeTab === 'crm' ? 'active' : ''}`}
            onClick={() => setActiveTab('crm')}
          >
            <Users size={18} />
            <span>CRM Customers</span>
          </div>
        )}

        <div 
          className={`nav-item ${activeTab === 'inventory' ? 'active' : ''}`}
          onClick={() => setActiveTab('inventory')}
        >
          <Package size={18} />
          <span>Inventory</span>
        </div>

        {canAccessChallans && (
          <div 
            className={`nav-item ${activeTab === 'challans' ? 'active' : ''}`}
            onClick={() => setActiveTab('challans')}
          >
            <FileText size={18} />
            <span>Sales Challan</span>
          </div>
        )}
      </nav>

      <div className="user-profile-section">
        <div className="profile-info">
          <div className="avatar">
            {user.name.charAt(0)}
          </div>
          <div>
            <div className="user-name">{user.name}</div>
            <div className="user-role">{user.role}</div>
          </div>
        </div>
        <button className="logout-btn" onClick={logout}>
          <LogOut size={16} />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
};
