import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Bus, Calendar, MapPin, Users, Save, CheckCircle } from 'lucide-react';
import { charterAdminApi } from '../../services/charterApi';
import { useToast } from '../../context/ToastContext';
import { formatCedi } from '../../utils/format';
import { cityById } from '../../data/cities';
import { busTypeById } from '../../data/operators';

const STATUS_FLOW = ['pending', 'quoted', 'accepted', 'deposit_paid', 'confirmed', 'in_progress', 'completed', 'cancelled'];

const AdminCharterDetail = () => {
  const { charterId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [charter, setCharter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [quotedPrice, setQuotedPrice] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [plate, setPlate] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [newStatus, setNewStatus] = useState('');

  const load = () => {
    setLoading(true);
    charterAdminApi.getCharter(charterId)
      .then((c) => {
        setCharter(c);
        setQuotedPrice(c.quotedPrice || '');
        setDepositAmount(c.depositAmount || '');
        setPlate(c.plate || '');
        setAdminNotes(c.adminNotes || '');
        setNewStatus(c.status);
      })
      .catch((err) => {
        console.error(err);
        toast("Couldn't load this charter — check your connection.", 'error');
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, [charterId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = {};
      if (newStatus !== charter.status) updates.status = newStatus;
      if (Number(quotedPrice) !== charter.quotedPrice) updates.quotedPrice = Number(quotedPrice);
      if (Number(depositAmount) !== charter.depositAmount) updates.depositAmount = Number(depositAmount);
      if (plate !== charter.plate) updates.plate = plate;
      if (adminNotes !== charter.adminNotes) updates.adminNotes = adminNotes;

      if (Object.keys(updates).length) {
        const updated = await charterAdminApi.updateCharter(charterId, updates);
        setCharter(updated);
        toast('Charter updated', 'success');
      }
    } catch (err) {
      console.error(err);
      toast("Couldn't save your changes — please try again.", 'error');
    }
    setSaving(false);
  };

  if (loading) return <div className="adm-page"><div className="adm-loader">Loading...</div></div>;
  if (!charter) return <div className="adm-page"><div className="adm-empty">Charter not found</div></div>;

  const pickup = cityById(charter.pickupCityId);
  const dest = cityById(charter.destCityId);
  const busType = busTypeById(charter.busTypeId);

  return (
    <div className="adm-page">
      <button className="adm-act mb-3" onClick={() => navigate('/admin/charters')}>
        <ArrowLeft size={14} /> Back to charters
      </button>

      <h1 className="adm-title">{charter.groupName}</h1>
      <p className="adm-subtitle">Ref: {charter.charterRef} · Created {new Date(charter.createdAt).toLocaleDateString()}</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16, marginBottom: 16 }}>
        <div className="adm-card" style={{ padding: 20 }}>
          <div className="adm-bold mb-3" style={{ fontSize: 15 }}>Trip Details</div>
          <div className="flex flex-col gap-2" style={{ fontSize: 14 }}>
            <div className="flex items-center gap-2"><MapPin size={14} /> {pickup?.name || '—'} → {dest?.name || '—'}</div>
            {charter.pickupAddress && <div style={{ paddingLeft: 22, color: 'var(--muted)' }}>{charter.pickupAddress}</div>}
            {charter.destAddress && <div style={{ paddingLeft: 22, color: 'var(--muted)' }}>To: {charter.destAddress}</div>}
            <div className="flex items-center gap-2"><Calendar size={14} /> {charter.departDate} at {charter.departTime}</div>
            {charter.isReturnTrip && <div className="flex items-center gap-2"><Calendar size={14} /> Return: {charter.returnDate} at {charter.returnTime}</div>}
            <div className="flex items-center gap-2"><Users size={14} /> {charter.passengerCount} passengers</div>
            <div className="flex items-center gap-2"><Bus size={14} /> {busType?.name || charter.busTypeId}</div>
            <div>Event: {charter.eventTypeId}</div>
            {charter.specialRequests && <div style={{ color: 'var(--muted)' }}>Notes: {charter.specialRequests}</div>}
          </div>
        </div>

        <div className="adm-card" style={{ padding: 20 }}>
          <div className="adm-bold mb-3" style={{ fontSize: 15 }}>Pricing & Assignment</div>
          <div className="flex flex-col gap-3">
            <div>
              <label className="t-xs" style={{ display: 'block', marginBottom: 4, color: 'var(--muted)' }}>Status</label>
              <select className="adm-sel" value={newStatus} onChange={(e) => setNewStatus(e.target.value)} style={{ width: '100%' }}>
                {STATUS_FLOW.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="t-xs" style={{ display: 'block', marginBottom: 4, color: 'var(--muted)' }}>Quoted price (GH₵)</label>
              <input className="adm-sel" type="number" style={{ width: '100%' }} value={quotedPrice} onChange={(e) => setQuotedPrice(e.target.value)} placeholder={charter.estimatedPrice ? `Estimated: ${charter.estimatedPrice}` : '0'} />
            </div>
            <div>
              <label className="t-xs" style={{ display: 'block', marginBottom: 4, color: 'var(--muted)' }}>Deposit amount (GH₵)</label>
              <input className="adm-sel" type="number" style={{ width: '100%' }} value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} />
            </div>
            <div>
              <label className="t-xs" style={{ display: 'block', marginBottom: 4, color: 'var(--muted)' }}>Vehicle plate</label>
              <input className="adm-sel" type="text" style={{ width: '100%' }} value={plate} onChange={(e) => setPlate(e.target.value)} placeholder="e.g. GR-1234-22" />
            </div>
            <div>
              <label className="t-xs" style={{ display: 'block', marginBottom: 4, color: 'var(--muted)' }}>Admin notes</label>
              <textarea className="adm-sel" rows={3} style={{ width: '100%', resize: 'vertical' }} value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} />
            </div>

            <button className="adm-act" style={{ alignSelf: 'flex-start', background: 'var(--primary)', color: '#fff', padding: '8px 16px', borderRadius: 8 }} disabled={saving} onClick={handleSave}>
              <Save size={14} /> {saving ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </div>
      </div>

      <div className="adm-card" style={{ padding: 20 }}>
        <div className="adm-bold mb-3" style={{ fontSize: 15 }}>Payment Summary</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, fontSize: 14 }}>
          <div>
            <div style={{ color: 'var(--muted)' }}>Estimated</div>
            <div className="adm-bold">{charter.estimatedPrice ? formatCedi(charter.estimatedPrice) : '—'}</div>
          </div>
          <div>
            <div style={{ color: 'var(--muted)' }}>Quoted</div>
            <div className="adm-bold">{charter.quotedPrice ? formatCedi(charter.quotedPrice) : '—'}</div>
          </div>
          <div>
            <div style={{ color: 'var(--muted)' }}>Deposit Paid</div>
            <div className="adm-bold" style={{ color: 'var(--success)' }}>{formatCedi(charter.depositPaid)}</div>
          </div>
          <div>
            <div style={{ color: 'var(--muted)' }}>Balance Paid</div>
            <div className="adm-bold" style={{ color: 'var(--success)' }}>{formatCedi(charter.balancePaid)}</div>
          </div>
        </div>
      </div>

      <div className="adm-card" style={{ padding: 20, marginTop: 16 }}>
        <div className="flex justify-between items-center mb-3">
          <div className="adm-bold" style={{ fontSize: 15 }}>Passengers ({charter.passengers.length}/{charter.passengerCount})</div>
        </div>
        {charter.passengers.length === 0 ? (
          <div style={{ color: 'var(--muted)', fontSize: 14 }}>No passengers added yet</div>
        ) : (
          <div className="adm-tbl-wrap">
            <table className="adm-tbl">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Status</th>
                  <th>Boarded</th>
                </tr>
              </thead>
              <tbody>
                {charter.passengers.map((p, i) => (
                  <tr key={p.id}>
                    <td>{i + 1}</td>
                    <td>{p.name}</td>
                    <td>{p.phone || '—'}</td>
                    <td><span className={`adm-pill ${p.status}`}>{p.status}</span></td>
                    <td className="adm-dim">{p.boardedAt ? new Date(p.boardedAt).toLocaleString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminCharterDetail;
