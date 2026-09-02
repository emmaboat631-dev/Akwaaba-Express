import React, { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Ticket as TicketIcon } from 'lucide-react';

import { useDriver } from '../../context/DriverContext';
import { useToast } from '../../context/ToastContext';
import { todayISO } from '../../data/driverTrips';
import { formatCedi } from '../../utils/format';

import SegmentedTabs from '../../components/SegmentedTabs';
import EmptyState from '../../components/EmptyState';
import PullToRefresh from '../../components/PullToRefresh';

// Simpler mirror of Trips.jsx — same page shape, no cancel action (a driver
// can't cancel a trip that already happened).
const TripRow = ({ entry }) => (
  <div className="card flex justify-between items-center">
    <div>
      <div className="semibold t-sm">{entry.type === 'live' ? 'Live ride' : 'Scheduled trip'}</div>
      <div className="t-xs muted">{format(new Date(entry.date), 'd MMM · HH:mm')} · {entry.distanceKm} km</div>
    </div>
    <div className="bold t-num">{formatCedi(entry.amount)}</div>
  </div>
);

const DriverTripHistory = () => {
  const driver = useDriver();
  const toast = useToast();
  const [tab, setTab] = useState('today');

  const { today, all } = useMemo(() => {
    const t = todayISO();
    return {
      today: driver.completedTrips.filter((e) => e.date.slice(0, 10) === t),
      all: driver.completedTrips,
    };
  }, [driver.completedTrips]);

  const list = tab === 'today' ? today : all;
  const refresh = async () => {
    await driver.refetchCompletions();
    toast('Up to date', 'info');
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: 'calc(20px + var(--safe-top)) 20px 8px' }}>
        <h1 className="mb-4">My Trips</h1>
        <SegmentedTabs
          value={tab}
          onChange={setTab}
          options={[
            { value: 'today', label: `Today${today.length ? ` (${today.length})` : ''}` },
            { value: 'all', label: 'All trips' },
          ]}
        />
      </div>

      <PullToRefresh onRefresh={refresh} className="has-nav" style={{ flex: 1, padding: '16px 20px 0' }}>
        {list.length === 0 ? (
          <EmptyState
            icon={TicketIcon}
            title={tab === 'today' ? 'No trips yet today' : 'No trips yet'}
            message="Completed trips and rides will show up here."
          />
        ) : (
          <div className="flex flex-col gap-3">
            {list.map((e) => <TripRow key={e.id} entry={e} />)}
          </div>
        )}
      </PullToRefresh>
    </div>
  );
};

export default DriverTripHistory;
