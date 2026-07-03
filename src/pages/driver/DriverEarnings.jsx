import React, { useState } from 'react';
import { format } from 'date-fns';
import { Star, Wallet } from 'lucide-react';

import { useAuth } from '../../context/AuthContext';
import { useDriver } from '../../context/DriverContext';
import { todayISO } from '../../data/driverTrips';
import { formatCedi, formatMinutes } from '../../utils/format';

import Header from '../../components/Header';
import SegmentedTabs from '../../components/SegmentedTabs';
import EmptyState from '../../components/EmptyState';

const StatGrid = ({ earnings, km, trips }) => (
  <div className="flex gap-3 mb-4">
    <div className="card flex-1 text-center" style={{ padding: 16 }}>
      <div className="bold t-num" style={{ fontSize: 20, color: 'var(--primary-dark)' }}>{formatCedi(earnings)}</div>
      <div className="t-xs muted">earnings</div>
    </div>
    <div className="card flex-1 text-center" style={{ padding: 16 }}>
      <div className="bold t-num" style={{ fontSize: 20 }}>{km.toFixed(1)}</div>
      <div className="t-xs muted">km covered</div>
    </div>
    <div className="card flex-1 text-center" style={{ padding: 16 }}>
      <div className="bold t-num" style={{ fontSize: 20 }}>{trips}</div>
      <div className="t-xs muted">trips</div>
    </div>
  </div>
);

const EntryRow = ({ entry }) => (
  <div className="card flex justify-between items-center" style={{ padding: 14 }}>
    <div>
      <div className="semibold t-sm">{entry.type === 'live' ? 'Live ride' : 'Scheduled trip'}</div>
      <div className="t-xs muted">{format(new Date(entry.date), 'd MMM, HH:mm')} · {entry.distanceKm} km</div>
    </div>
    <div className="bold t-num">{formatCedi(entry.amount)}</div>
  </div>
);

const DriverEarnings = () => {
  const { user } = useAuth();
  const driver = useDriver();
  const [tab, setTab] = useState('today');

  if (!user) return null;

  const today = todayISO();
  const todaysEntries = driver.completedTrips.filter((t) => t.date.slice(0, 10) === today);
  const todayEarnings = todaysEntries.reduce((sum, t) => sum + t.amount, 0);
  const todayKm = todaysEntries.reduce((sum, t) => sum + (t.distanceKm || 0), 0);

  const totalAttempts = driver.acceptedCount + driver.declinedCount;
  const acceptanceRate = totalAttempts ? Math.round((driver.acceptedCount / totalAttempts) * 100) : null;

  const weekHistory = driver.dailyHistory.slice(0, 7);
  const weekEarnings = weekHistory.reduce((sum, d) => sum + d.earnings, 0) + todayEarnings;
  const weekKm = weekHistory.reduce((sum, d) => sum + d.km, 0) + todayKm;
  const weekTrips = weekHistory.reduce((sum, d) => sum + d.trips, 0) + todaysEntries.length;

  return (
    <div className="screen has-nav fade-up">
      <Header title="Earnings" subtitle="Your trips, rides & payouts" />

      <div className="mb-4">
        <SegmentedTabs
          value={tab}
          onChange={setTab}
          options={[
            { value: 'today', label: 'Today' },
            { value: 'week', label: 'This week' },
            { value: 'history', label: 'History' },
          ]}
        />
      </div>

      {tab === 'today' && (
        <>
          <StatGrid earnings={todayEarnings} km={todayKm} trips={todaysEntries.length} />

          <div className="card mb-4" style={{ padding: 14 }}>
            <div className="flex justify-between items-center mb-3">
              <span className="t-sm muted">Acceptance rate</span>
              <span className="semibold t-sm">{acceptanceRate == null ? '—' : `${acceptanceRate}%`}</span>
            </div>
            <div className="flex justify-between items-center mb-3">
              <span className="t-sm muted">Hours online today</span>
              <span className="semibold t-sm">{formatMinutes(Math.round(driver.onlineSecondsToday / 60))}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="t-sm muted">Rating</span>
              <span className="semibold t-sm flex items-center gap-1"><Star size={13} fill="#F4C430" stroke="#F4C430" /> {user.rating?.toFixed(1) ?? '—'}</span>
            </div>
          </div>

          {todaysEntries.length === 0 ? (
            <EmptyState icon={Wallet} title="No trips yet today" message="Completed trips and rides will show up here." />
          ) : (
            <div className="flex flex-col gap-2">
              {todaysEntries.map((t) => <EntryRow key={t.id} entry={t} />)}
            </div>
          )}
        </>
      )}

      {tab === 'week' && (
        <>
          <StatGrid earnings={weekEarnings} km={weekKm} trips={weekTrips} />
          {weekHistory.length === 0 && todaysEntries.length === 0 ? (
            <EmptyState icon={Wallet} title="No history yet" message="Come back after a few days on the road." />
          ) : (
            <div className="flex flex-col gap-2">
              <div className="card flex justify-between items-center" style={{ padding: 14 }}>
                <span className="semibold t-sm">Today</span>
                <span className="bold t-num">{formatCedi(todayEarnings)}</span>
              </div>
              {weekHistory.map((d) => (
                <div key={d.dateISO} className="card flex justify-between items-center" style={{ padding: 14 }}>
                  <div>
                    <div className="semibold t-sm">{format(new Date(d.dateISO), 'EEE, d MMM')}</div>
                    <div className="t-xs muted">{d.trips} trip{d.trips === 1 ? '' : 's'} · {d.km.toFixed(1)} km</div>
                  </div>
                  <div className="bold t-num">{formatCedi(d.earnings)}</div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'history' && (
        driver.completedTrips.length === 0 ? (
          <EmptyState icon={Wallet} title="No trips yet" message="Your completed trips and rides will appear here." />
        ) : (
          <div className="flex flex-col gap-2">
            {driver.completedTrips.map((t) => <EntryRow key={t.id} entry={t} />)}
          </div>
        )
      )}
    </div>
  );
};

export default DriverEarnings;
