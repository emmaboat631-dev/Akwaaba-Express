import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { adminApi } from '../../services/adminApi';

const PAGE_SIZE = 15;

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [role, setRole] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    adminApi.getUsers({ page, pageSize: PAGE_SIZE, role: role || undefined })
      .then(({ data, total }) => { setUsers(data); setTotal(total); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page, role]);

  const filtered = search
    ? users.filter((u) =>
        (u.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (u.email || '').toLowerCase().includes(search.toLowerCase()) ||
        (u.phone || '').includes(search)
      )
    : users;

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="admin-page">
      <h1 className="admin-page-title">Users</h1>
      <p className="admin-page-sub">Manage passengers and drivers</p>

      <div className="admin-toolbar">
        <div className="admin-search-box">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search by name, email, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="admin-select" value={role} onChange={(e) => { setRole(e.target.value); setPage(0); }}>
          <option value="">All roles</option>
          <option value="passenger">Passengers</option>
          <option value="driver">Drivers</option>
        </select>
      </div>

      {loading ? (
        <div className="admin-loading">Loading users...</div>
      ) : filtered.length === 0 ? (
        <div className="admin-empty">No users found</div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Role</th>
                <th>Guest</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id}>
                  <td className="admin-bold">{u.name || '—'}</td>
                  <td>{u.email || '—'}</td>
                  <td>{u.phone || '—'}</td>
                  <td><span className={`admin-badge admin-badge-${u.role === 'driver' ? 'purple' : 'blue'}`}>{u.role}</span></td>
                  <td>{u.is_guest ? 'Yes' : 'No'}</td>
                  <td className="admin-muted">{u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}</td>
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

export default AdminUsers;
