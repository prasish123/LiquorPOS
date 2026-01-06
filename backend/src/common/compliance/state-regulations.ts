/**
 * State-Specific Alcohol Regulations
 *
 * This module contains comprehensive alcohol compliance rules for different US states.
 * Regulations are based on current state laws as of 2026.
 *
 * Sources:
 * - State Alcohol Beverage Control (ABC) agencies
 * - National Institute on Alcohol Abuse and Alcoholism (NIAAA)
 * - Alcohol and Tobacco Tax and Trade Bureau (TTB)
 */

export interface StateRegulation {
  state: string;
  stateCode: string;
  minimumAge: number;
  requiresIdScan: boolean;
  acceptableIdTypes: string[];
  saleHours: {
    monday: { start: string; end: string };
    tuesday: { start: string; end: string };
    wednesday: { start: string; end: string };
    thursday: { start: string; end: string };
    friday: { start: string; end: string };
    saturday: { start: string; end: string };
    sunday: { start: string; end: string };
  };
  restrictions: {
    beerWine: string[];
    spirits: string[];
    sundaySales: boolean;
    holidayRestrictions: string[];
  };
  taxRates: {
    beer: number; // per gallon
    wine: number; // per gallon
    spirits: number; // per gallon
  };
  licenseRequirements: {
    retailLicense: string;
    renewalPeriod: string; // e.g., "annual", "biennial"
    employeePermit: boolean;
  };
  specialRules: string[];
}

/**
 * Comprehensive state regulations database
 */
export const STATE_REGULATIONS: Record<string, StateRegulation> = {
  FL: {
    state: 'Florida',
    stateCode: 'FL',
    minimumAge: 21,
    requiresIdScan: false, // Recommended but not required
    acceptableIdTypes: [
      'drivers_license',
      'state_id',
      'passport',
      'military_id',
      'permanent_resident_card',
    ],
    saleHours: {
      monday: { start: '07:00', end: '24:00' },
      tuesday: { start: '07:00', end: '24:00' },
      wednesday: { start: '07:00', end: '24:00' },
      thursday: { start: '07:00', end: '24:00' },
      friday: { start: '07:00', end: '24:00' },
      saturday: { start: '07:00', end: '24:00' },
      sunday: { start: '07:00', end: '24:00' }, // Counties may restrict
    },
    restrictions: {
      beerWine: [
        'Can be sold in grocery stores and gas stations',
        'No restrictions on container size',
      ],
      spirits: [
        'Must be sold in licensed liquor stores',
        'Cannot be sold in grocery stores or gas stations',
      ],
      sundaySales: true, // Allowed statewide, but counties may restrict
      holidayRestrictions: [],
    },
    taxRates: {
      beer: 0.48, // per gallon
      wine: 2.25, // per gallon
      spirits: 6.5, // per gallon
    },
    licenseRequirements: {
      retailLicense: 'Series 2-APS (Alcoholic Beverages Package Store)',
      renewalPeriod: 'annual',
      employeePermit: false, // Not required for sales
    },
    specialRules: [
      'Retailers must check ID for anyone appearing under 30',
      'No sales to intoxicated persons',
      'Container must be sealed when sold',
      'Local ordinances may impose additional restrictions',
    ],
  },

  CA: {
    state: 'California',
    stateCode: 'CA',
    minimumAge: 21,
    requiresIdScan: false,
    acceptableIdTypes: ['drivers_license', 'state_id', 'passport', 'military_id'],
    saleHours: {
      monday: { start: '06:00', end: '02:00' }, // Until 2 AM next day
      tuesday: { start: '06:00', end: '02:00' },
      wednesday: { start: '06:00', end: '02:00' },
      thursday: { start: '06:00', end: '02:00' },
      friday: { start: '06:00', end: '02:00' },
      saturday: { start: '06:00', end: '02:00' },
      sunday: { start: '06:00', end: '02:00' },
    },
    restrictions: {
      beerWine: ['Can be sold in grocery stores', 'No Sunday restrictions'],
      spirits: ['Can be sold in grocery stores', 'No Sunday restrictions'],
      sundaySales: true,
      holidayRestrictions: [],
    },
    taxRates: {
      beer: 0.2,
      wine: 0.2,
      spirits: 3.3,
    },
    licenseRequirements: {
      retailLicense: 'Type 20 (Off-Sale Beer and Wine) or Type 21 (Off-Sale General)',
      renewalPeriod: 'annual',
      employeePermit: false,
    },
    specialRules: [
      'ABC agents conduct frequent compliance checks',
      'Retailers liable for sales to minors',
      'Must post ABC license prominently',
    ],
  },

  TX: {
    state: 'Texas',
    stateCode: 'TX',
    minimumAge: 21,
    requiresIdScan: false,
    acceptableIdTypes: [
      'drivers_license',
      'state_id',
      'passport',
      'military_id',
      'citizenship_certificate',
    ],
    saleHours: {
      monday: { start: '07:00', end: '24:00' },
      tuesday: { start: '07:00', end: '24:00' },
      wednesday: { start: '07:00', end: '24:00' },
      thursday: { start: '07:00', end: '24:00' },
      friday: { start: '07:00', end: '24:00' },
      saturday: { start: '07:00', end: '01:00' }, // Until 1 AM Sunday
      sunday: { start: '10:00', end: '24:00' }, // Beer/wine only before noon
    },
    restrictions: {
      beerWine: ['Can be sold in grocery stores', 'Sunday sales after 10 AM (beer/wine)'],
      spirits: [
        'Must be sold in licensed liquor stores',
        'No Sunday sales',
        "No sales on Thanksgiving, Christmas, New Year's Day",
      ],
      sundaySales: false, // For spirits
      holidayRestrictions: ['Thanksgiving', 'Christmas', "New Year's Day"],
    },
    taxRates: {
      beer: 0.2,
      wine: 0.2,
      spirits: 2.4,
    },
    licenseRequirements: {
      retailLicense: 'Package Store Permit (P)',
      renewalPeriod: 'annual',
      employeePermit: true, // Required for sellers
    },
    specialRules: [
      'Strict enforcement of Sunday restrictions',
      'Employees must be 18+ to sell',
      'Seller permit required for employees',
      'No sales after midnight except Saturday',
    ],
  },

  NY: {
    state: 'New York',
    stateCode: 'NY',
    minimumAge: 21,
    requiresIdScan: true, // Required in NYC
    acceptableIdTypes: ['drivers_license', 'state_id', 'passport', 'military_id'],
    saleHours: {
      monday: { start: '08:00', end: '24:00' },
      tuesday: { start: '08:00', end: '24:00' },
      wednesday: { start: '08:00', end: '24:00' },
      thursday: { start: '08:00', end: '24:00' },
      friday: { start: '08:00', end: '24:00' },
      saturday: { start: '08:00', end: '24:00' },
      sunday: { start: '12:00', end: '21:00' }, // Noon to 9 PM
    },
    restrictions: {
      beerWine: ['Can be sold in grocery stores', 'Sunday restrictions apply'],
      spirits: ['Must be sold in licensed liquor stores', 'No sales on Christmas Day'],
      sundaySales: true, // But with time restrictions
      holidayRestrictions: ['Christmas Day'],
    },
    taxRates: {
      beer: 0.14,
      wine: 0.3,
      spirits: 6.44,
    },
    licenseRequirements: {
      retailLicense: 'Off-Premises Liquor Store License',
      renewalPeriod: 'triennial',
      employeePermit: false,
    },
    specialRules: [
      'NYC requires ID scanning for all alcohol sales',
      'Strict penalties for violations',
      'No sales on election days at polling places',
      'Sunday sales limited hours',
    ],
  },

  PA: {
    state: 'Pennsylvania',
    stateCode: 'PA',
    minimumAge: 21,
    requiresIdScan: false,
    acceptableIdTypes: ['drivers_license', 'state_id', 'passport', 'military_id'],
    saleHours: {
      monday: { start: '07:00', end: '02:00' },
      tuesday: { start: '07:00', end: '02:00' },
      wednesday: { start: '07:00', end: '02:00' },
      thursday: { start: '07:00', end: '02:00' },
      friday: { start: '07:00', end: '02:00' },
      saturday: { start: '07:00', end: '02:00' },
      sunday: { start: '09:00', end: '02:00' },
    },
    restrictions: {
      beerWine: [
        'Beer can be sold in distributors, bottle shops, and some grocery stores',
        'Wine available at wine & spirits stores and some grocery stores',
      ],
      spirits: [
        'Must be sold at state-operated Fine Wine & Good Spirits stores',
        'Private retailers with special licenses',
      ],
      sundaySales: true,
      holidayRestrictions: [],
    },
    taxRates: {
      beer: 0.08,
      wine: 0.0, // No state excise tax on wine
      spirits: 7.24, // Highest in the nation
    },
    licenseRequirements: {
      retailLicense: 'Retail Liquor License (R)',
      renewalPeriod: 'biennial',
      employeePermit: false,
    },
    specialRules: [
      'State-controlled liquor system',
      'Complex licensing structure',
      'Sunday sales require special permit',
    ],
  },
};

