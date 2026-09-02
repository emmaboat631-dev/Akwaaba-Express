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
    try {
      await adminApi.updateBookingStatus(id, newStatus);
      load();
    } catch (err) {
      console.error('Failed to update booking:', err);
    }
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
    <div className="admin-page">
      <h1 className="admin-page-title">Bookings</h1>
      <p className="admin-page-sub">All passenger bookings and payments</p>

      <div className="admin-toolbar">
        <div className="admin-search-box">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search by booking ID or payment ref..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="admin-select" value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }}>
          <option value="">All statuses</option>
          <option value="confirmed">Confirmed</option>
          <option value="cancelled">Cancelled</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      {loading ? (
        <div className="admin-loading">Loading bookings...</div>
      ) : filtered.length === 0 ? (
        <div className="admin-empty">No bookings found</div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Route</th>
                <th>Type</th>
                <th>Passengers</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((b) => (
                <tr key={b.id}>
                  <td className="admin-mono">{b.id.slice(0, 8)}</td>
                  <td>{b.type === 'live' ? (b.live_route || 'Live ride') : routeLabel(b.trip)}</td>
                  <td><span className={`admin-badge admin-badge-${b.type === 'live' ? 'blue' : 'purple'}`}>{b.type}</span></td>
                  <td>{b.passengers?.length || 0}</td>
                  <td className="admin-bold">{formatCedi(b.amount)}</td>
                  <td><span className={`admin-badge admin-badge-${b.status === 'confirmed' ? 'green' : b.status === 'cancelled' ? 'red' : 'gray'}`}>{b.status}</span></td>
                  <td className="admin-muted">{new Date(b.created_at).toLocaleDateString()}</td>
                  <td>
                    {b.status === 'confirmed' && (
                      <button className="admin-action-btn admin-action-danger" onClick={() => handleStatusChange(b.id, 'cancelled')}>Cancel</button>
                    )}
                    {b.status === 'cancelled' && (
                      <button className="admin-action-btn" onClick={() => handleStatusChange(b.id, 'confirmed')}>Restore</button>
                    )}
                  </td>
                </tr>
              ))}
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

export default AdminBookings;
