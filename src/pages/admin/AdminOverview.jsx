import React, { useEffect, useState } from 'react';
import { Users, Ticket, Bus, Wallet, TrendingUp, TrendingDown, ArrowRight, Clock, MapPin, Radio } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../../services/adminApi';
import { formatCedi } from '../../utils/format';

const minutesToClock = (m) => {
  const h = Math.floor(m / 60);
  const mm = m % 60;
  const ap = h >= 12 ? 'PM' : 'AM';
  return `${((h % 12) || 12)}:${String(mm).padStart(2, '0')} ${ap}`;
};

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

const BarChart = ({ data, color = '#1FA971' }) => {
  if (!data.length) return null;
  const max = Math.max(...data.map((d) => d.revenue), 1);
  const barW = 100 / data.length;

  return (
    <div className="adm-bar-chart">
      <div className="adm-bar-chart-bars">
        {data.map((d, i) => (
          <div key={i} className="adm-bar-col" style={{ width: `${barW}%` }}>
            <div className="adm-bar-tooltip">{formatCedi(d.revenue)}</div>
            <div
              className="adm-bar"
              style={{
                height: `${Math.max((d.revenue / max) * 100, 4)}%`,
                background: d.revenue > 0 ? color : 'var(--a-line)',
              }}
            />
            <span className="adm-bar-label">{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const statusColor = {
  active: '#1FA971',
  boarding: '#F4A23B',
  in_progress: '#3B82F6',
  completed: '#8B918B',
  cancelled: '#CE1126',
};

const AdminOverview = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);
  const [todayTrips, setTodayTrips] = useState([]);
  const [dailyRevenue, setDailyRevenue] = useState([]);
  const [verifiedDrivers, setVerifiedDrivers] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [s, b, tt, dr, vd] = await Promise.all([
          adminApi.getStats(),
          adminApi.getBookings({ pageSize: 5 }),
          adminApi.getTodayTrips(),
          adminApi.getDailyRevenue(7),
          adminApi.getOnlineDriverCount(),
        ]);
        setStats(s);
        setRecent(b.data);
        setTodayTrips(tt);
        setDailyRevenue(dr);
        setVerifiedDrivers(vd);
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

  const weekTotal = dailyRevenue.reduce((s, d) => s + d.revenue, 0);

  return (
    <div className="adm-page">
      <div className="adm-page-head">
        <div>
          <h1 className="adm-title">Dashboard</h1>
          <p className="adm-subtitle">Akwaaba Express operations overview</p>
        </div>
      </div>

      {/* KPI cards */}
      <div className="adm-kpi-row">
        <Kpi icon={Wallet} label="Total Revenue" value={formatCedi(stats?.revenue ?? 0)} trend={12} color="#1FA971" />
        <Kpi icon={Ticket} label="Tickets Sold" value={stats?.totalBookings ?? 0} trend={8} trendLabel="This month" color="#3B82F6" />
        <Kpi icon={Users} label="Total Users" value={stats?.totalUsers ?? 0} trend={5} color="#F4C430" />
        <Kpi icon={Radio} label="Verified Drivers" value={verifiedDrivers} color="#9333ea" />
      </div>

      {/* Revenue bar chart + Booking donut */}
      <div className="adm-grid-2">
        <div className="adm-card">
          <div className="adm-card-head">
            <h2>Revenue — Last 7 Days</h2>
            <span className="adm-card-badge">{formatCedi(weekTotal)}</span>
          </div>
          <BarChart data={dailyRevenue} />
        </div>

        <div className="adm-card">
          <div className="adm-card-head">
            <h2>Booking Status</h2>
          </div>
          <Donut data={bookingsByStatus} />
        </div>
      </div>

      {/* Today's trips + Recent bookings side by side */}
      <div className="adm-grid-2">
        {/* Today's trips */}
        <div className="adm-card">
          <div className="adm-card-head">
            <h2>Today's Schedule</h2>
            <span className="adm-card-count">{todayTrips.length} trip{todayTrips.length !== 1 ? 's' : ''}</span>
          </div>
          {todayTrips.length === 0 ? (
            <div className="adm-empty">No trips scheduled for today</div>
          ) : (
            <div className="adm-today-list">
              {todayTrips.slice(0, 6).map((t) => (
                <div key={t.id} className="adm-today-item">
                  <div className="adm-today-time">
                    <Clock size={13} />
                    <span>{minutesToClock(t.depart_mins)}</span>
                  </div>
                  <div className="adm-today-route">
                    <MapPin size={13} />
                    <span>{t.from_id} → {t.to_id}</span>
                  </div>
                  <div className="adm-today-meta">
                    <span className="adm-pill-sm" style={{ background: `${statusColor[t.status] || '#8B918B'}20`, color: statusColor[t.status] || '#8B918B' }}>
                      {t.status}
                    </span>
                    <span className="adm-dim">{t.operator?.name}</span>
                  </div>
                </div>
              ))}
              {todayTrips.length > 6 && (
                <button className="adm-text-btn" onClick={() => navigate('/admin/trips')} style={{ marginTop: 8 }}>
                  +{todayTrips.length - 6} more <ArrowRight size={14} />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Recent bookings */}
        <div className="adm-card">
          <div className="adm-card-head">
            <h2>Recent Bookings</h2>
            <button className="adm-text-btn" onClick={() => navigate('/admin/bookings')}>View all <ArrowRight size={14} /></button>
          </div>
          {recent.length === 0 ? (
            <div className="adm-empty">No bookings yet</div>
          ) : (
            <div className="adm-recent-list">
              {recent.map((b) => (
                <div key={b.id} className="adm-recent-item">
                  <div className="adm-recent-left">
                    <span className="adm-mono" style={{ fontSize: 12, opacity: 0.5 }}>#{b.id.slice(0, 8)}</span>
                    <span className="adm-bold" style={{ fontSize: 13 }}>
                      {b.trip ? `${b.trip.from_id} → ${b.trip.to_id}` : b.live_route || 'Live hail'}
                    </span>
                  </div>
                  <div className="adm-recent-right">
                    <span className="adm-bold">{formatCedi(b.amount)}</span>
                    <span className={`adm-pill-sm ${b.status}`}>{b.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminOverview;
