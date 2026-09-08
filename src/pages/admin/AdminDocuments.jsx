import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Search, ShieldCheck, ShieldX, Eye, Clock } from 'lucide-react';
import { adminApi } from '../../services/adminApi';

const PAGE_SIZE = 15;

const StatusBadge = ({ status }) => {
  const map = {
    pending: { cls: 'scheduled', icon: Clock, label: 'Pending' },
    verified: { cls: 'confirmed', icon: ShieldCheck, label: 'Verified' },
    rejected: { cls: 'cancelled', icon: ShieldX, label: 'Rejected' },
  };
  const s = map[status] || map.pending;
  const Icon = s.icon;
  return (
    <span className={`adm-pill ${s.cls}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <Icon size={11} /> {s.label}
    </span>
  );
};

const DetailModal = ({ driver, onClose, onAction }) => {
  const [reason, setReason] = useState('');
  const [acting, setActing] = useState(false);
  if (!driver) return null;

  const handle = async (newStatus) => {
    setActing(true);
    await onAction(driver.id, newStatus, reason);
    setActing(false);
  };

  return (
    <div className="adm-modal-overlay" onClick={onClose}>
      <div className="adm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="adm-modal-head">
          <h2>Driver Verification</h2>
          <button className="adm-modal-close" onClick={onClose}>&times;</button>
        </div>

        <div className="adm-modal-body">
          <div className="adm-detail-grid">
            <div className="adm-detail-item">
              <span className="adm-detail-label">Name</span>
              <span className="adm-detail-value">{driver.name || '—'}</span>
            </div>
            <div className="adm-detail-item">
              <span className="adm-detail-label">Email</span>
              <span className="adm-detail-value">{driver.email || '—'}</span>
            </div>
            <div className="adm-detail-item">
              <span className="adm-detail-label">Phone</span>
              <span className="adm-detail-value">{driver.phone || '—'}</span>
            </div>
            <div className="adm-detail-item">
              <span className="adm-detail-label">License No.</span>
              <span className="adm-detail-value adm-mono">{driver.license_no || '—'}</span>
            </div>
            <div className="adm-detail-item">
              <span className="adm-detail-label">Vehicle Plate</span>
              <span className="adm-detail-value adm-mono">{driver.vehicle_plate || '—'}</span>
            </div>
            <div className="adm-detail-item">
              <span className="adm-detail-label">Vehicle Model</span>
              <span className="adm-detail-value">{driver.vehicle_model || '—'}</span>
            </div>
            <div className="adm-detail-item">
              <span className="adm-detail-label">Status</span>
              <StatusBadge status={driver.verification_status} />
            </div>
            <div className="adm-detail-item">
              <span className="adm-detail-label">Submitted</span>
              <span className="adm-detail-value">{driver.updated_at ? new Date(driver.updated_at).toLocaleDateString() : '—'}</span>
            </div>
          </div>

          {driver.verification_status === 'pending' && (
            <div className="adm-verify-actions">
              <textarea
                className="adm-verify-reason"
                placeholder="Reason for rejection (optional)"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
              />
              <div className="adm-verify-btns">
                <button
                  className="adm-verify-btn approve"
                  onClick={() => handle('verified')}
                  disabled={acting}
                >
                  <ShieldCheck size={15} /> Approve
                </button>
                <button
                  className="adm-verify-btn reject"
                  onClick={() => handle('rejected')}
                  disabled={acting}
                >
                  <ShieldX size={15} /> Reject
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const AdminDocuments = () => {
  const [drivers, setDrivers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState('pending');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  const load = () => {
    setLoading(true);
    adminApi.getDriverVerifications({ page, pageSize: PAGE_SIZE, status: filter || undefined })
      .then(({ data, total }) => { setDrivers(data); setTotal(total); })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(load, [page, filter]);

  const handleAction = async (id, status, reason) => {
    try {
      await adminApi.updateVerificationStatus(id, status, reason);
      setSelected(null);
      load();
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = search
    ? drivers.filter((d) =>
        (d.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (d.email || '').toLowerCase().includes(search.toLowerCase()) ||
        (d.license_no || '').toLowerCase().includes(search.toLowerCase()) ||
        (d.vehicle_plate || '').toLowerCase().includes(search.toLowerCase())
      )
    : drivers;

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const counts = { pending: 0, verified: 0, rejected: 0 };
  drivers.forEach((d) => { if (counts[d.verification_status] !== undefined) counts[d.verification_status]++; });

  return (
    <div className="adm-page">
      <h1 className="adm-title">Document Verification</h1>
      <p className="adm-subtitle">Review and verify driver documents and licenses</p>

      <div className="adm-bar">
        <div className="adm-search">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search name, email, license..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="adm-sel" value={filter} onChange={(e) => { setFilter(e.target.value); setPage(0); }}>
          <option value="pending">Pending review</option>
          <option value="">All statuses</option>
          <option value="verified">Verified</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {loading ? (
        <div className="adm-loader">Loading verifications...</div>
      ) : filtered.length === 0 ? (
        <div className="adm-empty">
          {filter === 'pending' ? 'No pending verifications' : 'No drivers found'}
        </div>
      ) : (
        <div className="adm-card">
          <div className="adm-tbl-wrap">
            <table className="adm-tbl">
              <thead>
                <tr>
                  <th>Driver</th>
                  <th>Email</th>
                  <th>License No.</th>
                  <th>Vehicle</th>
                  <th>Status</th>
                  <th>Submitted</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((d) => (
                  <tr key={d.id}>
                    <td className="adm-bold">{d.name || '—'}</td>
                    <td>{d.email || '—'}</td>
                    <td className="adm-mono">{d.license_no || '—'}</td>
                    <td>{d.vehicle_plate ? `${d.vehicle_model || ''} · ${d.vehicle_plate}` : '—'}</td>
                    <td><StatusBadge status={d.verification_status} /></td>
                    <td className="adm-dim">{d.updated_at ? new Date(d.updated_at).toLocaleDateString() : '—'}</td>
                    <td>
                      <button className="adm-act" onClick={() => setSelected(d)}>
                        <Eye size={13} style={{ marginRight: 4, verticalAlign: -2 }} />
                        Review
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

      <DetailModal driver={selected} onClose={() => setSelected(null)} onAction={handleAction} />
    </div>
  );
};

export default AdminDocuments;
