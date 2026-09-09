import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bus, Calendar, MapPin, Plus } from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import { charterApi } from '../services/charterApi';
import { useToast } from '../context/ToastContext';
import { cityById } from '../data/cities';
import { formatCedi } from '../utils/format';
import Header from '../components/Header';
import EmptyState from '../components/EmptyState';
import { SkeletonList } from '../components/Skeleton';

const STATUS_COLORS = {
  pending: 'var(--warning)',
  quoted: 'var(--info)',
  accepted: 'var(--info)',
  deposit_paid: 'var(--primary)',
  confirmed: 'var(--success)',
  in_progress: 'var(--primary)',
  completed: 'var(--success)',
  cancelled: 'var(--danger)',
};

const CharterList = () => {
  const toast = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [charters, setCharters] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    charterApi.getMyCharters(user.id)
      .then(setCharters)
      .catch((err) => { console.error(err); toast("Couldn't load your charters — check your connection.", 'error'); })
      .finally(() => setLoading(false));
  }, [user.id]);

  return (
    <div className="screen fade-up">
      <Header title="My Charters" />

      {loading ? <SkeletonList count={3} /> : charters.length === 0 ? (
        <EmptyState
          icon={Bus}
          title="No charters yet"
          message="Request a group charter for your next event."
          action={
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/charter/new')}>
              <Plus size={14} /> New Charter
            </button>
          }
        />
      ) : (
        <div className="flex flex-col gap-3" style={{ paddingBottom: 20 }}>
          <button className="btn btn-primary btn-sm" style={{ alignSelf: 'flex-end' }} onClick={() => navigate('/charter/new')}>
            <Plus size={14} /> New Charter
          </button>
          {charters.map((c) => {
            const pickup = cityById(c.pickupCityId);
            const dest = cityById(c.destCityId);
            return (
              <button key={c.id} className="card" style={{ textAlign: 'left', cursor: 'pointer' }} onClick={() => navigate(`/charter/${c.id}`)}>
                <div className="flex justify-between items-center mb-2">
                  <div className="semibold">{c.groupName}</div>
                  <span className="badge" style={{ background: (STATUS_COLORS[c.status] || 'var(--muted)') + '22', color: STATUS_COLORS[c.status], fontWeight: 600, fontSize: 11 }}>
                    {c.status.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex items-center gap-2 t-sm muted mb-1">
                  <MapPin size={13} /> {pickup?.name || '—'} → {dest?.name || '—'}
                </div>
                <div className="flex items-center gap-2 t-sm muted">
                  <Calendar size={13} /> {c.departDate}
                  {c.quotedPrice && <span className="semibold" style={{ color: 'var(--ink)', marginLeft: 'auto' }}>{formatCedi(c.quotedPrice)}</span>}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CharterList;
