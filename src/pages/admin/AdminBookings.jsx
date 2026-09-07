import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { adminApi } from '../../services/adminApi';
import { formatCedi } from '../../utils/format';
import { cityById } from '../../data/cities';

const PAGE_SIZE = 15;

const AdminBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    adminApi.getBookings({ page, pageSize: PAGE_SIZE, status: status || undefined })
      .then(({ data, total }) => { setBookings(data); setTotal(total); })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(load, [page, status]);

  const handleStatusChange = async (id, newStatus) => {
    try { await adminApi.updateBookingStatus(id, newStatus); load(); } catch (err) { console.error(err); }
  };

  const filtered = search
    ? bookings.filter((b) =>
        b.id.toLowerCase().includes(search.toLowerCase()) ||
        (b.payment_ref || '').toLowerCase().includes(search.toLowerCase())
      )
    : bookings;

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const routeLabel = (trip) => {
    if (!trip) return '—';
    const from = cityById(trip.from_id);
    const to = cityById(trip.to_id);
    return `${from?.name || trip.from_id} → ${to?.name || trip.to_id}`;
  };

  return (
    <div className="adm-page">
      <h1 className="adm-title">Bookings</h1>
      <p className="adm-subtitle">All passenger bookings and payments</p>

      <div className="adm-bar">
        <div className="adm-search">
          <Search size={16} />
          <input type="text" placeholder="Search booking ID or payment ref..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="adm-sel" value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }}>
          <option value="">All statuses</option>
          <option value="confirmed">Confirmed</option>
          <option value="cancelled">Cancelled</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      {loading ? <div className="adm-loader">Loading...</div> : filtered.length === 0 ? <div className="adm-empty">No bookings found</div> : (
        <div className="adm-card">
          <div className="adm-tbl-wrap">
            <table className="adm-tbl">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Route</th>
                  <th>Type</th>
                  <th>Pax</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((b) => (
                  <tr key={b.id}>
                    <td className="adm-mono">{b.id.slice(0, 8)}</td>
                    <td>{b.type === 'live' ? (b.live_route || 'Live ride') : routeLabel(b.trip)}</td>
                    <td><span className={`adm-pill ${b.type}`}>{b.type}</span></td>
                    <td>{b.passengers?.length || 0}</td>
                    <td className="adm-bold">{formatCedi(b.amount)}</td>
                    <td><span className={`adm-pill ${b.status}`}>{b.status}</span></td>
                    <td className="adm-dim">{new Date(b.created_at).toLocaleDateString()}</td>
                    <td>
                      {b.status === 'confirmed' && <button className="adm-act danger" onClick={() => handleStatusChange(b.id, 'cancelled')}>Cancel</button>}
                      {b.status === 'cancelled' && <button className="adm-act" onClick={() => handleStatusChange(b.id, 'confirmed')}>Restore</button>}
                    </td>
                  </tr>
                ))}
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

export default AdminBookings;
