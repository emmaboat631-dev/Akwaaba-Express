import { describe, it, expect } from 'vitest';
import { driverInfoFor } from './driverInfo';

describe('driverInfoFor', () => {
  it('returns a generic fallback for a null trip', () => {
    expect(driverInfoFor(null)).toEqual({ name: 'Driver', phone: '', synthesized: true });
  });

  it('returns a generic fallback for undefined', () => {
    expect(driverInfoFor(undefined).name).toBe('Driver');
  });

  describe('real driver attached', () => {
    it('uses the driver name and phone from the trip', () => {
      const info = driverInfoFor({ id: 'bus_1', driverName: 'Kwame Asare', driverPhone: '024 111 2222' });
      expect(info.name).toBe('Kwame Asare');
      expect(info.phone).toBe('024 111 2222');
      expect(info.synthesized).toBe(false);
    });

    it('passes through vehicle model and colour', () => {
      const info = driverInfoFor({
        id: 'bus_1', driverName: 'Ama Serwaa',
        vehicleModel: 'Toyota Coaster', vehicleColor: 'White',
      });
      expect(info.vehicleModel).toBe('Toyota Coaster');
      expect(info.vehicleColor).toBe('White');
    });

    it('defaults the name when only a phone is present', () => {
      const info = driverInfoFor({ id: 'bus_1', driverPhone: '020 555 0000' });
      expect(info.name).toBe('Driver');
      expect(info.phone).toBe('020 555 0000');
      expect(info.synthesized).toBe(false);
    });

    it('defaults the phone to empty when only a name is present', () => {
      const info = driverInfoFor({ id: 'bus_1', driverName: 'Yaw Boateng' });
      expect(info.phone).toBe('');
    });

    it('nulls vehicle fields when the trip omits them', () => {
      const info = driverInfoFor({ id: 'bus_1', driverName: 'Kofi Mensah' });
      expect(info.vehicleModel).toBeNull();
      expect(info.vehicleColor).toBeNull();
    });
  });

  describe('synthesized driver', () => {
    it('marks the info as synthesized when no driver is attached', () => {
      expect(driverInfoFor({ id: 'bus_7' }).synthesized).toBe(true);
    });

    it('is deterministic for the same bus id', () => {
      const a = driverInfoFor({ id: 'bus_42' });
      const b = driverInfoFor({ id: 'bus_42' });
      expect(a.name).toBe(b.name);
      expect(a.phone).toBe(b.phone);
    });

    it('produces a two-part name', () => {
      const { name } = driverInfoFor({ id: 'bus_9' });
      expect(name.split(' ')).toHaveLength(2);
    });

    it('produces a Ghana mobile number', () => {
      const { phone } = driverInfoFor({ id: 'bus_9' });
      expect(phone).toMatch(/^0(20|24|26|27|50|54|55|59) \d{3} \d{4}$/);
    });

    it('varies across different bus ids', () => {
      const ids = ['bus_1', 'bus_2', 'bus_3', 'bus_4', 'bus_5', 'bus_6'];
      const names = new Set(ids.map((id) => driverInfoFor({ id }).name));
      expect(names.size).toBeGreaterThan(1);
    });

    it('handles a trip with no id', () => {
      const info = driverInfoFor({});
      expect(info.name).toBeTruthy();
      expect(info.synthesized).toBe(true);
    });

    it('nulls the vehicle fields', () => {
      const info = driverInfoFor({ id: 'bus_3' });
      expect(info.vehicleModel).toBeNull();
      expect(info.vehicleColor).toBeNull();
    });
  });
});
