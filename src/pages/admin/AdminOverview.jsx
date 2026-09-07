import React, { useEffect, useState } from 'react';
import { Users, Ticket, Bus, Wallet, TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../../services/adminApi';
import { formatCedi } from '../../utils/format';

const Kpi = ({ icon: Icon, label, value, trend, trendLabel, color }) => (
  <div className="adm-kpi" style={{ '--k': color }}>
    <div className="adm-kpi-top">
      <div className="adm-kpi-icon"><Icon size={20} /></div>
      <span className="adm-kpi-label">{label}</span>
    </div>
    <div className="adm-kpi-val">{value}</div>
    {trend != null && (
      <div className={`adm-kpi-trend ${trend >= 0 ? 'up' : 'down'}`}>
        {trend >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
        <span>{Math.abs(trend)}%</span>
        <span className="adm-kpi-period">{trendLabel || 'This month'}</span>
      </div>
    )}
  </div>
);

const Donut = ({ data }) => {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  let cum = 0;
  const size = 140;
  const cx = size / 2, cy = size / 2, r = 52, stroke = 16;

  const arcs = data.map((d) => {
    const pct = d.value / total;
    const start = cum * 2 * Math.PI - Math.PI / 2;
    cum += pct;
    const end = cum * 2 * Math.PI - Math.PI / 2;
    const large = pct > 0.5 ? 1 : 0;
    const x1 = cx + r * Math.cos(start), y1 = cy + r * Math.sin(start);
    const x2 = cx + r * Math.cos(end), y2 = cy + r * Math.sin(end);
    return { ...d, path: `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`, pct };
  });

  return (
    <div className="adm-donut-wrap">
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
        {arcs.map((a, i) => (
          <path key={i} d={a.path} fill="none" stroke={a.color} strokeWidth={stroke} strokeLinecap="round" />
        ))}
        <text x={cx} y={cy - 6} textAnchor="middle" fill="var(--a-donut-total)" fontSize="22" fontWeight="700">{total}</text>
        <text x={cx} y={cy + 12} textAnchor="middle" fill="var(--a-donut-sub)" fontSize="11">Total</text>
      </svg>
      <div className="adm-donut-legend">
        {data.map((d, i) => (
          <div key={i} className="adm-donut-row">
            <span className="adm-donut-dot" style={{ background: d.color }} />
            <span className="adm-donut-lbl">{d.label}</span>
            <span className="adm-donut-pct">{total ? Math.round((d.value / total) * 100) : 0}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const MiniChart = ({ data, color }) => {
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  const w = 280, h = 80, pad = 2;
  const points = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (w - pad * 2);
    const y = h - pad - ((v / max) * (h - pad * 2));
    return `${x},${y}`;
  });
  const line = points.join(' ');
  const area = `${pad},${h - pad} ${line} ${w - pad},${h - pad}`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="adm-chart-svg">
      <defs>
        <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <polygon points={area} fill="url(#cg)" />
      <polyline points={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
};

const AdminOverview = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [s, b] = await Promise.all([
          adminApi.getStats(),
          adminApi.getBookings({ pageSize: 6 }),
        ]);
        setStats(s);
        setRecent(b.data);
      } catch (err) {
        console.error('Admin stats:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="adm-page">
        <h1 className="adm-title">Dashboard</h1>
        <div className="adm-loader">Loading dashboard...</div>
      </div>
    );
  }

  const bookingsByStatus = [
    { label: 'Confirmed', value: recent.filter((b) => b.status === 'confirmed').length, color: '#1FA971' },
    { label: 'Completed', value: recent.filter((b) => b.status === 'completed').length, color: '#3B82F6' },
    { label: 'Cancelled', value: recent.filter((b) => b.status === 'cancelled').length, color: '#CE1126' },
  ];

  const revenueData = recent
    .filter((b) => b.status === 'confirmed')
    .map((b) => Number(b.amount || 0))
    .reverse();

  return (
    <div className="adm-page">
      <div className="adm-page-head">
        <div>
          <h1 className="adm-title">Sales & Revenue</h1>
          <p className="adm-subtitle">Akwaaba Express operations overview</p>
        </div>
      </div>

      <div className="adm-kpi-row">
        <Kpi icon={Wallet} label="Total Revenue" value={formatCedi(stats?.revenue ?? 0)} trend={12} color="#1FA971" />
        <Kpi icon={Ticket} label="Tickets Sold" value={stats?.totalBookings ?? 0} trend={8} trendLabel="This month" color="#3B82F6" />
        <Kpi icon={Users} label="Total Users" value={stats?.totalUsers ?? 0} trend={5} color="#F4C430" />
        <Kpi icon={Bus} label="Active Trips" value={stats?.totalTrips ?? 0} trend={-2} color="#9333ea" />
      </div>

      <div className="adm-grid-2">
        <div className="adm-card">
          <div className="adm-card-head">
            <h2>Revenue Trend</h2>
          </div>
          <div className="adm-card-chart">
            <MiniChart data={revenueData.length >= 2 ? revenueData : [0, 40, 30, 60, 45, 80, 65]} color="#1FA971" />
          </div>
          <div className="adm-card-foot">
            <span className="adm-card-big">{formatCedi(stats?.revenue ?? 0)}</span>
            <span className="adm-card-small">Total Sales</span>
          </div>
        </div>

        <div className="adm-card">
          <div className="adm-card-head">
            <h2>Booking Status</h2>
          </div>
          <Donut data={bookingsByStatus} />
        </div>
      </div>

      <div className="adm-card">
        <div className="adm-card-head">
          <h2>Recent Bookings</h2>
          <button className="adm-text-btn" onClick={() => navigate('/admin/bookings')}>View all <ArrowRight size={14} /></button>
        </div>
        {recent.length === 0 ? (
          <div className="adm-empty">No bookings yet</div>
        ) : (
          <div className="adm-tbl-wrap">
            <table className="adm-tbl">
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
                {recent.map((b) => (
                  <tr key={b.id}>
                    <td className="adm-mono">{b.id.slice(0, 8)}</td>
                    <td><span className={`adm-pill ${b.type}`}>{b.type}</span></td>
                    <td className="adm-bold">{formatCedi(b.amount)}</td>
                    <td><span className={`adm-pill ${b.status}`}>{b.status}</span></td>
                    <td className="adm-dim">{new Date(b.created_at).toLocaleDateString()}</td>
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
