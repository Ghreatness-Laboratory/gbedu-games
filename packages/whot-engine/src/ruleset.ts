import { Ruleset, PresetName } from '@gbedu/shared';

export const DEFAULT_RULESET: Ruleset = {
  startingCards: 6,
  pickTwoPassing: true,
  pickThreePassing: true,
  crossPassing: false,
  whot20DefendsAgainstPicks: false,
  specials: {
    holdOn: true,
    pickTwo: true,
    pickThree: true,
    suspension: true,
    generalMarket: true,
    whot: true,
  },
  goOutOnSpecial: true,
  calloutsRequired: true,
  calloutPenalty: 2,
  turnTimerSec: 0,
  reconnectTimeoutSec: 60,
};

export const PRESETS: Record<Exclude<PresetName, 'custom'>, Ruleset> = {
  naija_classic: {
    ...DEFAULT_RULESET,
  },
  quick_game: {
    ...DEFAULT_RULESET,
    startingCards: 4,
    turnTimerSec: 15,
    reconnectTimeoutSec: 30,
  },
  no_specials: {
    ...DEFAULT_RULESET,
    pickTwoPassing: false,
    pickThreePassing: false,
    crossPassing: false,
    whot20DefendsAgainstPicks: false,
    specials: {
      holdOn: false,
      pickTwo: false,
      pickThree: false,
      suspension: false,
      generalMarket: false,
      whot: false,
    },
  },
};

const ALLOWED_RULESET_KEYS = new Set([
  'startingCards',
  'pickTwoPassing',
  'pickThreePassing',
  'crossPassing',
  'whot20DefendsAgainstPicks',
  'specials',
  'goOutOnSpecial',
  'calloutsRequired',
  'calloutPenalty',
  'turnTimerSec',
  'reconnectTimeoutSec',
]);

const ALLOWED_SPECIALS_KEYS = new Set([
  'holdOn',
  'pickTwo',
  'pickThree',
  'suspension',
  'generalMarket',
  'whot',
]);

