import { describe, it, expect } from 'vitest';
import {
  checkWinningHand,
  createJackpotDeck,
  executeSimultaneousPass,
  validateJackpotCall,
  getHandProgress,
  validateSuspectAccusation,
  applySuspectResult,
  canPlayerAccuse,
  checkMatchWinnerByPoints,
  validateFreezeCard,
  applyFreezeCard,
} from './engine';
import { JackpotCard, JackpotPlayer } from './types';

describe('Jackpot Hand Checker', () => {
  it('should detect match_set win without wilds (5 circles)', () => {
    const hand: JackpotCard[] = [
      { id: 'c1', shape: 'circle' },
      { id: 'c2', shape: 'circle' },
      { id: 'c3', shape: 'circle' },
      { id: 'c4', shape: 'circle' },
      { id: 'c5', shape: 'circle' },
    ];
    const res = checkWinningHand(hand, 'match_set', false);
    expect(res.isWin).toBe(true);
    expect(res.winningShape).toBe('circle');
  });

  it('should fail match_set when cards do not match', () => {
    const hand: JackpotCard[] = [
      { id: 'c1', shape: 'circle' },
      { id: 'c2', shape: 'circle' },
      { id: 'c3', shape: 'circle' },
      { id: 'c4', shape: 'triangle' },
      { id: 'c5', shape: 'star' },
    ];
    const res = checkWinningHand(hand, 'match_set', false);
    expect(res.isWin).toBe(false);
  });

  it('should detect match_set win with Whot 20 wild cards', () => {
    // 3 stars + 2 whot wilds = 5 stars!
    const hand: JackpotCard[] = [
      { id: 's1', shape: 'star' },
      { id: 's2', shape: 'star' },
      { id: 's3', shape: 'star' },
      { id: 'w1', shape: 'whot' },
      { id: 'w2', shape: 'whot' },
    ];
    const res = checkWinningHand(hand, 'match_set', true);
    expect(res.isWin).toBe(true);
    expect(res.winningShape).toBe('star');

    // With wilds off, 3 stars + 2 whot is NOT a win
    const resNoWilds = checkWinningHand(hand, 'match_set', false);
    expect(resNoWilds.isWin).toBe(false);
  });

  it('should detect collect_all win without wilds (one of each shape)', () => {
    const hand: JackpotCard[] = [
      { id: 'c1', shape: 'circle' },
      { id: 't1', shape: 'triangle' },
      { id: 'cr1', shape: 'cross' },
      { id: 'sq1', shape: 'square' },
      { id: 'st1', shape: 'star' },
    ];
    const res = checkWinningHand(hand, 'collect_all', false);
    expect(res.isWin).toBe(true);
  });

  it('should detect collect_all win with Whot wild filling in missing shape', () => {
    // Has circle, triangle, cross, square + 1 whot wild (substitutes star)
    const hand: JackpotCard[] = [
      { id: 'c1', shape: 'circle' },
      { id: 't1', shape: 'triangle' },
      { id: 'cr1', shape: 'cross' },
      { id: 'sq1', shape: 'square' },
      { id: 'w1', shape: 'whot' },
    ];
    const res = checkWinningHand(hand, 'collect_all', true);
    expect(res.isWin).toBe(true);

    // With wilds off, this is not a win
    const resNoWilds = checkWinningHand(hand, 'collect_all', false);
    expect(resNoWilds.isWin).toBe(false);
  });
});

const createMockPlayer = (overrides: Partial<JackpotPlayer>): JackpotPlayer => ({
  id: 'p1',
  userId: 'p1',
  displayName: 'Player',
  username: 'player',
  avatarId: 'avatar-01',
  isBot: false,
  isHost: false,
  seatIndex: 0,
  hand: [],
  cardCount: 5,
  hasLockedIn: false,
  selectedCardId: null,
  passedCard: null,
  receivedCard: null,
  score: 0,
  points: 0,
  suspectTokens: 2,
  isExposed: false,
  exposedShape: null,
  isSkipped: false,
  isFrozen: false,
  hasUsedFreeze: false,
  isConnected: true,
  ...overrides,
});

