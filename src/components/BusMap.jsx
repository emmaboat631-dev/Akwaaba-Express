import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useTheme } from '../context/ThemeContext';

// School-bus marker — style inspired by IconBaandar's "school bus" icons on
// Flaticon (https://www.flaticon.com/free-icons/school-bus). Drawn inline so the
// app stays self-contained and offline-capable; credit is shown in Profile.
const schoolBus = `<svg viewBox="0 0 60 40" width="40" height="27" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="6" width="54" height="22" rx="5" fill="#FBC02D"/><rect x="8" y="10" width="8" height="7" rx="1.5" fill="#D9EEFF"/><rect x="18" y="10" width="8" height="7" rx="1.5" fill="#D9EEFF"/><rect x="28" y="10" width="8" height="7" rx="1.5" fill="#D9EEFF"/><rect x="38" y="10" width="8" height="7" rx="1.5" fill="#D9EEFF"/><rect x="48" y="10" width="6" height="7" rx="1.5" fill="#D9EEFF"/><rect x="3" y="21" width="54" height="2.5" fill="#263238"/><circle cx="17" cy="29" r="5" fill="#263238"/><circle cx="17" cy="29" r="2" fill="#CFD8DC"/><circle cx="43" cy="29" r="5" fill="#263238"/><circle cx="43" cy="29" r="2" fill="#CFD8DC"/></svg>`;

const busIcon = (selected) =>
  L.divIcon({
    className: '',
    html: `<div class="bus-pin${selected ? ' selected' : ''}">${schoolBus}</div>`,
    iconSize: [40, 27],
    iconAnchor: [20, 14],
  });

const dotIcon = (cls) => L.divIcon({ className: '', html: `<div class="${cls}"></div>`, iconSize: [18, 18], iconAnchor: [9, 9] });

// Recenters / fits the map when the focus props change.
const MapController = ({ center, zoom, fitBounds }) => {
  const map = useMap();
  const lat = center?.[0];
  const lng = center?.[1];
  useEffect(() => {
    const fix = () => map.invalidateSize();
    const timers = [80, 250, 600].map((ms) => setTimeout(fix, ms));
    // Recompute whenever the container actually gets/changes size (e.g. after the
    // sheet animates or the layout settles) so tiles always load.
    const ro = new ResizeObserver(fix);
    ro.observe(map.getContainer());
    window.addEventListener('resize', fix);
    return () => {
      timers.forEach(clearTimeout);
      ro.disconnect();
      window.removeEventListener('resize', fix);
    };
  }, [map]);
  useEffect(() => {
    if (fitBounds && fitBounds.length > 1) {
      map.fitBounds(fitBounds, { padding: [50, 50], maxZoom: 14 });
    } else if (lat != null && lng != null) {
      // setView (no animation) so the map stays still instead of panning.
      map.setView([lat, lng], zoom ?? map.getZoom(), { animate: false });
    }
  }, [map, lat, lng, zoom, fitBounds]);
  return null;
};

const BusMap = ({
  center = [5.6037, -0.187],
  zoom = 12,
  buses = [],
  selectedBusId,
  onSelectBus,
  userPosition,
  routeLine,
  fitBounds,
  style,
}) => {
  const { isDark } = useTheme() || {};
  const tileUrl = isDark
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

  return (
  <MapContainer
    center={center}
    zoom={zoom}
    zoomControl={false}
    attributionControl={false}
    style={{ width: '100%', height: '100%', ...style }}
  >
    <TileLayer key={tileUrl} url={tileUrl} />
    <MapController center={center} zoom={zoom} fitBounds={fitBounds} />

    {routeLine && routeLine.length > 1 && (
      <>
        <Polyline positions={routeLine} pathOptions={{ color: isDark ? '#F0F2ED' : '#151815', weight: 4, opacity: 0.85 }} />
        <Marker position={routeLine[0]} icon={dotIcon('pulse-marker')} />
        <Marker position={routeLine[routeLine.length - 1]} icon={busIcon(true)} />
      </>
    )}

    {userPosition && <Marker position={userPosition} icon={dotIcon('pulse-marker')} />}

    {buses.map((bus) => (
      <Marker
        key={bus.id}
        position={bus.position}
        icon={busIcon(bus.id === selectedBusId)}
        eventHandlers={{ click: () => onSelectBus?.(bus) }}
      />
    ))}
  </MapContainer>
  );
};

export default BusMap;
