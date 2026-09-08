import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Search, Star, Bus, ShieldCheck, ShieldX, Clock } from 'lucide-react';
import { adminApi } from '../../services/adminApi';

const PAGE_SIZE = 15;

const AdminDrivers = () => {
  const [drivers, setDrivers] = useState([]);
  const [driverStats, setDriverStats] = useState({});
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      adminApi.getUsers({ page, pageSize: PAGE_SIZE, role: 'driver' }),
      adminApi.getDriverStats(),
    ])
      .then(([{ data, total: t }, stats]) => {
        setDrivers(data);
        setTotal(t);
        setDriverStats(stats);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page]);

  const filtered = search
    ? drivers.filter((d) =>
        (d.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (d.email || '').toLowerCase().includes(search.toLowerCase()) ||
        (d.vehicle_plate || '').toLowerCase().includes(search.toLowerCase())
      )
    : drivers;

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const statusIcon = (s) => {
    if (s === 'verified') return <span className="adm-pill confirmed" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11 }}><ShieldCheck size={11} /> Verified</span>;
    if (s === 'rejected') return <span className="adm-pill cancelled" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11 }}><ShieldX size={11} /> Rejected</span>;
    return <span className="adm-pill scheduled" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11 }}><Clock size={11} /> Pending</span>;
  };

  return (
    <div className="adm-page">
      <h1 className="adm-title">Driver Performance</h1>
      <p className="adm-subtitle">Trip stats and performance metrics for all drivers</p>

      <div className="adm-bar">
        <div className="adm-search">
          <Search size={16} />
          <input type="text" placeholder="Search driver name, email, plate..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {loading ? (
        <div className="adm-loader">Loading drivers...</div>
      ) : filtered.length === 0 ? (
        <div className="adm-empty">No drivers found</div>
      ) : (
        <div className="adm-card">
          <div className="adm-tbl-wrap">
            <table className="adm-tbl">
              <thead>
                <tr>
                  <th>Driver</th>
                  <th>Vehicle</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Trips</th>
                  <th style={{ textAlign: 'right' }}>Passengers</th>
                  <th style={{ textAlign: 'right' }}>Revenue</th>
                  <th style={{ textAlign: 'center' }}>Rating</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((d) => {
                  const s = driverStats[d.id] || { trips: 0, passengers: 0, revenue: 0 };
                  const rating = d.rating || 0;
                  return (
                    <tr key={d.id}>
                      <td>
                        <div className="adm-bold">{d.name || '—'}</div>
                        <div className="t-xs adm-dim">{d.email || ''}</div>
                      </td>
                      <td>
                        <div className="adm-mono" style={{ fontSize: 12 }}>{d.vehicle_plate || '—'}</div>
                        <div className="t-xs adm-dim">{d.vehicle_model || ''}</div>
                      </td>
                      <td>{statusIcon(d.verification_status)}</td>
                      <td style={{ textAlign: 'right' }}>{s.trips}</td>
                      <td style={{ textAlign: 'right' }}>{s.passengers}</td>
                      <td style={{ textAlign: 'right' }} className="adm-bold">GH₵ {s.revenue.toFixed(0)}</td>
                      <td style={{ textAlign: 'center' }}>
                        {rating > 0 ? (
                          <span className="flex items-center justify-center gap-1" style={{ color: '#F4C430' }}>
                            <Star size={13} fill="#F4C430" /> {rating.toFixed(1)}
                          </span>
                        ) : (
                          <span className="adm-dim">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {totalPages > 1 && (
        <div className="adm-pag">
          <button disabled={page === 0} onClick={() => setPage(page - 1)}><ChevronLeft size={16} /> Prev</button>
          <span>Page {page + 1} of {totalPages}</span>
          <button disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>Next <ChevronRight size={16} /></button>
        </div>
      )}
    </div>
  );
};

export default AdminDrivers;