describe('Simultaneous Pass Logic', () => {
  it('should pass cards simultaneously around circle in left direction', () => {
    const players: JackpotPlayer[] = [
      createMockPlayer({
        id: 'p1',
        displayName: 'Player 1',
        isHost: true,
        hand: [
          { id: 'c1', shape: 'circle' },
          { id: 'c2', shape: 'circle' },
          { id: 'c3', shape: 'circle' },
          { id: 'c4', shape: 'circle' },
          { id: 'pass_p1', shape: 'triangle' },
        ],
        hasLockedIn: true,
        selectedCardId: 'pass_p1',
      }),
      createMockPlayer({
        id: 'p2',
        displayName: 'Player 2',
        avatarId: 'avatar-02',
        isBot: true,
        seatIndex: 1,
        hand: [
          { id: 't1', shape: 'triangle' },
          { id: 't2', shape: 'triangle' },
          { id: 't3', shape: 'triangle' },
          { id: 't4', shape: 'triangle' },
          { id: 'pass_p2', shape: 'cross' },
        ],
        hasLockedIn: true,
        selectedCardId: 'pass_p2',
      }),
      createMockPlayer({
        id: 'p3',
        displayName: 'Player 3',
        avatarId: 'avatar-03',
        isBot: true,
        seatIndex: 2,
        hand: [
          { id: 'cr1', shape: 'cross' },
          { id: 'cr2', shape: 'cross' },
          { id: 'cr3', shape: 'cross' },
          { id: 'cr4', shape: 'cross' },
          { id: 'pass_p3', shape: 'circle' },
        ],
        hasLockedIn: true,
        selectedCardId: 'pass_p3',
      }),
    ];

    const { updatedPlayers } = executeSimultaneousPass(players, 'left');

    // Hand size must remain exactly 5
    expect(updatedPlayers[0].hand.length).toBe(5);
    expect(updatedPlayers[1].hand.length).toBe(5);
    expect(updatedPlayers[2].hand.length).toBe(5);

    // Player 1 passed 'pass_p1' (triangle) to Player 2
    // Player 1 received 'pass_p3' (circle) from Player 3!
    expect(updatedPlayers[0].hand.some((c) => c.id === 'pass_p3')).toBe(true);
    expect(updatedPlayers[0].hand.some((c) => c.id === 'pass_p1')).toBe(false);

    // Player 2 received 'pass_p1' from Player 1
    expect(updatedPlayers[1].hand.some((c) => c.id === 'pass_p1')).toBe(true);
    expect(updatedPlayers[1].hand.some((c) => c.id === 'pass_p2')).toBe(false);

    // Player 3 received 'pass_p2' from Player 2
    expect(updatedPlayers[2].hand.some((c) => c.id === 'pass_p2')).toBe(true);
    expect(updatedPlayers[2].hand.some((c) => c.id === 'pass_p3')).toBe(false);
  });

  it('should auto-pick a card when player has not locked in before timer ends', () => {
    const players: JackpotPlayer[] = [
      createMockPlayer({
        id: 'p1',
        displayName: 'Player 1',
        isHost: true,
        hand: [
          { id: 'c1', shape: 'circle' },
          { id: 'c2', shape: 'circle' },
          { id: 'c3', shape: 'circle' },
          { id: 'c4', shape: 'circle' },
          { id: 'non_matching', shape: 'star' },
        ],
      }),
      createMockPlayer({
        id: 'p2',
        displayName: 'Player 2',
        avatarId: 'avatar-02',
        isBot: true,
        seatIndex: 1,
        hand: [
          { id: 's1', shape: 'star' },
          { id: 's2', shape: 'star' },
          { id: 's3', shape: 'star' },
          { id: 's4', shape: 'star' },
          { id: 's5', shape: 'triangle' },
        ],
      }),
    ];

    const { updatedPlayers } = executeSimultaneousPass(players, 'left');
    expect(updatedPlayers[0].hand.length).toBe(5);
    expect(updatedPlayers[1].hand.length).toBe(5);
    // Player 1 should have auto-discarded the non-matching star
    expect(updatedPlayers[0].hand.some((c) => c.id === 'non_matching')).toBe(false);
  });
});

