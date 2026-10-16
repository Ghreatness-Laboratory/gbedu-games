// Jackpot Core Game Engine (Pure, Deterministic, and Unit-Tested)
import { Shape } from '@gbedu/shared';
import {
  JackpotCard,
  JackpotPlayer,
  JackpotWinCondition,
  JackpotHandProgress,
} from './types';

export const BASIC_SHAPES: Shape[] = ['circle', 'triangle', 'cross', 'square', 'star'];

export const SHAPE_NAMES: Record<Shape, string> = {
  circle: 'Circles',
  triangle: 'Triangles',
  cross: 'Crosses',
  square: 'Squares',
  star: 'Stars',
  whot: 'Whot Wilds',
};

export const SHAPE_SYMBOLS: Record<Shape, string> = {
  circle: '●',
  triangle: '▲',
  cross: '✚',
  square: '■',
  star: '★',
  whot: '👑',
};

// 1. Deck Creation (from standard Nigerian Whot deck)
export function createJackpotDeck(allowWhotWilds: boolean = true): JackpotCard[] {
  const deck: JackpotCard[] = [];

  const addShapeCards = (shape: Shape, numbers: number[]) => {
    numbers.forEach((num, idx) => {
      deck.push({
        id: `${shape}_${num}_${idx}`,
        shape,
        number: num,
      });
    });
  };

  // Standard Whot shapes distribution
  addShapeCards('circle', [1, 2, 3, 4, 5, 7, 8, 10, 11, 12, 13, 14]); // 12
  addShapeCards('triangle', [1, 2, 3, 4, 5, 7, 8, 10, 11, 12, 13, 14]); // 12
  addShapeCards('cross', [1, 2, 3, 5, 7, 10, 11, 13, 14]); // 9
  addShapeCards('square', [1, 2, 3, 5, 7, 10, 11, 13, 14]); // 9
  addShapeCards('star', [1, 2, 3, 4, 5, 7, 8]); // 7

  if (allowWhotWilds) {
    for (let i = 0; i < 5; i++) {
      deck.push({
        id: `whot_20_${i}`,
        shape: 'whot',
        number: 20,
      });
    }
  }

  return deck;
}