/**
 * Get regulation for a specific state
 */
export function getStateRegulation(stateCode: string): StateRegulation | null {
  return STATE_REGULATIONS[stateCode.toUpperCase()] || null;
}

/**
 * Check if alcohol sales are allowed at current time
 */
export function isSaleAllowedNow(
  stateCode: string,
  productType: 'beer' | 'wine' | 'spirits',
): { allowed: boolean; reason?: string } {
  const regulation = getStateRegulation(stateCode);
  if (!regulation) {
    return { allowed: false, reason: 'State regulations not found' };
  }

  const now = new Date();
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayOfWeek = dayNames[now.getDay()] as keyof StateRegulation['saleHours'];
  const currentTime = now.toTimeString().slice(0, 5); // HH:MM format

  const hours = regulation.saleHours[dayOfWeek];

  // Check if current time is within allowed hours
  if (currentTime < hours.start || currentTime > hours.end) {
    return {
      allowed: false,
      reason: `Sales not allowed at this time. Hours: ${hours.start} - ${hours.end}`,
    };
  }

  // Check Sunday restrictions for spirits
  if (dayOfWeek === 'sunday' && productType === 'spirits' && !regulation.restrictions.sundaySales) {
    return {
      allowed: false,
      reason: 'Spirit sales not allowed on Sunday in this state',
    };
  }

  // Check holiday restrictions
  const today = now.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
  });
  if (regulation.restrictions.holidayRestrictions.some((holiday) => today.includes(holiday))) {
    return {
      allowed: false,
      reason: 'Sales not allowed on this holiday',
    };
  }

  return { allowed: true };
}

/**
 * Validate ID type for state
 */
export function isValidIdType(stateCode: string, idType: string): boolean {
  const regulation = getStateRegulation(stateCode);
  if (!regulation) return false;

  return regulation.acceptableIdTypes.includes(idType);
}

/**
 * Get all supported states
 */
export function getSupportedStates(): string[] {
  return Object.keys(STATE_REGULATIONS);
}