describe('Jackpot Call Validation & False Alarm Penalty', () => {
  it('should successfully validate winning call', () => {
    const players: JackpotPlayer[] = [
      createMockPlayer({
        id: 'winner',
        displayName: 'Winner',
        isHost: true,
        hand: [
          { id: 'c1', shape: 'circle' },
          { id: 'c2', shape: 'circle' },
          { id: 'c3', shape: 'circle' },
          { id: 'c4', shape: 'circle' },
          { id: 'c5', shape: 'circle' },
        ],
      }),
    ];

    const res = validateJackpotCall('winner', players, 'match_set', false);
    expect(res.isValid).toBe(true);
    expect(players[0].isSkipped).toBe(false);
  });

  it('should penalize false alarm caller with skip penalty', () => {
    const players: JackpotPlayer[] = [
      createMockPlayer({
        id: 'liar',
        displayName: 'Liar',
        isHost: true,
        hand: [
          { id: 'c1', shape: 'circle' },
          { id: 'c2', shape: 'circle' },
          { id: 't1', shape: 'triangle' },
          { id: 'cr1', shape: 'cross' },
          { id: 'st1', shape: 'star' },
        ],
      }),
    ];

    const res = validateJackpotCall('liar', players, 'match_set', false);
    expect(res.isValid).toBe(false);
    expect(players[0].isSkipped).toBe(true); // Frozen/skipped penalty applied!
  });
});