export function validateRuleset(input: unknown): { valid: boolean; ruleset: Ruleset; error?: string } {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { valid: false, ruleset: DEFAULT_RULESET, error: 'Ruleset must be an object' };
  }

  const obj = input as Record<string, unknown>;

  // Check for unknown keys
  for (const key of Object.keys(obj)) {
    if (!ALLOWED_RULESET_KEYS.has(key)) {
      return { valid: false, ruleset: DEFAULT_RULESET, error: `Unknown ruleset key: ${key}` };
    }
  }

  // Validate startingCards (4 to 8)
  const startingCards = obj.startingCards !== undefined ? Number(obj.startingCards) : DEFAULT_RULESET.startingCards;
  if (!Number.isInteger(startingCards) || startingCards < 4 || startingCards > 8) {
    return { valid: false, ruleset: DEFAULT_RULESET, error: 'startingCards must be an integer between 4 and 8' };
  }

  // Validate calloutPenalty (1 to 5)
  const calloutPenalty = obj.calloutPenalty !== undefined ? Number(obj.calloutPenalty) : DEFAULT_RULESET.calloutPenalty;
  if (!Number.isInteger(calloutPenalty) || calloutPenalty < 1 || calloutPenalty > 5) {
    return { valid: false, ruleset: DEFAULT_RULESET, error: 'calloutPenalty must be an integer between 1 and 5' };
  }

  // Validate turnTimerSec (0, 15, 30, 60)
  const turnTimerSec = obj.turnTimerSec !== undefined ? Number(obj.turnTimerSec) : DEFAULT_RULESET.turnTimerSec;
  if (![0, 15, 30, 60].includes(turnTimerSec)) {
    return { valid: false, ruleset: DEFAULT_RULESET, error: 'turnTimerSec must be 0, 15, 30, or 60' };
  }

  // Validate reconnectTimeoutSec (10 to 300)
  const reconnectTimeoutSec = obj.reconnectTimeoutSec !== undefined ? Number(obj.reconnectTimeoutSec) : DEFAULT_RULESET.reconnectTimeoutSec;
  if (!Number.isInteger(reconnectTimeoutSec) || reconnectTimeoutSec < 10 || reconnectTimeoutSec > 300) {
    return { valid: false, ruleset: DEFAULT_RULESET, error: 'reconnectTimeoutSec must be between 10 and 300 seconds' };
  }

  // Validate specials object
  const specialsRaw = obj.specials !== undefined ? obj.specials : DEFAULT_RULESET.specials;
  if (typeof specialsRaw !== 'object' || specialsRaw === null || Array.isArray(specialsRaw)) {
    return { valid: false, ruleset: DEFAULT_RULESET, error: 'specials must be an object' };
  }
  const specialsObj = specialsRaw as Record<string, unknown>;
  for (const key of Object.keys(specialsObj)) {
    if (!ALLOWED_SPECIALS_KEYS.has(key)) {
      return { valid: false, ruleset: DEFAULT_RULESET, error: `Unknown specials key: ${key}` };
    }
  }

  const result: Ruleset = {
    startingCards,
    pickTwoPassing: obj.pickTwoPassing !== undefined ? Boolean(obj.pickTwoPassing) : DEFAULT_RULESET.pickTwoPassing,
    pickThreePassing: obj.pickThreePassing !== undefined ? Boolean(obj.pickThreePassing) : DEFAULT_RULESET.pickThreePassing,
    crossPassing: obj.crossPassing !== undefined ? Boolean(obj.crossPassing) : DEFAULT_RULESET.crossPassing,
    whot20DefendsAgainstPicks: obj.whot20DefendsAgainstPicks !== undefined ? Boolean(obj.whot20DefendsAgainstPicks) : DEFAULT_RULESET.whot20DefendsAgainstPicks,
    specials: {
      holdOn: specialsObj.holdOn !== undefined ? Boolean(specialsObj.holdOn) : DEFAULT_RULESET.specials.holdOn,
      pickTwo: specialsObj.pickTwo !== undefined ? Boolean(specialsObj.pickTwo) : DEFAULT_RULESET.specials.pickTwo,
      pickThree: specialsObj.pickThree !== undefined ? Boolean(specialsObj.pickThree) : DEFAULT_RULESET.specials.pickThree,
      suspension: specialsObj.suspension !== undefined ? Boolean(specialsObj.suspension) : DEFAULT_RULESET.specials.suspension,
      generalMarket: specialsObj.generalMarket !== undefined ? Boolean(specialsObj.generalMarket) : DEFAULT_RULESET.specials.generalMarket,
      whot: specialsObj.whot !== undefined ? Boolean(specialsObj.whot) : DEFAULT_RULESET.specials.whot,
    },
    goOutOnSpecial: obj.goOutOnSpecial !== undefined ? Boolean(obj.goOutOnSpecial) : DEFAULT_RULESET.goOutOnSpecial,
    calloutsRequired: obj.calloutsRequired !== undefined ? Boolean(obj.calloutsRequired) : DEFAULT_RULESET.calloutsRequired,
    calloutPenalty,
    turnTimerSec,
    reconnectTimeoutSec,
  };

  return { valid: true, ruleset: result };
}

function areRulesetsEqual(a: Ruleset, b: Ruleset): boolean {
  return (
    a.startingCards === b.startingCards &&
    a.pickTwoPassing === b.pickTwoPassing &&
    a.pickThreePassing === b.pickThreePassing &&
    a.crossPassing === b.crossPassing &&
    a.whot20DefendsAgainstPicks === b.whot20DefendsAgainstPicks &&
    a.goOutOnSpecial === b.goOutOnSpecial &&
    a.calloutsRequired === b.calloutsRequired &&
    a.calloutPenalty === b.calloutPenalty &&
    a.turnTimerSec === b.turnTimerSec &&
    a.reconnectTimeoutSec === b.reconnectTimeoutSec &&
    a.specials.holdOn === b.specials.holdOn &&
    a.specials.pickTwo === b.specials.pickTwo &&
    a.specials.pickThree === b.specials.pickThree &&
    a.specials.suspension === b.specials.suspension &&
    a.specials.generalMarket === b.specials.generalMarket &&
    a.specials.whot === b.specials.whot
  );
}

export function detectPreset(ruleset: Ruleset): PresetName {
  if (areRulesetsEqual(ruleset, PRESETS.naija_classic)) return 'naija_classic';
  if (areRulesetsEqual(ruleset, PRESETS.quick_game)) return 'quick_game';
  if (areRulesetsEqual(ruleset, PRESETS.no_specials)) return 'no_specials';
  return 'custom';
}
