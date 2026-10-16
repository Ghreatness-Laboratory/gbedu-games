import { describe, it, expect } from 'vitest';
import {
  checkWinningHand,
  createJackpotDeck,
  executeSimultaneousPass,
  validateJackpotCall,
  getHandProgress,
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

describe('Simultaneous Pass Logic', () => {
  it('should pass cards simultaneously around circle in left direction', () => {
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
        hand: [
          { id: 'c1', shape: 'circle' },
          { id: 'c2', shape: 'circle' },
          { id: 'c3', shape: 'circle' },
          { id: 'c4', shape: 'circle' },
          { id: 'pass_p1', shape: 'triangle' },
        ],
        cardCount: 5,
        hasLockedIn: true,
        selectedCardId: 'pass_p1',
        passedCard: null,
        receivedCard: null,
        score: 0,
        isSkipped: false,
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
          { id: 't1', shape: 'triangle' },
          { id: 't2', shape: 'triangle' },
          { id: 't3', shape: 'triangle' },
          { id: 't4', shape: 'triangle' },
          { id: 'pass_p2', shape: 'cross' },
        ],
        cardCount: 5,
        hasLockedIn: true,
        selectedCardId: 'pass_p2',
        passedCard: null,
        receivedCard: null,
        score: 0,
        isSkipped: false,
        isConnected: true,
      },
      {
        id: 'p3',
        userId: 'p3',
        displayName: 'Player 3',
        username: 'p3',
        avatarId: 'avatar-03',
        isBot: true,
        isHost: false,
        seatIndex: 2,
        hand: [
          { id: 'cr1', shape: 'cross' },
          { id: 'cr2', shape: 'cross' },
          { id: 'cr3', shape: 'cross' },
          { id: 'cr4', shape: 'cross' },
          { id: 'pass_p3', shape: 'circle' },
        ],
        cardCount: 5,
        hasLockedIn: true,
        selectedCardId: 'pass_p3',
        passedCard: null,
        receivedCard: null,
        score: 0,
        isSkipped: false,
        isConnected: true,
      },
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
      {
        id: 'p1',
        userId: 'p1',
        displayName: 'Player 1',
        username: 'p1',
        avatarId: 'avatar-01',
        isBot: false,
        isHost: true,
        seatIndex: 0,
        hand: [
          { id: 'c1', shape: 'circle' },
          { id: 'c2', shape: 'circle' },
          { id: 'c3', shape: 'circle' },
          { id: 'c4', shape: 'circle' },
          { id: 'non_matching', shape: 'star' },
        ],
        cardCount: 5,
        hasLockedIn: false,
        selectedCardId: null, // NOT selected!
        passedCard: null,
        receivedCard: null,
        score: 0,
        isSkipped: false,
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
          { id: 's1', shape: 'star' },
          { id: 's2', shape: 'star' },
          { id: 's3', shape: 'star' },
          { id: 's4', shape: 'star' },
          { id: 's5', shape: 'triangle' },
        ],
        cardCount: 5,
        hasLockedIn: false,
        selectedCardId: null,
        passedCard: null,
        receivedCard: null,
        score: 0,
        isSkipped: false,
        isConnected: true,
      },
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
      {
        id: 'winner',
        userId: 'winner',
        displayName: 'Winner',
        username: 'winner',
        avatarId: 'avatar-01',
        isBot: false,
        isHost: true,
        seatIndex: 0,
        hand: [
          { id: 'c1', shape: 'circle' },
          { id: 'c2', shape: 'circle' },
          { id: 'c3', shape: 'circle' },
          { id: 'c4', shape: 'circle' },
          { id: 'c5', shape: 'circle' },
        ],
        cardCount: 5,
        hasLockedIn: false,
        selectedCardId: null,
        passedCard: null,
        receivedCard: null,
        score: 0,
        isSkipped: false,
        isConnected: true,
      },
    ];

    const res = validateJackpotCall('winner', players, 'match_set', false);
    expect(res.isValid).toBe(true);
    expect(players[0].isSkipped).toBe(false);
  });

  it('should penalize false alarm caller with skip penalty', () => {
    const players: JackpotPlayer[] = [
      {
        id: 'liar',
        userId: 'liar',
        displayName: 'Liar',
        username: 'liar',
        avatarId: 'avatar-01',
        isBot: false,
        isHost: true,
        seatIndex: 0,
        hand: [
          { id: 'c1', shape: 'circle' },
          { id: 'c2', shape: 'circle' },
          { id: 't1', shape: 'triangle' },
          { id: 'cr1', shape: 'cross' },
          { id: 'st1', shape: 'star' },
        ],
        cardCount: 5,
        hasLockedIn: false,
        selectedCardId: null,
        passedCard: null,
        receivedCard: null,
        score: 0,
        isSkipped: false,
        isConnected: true,
      },
    ];

    const res = validateJackpotCall('liar', players, 'match_set', false);
    expect(res.isValid).toBe(false);
    expect(players[0].isSkipped).toBe(true); // Frozen/skipped penalty applied!
  });
});