describe('Suspect Mechanic & Competitive Scoring', () => {
  it('should correctly validate right accusation when accused has 3 matching shapes', () => {
    const accusedHand: JackpotCard[] = [
      { id: 's1', shape: 'star' },
      { id: 's2', shape: 'star' },
      { id: 's3', shape: 'star' },
      { id: 'c1', shape: 'circle' },
      { id: 't1', shape: 'triangle' },
    ];
    const res = validateSuspectAccusation(accusedHand, 'star', 3, true);
    expect(res.isCorrect).toBe(true);
    expect(res.matchingCount).toBe(3);
  });

  it('should count Whot 20 cards as the named shape for accusations', () => {
    // 2 squares + 1 whot wild = 3 squares!
    const accusedHand: JackpotCard[] = [
      { id: 'sq1', shape: 'square' },
      { id: 'sq2', shape: 'square' },
      { id: 'w1', shape: 'whot' },
      { id: 'c1', shape: 'circle' },
      { id: 't1', shape: 'triangle' },
    ];
    const resWithWild = validateSuspectAccusation(accusedHand, 'square', 3, true);
    expect(resWithWild.isCorrect).toBe(true);
    expect(resWithWild.matchingCount).toBe(3);

    // If wilds are disabled, 2 squares + 1 whot is NOT enough for threshold 3
    const resWithoutWild = validateSuspectAccusation(accusedHand, 'square', 3, false);
    expect(resWithoutWild.isCorrect).toBe(false);
    expect(resWithoutWild.matchingCount).toBe(2);
  });

  it('should handle wrong accusation: spends token, skips accuser, leaves accused unharmed', () => {
    const accuser: JackpotPlayer = {
      id: 'p1',
      userId: 'p1',
      displayName: 'Accuser',
      username: 'p1',
      avatarId: 'avatar-01',
      isBot: false,
      isHost: true,
      seatIndex: 0,
      hand: [],
      cardCount: 5,
      hasLockedIn: false,
      selectedCardId: null,
      passedCard: null,
      receivedCard: null,
      score: 0,
      points: 2,
      suspectTokens: 2,
      isExposed: false,
      exposedShape: null,
      isSkipped: false,
      isFrozen: false,
      hasUsedFreeze: false,
      isConnected: true,
    };

    const accused: JackpotPlayer = {
      id: 'p2',
      userId: 'p2',
      displayName: 'Accused',
      username: 'p2',
      avatarId: 'avatar-02',
      isBot: true,
      isHost: false,
      seatIndex: 1,
      hand: [
        { id: 'c1', shape: 'circle' },
        { id: 'c2', shape: 'circle' },
        { id: 't1', shape: 'triangle' },
        { id: 't2', shape: 'triangle' },
        { id: 'st1', shape: 'star' },
      ],
      cardCount: 5,
      hasLockedIn: false,
      selectedCardId: null,
      passedCard: null,
      receivedCard: null,
      score: 0,
      points: 4,
      suspectTokens: 2,
      isExposed: false,
      exposedShape: null,
      isSkipped: false,
      isFrozen: false,
      hasUsedFreeze: false,
      isConnected: true,
    };

    // Accuses accused of 'circle' (accused only holds 2 circles, threshold is 3)
    const check = validateSuspectAccusation(accused.hand, 'circle', 3, true);
    expect(check.isCorrect).toBe(false);

    const { updatedAccuser, updatedAccused } = applySuspectResult(
      accuser,
      accused,
      'circle',
      false
    );

    // Accuser spent 1 token (down from 2 to 1)
    expect(updatedAccuser.suspectTokens).toBe(1);
    // Accuser is skipped for next pass
    expect(updatedAccuser.isSkipped).toBe(true);
    // Accuser points unchanged
    expect(updatedAccuser.points).toBe(2);

    // Accused is NOT exposed and suffers no penalty
    expect(updatedAccused.isExposed).toBe(false);
    expect(updatedAccused.isSkipped).toBe(false);
  });

  it('should handle correct accusation: accuser keeps token and earns +1 point; accused is exposed', () => {
    const accuser: JackpotPlayer = {
      id: 'p1',
      userId: 'p1',
      displayName: 'Accuser',
      username: 'p1',
      avatarId: 'avatar-01',
      isBot: false,
      isHost: true,
      seatIndex: 0,
      hand: [],
      cardCount: 5,
      hasLockedIn: false,
      selectedCardId: null,
      passedCard: null,
      receivedCard: null,
      score: 0,
      points: 2,
      suspectTokens: 2,
      isExposed: false,
      exposedShape: null,
      isSkipped: false,
      isFrozen: false,
      hasUsedFreeze: false,
      isConnected: true,
    };

    const accused: JackpotPlayer = {
      id: 'p2',
      userId: 'p2',
      displayName: 'Accused',
      username: 'p2',
      avatarId: 'avatar-02',
      isBot: true,
      isHost: false,
      seatIndex: 1,
      hand: [
        { id: 'c1', shape: 'circle' },
        { id: 'c2', shape: 'circle' },
        { id: 'c3', shape: 'circle' },
        { id: 't1', shape: 'triangle' },
        { id: 'st1', shape: 'star' },
      ],
      cardCount: 5,
      hasLockedIn: false,
      selectedCardId: null,
      passedCard: null,
      receivedCard: null,
      score: 0,
      points: 4,
      suspectTokens: 2,
      isExposed: false,
      exposedShape: null,
      isSkipped: false,
      isFrozen: false,
      hasUsedFreeze: false,
      isConnected: true,
    };

    const { updatedAccuser, updatedAccused } = applySuspectResult(
      accuser,
      accused,
      'circle',
      true
    );

    // Accuser kept token (still 2)
    expect(updatedAccuser.suspectTokens).toBe(2);
    // Accuser earned +1 point (2 -> 3)
    expect(updatedAccuser.points).toBe(3);
    // Accuser is not skipped
    expect(updatedAccuser.isSkipped).toBe(false);

    // Accused is exposed to 'circle'
    expect(updatedAccused.isExposed).toBe(true);
    expect(updatedAccused.exposedShape).toBe('circle');
  });

  it('should enforce that exposed player must pass a card of the exposed shape', () => {
    const players: JackpotPlayer[] = [
      {
        id: 'p1',
        userId: 'p1',
        displayName: 'Player 1 (Exposed)',
        username: 'p1',
        avatarId: 'avatar-01',
        isBot: false,
        isHost: true,
        seatIndex: 0,
        hand: [
          { id: 'c1', shape: 'circle' },
          { id: 'c2', shape: 'circle' },
          { id: 'c3', shape: 'circle' },
          { id: 't1', shape: 'triangle' },
          { id: 'st1', shape: 'star' },
        ],
        cardCount: 5,
        hasLockedIn: true,
        selectedCardId: 't1', // Tried to pass triangle!
        passedCard: null,
        receivedCard: null,
        score: 0,
        points: 0,
        suspectTokens: 2,
        isExposed: true, // EXPOSED TO CIRCLE!
        exposedShape: 'circle',
        isSkipped: false,
        isFrozen: false,
        hasUsedFreeze: false,
        isConnected: true,
      },
      {
        id: 'p2',
        userId: 'p2',
        displayName: 'Player 2',
        username: 'p2',
        avatarId: 'avatar-02',
        isBot: true,
        isHost: false,
        seatIndex: 1,
        hand: [
          { id: 't2', shape: 'triangle' },
          { id: 't3', shape: 'triangle' },
          { id: 't4', shape: 'triangle' },
          { id: 'cr1', shape: 'cross' },
          { id: 'cr2', shape: 'cross' },
        ],
        cardCount: 5,
        hasLockedIn: true,
        selectedCardId: 'cr1',
        passedCard: null,
        receivedCard: null,
        score: 0,
        points: 0,
        suspectTokens: 2,
        isExposed: false,
        exposedShape: null,
        isSkipped: false,
        isFrozen: false,
        hasUsedFreeze: false,
        isConnected: true,
      },
    ];

    const { updatedPlayers, passedSummary } = executeSimultaneousPass(players, 'left');

    // Player 1's passed card must be one of their circles!
    const p1Passed = passedSummary.find((s) => s.fromPlayerId === 'p1');
    expect(p1Passed?.card.shape).toBe('circle');

    // Once passed, Player 1 is no longer exposed
    expect(updatedPlayers[0].isExposed).toBe(false);
    expect(updatedPlayers[0].exposedShape).toBe(null);
  });

  it('should enforce 5-second cooldown and prevent self-accusation', () => {
    const accuser: JackpotPlayer = {
      id: 'p1',
      userId: 'p1',
      displayName: 'Accuser',
      username: 'p1',
      avatarId: 'avatar-01',
      isBot: false,
      isHost: true,
      seatIndex: 0,
      hand: [],
      cardCount: 5,
      hasLockedIn: false,
      selectedCardId: null,
      passedCard: null,
      receivedCard: null,
      score: 0,
      points: 0,
      suspectTokens: 2,
      isExposed: false,
      exposedShape: null,
      isSkipped: false,
      isFrozen: false,
      hasUsedFreeze: false,
      isConnected: true,
    };

    const accused: JackpotPlayer = {
      ...accuser,
      id: 'p2',
      displayName: 'Accused',
    };

    // Cannot accuse self
    const selfCheck = canPlayerAccuse(accuser, accuser);
    expect(selfCheck.canAccuse).toBe(false);

    // Can accuse opponent
    const validCheck = canPlayerAccuse(accuser, accused, 10000);
    expect(validCheck.canAccuse).toBe(true);

    // During cooldown (e.g. 2 seconds after last accusation)
    accuser.lastSuspectTimestamp = 10000;
    const cooldownCheck = canPlayerAccuse(accuser, accused, 12000, 5000);
    expect(cooldownCheck.canAccuse).toBe(false);
    expect(cooldownCheck.reason).toContain('cooldown');

    // After cooldown has expired (6 seconds later)
    const expiredCheck = canPlayerAccuse(accuser, accused, 16000, 5000);
    expect(expiredCheck.canAccuse).toBe(true);
  });

  it('should detect match winner when first player reaches 15 points', () => {
    const players: JackpotPlayer[] = [
      {
        id: 'p1',
        userId: 'p1',
        displayName: 'Player 1',
        username: 'p1',
        avatarId: 'avatar-01',
        isBot: false,
        isHost: true,
        seatIndex: 0,
        hand: [],
        cardCount: 5,
        hasLockedIn: false,
        selectedCardId: null,
        passedCard: null,
        receivedCard: null,
        score: 2,
        points: 14,
        suspectTokens: 2,
        isExposed: false,
        exposedShape: null,
        isSkipped: false,
        isFrozen: false,
        hasUsedFreeze: false,
        isConnected: true,
      },
      {
        id: 'p2',
        userId: 'p2',
        displayName: 'Player 2',
        username: 'p2',
        avatarId: 'avatar-02',
        isBot: true,
        isHost: false,
        seatIndex: 1,
        hand: [],
        cardCount: 5,
        hasLockedIn: false,
        selectedCardId: null,
        passedCard: null,
        receivedCard: null,
        score: 1,
        points: 11,
        suspectTokens: 1,
        isExposed: false,
        exposedShape: null,
        isSkipped: false,
        isFrozen: false,
        hasUsedFreeze: false,
        isConnected: true,
      },
    ];

    // At 14 points, match is not over
    expect(checkMatchWinnerByPoints(players, 15).isGameOver).toBe(false);

    // Player 1 scores +1 from a correct suspect -> reaches 15 points!
    players[0].points = 15;
    const winCheck = checkMatchWinnerByPoints(players, 15);
    expect(winCheck.isGameOver).toBe(true);
    expect(winCheck.winner?.id).toBe('p1');
  });
});
