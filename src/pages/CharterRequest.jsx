import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { ArrowLeft, ArrowRight, Bus, Calendar, Clock, MapPin, Users, FileText, Check } from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { charterApi } from '../services/charterApi';
import { cityById } from '../data/cities';
import { busTypeById } from '../data/operators';
import { formatCedi } from '../utils/format';
import CityPicker from '../components/CityPicker';
import DatePicker from '../components/DatePicker';
import Header from '../components/Header';

const STEPS = ['Route', 'Details', 'Bus', 'Review'];

const StepIndicator = ({ current }) => (
  <div className="flex items-center gap-2 mb-4" style={{ padding: '0 4px' }}>
    {STEPS.map((label, i) => (
      <React.Fragment key={label}>
        <div className="flex items-center gap-1">
          <div style={{
            width: 28, height: 28, borderRadius: '50%', fontSize: 13, fontWeight: 600,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: i <= current ? 'var(--primary)' : 'var(--surface-2)',
            color: i <= current ? '#fff' : 'var(--muted)',
          }}>
            {i < current ? <Check size={14} /> : i + 1}
          </div>
          <span className="t-xs" style={{ color: i <= current ? 'var(--ink)' : 'var(--muted)' }}>{label}</span>
        </div>
        {i < STEPS.length - 1 && <div style={{ flex: 1, height: 2, background: i < current ? 'var(--primary)' : 'var(--line)' }} />}
      </React.Fragment>
    ))}
  </div>
);

