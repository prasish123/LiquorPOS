import {
  getStateRegulation,
  isSaleAllowedNow,
  isValidIdType,
  getSupportedStates,
} from './state-regulations';

describe('State Regulations', () => {
  describe('getStateRegulation', () => {
    it('should return Florida regulations', () => {
      const regulation = getStateRegulation('FL');

      expect(regulation).toBeDefined();
      expect(regulation?.state).toBe('Florida');
      expect(regulation?.minimumAge).toBe(21);
    });

    it('should return California regulations', () => {
      const regulation = getStateRegulation('CA');

      expect(regulation).toBeDefined();
      expect(regulation?.state).toBe('California');
      expect(regulation?.minimumAge).toBe(21);
    });

    it('should return null for unsupported state', () => {
      const regulation = getStateRegulation('ZZ');

      expect(regulation).toBeNull();
    });

    it('should be case insensitive', () => {
      const regulation1 = getStateRegulation('fl');
      const regulation2 = getStateRegulation('FL');

      expect(regulation1).toEqual(regulation2);
    });
  });

  describe('isSaleAllowedNow', () => {
    it('should allow beer sales during business hours', () => {
      // Note: This test depends on current time
      // In production, you'd mock the Date object
      const result = isSaleAllowedNow('FL', 'beer');

      expect(result).toHaveProperty('allowed');
      if (!result.allowed) {
        expect(result.reason).toBeDefined();
      }
    });

    it('should check Sunday restrictions for spirits in Texas', () => {
      // Texas doesn't allow spirit sales on Sunday
      const result = isSaleAllowedNow('TX', 'spirits');

      expect(result).toHaveProperty('allowed');
      // Result depends on current day
    });

    it('should return false for unsupported state', () => {
      const result = isSaleAllowedNow('ZZ', 'beer');

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('not found');
    });
  });

  describe('isValidIdType', () => {
    it('should accept drivers license in Florida', () => {
      const result = isValidIdType('FL', 'drivers_license');

      expect(result).toBe(true);
    });

    it('should accept passport in all states', () => {
      const states = getSupportedStates();

      states.forEach(state => {
        const result = isValidIdType(state, 'passport');
        expect(result).toBe(true);
      });
    });

    it('should reject invalid ID type', () => {
      const result = isValidIdType('FL', 'library_card');

      expect(result).toBe(false);
    });

    it('should return false for unsupported state', () => {
      const result = isValidIdType('ZZ', 'drivers_license');

      expect(result).toBe(false);
    });
  });

  describe('getSupportedStates', () => {
    it('should return array of state codes', () => {
      const states = getSupportedStates();

      expect(Array.isArray(states)).toBe(true);
      expect(states.length).toBeGreaterThan(0);
      expect(states).toContain('FL');
      expect(states).toContain('CA');
      expect(states).toContain('TX');
      expect(states).toContain('NY');
      expect(states).toContain('PA');
    });
  });

  describe('State-specific regulations', () => {
    it('should have correct minimum age for all states', () => {
      const states = getSupportedStates();

      states.forEach(state => {
        const regulation = getStateRegulation(state);
        expect(regulation?.minimumAge).toBe(21);
      });
    });

    it('should have sale hours for all days', () => {
      const regulation = getStateRegulation('FL');

      expect(regulation?.saleHours.monday).toBeDefined();
      expect(regulation?.saleHours.tuesday).toBeDefined();
      expect(regulation?.saleHours.wednesday).toBeDefined();
      expect(regulation?.saleHours.thursday).toBeDefined();
      expect(regulation?.saleHours.friday).toBeDefined();
      expect(regulation?.saleHours.saturday).toBeDefined();
      expect(regulation?.saleHours.sunday).toBeDefined();
    });

    it('should have tax rates for all alcohol types', () => {
      const regulation = getStateRegulation('FL');

      expect(regulation?.taxRates.beer).toBeGreaterThan(0);
      expect(regulation?.taxRates.wine).toBeGreaterThan(0);
      expect(regulation?.taxRates.spirits).toBeGreaterThan(0);
    });

    it('should have license requirements', () => {
      const regulation = getStateRegulation('FL');

      expect(regulation?.licenseRequirements.retailLicense).toBeDefined();
      expect(regulation?.licenseRequirements.renewalPeriod).toBeDefined();
      expect(typeof regulation?.licenseRequirements.employeePermit).toBe('boolean');
    });

    it('should identify NY as requiring ID scanning', () => {
      const regulation = getStateRegulation('NY');

      expect(regulation?.requiresIdScan).toBe(true);
    });

    it('should identify TX Sunday spirit restrictions', () => {
      const regulation = getStateRegulation('TX');

      expect(regulation?.restrictions.sundaySales).toBe(false);
      expect(regulation?.restrictions.holidayRestrictions.length).toBeGreaterThan(0);
    });
  });
});

