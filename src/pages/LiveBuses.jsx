import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useNearbyBuses } from '../hooks/useNearbyBuses';
import { useRelay } from '../hooks/useRelay';
import { useGeolocation } from '../hooks/useGeolocation';
import { useBriefLoad } from '../hooks/useBriefLoad';
import BusMap from '../components/BusMap';
import BottomSheet from '../components/BottomSheet';
import LiveBusCard from '../components/LiveBusCard';
import { SkeletonList } from '../components/Skeleton';

const LiveBuses = () => {
  const navigate = useNavigate();
  const { position, located } = useGeolocation();
  const simulated = useNearbyBuses(position);
  const { liveBuses } = useRelay(); // real drivers online on other devices
  const [selected, setSelected] = useState(null);
  const loading = useBriefLoad();

  // Real online drivers first, then the simulated background traffic.
  const buses = useMemo(() => [...liveBuses, ...simulated], [liveBuses, simulated]);
  const sorted = useMemo(() => [...buses].sort((a, b) => (a.etaMin ?? 99) - (b.etaMin ?? 99)), [buses]);

  return (
    <div style={{ position: 'relative', height: '100%', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        <BusMap
          center={position}
          zoom={12.4}
          buses={buses}
          selectedBusId={selected}
          userPosition={located ? position : undefined}
          onSelectBus={(b) => setSelected(b.id)}
        />
      </div>

      <div style={{ position: 'absolute', top: 'calc(var(--safe-top) + 14px)', left: 16, right: 16, zIndex: 20, display: 'flex', gap: 10, alignItems: 'center' }}>
        <button className="icon-btn" onClick={() => navigate('/')}><ArrowLeft size={20} /></button>
        <div className="card" style={{ padding: '9px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="live-dot" />
          <span className="t-sm semibold">{buses.length} buses available near you</span>
        </div>
      </div>

      <BottomSheet peek={46} half={0.5} full={0.88} initial="half" bottomOffset={88}>
        <h3 className="mb-1">Live buses</h3>
        <div className="t-sm muted mb-4">Tap a bus to track it and grab a seat.</div>
        {loading ? (
          <SkeletonList count={5} />
        ) : (
          <div className="flex flex-col gap-3">
            {sorted.map((bus) => (
              <LiveBusCard key={bus.id} bus={bus} onClick={() => navigate(`/live/${bus.id}`)} />
            ))}
          </div>
        )}
      </BottomSheet>
    </div>
  );
};

export default LiveBuses;
