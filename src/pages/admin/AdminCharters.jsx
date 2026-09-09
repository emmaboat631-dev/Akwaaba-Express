import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Search, Eye } from 'lucide-react';
import { charterAdminApi } from '../../services/charterApi';
import { formatCedi } from '../../utils/format';
import { cityById } from '../../data/cities';

const PAGE_SIZE = 15;

const STATUS_OPTS = ['', 'pending', 'quoted', 'accepted', 'deposit_paid', 'confirmed', 'in_progress', 'completed', 'cancelled'];

const AdminCharters = () => {
  const navigate = useNavigate();
  const [charters, setCharters] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    charterAdminApi.getCharters({ page, pageSize: PAGE_SIZE, status: status || undefined })
      .then(({ data, total }) => { setCharters(data); setTotal(total); })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(load, [page, status]);

  const filtered = search
    ? charters.filter((c) =>
        c.charterRef.toLowerCase().includes(search.toLowerCase()) ||
        c.groupName.toLowerCase().includes(search.toLowerCase())
      )
    : charters;

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const routeLabel = (c) => {
    const from = cityById(c.pickupCityId);
    const to = cityById(c.destCityId);
    return `${from?.name || c.pickupCityId} → ${to?.name || c.destCityId}`;
  };

  return (
    <div className="adm-page">
      <h1 className="adm-title">Group Charters</h1>
      <p className="adm-subtitle">Manage charter requests and assignments</p>

      <div className="adm-bar">
        <div className="adm-search">
          <Search size={16} />
          <input type="text" placeholder="Search ref or group name..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="adm-sel" value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }}>
          {STATUS_OPTS.map((s) => <option key={s} value={s}>{s || 'All statuses'}</option>)}
        </select>
      </div>

      {loading ? <div className="adm-loader">Loading...</div> : filtered.length === 0 ? <div className="adm-empty">No charters found</div> : (
        <div className="adm-card">
          <div className="adm-tbl-wrap">
            <table className="adm-tbl">
              <thead>
                <tr>
                  <th>Ref</th>
                  <th>Group</th>
                  <th>Route</th>
                  <th>Date</th>
                  <th>Pax</th>
                  <th>Price</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id}>
                    <td className="adm-mono">{c.charterRef}</td>
                    <td>{c.groupName}</td>
                    <td>{routeLabel(c)}</td>
                    <td className="adm-dim">{c.departDate}</td>
                    <td>{c.passengerCount}</td>
                    <td className="adm-bold">{c.quotedPrice ? formatCedi(c.quotedPrice) : c.estimatedPrice ? `~${formatCedi(c.estimatedPrice)}` : '—'}</td>
                    <td><span className={`adm-pill ${c.status}`}>{c.status.replace('_', ' ')}</span></td>
                    <td>
                      <button className="adm-act" onClick={() => navigate(`/admin/charters/${c.id}`)}>
                        <Eye size={14} /> View
                      </button>
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

export default AdminCharters;
