import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bus, Car, Info, IdCard, Palette } from 'lucide-react';

import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { OPERATORS, BUS_TYPES } from '../../data/operators';

import Header from '../../components/Header';
import OperatorMark from '../../components/OperatorMark';

// Where a driver enters what passengers actually see about them and their
// vehicle: company, bus class, plate, model, colour, license number. Broadcast
// via the LAN relay while online (DriverDashboard), then shown on the
// passenger's Ticket screen for a booked live trip.
const DriverVehicleSetup = () => {
  const navigate = useNavigate();
  const { user, setVehicleInfo } = useAuth();
  const toast = useToast();

  const [form, setForm] = useState({
    operatorId: user?.operatorId || '',
    busTypeId: user?.busTypeId || '',
    vehiclePlate: user?.vehiclePlate || '',
    vehicleModel: user?.vehicleModel || '',
    vehicleColor: user?.vehicleColor || '',
    licenseNo: user?.licenseNo || '',
  });

  if (!user) return null;

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = () => {
    if (!form.operatorId) { toast('Pick your company', 'error'); return; }
    if (!form.busTypeId) { toast('Pick your bus class', 'error'); return; }
    if (!form.vehiclePlate.trim()) { toast('Enter your plate number', 'error'); return; }
    if (!form.vehicleModel.trim()) { toast('Enter the vehicle model', 'error'); return; }
    if (!form.licenseNo.trim()) { toast('Enter your license number', 'error'); return; }
    setVehicleInfo(form);
    toast('Vehicle profile saved', 'success');
    navigate('/driver/profile');
  };

  return (
    <div className="screen fade-up">
      <Header title="Vehicle profile" subtitle="What passengers see on their ticket" onBack={() => navigate(-1)} />

      <div className="card mb-4 flex items-start gap-3" style={{ padding: 14 }}>
        <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Info size={17} />
        </div>
        <div className="t-xs muted" style={{ lineHeight: 1.5 }}>
          These details appear on the passenger's ticket when they book a live ride with you — your name, phone, company and vehicle. Editing any field sends verification back to <span className="semibold">pending</span> until you resubmit.
        </div>
      </div>

      {/* Company */}
      <h3 className="mb-2">Company</h3>
      <div className="card mb-4" style={{ padding: 12 }}>
        <div className="flex flex-col gap-2">
          {OPERATORS.map((op) => {
            const active = form.operatorId === op.id;
            return (
              <button
                key={op.id}
                className="flex items-center gap-3 w-full"
                style={{
                  padding: 10, borderRadius: 12, textAlign: 'left',
                  background: active ? 'var(--primary-light)' : 'transparent',
                  border: `1px solid ${active ? 'var(--primary)' : 'var(--line)'}`,
                }}
                onClick={() => setForm((f) => ({ ...f, operatorId: op.id }))}
              >
                <OperatorMark operator={op} size={36} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="semibold t-sm">{op.name}</div>
                  <div className="t-xs muted">Rating {op.rating.toFixed(1)}</div>
                </div>
                {active && <span className="badge badge-primary">Selected</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Bus class — same big-card pattern as Company so both scan at a glance */}
      <h3 className="mb-2">Bus class</h3>
      <div className="card mb-4" style={{ padding: 12 }}>
        <div className="flex flex-col gap-2">
          {BUS_TYPES.map((bt) => {
            const active = form.busTypeId === bt.id;
            return (
              <button
                key={bt.id}
                className="flex items-center gap-3 w-full"
                style={{
                  padding: 12, borderRadius: 12, textAlign: 'left',
                  background: active ? 'var(--primary-light)' : 'transparent',
                  border: `1px solid ${active ? 'var(--primary)' : 'var(--line)'}`,
                }}
                onClick={() => setForm((f) => ({ ...f, busTypeId: bt.id }))}
              >
                <div style={{
                  width: 40, height: 40, borderRadius: 12,
                  background: active ? 'var(--primary)' : 'var(--surface-2)',
                  color: active ? '#fff' : 'var(--primary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <Bus size={19} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="semibold">{bt.name}</div>
                  <div className="t-xs muted" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {bt.seats} seats · {bt.amenities.slice(0, 2).join(', ')}
                  </div>
                </div>
                {active && <span className="badge badge-primary">Selected</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Vehicle details */}
      <h3 className="mb-2">Vehicle</h3>
      <div className="card mb-4">
        <div className="field-label">Plate number</div>
        <div className="field mb-3">
          <Car size={17} className="muted" />
          <input placeholder="GR 4821-24" value={form.vehiclePlate} onChange={set('vehiclePlate')} style={{ textTransform: 'uppercase' }} />
        </div>

        <div className="flex gap-3 mb-3">
          <div style={{ flex: 1.4, minWidth: 0 }}>
            <div className="field-label">Model</div>
            <div className="field"><input placeholder="Toyota Hiace" value={form.vehicleModel} onChange={set('vehicleModel')} /></div>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="field-label">Colour</div>
            <div className="field"><Palette size={16} className="muted" /><input placeholder="White" value={form.vehicleColor} onChange={set('vehicleColor')} /></div>
          </div>
        </div>

        <div className="field-label">Driver's license no.</div>
        <div className="field">
          <IdCard size={17} className="muted" />
          <input placeholder="DVLA-0000000" value={form.licenseNo} onChange={set('licenseNo')} />
        </div>
      </div>

      <button className="btn btn-primary" onClick={submit}>Save vehicle profile</button>
    </div>
  );
};

export default DriverVehicleSetup;
