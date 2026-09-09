import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Bus, Calendar, Clock, MapPin, Users, AlertCircle, CheckCircle, XCircle, CreditCard, UserPlus } from 'lucide-react';

import { charterApi } from '../services/charterApi';
import { cityById } from '../data/cities';
import { busTypeById, operatorById } from '../data/operators';
import { formatCedi } from '../utils/format';
import Header from '../components/Header';
import EmptyState from '../components/EmptyState';
import { SkeletonLine } from '../components/Skeleton';

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

const STATUS_LABELS = {
  pending: 'Pending Review',
  quoted: 'Quotation Ready',
  accepted: 'Accepted',
  deposit_paid: 'Deposit Paid',
  confirmed: 'Confirmed',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const CharterDetails = () => {
  const { charterId } = useParams();
  const navigate = useNavigate();
  const [charter, setCharter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  const load = () => {
    setLoading(true);
    charterApi.getCharter(charterId)
      .then(setCharter)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(load, [charterId]);

  const handleCancel = async () => {
    if (!confirm('Cancel this charter request?')) return;
    setCancelling(true);
    try {
      await charterApi.cancelCharter(charterId);
      load();
    } catch (err) {
      console.error(err);
    }
    setCancelling(false);
  };

  if (loading) {
    return (
      <div className="screen fade-up">
        <Header title="Charter Details" />
        <div className="card mb-4 flex flex-col gap-3">
          <SkeletonLine w="60%" h={16} />
          <SkeletonLine w="80%" h={12} />
          <SkeletonLine w="40%" h={12} />
        </div>
      </div>
    );
  }

  if (!charter) {
    return (
      <div className="screen fade-up">
        <Header title="Charter Details" />
        <EmptyState icon={Bus} title="Charter not found" message="This charter request may have been removed." />
      </div>
    );
  }

  const pickup = cityById(charter.pickupCityId);
  const dest = cityById(charter.destCityId);
  const busType = busTypeById(charter.busTypeId);
  const operator = charter.operatorId ? operatorById(charter.operatorId) : null;

  const showQuote = charter.quotedPrice && ['quoted', 'accepted', 'deposit_paid', 'confirmed', 'in_progress', 'completed'].includes(charter.status);
  const canCancel = ['pending', 'quoted'].includes(charter.status);
  const canPayDeposit = charter.status === 'quoted' && charter.depositAmount && charter.depositPaid < charter.depositAmount;
  const canPayBalance = charter.status === 'deposit_paid' && charter.quotedPrice && (charter.depositPaid + charter.balancePaid) < charter.quotedPrice;

  return (
    <div className="screen fade-up">
      <Header title="Charter Details" />

      <div className="card mb-3">
        <div className="flex justify-between items-center mb-3">
          <div>
            <div className="bold" style={{ fontSize: 18 }}>{charter.groupName}</div>
            <div className="t-xs muted">Ref: {charter.charterRef}</div>
          </div>
          <span className="badge" style={{ background: STATUS_COLORS[charter.status] + '22', color: STATUS_COLORS[charter.status], fontWeight: 600 }}>
            {STATUS_LABELS[charter.status]}
          </span>
        </div>

        <div className="flex flex-col gap-2 t-sm">
          <div className="flex items-center gap-2">
            <MapPin size={14} className="muted" />
            <span>{pickup?.name || charter.pickupCityId} → {dest?.name || charter.destCityId}</span>
          </div>
          {charter.pickupAddress && <div className="t-xs muted" style={{ paddingLeft: 22 }}>{charter.pickupAddress}</div>}
          <div className="flex items-center gap-2">
            <Calendar size={14} className="muted" />
            <span>{charter.departDate} at {charter.departTime}</span>
          </div>
          {charter.isReturnTrip && (
            <div className="flex items-center gap-2">
              <Clock size={14} className="muted" />
              <span>Return: {charter.returnDate} at {charter.returnTime}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Users size={14} className="muted" />
            <span>{charter.passengerCount} passengers</span>
          </div>
          <div className="flex items-center gap-2">
            <Bus size={14} className="muted" />
            <span>{busType?.name || charter.busTypeId}</span>
          </div>
          {operator && (
            <div className="flex items-center gap-2">
              <CheckCircle size={14} className="muted" />
              <span>Operator: {operator.name}</span>
            </div>
          )}
          {charter.plate && (
            <div className="t-xs muted" style={{ paddingLeft: 22 }}>Plate: {charter.plate}</div>
          )}
        </div>
      </div>

      {showQuote && (
        <div className="card mb-3" style={{ background: 'var(--primary-light)' }}>
          <div className="t-xs muted mb-1">Quoted Price</div>
          <div className="bold" style={{ fontSize: 22, color: 'var(--primary-dark)' }}>{formatCedi(charter.quotedPrice)}</div>
          {charter.depositAmount && (
            <div className="flex justify-between mt-2 t-sm">
              <span className="muted">Deposit ({Math.round((charter.depositAmount / charter.quotedPrice) * 100)}%)</span>
              <span className="semibold">{formatCedi(charter.depositAmount)}</span>
            </div>
          )}
          <div className="flex justify-between t-sm">
            <span className="muted">Paid</span>
            <span className="semibold" style={{ color: 'var(--success)' }}>{formatCedi(charter.depositPaid + charter.balancePaid)}</span>
          </div>
          {charter.quotedPrice - charter.depositPaid - charter.balancePaid > 0 && (
            <div className="flex justify-between t-sm">
              <span className="muted">Remaining</span>
              <span className="semibold" style={{ color: 'var(--danger)' }}>{formatCedi(charter.quotedPrice - charter.depositPaid - charter.balancePaid)}</span>
            </div>
          )}
        </div>
      )}

      {charter.adminNotes && (
        <div className="card mb-3">
          <div className="t-xs muted mb-1">Admin Notes</div>
          <div className="t-sm">{charter.adminNotes}</div>
        </div>
      )}

      <div className="card mb-3">
        <div className="flex justify-between items-center mb-2">
          <div className="semibold t-sm">Passengers ({charter.passengers.length}/{charter.passengerCount})</div>
          {['pending', 'quoted', 'accepted', 'deposit_paid', 'confirmed'].includes(charter.status) && (
            <button className="btn btn-sm btn-outline" onClick={() => navigate(`/charter/${charter.id}/passengers`)}>
              <UserPlus size={14} /> Manage
            </button>
          )}
        </div>
        {charter.passengers.length === 0 ? (
          <div className="t-sm muted">No passengers added yet</div>
        ) : (
          <div className="flex flex-col gap-1">
            {charter.passengers.slice(0, 5).map((p) => (
              <div key={p.id} className="flex justify-between items-center t-sm">
                <span>{p.name}</span>
                <span className={`badge badge-${p.status === 'boarded' ? 'success' : 'default'}`} style={{ fontSize: 11 }}>{p.status}</span>
              </div>
            ))}
            {charter.passengers.length > 5 && <div className="t-xs muted">+{charter.passengers.length - 5} more</div>}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2" style={{ paddingBottom: 20 }}>
        {canPayDeposit && (
          <button className="btn btn-primary" onClick={() => navigate(`/charter/${charter.id}/pay`, { state: { type: 'deposit', amount: charter.depositAmount, charter } })}>
            <CreditCard size={16} /> Pay Deposit — {formatCedi(charter.depositAmount)}
          </button>
        )}
        {canPayBalance && (
          <button className="btn btn-primary" onClick={() => navigate(`/charter/${charter.id}/pay`, { state: { type: 'balance', amount: charter.quotedPrice - charter.depositPaid, charter } })}>
            <CreditCard size={16} /> Pay Balance — {formatCedi(charter.quotedPrice - charter.depositPaid)}
          </button>
        )}
        {canCancel && (
          <button className="btn btn-outline" style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }} disabled={cancelling} onClick={handleCancel}>
            <XCircle size={16} /> {cancelling ? 'Cancelling...' : 'Cancel Request'}
          </button>
        )}
      </div>
    </div>
  );
};

export default CharterDetails;
