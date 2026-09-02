import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { adminApi } from '../../services/adminApi';
import { formatCedi } from '../../utils/format';
import { cityById } from '../../data/cities';
import { minutesToClock } from '../../utils/format';

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
    try {
      await adminApi.updateTripStatus(id, newStatus);
      load();
    } catch (err) {
      console.error('Failed to update trip:', err);
    }
  };

  const filtered = search
    ? trips.filter((t) => {
        const from = cityById(t.from_id)?.name || t.from_id;
        const to = cityById(t.to_id)?.name || t.to_id;
        const term = search.toLowerCase();
        return from.toLowerCase().includes(term) ||
               to.toLowerCase().includes(term) ||
               (t.plate || '').toLowerCase().includes(term) ||
               (t.operator?.name || '').toLowerCase().includes(term);
      })
    : trips;

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="admin-page">
      <h1 className="admin-page-title">Trips</h1>
      <p className="admin-page-sub">All scheduled and completed trips</p>

      <div className="admin-toolbar">
        <div className="admin-search-box">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search by route, plate, operator..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="admin-select" value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }}>
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {loading ? (
        <div className="admin-loading">Loading trips...</div>
      ) : filtered.length === 0 ? (
        <div className="admin-empty">No trips found</div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Route</th>
                <th>Operator</th>
                <th>Bus Type</th>
                <th>Plate</th>
                <th>Date</th>
                <th>Departure</th>
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
                    <td className="admin-bold">{from?.name || t.from_id} → {to?.name || t.to_id}</td>
                    <td>
                      {t.operator && (
                        <span className="admin-operator">
                          <span className="admin-operator-dot" style={{ background: t.operator.color }} />
                          {t.operator.name}
                        </span>
                      )}
                    </td>
                    <td>{t.busType?.name || '—'}</td>
                    <td className="admin-mono">{t.plate || '—'}</td>
                    <td>{t.travel_date}</td>
                    <td>{minutesToClock(t.depart_mins)}</td>
                    <td>{formatCedi(t.price)}</td>
                    <td>{t.seats_total}</td>
                    <td><span className={`admin-badge admin-badge-${t.status === 'active' ? 'green' : t.status === 'cancelled' ? 'red' : 'gray'}`}>{t.status}</span></td>
                    <td>
                      {t.status === 'active' && (
                        <button className="admin-action-btn admin-action-danger" onClick={() => handleStatusChange(t.id, 'cancelled')}>Cancel</button>
                      )}
                      {t.status === 'cancelled' && (
                        <button className="admin-action-btn" onClick={() => handleStatusChange(t.id, 'active')}>Reactivate</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="admin-pagination">
          <button disabled={page === 0} onClick={() => setPage(page - 1)}><ChevronLeft size={16} /> Prev</button>
          <span>Page {page + 1} of {totalPages}</span>
          <button disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>Next <ChevronRight size={16} /></button>
        </div>
      )}
    </div>
  );
};

export default AdminTrips;
