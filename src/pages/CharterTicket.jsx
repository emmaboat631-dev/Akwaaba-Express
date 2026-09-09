import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Bus, Calendar, MapPin, QrCode, Users } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

import { charterApi } from '../services/charterApi';
import { useToast } from '../context/ToastContext';
import { cityById } from '../data/cities';
import { busTypeById } from '../data/operators';
import Header from '../components/Header';
import EmptyState from '../components/EmptyState';
import { SkeletonLine } from '../components/Skeleton';

const CharterTicket = () => {
  const toast = useToast();
  const { charterId } = useParams();
  const [charter, setCharter] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    charterApi.getCharter(charterId)
      .then(setCharter)
      .catch((err) => { console.error(err); toast("Couldn't load this ticket — check your connection.", 'error'); })
      .finally(() => setLoading(false));
  }, [charterId]);

  if (loading) {
    return (
      <div className="screen fade-up">
        <Header title="Charter Ticket" />
        <div className="card flex flex-col gap-3 items-center">
          <SkeletonLine w={180} h={180} r={12} />
          <SkeletonLine w="60%" h={14} />
        </div>
      </div>
    );
  }

  if (!charter || !['confirmed', 'in_progress', 'completed'].includes(charter.status)) {
    return (
      <div className="screen fade-up">
        <Header title="Charter Ticket" />
        <EmptyState icon={QrCode} title="Ticket not available" message="Your charter must be confirmed before tickets are issued." />
      </div>
    );
  }

  const pickup = cityById(charter.pickupCityId);
  const dest = cityById(charter.destCityId);
  const busType = busTypeById(charter.busTypeId);

  return (
    <div className="screen fade-up">
      <Header title="Charter Ticket" />

      <div className="card mb-3" style={{ textAlign: 'center' }}>
        <div className="bold" style={{ fontSize: 18, marginBottom: 4 }}>{charter.groupName}</div>
        <div className="t-xs muted mb-3">Ref: {charter.charterRef}</div>

        <div style={{ background: '#fff', padding: 16, borderRadius: 12, display: 'inline-block', marginBottom: 16 }}>
          <QRCodeSVG value={`${window.location.origin}/charter/${charter.id}`} size={180} level="M" fgColor="#0B2E1C" bgColor="#ffffff" />
        </div>

        <div className="flex flex-col gap-2 t-sm" style={{ textAlign: 'left' }}>
          <div className="flex items-center gap-2">
            <MapPin size={14} className="muted" />
            <span>{pickup?.name || '—'} → {dest?.name || '—'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar size={14} className="muted" />
            <span>{charter.departDate} at {charter.departTime}</span>
          </div>
          <div className="flex items-center gap-2">
            <Bus size={14} className="muted" />
            <span>{busType?.name || '—'} {charter.plate ? `· ${charter.plate}` : ''}</span>
          </div>
          <div className="flex items-center gap-2">
            <Users size={14} className="muted" />
            <span>{charter.passengers.length} passengers</span>
          </div>
        </div>
      </div>

      <div className="t-sm semibold mb-2">Passenger QR Codes</div>
      <div className="flex flex-col gap-2" style={{ paddingBottom: 20 }}>
        {charter.passengers.map((p) => (
          <div key={p.id} className="card flex items-center gap-3">
            <div style={{ background: '#fff', padding: 6, borderRadius: 8, flexShrink: 0 }}>
              <QRCodeSVG value={p.qrValue || `${window.location.origin}/charter/${charter.id}/p/${p.id}`} size={60} level="M" fgColor="#0B2E1C" bgColor="#ffffff" />
            </div>
            <div style={{ flex: 1 }}>
              <div className="t-sm semibold">{p.name}</div>
              {p.phone && <div className="t-xs muted">{p.phone}</div>}
              <span className={`badge badge-${p.status === 'boarded' ? 'success' : 'default'}`} style={{ fontSize: 10, marginTop: 2 }}>{p.status}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CharterTicket;
