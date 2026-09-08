import React, { useEffect, useState } from 'react';
import { Route as RouteIcon, TrendingUp, Ticket, Wallet } from 'lucide-react';
import { adminApi } from '../../services/adminApi';
import { cityById } from '../../data/cities';
import { formatCedi } from '../../utils/format';

const AdminRoutes = () => {
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.getTopRoutes(20).then(setRoutes).catch(console.error).finally(() => setLoading(false));
  }, []);

  const maxBookings = Math.max(...routes.map((r) => r.bookings), 1);
  const totalRevenue = routes.reduce((s, r) => s + r.revenue, 0);
  const totalBookings = routes.reduce((s, r) => s + r.bookings, 0);

  return (
    <div className="adm-page">
      <h1 className="adm-title">Route Analytics</h1>
      <p className="adm-subtitle">Performance breakdown by route</p>

      {loading ? (
        <div className="adm-loader">Loading route data...</div>
      ) : routes.length === 0 ? (
        <div className="adm-empty">No booking data yet</div>
      ) : (
        <>
          <div className="adm-kpi-row" style={{ marginBottom: 24 }}>
            <div className="adm-kpi" style={{ '--k': '#1FA971' }}>
              <div className="adm-kpi-top"><div className="adm-kpi-icon"><RouteIcon size={20} /></div><span className="adm-kpi-label">Active Routes</span></div>
              <div className="adm-kpi-val">{routes.length}</div>
            </div>
            <div className="adm-kpi" style={{ '--k': '#3B82F6' }}>
              <div className="adm-kpi-top"><div className="adm-kpi-icon"><Ticket size={20} /></div><span className="adm-kpi-label">Total Bookings</span></div>
              <div className="adm-kpi-val">{totalBookings}</div>
            </div>
            <div className="adm-kpi" style={{ '--k': '#F4C430' }}>
              <div className="adm-kpi-top"><div className="adm-kpi-icon"><Wallet size={20} /></div><span className="adm-kpi-label">Total Revenue</span></div>
              <div className="adm-kpi-val">{formatCedi(totalRevenue)}</div>
            </div>
          </div>

          <div className="adm-card">
            <div className="adm-card-head">
              <h2>Routes by Popularity</h2>
            </div>
            <div className="adm-tbl-wrap">
              <table className="adm-tbl">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Route</th>
                    <th>Popularity</th>
                    <th style={{ textAlign: 'right' }}>Bookings</th>
                    <th style={{ textAlign: 'right' }}>Revenue</th>
                    <th style={{ textAlign: 'right' }}>Avg. Fare</th>
                  </tr>
                </thead>
                <tbody>
                  {routes.map((r, i) => {
                    const pct = Math.round((r.bookings / maxBookings) * 100);
                    return (
                      <tr key={i}>
                        <td className="adm-dim">{i + 1}</td>
                        <td className="adm-bold">{cityById(r.fromId)?.name || r.fromId} → {cityById(r.toId)?.name || r.toId}</td>
                        <td style={{ minWidth: 120 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ flex: 1, height: 8, borderRadius: 4, background: 'var(--a-line)' }}>
                              <div style={{ width: `${pct}%`, height: '100%', borderRadius: 4, background: '#1FA971', transition: 'width .3s' }} />
                            </div>
                            <span className="t-xs adm-dim" style={{ minWidth: 28 }}>{pct}%</span>
                          </div>
                        </td>
                        <td style={{ textAlign: 'right' }}>{r.bookings}</td>
                        <td style={{ textAlign: 'right' }} className="adm-bold">{formatCedi(r.revenue)}</td>
                        <td style={{ textAlign: 'right' }} className="adm-dim">{formatCedi(r.bookings > 0 ? Math.round(r.revenue / r.bookings) : 0)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminRoutes;
