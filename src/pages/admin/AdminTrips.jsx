import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { adminApi } from '../../services/adminApi';
import { formatCedi, minutesToClock } from '../../utils/format';
import { cityById } from '../../data/cities';

const PAGE_SIZE = 15;

const AdminTrips = () => {
  const [trips, setTrips] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    adminApi.getTrips({ page, pageSize: PAGE_SIZE, status: status || undefined })
      .then(({ data, total }) => { setTrips(data); setTotal(total); })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(load, [page, status]);

  const handleStatusChange = async (id, newStatus) => {
    try { await adminApi.updateTripStatus(id, newStatus); load(); } catch (err) { console.error(err); }
  };

  const filtered = search
    ? trips.filter((t) => {
        const from = cityById(t.from_id)?.name || t.from_id;
        const to = cityById(t.to_id)?.name || t.to_id;
        const term = search.toLowerCase();
        return from.toLowerCase().includes(term) || to.toLowerCase().includes(term) ||
               (t.plate || '').toLowerCase().includes(term) || (t.operator?.name || '').toLowerCase().includes(term);
      })
    : trips;

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="adm-page">
      <h1 className="adm-title">Trips</h1>
      <p className="adm-subtitle">All scheduled and completed trips</p>

      <div className="adm-bar">
        <div className="adm-search">
          <Search size={16} />
          <input type="text" placeholder="Search route, plate, operator..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="adm-sel" value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }}>
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {loading ? <div className="adm-loader">Loading...</div> : filtered.length === 0 ? <div className="adm-empty">No trips found</div> : (
        <div className="adm-card">
          <div className="adm-tbl-wrap">
            <table className="adm-tbl">
              <thead>
                <tr>
                  <th>Route</th>
                  <th>Operator</th>
                  <th>Bus</th>
                  <th>Plate</th>
                  <th>Date</th>
                  <th>Depart</th>
                  <th>Price</th>
                  <th>Seats</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => {
                  const from = cityById(t.from_id);
                  const to = cityById(t.to_id);
                  return (
                    <tr key={t.id}>
                      <td className="adm-bold">{from?.name || t.from_id} → {to?.name || t.to_id}</td>
                      <td>{t.operator && <span className="adm-op"><span className="adm-op-dot" style={{ background: t.operator.color }} />{t.operator.name}</span>}</td>
                      <td>{t.busType?.name || '—'}</td>
                      <td className="adm-mono">{t.plate || '—'}</td>
                      <td>{t.travel_date}</td>
                      <td>{minutesToClock(t.depart_mins)}</td>
                      <td>{formatCedi(t.price)}</td>
                      <td>{t.seats_total}</td>
                      <td><span className={`adm-pill ${t.status === 'active' ? 'confirmed' : t.status}`}>{t.status}</span></td>
                      <td>
                        {t.status === 'active' && <button className="adm-act danger" onClick={() => handleStatusChange(t.id, 'cancelled')}>Cancel</button>}
                        {t.status === 'cancelled' && <button className="adm-act" onClick={() => handleStatusChange(t.id, 'active')}>Reactivate</button>}
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

export default AdminTrips;
