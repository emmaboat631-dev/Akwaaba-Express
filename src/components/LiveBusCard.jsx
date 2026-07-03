import React from 'react';
import { Users, ChevronRight } from 'lucide-react';
import { operatorById, busTypeById } from '../data/operators';
import { formatCedi } from '../utils/format';
import OperatorMark from './OperatorMark';

const LiveBusCard = ({ bus, onClick }) => {
  const operator = operatorById(bus.operatorId);
  const busType = busTypeById(bus.busTypeId);

  return (
    <div className="card card-pressable flex items-center gap-3" onClick={onClick}>
      <OperatorMark operator={operator} size={46} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="flex items-center gap-2">
          <span className="semibold" style={{ fontSize: 15 }}>{bus.routeName}</span>
        </div>
        <div className="t-xs muted flex items-center gap-3 mt-1">
          <span className="flex items-center gap-1"><span className="live-dot" /> {bus.etaMin} min away</span>
          <span className="flex items-center gap-1"><Users size={12} /> {bus.seatsAvailable} free</span>
        </div>
        <div className="t-xs muted mt-1">{operator.name} · {busType.name} · {bus.plate}</div>
      </div>

      <div className="text-right no-shrink">
        <div className="bold" style={{ color: 'var(--primary-dark)' }}>{formatCedi(bus.pricePerSeat)}</div>
        <ChevronRight size={18} className="muted" style={{ marginLeft: 'auto' }} />
      </div>
    </div>
  );
};

export default LiveBusCard;
