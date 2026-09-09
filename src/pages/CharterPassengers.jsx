import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { UserPlus, Trash2, Users } from 'lucide-react';

import { charterApi } from '../services/charterApi';
import Header from '../components/Header';
import EmptyState from '../components/EmptyState';
import { SkeletonLine } from '../components/Skeleton';

const CharterPassengers = () => {
  const { charterId } = useParams();
  const [charter, setCharter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [adding, setAdding] = useState(false);

  const load = () => {
    setLoading(true);
    charterApi.getCharter(charterId)
      .then(setCharter)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(load, [charterId]);

  const handleAdd = async () => {
    if (!name.trim()) return;
    setAdding(true);
    try {
      await charterApi.addPassenger(charterId, { name: name.trim(), phone: phone.trim() });
      setName('');
      setPhone('');
      load();
    } catch (err) {
      console.error(err);
    }
    setAdding(false);
  };

  const handleRemove = async (passengerId) => {
    if (!confirm('Remove this passenger?')) return;
    try {
      await charterApi.removePassenger(passengerId);
      load();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="screen fade-up">
        <Header title="Passengers" />
        <div className="card flex flex-col gap-2">
          <SkeletonLine w="60%" h={14} />
          <SkeletonLine w="80%" h={12} />
          <SkeletonLine w="50%" h={12} />
        </div>
      </div>
    );
  }

  if (!charter) {
    return (
      <div className="screen fade-up">
        <Header title="Passengers" />
        <EmptyState icon={Users} title="Charter not found" />
      </div>
    );
  }

  const remaining = charter.passengerCount - charter.passengers.length;

  return (
    <div className="screen fade-up">
      <Header title="Passengers" />

      <div className="card mb-3">
        <div className="flex justify-between items-center mb-2">
          <div className="semibold">{charter.groupName}</div>
          <span className="badge badge-primary">{charter.passengers.length}/{charter.passengerCount}</span>
        </div>
        {remaining > 0 && <div className="t-xs muted">{remaining} spot{remaining !== 1 ? 's' : ''} remaining</div>}
      </div>

      {remaining > 0 && (
        <div className="card mb-3">
          <div className="t-sm semibold mb-2 flex items-center gap-2"><UserPlus size={14} /> Add Passenger</div>
          <div className="field mb-2"><input placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="field mb-2"><input placeholder="Phone number (optional)" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
          <button className="btn btn-primary btn-sm" disabled={!name.trim() || adding} onClick={handleAdd}>
            {adding ? 'Adding...' : 'Add passenger'}
          </button>
        </div>
      )}

      {charter.passengers.length === 0 ? (
        <EmptyState icon={Users} title="No passengers yet" message="Add passengers to your charter group above." />
      ) : (
        <div className="flex flex-col gap-2">
          {charter.passengers.map((p, i) => (
            <div key={p.id} className="card flex justify-between items-center">
              <div>
                <div className="t-sm semibold">{i + 1}. {p.name}</div>
                {p.phone && <div className="t-xs muted">{p.phone}</div>}
              </div>
              <div className="flex items-center gap-2">
                <span className={`badge badge-${p.status === 'boarded' ? 'success' : 'default'}`} style={{ fontSize: 11 }}>{p.status}</span>
                {p.status === 'pending' && (
                  <button className="icon-btn" onClick={() => handleRemove(p.id)} title="Remove">
                    <Trash2 size={14} style={{ color: 'var(--danger)' }} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CharterPassengers;
