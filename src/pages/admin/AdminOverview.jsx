import React, { useEffect, useState } from 'react';
import { Users, Ticket, Bus, Wallet, TrendingUp, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../../services/adminApi';
import { formatCedi } from '../../utils/format';

const KpiCard = ({ icon: Icon, label, value, color, onClick }) => (
  <button className="admin-kpi" onClick={onClick} style={{ '--kpi-color': color }}>
    <div className="admin-kpi-icon"><Icon size={22} /></div>
    <div className="admin-kpi-body">
      <div className="admin-kpi-value">{value}</div>
      <div className="admin-kpi-label">{label}</div>
    </div>
    <ArrowRight size={16} className="admin-kpi-arrow" />
  </button>
);

const AdminOverview = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recentBookings, setRecentBookings] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const [s, b] = await Promise.all([
          adminApi.getStats(),
          adminApi.getBookings({ pageSize: 5 }),
        ]);
        setStats(s);
        setRecentBookings(b.data);
      } catch (err) {
        console.error('Admin stats error:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="admin-page">
        <h1 className="admin-page-title">Dashboard</h1>
        <div className="admin-loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <h1 className="admin-page-title">Dashboard</h1>
      <p className="admin-page-sub">Overview of Akwaaba Express operations</p>

      <div className="admin-kpi-grid">
        <KpiCard icon={Users} label="Total Users" value={stats?.totalUsers ?? 0} color="#2563eb" onClick={() => navigate('/admin/users')} />
        <KpiCard icon={Ticket} label="Total Bookings" value={stats?.totalBookings ?? 0} color="#16a34a" onClick={() => navigate('/admin/bookings')} />
        <KpiCard icon={Bus} label="Total Trips" value={stats?.totalTrips ?? 0} color="#9333ea" onClick={() => navigate('/admin/trips')} />
        <KpiCard icon={Wallet} label="Revenue" value={formatCedi(stats?.revenue ?? 0)} color="#ea580c" />
      </div>

      <div className="admin-section">
        <div className="admin-section-header">
          <h2>Recent Bookings</h2>
          <button className="admin-link" onClick={() => navigate('/admin/bookings')}>View all <ArrowRight size={14} /></button>
        </div>
        {recentBookings.length === 0 ? (
          <div className="admin-empty">No bookings yet</div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Booking ID</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {recentBookings.map((b) => (
                  <tr key={b.id}>
                    <td className="admin-mono">{b.id.slice(0, 8)}...</td>
                    <td><span className={`admin-badge admin-badge-${b.type === 'live' ? 'blue' : 'purple'}`}>{b.type}</span></td>
                    <td>{formatCedi(b.amount)}</td>
                    <td><span className={`admin-badge admin-badge-${b.status === 'confirmed' ? 'green' : b.status === 'cancelled' ? 'red' : 'gray'}`}>{b.status}</span></td>
                    <td className="admin-muted">{new Date(b.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminOverview;
