import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { adminApi } from '../../services/adminApi';
import { useToast } from '../../context/ToastContext';

const PAGE_SIZE = 15;

const AdminUsers = () => {
  const toast = useToast();
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
      .catch((err) => { console.error(err); toast("Couldn't load users — check your connection.", 'error'); })
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
    <div className="adm-page">
      <h1 className="adm-title">Users</h1>
      <p className="adm-subtitle">Manage passengers and drivers</p>

      <div className="adm-bar">
        <div className="adm-search">
          <Search size={16} />
          <input type="text" placeholder="Search name, email, phone..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="adm-sel" value={role} onChange={(e) => { setRole(e.target.value); setPage(0); }}>
          <option value="">All roles</option>
          <option value="passenger">Passengers</option>
          <option value="driver">Drivers</option>
        </select>
      </div>

      {loading ? <div className="adm-loader">Loading users...</div> : filtered.length === 0 ? <div className="adm-empty">No users found</div> : (
        <div className="adm-card">
          <div className="adm-tbl-wrap">
            <table className="adm-tbl">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Role</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.id}>
                    <td className="adm-bold">{u.name || '—'}</td>
                    <td>{u.email || '—'}</td>
                    <td>{u.phone || '—'}</td>
                    <td><span className={`adm-pill ${u.role}`}>{u.role}</span></td>
                    <td className="adm-dim">{u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}</td>
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

export default AdminUsers;