// 2. Fisher-Yates Deck Shuffle
export function shuffleJackpotDeck(
  deck: JackpotCard[],
  rng: () => number = Math.random
): JackpotCard[] {
  const result = [...deck];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// 3. Count Shapes in Hand
export function countHandShapes(hand: JackpotCard[]): {
  counts: Record<Shape, number>;
  wildCount: number;
} {
  const counts: Record<Shape, number> = {
    circle: 0,
    triangle: 0,
    cross: 0,
    square: 0,
    star: 0,
    whot: 0,
  };

  hand.forEach((c) => {
    if (counts[c.shape] !== undefined) {
      counts[c.shape]++;
    }
  });

  return { counts, wildCount: counts.whot };
}

// 4. Check Winning Hand
// Match Set: All 5 cards share the same shape (Whot wilds substitute any shape)
// Collect All: Hand holds one of each of the 5 shapes (circle, triangle, cross, square, star)
export function checkWinningHand(
  hand: JackpotCard[],
  condition: JackpotWinCondition = 'match_set',
  allowWhotWilds: boolean = true
): {
  isWin: boolean;
  winningShape?: Shape;
  details: string;
} {
  if (!hand || hand.length < 5) {
    return { isWin: false, details: 'Need 5 cards in hand' };
  }

  const { counts, wildCount } = countHandShapes(hand);
  const effectiveWilds = allowWhotWilds ? wildCount : 0;

  if (condition === 'match_set') {
    // Check if all 5 cards are pure Whot cards
    if (effectiveWilds >= 5) {
      return {
        isWin: true,
        winningShape: 'whot',
        details: 'JACKPOT! 5 Whot Wild Cards!',
      };
    }

    // Check each basic shape
    for (const shape of BASIC_SHAPES) {
      const matchCount = counts[shape] + effectiveWilds;
      if (matchCount >= 5) {
        return {
          isWin: true,
          winningShape: shape,
          details: `JACKPOT! 5 Matching ${SHAPE_NAMES[shape]}!`,
        };
      }
    }

    return { isWin: false, details: 'Hand is not 5 of a kind' };
  } else {
    // condition === 'collect_all'
    // Count distinct basic shapes present
    const distinctPresent = BASIC_SHAPES.filter((s) => counts[s] > 0);
    const missingShapes = BASIC_SHAPES.filter((s) => counts[s] === 0);

    if (distinctPresent.length + effectiveWilds >= 5) {
      return {
        isWin: true,
        details: 'JACKPOT! Collected all 5 unique shapes!',
      };
    }

    return {
      isWin: false,
      details: `Missing: ${missingShapes.map((s) => SHAPE_NAMES[s]).join(', ')}`,
    };
  }
}

// 5. Calculate Hand Progress Helper (e.g. 4/5 Stars)
export function getHandProgress(
  hand: JackpotCard[],
  condition: JackpotWinCondition = 'match_set',
  allowWhotWilds: boolean = true
): JackpotHandProgress {
  const { counts, wildCount } = countHandShapes(hand);
  const effectiveWilds = allowWhotWilds ? wildCount : 0;
  const winCheck = checkWinningHand(hand, condition, allowWhotWilds);

  if (condition === 'match_set') {
    // Find shape with maximum current match
    let bestShape: Shape = 'circle';
    let maxMatches = -1;

    for (const shape of BASIC_SHAPES) {
      const total = counts[shape] + effectiveWilds;
      if (total > maxMatches) {
        maxMatches = total;
        bestShape = shape;
      }
    }

    // If pure wilds
    if (effectiveWilds > maxMatches) {
      maxMatches = effectiveWilds;
      bestShape = 'whot';
    }

    const currentCount = Math.min(5, Math.max(1, maxMatches));
    const symbol = SHAPE_SYMBOLS[bestShape];
    const name = SHAPE_NAMES[bestShape];

    return {
      isWin: winCheck.isWin,
      label: winCheck.isWin
        ? `JACKPOT! 5/5 ${name} ${symbol}`
        : `${currentCount}/5 ${name} ${symbol}`,
      currentCount,
      totalNeeded: 5,
      targetShape: bestShape,
      shapeCounts: counts,
      wildCount: effectiveWilds,
    };
  } else {
    // collect_all
    const distinctBasicCount = BASIC_SHAPES.filter((s) => counts[s] > 0).length;
    const currentCount = Math.min(5, distinctBasicCount + effectiveWilds);

    return {
      isWin: winCheck.isWin,
      label: winCheck.isWin
        ? 'JACKPOT! 5/5 All Shapes Complete!'
        : `${currentCount}/5 Unique Shapes`,
      currentCount,
      totalNeeded: 5,
      shapeCounts: counts,
      wildCount: effectiveWilds,
    };
  }
}

// 6. Execute Simultaneous Card Passing Step
// Every player passes their chosen card (or auto-picked card) to their neighbor simultaneously
// Respects "Exposed" mandatory shape passing and resets transient statuses (exposed, skipped, frozen)
export function executeSimultaneousPass(
  players: JackpotPlayer[],
  direction: 'left' | 'right' = 'left',
  condition: JackpotWinCondition = 'match_set',
  allowWhotWilds: boolean = true
): {
  updatedPlayers: JackpotPlayer[];
  passedSummary: { fromPlayerId: string; toPlayerId: string; card: JackpotCard }[];
} {
  const n = players.length;
  if (n < 2) return { updatedPlayers: players, passedSummary: [] };

  // 1. Ensure every player has a card selected to pass, strictly enforcing Exposed rule
  const cardsToPass: JackpotCard[] = [];

  players.forEach((p) => {
    let cardToPass: JackpotCard;

    // Check if player is exposed: must pass card of exposedShape if held
    const exposedShape = p.isExposed ? p.exposedShape : null;
    const heldExposedCard = exposedShape
      ? p.hand.find((c) => c.shape === exposedShape || (allowWhotWilds && c.shape === 'whot'))
      : null;

    if (heldExposedCard) {
      // Must pass this card!
      if (p.selectedCardId) {
        const selected = p.hand.find((c) => c.id === p.selectedCardId);
        if (selected && (selected.shape === exposedShape || (allowWhotWilds && selected.shape === 'whot'))) {
          cardToPass = selected;
        } else {
          // Player tried to pick non-exposed card; forced to pass exposed card
          cardToPass = heldExposedCard;
        }
      } else {
        cardToPass = heldExposedCard;
      }
    } else if (p.selectedCardId) {
      const found = p.hand.find((c) => c.id === p.selectedCardId);
      cardToPass = found || p.hand[0];
    } else {
      // Auto-pick: choose card that least contributes to goal
      cardToPass = autoPickCardToPass(p.hand, condition, allowWhotWilds);
    }

    cardsToPass.push(cardToPass);
  });

  const passedSummary: { fromPlayerId: string; toPlayerId: string; card: JackpotCard }[] = [];

  // 2. Shift cards simultaneously
  const updatedPlayers = players.map((player, i) => {
    const cardPassedByThisPlayer = cardsToPass[i];

    // Determine who passed to this player
    // If direction is 'left': player i passes to (i + 1) % n, so player i receives from (i - 1 + n) % n
    // If direction is 'right': player i passes to (i - 1 + n) % n, so player i receives from (i + 1) % n
    const donorIndex = direction === 'left' ? (i - 1 + n) % n : (i + 1) % n;
    const recipientIndex = direction === 'left' ? (i + 1) % n : (i - 1 + n) % n;

    const receivedCard = cardsToPass[donorIndex];

    passedSummary.push({
      fromPlayerId: player.id,
      toPlayerId: players[recipientIndex].id,
      card: cardPassedByThisPlayer,
    });

    // Remove passed card, add received card (strictly maintaining 5 cards)
    const nextHand = player.hand.filter((c) => c.id !== cardPassedByThisPlayer.id);
    nextHand.push(receivedCard);

    return {
      ...player,
      hand: nextHand,
      cardCount: nextHand.length,
      hasLockedIn: false,
      selectedCardId: null,
      passedCard: cardPassedByThisPlayer,
      receivedCard: receivedCard,
      // Clear transient round/step statuses
      isSkipped: false,
      isExposed: false,
      exposedShape: null,
      isFrozen: false,
    };
  });

  return { updatedPlayers, passedSummary };
}

// 7. Auto-Pick Fallback: selects the card that least aligns with current strategy
export function autoPickCardToPass(
  hand: JackpotCard[],
  condition: JackpotWinCondition = 'match_set',
  allowWhotWilds: boolean = true,
  mandatoryShape: Shape | null = null
): JackpotCard {
  if (hand.length === 0) {
    return { id: 'empty', shape: 'circle' };
  }

  // If a mandatory shape is exposed, pass it!
  if (mandatoryShape) {
    const matching = hand.find(
      (c) => c.shape === mandatoryShape || (allowWhotWilds && c.shape === 'whot')
    );
    if (matching) return matching;
  }

  const { counts } = countHandShapes(hand);

  if (condition === 'match_set') {
    // Find target shape (shape with the most cards, excluding pure whots)
    let bestShape: Shape = 'circle';
    let max = -1;
    for (const shape of BASIC_SHAPES) {
      if (counts[shape] > max) {
        max = counts[shape];
        bestShape = shape;
      }
    }

    // Never discard Whot wilds if they are active
    const nonTargetNonWild = hand.filter(
      (c) => c.shape !== bestShape && (allowWhotWilds ? c.shape !== 'whot' : true)
    );

    if (nonTargetNonWild.length > 0) {
      // Pick the least frequent shape among non-targets
      return nonTargetNonWild[0];
    }

    // If all cards match or are wilds, pass random card
    return hand[0];
  } else {
    // collect_all: discard duplicate shapes first
    for (const shape of BASIC_SHAPES) {
      if (counts[shape] > 1) {
        const dup = hand.find((c) => c.shape === shape);
        if (dup) return dup;
      }
    }

    // If no duplicates, pass any non-wild card
    const nonWild = hand.filter((c) => (allowWhotWilds ? c.shape !== 'whot' : true));
    return nonWild[0] || hand[0];
  }
}

// 8. Validate Jackpot Call & Apply Points
export function validateJackpotCall(
  callerId: string,
  players: JackpotPlayer[],
  condition: JackpotWinCondition = 'match_set',
  allowWhotWilds: boolean = true
): {
  isValid: boolean;
  caller: JackpotPlayer | undefined;
  winnerHand?: JackpotCard[];
  error?: string;
} {
  const caller = players.find((p) => p.id === callerId);
  if (!caller) {
    return { isValid: false, caller: undefined, error: 'Caller not found' };
  }

  const check = checkWinningHand(caller.hand, condition, allowWhotWilds);

  if (check.isWin) {
    // Award 5 competition points for winning the round!
    caller.points = (caller.points || 0) + 5;
    caller.score = (caller.score || 0) + 1;

    return {
      isValid: true,
      caller,
      winnerHand: caller.hand,
    };
  } else {
    // False Call Penalty: caller loses their next pass step (isSkipped = true)
    caller.isSkipped = true;
    return {
      isValid: false,
      caller,
      error: 'False alarm! Your hand does not meet the winning condition.',
    };
  }
}

// 9. Suspect Mechanic: Accusation Validation
// Accused must hold at least `threshold` (default 3) cards of named shape (Whot wilds count)
export function validateSuspectAccusation(
  accusedHand: JackpotCard[],
  shape: Shape,
  threshold: number = 3,
  allowWhotWilds: boolean = true
): {
  isCorrect: boolean;
  matchingCount: number;
} {
  const { counts, wildCount } = countHandShapes(accusedHand);
  const effectiveWilds = allowWhotWilds ? wildCount : 0;
  const directCount = counts[shape] || 0;
  const matchingCount = directCount + effectiveWilds;

  return {
    isCorrect: matchingCount >= threshold,
    matchingCount,
  };
}

// 10. Check if Player Can Accuse (Token & 5s Cooldown & Single Active Accused Validation)
export function canPlayerAccuse(
  accuser: JackpotPlayer,
  accused: JackpotPlayer,
  currentTime: number = Date.now(),
  cooldownMs: number = 5000
): { canAccuse: boolean; reason?: string } {
  if (accuser.id === accused.id) {
    return { canAccuse: false, reason: 'You cannot accuse yourself' };
  }
  if (accuser.suspectTokens <= 0) {
    return { canAccuse: false, reason: 'No Suspect tokens remaining this round' };
  }
  if (accused.isExposed) {
    return { canAccuse: false, reason: `${accused.displayName} is already exposed!` };
  }
  if (accuser.lastSuspectTimestamp && currentTime - accuser.lastSuspectTimestamp < cooldownMs) {
    const remainingSec = Math.ceil((cooldownMs - (currentTime - accuser.lastSuspectTimestamp)) / 1000);
    return { canAccuse: false, reason: `Please wait ${remainingSec}s cooldown before suspecting again` };
  }
  return { canAccuse: true };
}

// 11. Apply Suspect Result
// Correct: Accuser +1 pt & keeps token; Accused is Exposed (must pass that shape)
// Wrong: Accuser spends token & gets skipped next pass step; Accused suffers no penalty
export function applySuspectResult(
  accuser: JackpotPlayer,
  accused: JackpotPlayer,
  shape: Shape,
  isCorrect: boolean,
  currentTime: number = Date.now()
): {
  updatedAccuser: JackpotPlayer;
  updatedAccused: JackpotPlayer;
} {
  const updatedAccuser = { ...accuser, lastSuspectTimestamp: currentTime };
  const updatedAccused = { ...accused };

  if (isCorrect) {
    updatedAccuser.points = (updatedAccuser.points || 0) + 1;
    updatedAccused.isExposed = true;
    updatedAccused.exposedShape = shape;
  } else {
    updatedAccuser.suspectTokens = Math.max(0, updatedAccuser.suspectTokens - 1);
    updatedAccuser.isSkipped = true;
  }

  return { updatedAccuser, updatedAccused };
}

// 12. Freeze Card Mechanic Validation & Application
export function validateFreezeCard(
  freezer: JackpotPlayer,
  target: JackpotPlayer
): { canFreeze: boolean; reason?: string } {
  if (freezer.id === target.id) {
    return { canFreeze: false, reason: 'Cannot freeze yourself' };
  }
  if (freezer.suspectTokens <= 0) {
    return { canFreeze: false, reason: 'Freezing costs 1 Suspect token' };
  }
  if (freezer.hasUsedFreeze) {
    return { canFreeze: false, reason: 'Freeze card already used this round' };
  }
  if (target.isFrozen) {
    return { canFreeze: false, reason: 'Player is already frozen' };
  }
  return { canFreeze: true };
}

export function applyFreezeCard(
  freezer: JackpotPlayer,
  target: JackpotPlayer
): { updatedFreezer: JackpotPlayer; updatedTarget: JackpotPlayer } {
  const updatedFreezer = {
    ...freezer,
    suspectTokens: Math.max(0, freezer.suspectTokens - 1),
    hasUsedFreeze: true,
  };
  const updatedTarget = {
    ...target,
    isFrozen: true,
  };
  return { updatedFreezer, updatedTarget };
}

// 13. Match Winner Check by Points (First to 10, 15, or 20 points)
export function checkMatchWinnerByPoints(
  players: JackpotPlayer[],
  targetPoints: number = 15
): {
  isGameOver: boolean;
  winner: JackpotPlayer | null;
} {
  const candidates = players.filter((p) => (p.points || 0) >= targetPoints);
  if (candidates.length === 0) {
    return { isGameOver: false, winner: null };
  }

  // Pick highest points
  candidates.sort((a, b) => (b.points || 0) - (a.points || 0));
  return { isGameOver: true, winner: candidates[0] };
}