const CharterRequest = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [picker, setPicker] = useState(null);
  const [showDepartCal, setShowDepartCal] = useState(false);
  const [showReturnCal, setShowReturnCal] = useState(false);

  const [eventTypes, setEventTypes] = useState([]);
  const [pricing, setPricing] = useState([]);

  const [pickupCityId, setPickupCityId] = useState('');
  const [pickupAddress, setPickupAddress] = useState('');
  const [destCityId, setDestCityId] = useState('');
  const [destAddress, setDestAddress] = useState('');
  const [departDate, setDepartDate] = useState('');
  const [departTime, setDepartTime] = useState('06:00');
  const [isReturnTrip, setIsReturnTrip] = useState(false);
  const [returnDate, setReturnDate] = useState('');
  const [returnTime, setReturnTime] = useState('18:00');
  const [passengerCount, setPassengerCount] = useState(20);
  const [eventTypeId, setEventTypeId] = useState('');
  const [groupName, setGroupName] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');
  const [busTypeId, setBusTypeId] = useState('standard');

  useEffect(() => {
    // Without these the form has no event types and no price to quote, so a
    // failure here has to be visible rather than silently degrading.
    Promise.all([
      charterApi.getEventTypes().then(setEventTypes),
      charterApi.getPricing().then(setPricing),
    ]).catch((err) => {
      console.error(err);
      toast("Couldn't load charter options — check your connection.", 'error');
    });
  }, [toast]);

  const pickup = cityById(pickupCityId);
  const dest = cityById(destCityId);

  const estimatedPrice = pricing.length && busTypeId
    ? charterApi.estimatePrice(pricing, busTypeId, 200, 8, isReturnTrip)
    : null;

  const busType = busTypeById(busTypeId);

  const canNext = () => {
    if (step === 0) return pickupCityId && destCityId && departDate && departTime;
    if (step === 1) return groupName && passengerCount >= 1 && eventTypeId;
    if (step === 2) return busTypeId;
    return true;
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const charter = await charterApi.createCharter({
        pickupCityId, pickupAddress, destCityId, destAddress,
        departDate, departTime,
        returnDate: isReturnTrip ? returnDate : null,
        returnTime: isReturnTrip ? returnTime : null,
        isReturnTrip, passengerCount, eventTypeId,
        groupName, specialRequests, busTypeId,
        estimatedPrice,
      }, user.id);
      navigate(`/charter/${charter.id}`, { replace: true });
    } catch (err) {
      console.error(err);
      toast("Couldn't send your request — check your connection and try again.", 'error');
      setSubmitting(false);
    }
  };

  return (
    <div className="screen fade-up">
      <Header title="Group Charter" />
      <StepIndicator current={step} />

      {step === 0 && (
        <div className="flex flex-col gap-3">
          <div className="card">
            <div className="t-sm semibold mb-2 flex items-center gap-2"><MapPin size={14} /> Pickup</div>
            <button className="field mb-2" style={{ cursor: 'pointer', width: '100%', textAlign: 'left' }} onClick={() => setPicker('pickup')}>
              {pickup ? `${pickup.name}, ${pickup.region}` : 'Select pickup city'}
            </button>
            <div className="field"><input placeholder="Exact address (optional)" value={pickupAddress} onChange={(e) => setPickupAddress(e.target.value)} /></div>
          </div>

          <div className="card">
            <div className="t-sm semibold mb-2 flex items-center gap-2"><MapPin size={14} /> Destination</div>
            <button className="field mb-2" style={{ cursor: 'pointer', width: '100%', textAlign: 'left' }} onClick={() => setPicker('dest')}>
              {dest ? `${dest.name}, ${dest.region}` : 'Select destination city'}
            </button>
            <div className="field"><input placeholder="Exact address (optional)" value={destAddress} onChange={(e) => setDestAddress(e.target.value)} /></div>
          </div>

          <div className="card">
            <div className="t-sm semibold mb-2 flex items-center gap-2"><Calendar size={14} /> Departure</div>
            <div className="flex gap-2">
              <button className="field" style={{ flex: 1, cursor: 'pointer', textAlign: 'left' }} onClick={() => setShowDepartCal(true)}>
                <span style={{ color: departDate ? 'var(--ink)' : 'var(--muted)', fontWeight: 500, fontSize: 15 }}>
                  {departDate ? format(parseISO(departDate), 'EEE, d MMM yyyy') : 'Select date'}
                </span>
              </button>
              <div className="field" style={{ width: 110 }}><input type="time" value={departTime} onChange={(e) => setDepartTime(e.target.value)} /></div>
            </div>

            <label className="flex items-center gap-2 mt-3 t-sm" style={{ cursor: 'pointer' }}>
              <input type="checkbox" checked={isReturnTrip} onChange={(e) => setIsReturnTrip(e.target.checked)} />
              Include return trip
            </label>

            {isReturnTrip && (
              <div className="flex gap-2 mt-2">
                <button className="field" style={{ flex: 1, cursor: 'pointer', textAlign: 'left' }} onClick={() => setShowReturnCal(true)}>
                  <span style={{ color: returnDate ? 'var(--ink)' : 'var(--muted)', fontWeight: 500, fontSize: 15 }}>
                    {returnDate ? format(parseISO(returnDate), 'EEE, d MMM yyyy') : 'Select date'}
                  </span>
                </button>
                <div className="field" style={{ width: 110 }}><input type="time" value={returnTime} onChange={(e) => setReturnTime(e.target.value)} /></div>
              </div>
            )}
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="flex flex-col gap-3">
          <div className="card">
            <div className="t-sm semibold mb-2 flex items-center gap-2"><Users size={14} /> Group Info</div>
            <div className="field mb-2"><input placeholder="Group / organisation name" value={groupName} onChange={(e) => setGroupName(e.target.value)} /></div>

            <label className="t-xs muted mb-1" style={{ display: 'block' }}>Event type</label>
            <div className="field mb-2">
              <select value={eventTypeId} onChange={(e) => setEventTypeId(e.target.value)} style={{ background: 'transparent', border: 'none', outline: 'none', width: '100%', fontSize: 15, fontWeight: 500, color: 'var(--ink)' }}>
                <option value="">Select event type</option>
                {eventTypes.map((et) => <option key={et.id} value={et.id}>{et.label}</option>)}
              </select>
            </div>

            <label className="t-xs muted mb-1" style={{ display: 'block' }}>Number of passengers</label>
            <div className="field"><input type="number" min={1} max={200} value={passengerCount} onChange={(e) => setPassengerCount(Number(e.target.value))} /></div>
          </div>

          <div className="card">
            <div className="t-sm semibold mb-2 flex items-center gap-2"><FileText size={14} /> Special requests</div>
            <textarea rows={4} placeholder="Any special requirements (e.g. PA system, decorations, stops...)" value={specialRequests} onChange={(e) => setSpecialRequests(e.target.value)} style={{ background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', outline: 'none', width: '100%', padding: '12px 14px', fontSize: 15, fontWeight: 500, color: 'var(--ink)', resize: 'vertical', lineHeight: 1.5 }} />
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-3">
          <div className="card">
            <div className="t-sm semibold mb-3 flex items-center gap-2"><Bus size={14} /> Choose bus type</div>
            {['mini', 'standard', 'vip'].map((bt) => {
              const info = busTypeById(bt);
              const rate = pricing.find((p) => p.bus_type_id === bt);
              const selected = busTypeId === bt;
              return (
                <button
                  key={bt}
                  onClick={() => setBusTypeId(bt)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    width: '100%', textAlign: 'left', cursor: 'pointer',
                    padding: '14px 16px', marginBottom: 10,
                    borderRadius: 'var(--r-sm)',
                    background: selected ? 'var(--primary-light, rgba(6,57,47,0.08))' : 'var(--surface-2)',
                    border: selected ? '2px solid var(--primary)' : '2px solid transparent',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%',
                    border: selected ? '6px solid var(--primary)' : '2px solid var(--muted)',
                    background: selected ? '#fff' : 'transparent',
                    flexShrink: 0,
                  }} />
                  <div style={{ flex: 1 }}>
                    <div className="semibold">{info?.name || bt}</div>
                    <div className="t-xs muted">{info?.seats || '—'} seats</div>
                  </div>
                  {rate && <div className="t-sm semibold" style={{ color: 'var(--primary)', whiteSpace: 'nowrap' }}>from {formatCedi(rate.charter_base)}</div>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="flex flex-col gap-3">
          <div className="card">
            <div className="t-sm semibold mb-3">Review your charter request</div>
            <div className="flex flex-col gap-2 t-sm">
              <Row label="Group" value={groupName} />
              <Row label="Event" value={eventTypes.find((e) => e.id === eventTypeId)?.label || '—'} />
              <Row label="Pickup" value={pickup ? `${pickup.name}, ${pickup.region}` : '—'} />
              {pickupAddress && <Row label="Address" value={pickupAddress} />}
              <Row label="Destination" value={dest ? `${dest.name}, ${dest.region}` : '—'} />
              {destAddress && <Row label="Address" value={destAddress} />}
              <Row label="Depart" value={`${departDate} at ${departTime}`} />
              {isReturnTrip && <Row label="Return" value={`${returnDate} at ${returnTime}`} />}
              <Row label="Passengers" value={passengerCount} />
              <Row label="Bus type" value={busType?.name || busTypeId} />
            </div>
          </div>

          {estimatedPrice && (
            <div className="card" style={{ background: 'var(--primary-light)' }}>
              <div className="t-xs muted mb-1">Estimated price</div>
              <div className="bold" style={{ fontSize: 22, color: 'var(--primary-dark)' }}>{formatCedi(estimatedPrice)}</div>
              <div className="t-xs muted mt-1">Final price will be quoted by our team</div>
            </div>
          )}
        </div>
      )}

      <div className="flex gap-2 mt-4" style={{ paddingBottom: 20 }}>
        {step > 0 && (
          <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setStep(step - 1)}>
            <ArrowLeft size={16} /> Back
          </button>
        )}
        {step < 3 ? (
          <button className="btn btn-primary" style={{ flex: 1 }} disabled={!canNext()} onClick={() => setStep(step + 1)}>
            Next <ArrowRight size={16} />
          </button>
        ) : (
          <button className="btn btn-primary" style={{ flex: 1 }} disabled={submitting} onClick={handleSubmit}>
            {submitting ? 'Submitting...' : 'Submit request'}
          </button>
        )}
      </div>

      <CityPicker
        open={picker === 'pickup'}
        title="Pickup city"
        exclude={destCityId}
        onSelect={(city) => setPickupCityId(city.id)}
        onClose={() => setPicker(null)}
      />
      <CityPicker
        open={picker === 'dest'}
        title="Destination city"
        exclude={pickupCityId}
        onSelect={(city) => setDestCityId(city.id)}
        onClose={() => setPicker(null)}
      />
      <DatePicker
        open={showDepartCal}
        value={departDate}
        onSelect={setDepartDate}
        onClose={() => setShowDepartCal(false)}
        title="Departure date"
      />
      <DatePicker
        open={showReturnCal}
        value={returnDate}
        min={departDate}
        onSelect={setReturnDate}
        onClose={() => setShowReturnCal(false)}
        title="Return date"
      />
    </div>
  );
};

const Row = ({ label, value }) => (
  <div className="flex justify-between">
    <span className="muted">{label}</span>
    <span className="semibold">{value}</span>
  </div>
);

export default CharterRequest;
