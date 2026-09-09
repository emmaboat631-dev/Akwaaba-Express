import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Bus, Calendar, CheckCircle, MapPin, Users, Scan } from 'lucide-react';

import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { charterAdminApi, charterApi } from '../../services/charterApi';
import { cityById } from '../../data/cities';
import { busTypeById } from '../../data/operators';
import Header from '../../components/Header';
import EmptyState from '../../components/EmptyState';
import { SkeletonLine } from '../../components/Skeleton';

const DriverCharterTrip = () => {
  const { charterId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();
  const [charter, setCharter] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    charterApi.getCharter(charterId)
      .then(setCharter)
      .catch((err) => {
        console.error(err);
        toast("Couldn't load this charter — check your connection.", 'error');
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, [charterId]);

  const handleBoard = async (passengerId) => {
    try {
      await charterApi.updatePassengerStatus(passengerId, 'boarded');
      load();
    } catch (err) {
      console.error(err);
      toast("Couldn't update that passenger — please try again.", 'error');
    }
  };

  if (loading) {
    return (
      <div className="screen fade-up">
        <Header title="Charter Trip" />
        <div className="card flex flex-col gap-3">
          <SkeletonLine w="60%" h={16} />
          <SkeletonLine w="80%" h={12} />
        </div>
      </div>
    );
  }

  if (!charter) {
    return (
      <div className="screen fade-up">
        <Header title="Charter Trip" />
        <EmptyState icon={Bus} title="Charter not found" />
      </div>
    );
  }

  const pickup = cityById(charter.pickupCityId);
  const dest = cityById(charter.destCityId);
  const busType = busTypeById(charter.busTypeId);
  const boarded = charter.passengers.filter((p) => p.status === 'boarded').length;

  return (
    <div className="screen fade-up">
      <Header title="Charter Trip" />

      <div className="card mb-3">
        <div className="bold" style={{ fontSize: 18 }}>{charter.groupName}</div>
        <div className="t-xs muted mb-3">Ref: {charter.charterRef}</div>

        <div className="flex flex-col gap-2 t-sm">
          <div className="flex items-center gap-2"><MapPin size={14} className="muted" /> {pickup?.name || '—'} → {dest?.name || '—'}</div>
          <div className="flex items-center gap-2"><Calendar size={14} className="muted" /> {charter.departDate} at {charter.departTime}</div>
          <div className="flex items-center gap-2"><Bus size={14} className="muted" /> {busType?.name || '—'} · {charter.plate || 'No plate'}</div>
          <div className="flex items-center gap-2"><Users size={14} className="muted" /> {boarded}/{charter.passengers.length} boarded</div>
        </div>
      </div>

      <div className="flex gap-2 mb-3">
        <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => navigate('/driver/scan')}>
          <Scan size={16} /> Scan QR
        </button>
      </div>

      <div className="t-sm semibold mb-2">Passenger Manifest</div>
      <div className="flex flex-col gap-2" style={{ paddingBottom: 20 }}>
        {charter.passengers.map((p, i) => (
          <div key={p.id} className="card flex justify-between items-center">
            <div>
              <div className="t-sm semibold">{i + 1}. {p.name}</div>
              {p.phone && <div className="t-xs muted">{p.phone}</div>}
            </div>
            <div className="flex items-center gap-2">
              {p.status === 'boarded' ? (
                <span className="badge badge-success" style={{ fontSize: 11 }}>
                  <CheckCircle size={11} /> Boarded
                </span>
              ) : (
                <button className="btn btn-sm btn-outline" onClick={() => handleBoard(p.id)}>
                  Board
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DriverCharterTrip;
