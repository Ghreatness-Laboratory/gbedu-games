import { describe, it, expect } from 'vitest';
import {
  createStandardDeck,
  newGame,
  playCard,
  drawCard,
  legalCardIds,
  getPlayerView,
  validateRuleset,
  detectPreset,
  DEFAULT_RULESET,
  PRESETS,
  forfeitPlayer,
} from '../src';

describe('Whot Engine: Deck & Ruleset', () => {
  it('creates the exact official standard 54-card Nigerian Whot deck', () => {
    const deck = createStandardDeck();
    expect(deck).toHaveLength(54);

    const circles = deck.filter((c) => c.shape === 'circle');
    const triangles = deck.filter((c) => c.shape === 'triangle');
    const crosses = deck.filter((c) => c.shape === 'cross');
    const squares = deck.filter((c) => c.shape === 'square');
    const stars = deck.filter((c) => c.shape === 'star');
    const whots = deck.filter((c) => c.number === 20);

    expect(circles).toHaveLength(12);
    expect(triangles).toHaveLength(12);
    expect(crosses).toHaveLength(9);
    expect(squares).toHaveLength(9);
    expect(stars).toHaveLength(7);
    expect(whots).toHaveLength(5);
  });

  it('validates ruleset strictly and rejects unknown keys', () => {
    const validRes = validateRuleset({ startingCards: 5, turnTimerSec: 30 });
    expect(validRes.valid).toBe(true);
    expect(validRes.ruleset.startingCards).toBe(5);
    expect(validRes.ruleset.turnTimerSec).toBe(30);

    // Unknown key rejection
    const invalidKeyRes = validateRuleset({ fakeKey: 123 });
    expect(invalidKeyRes.valid).toBe(false);
    expect(invalidKeyRes.error).toContain('Unknown ruleset key');

    // Invalid startingCards range (<4 or >8)
    const outOfBoundsRes = validateRuleset({ startingCards: 12 });
    expect(outOfBoundsRes.valid).toBe(false);
  });

  it('detects presets correctly (Naija Classic, Quick Game, No Specials, Custom)', () => {
    expect(detectPreset(PRESETS.naija_classic)).toBe('naija_classic');
    expect(detectPreset(PRESETS.quick_game)).toBe('quick_game');
    expect(detectPreset(PRESETS.no_specials)).toBe('no_specials');

    const custom = { ...DEFAULT_RULESET, startingCards: 7 };
    expect(detectPreset(custom)).toBe('custom');
  });
});

describe('Whot Engine: Gameplay & Specials', () => {
  const mockPlayers = [
    { userId: 'u1', username: 'Ada', displayName: 'Ada', avatarUrl: '👑' },
    { userId: 'u2', username: 'Tobi', displayName: 'Tobi', avatarUrl: '🦁' },
    { userId: 'u3', username: 'Chi', displayName: 'Chi', avatarUrl: '🕶️' },
  ];

  it('initializes game for 2 to 6 players properly', () => {
    const res = newGame({ roomId: 'room1', players: mockPlayers });
    expect(res.success).toBe(true);
    expect(res.state.players).toHaveLength(3);
    expect(res.state.discardPile).toHaveLength(1);
    expect(res.state.players[0].hand).toHaveLength(6);
    expect(res.state.activePlayerIndex).toBe(0);
  });

  it('preserves secret hands and never leaks private cards or draw pile order', () => {
    const res = newGame({ roomId: 'room1', players: mockPlayers });
    const viewForU1 = getPlayerView(res.state, 'u1');

    expect(viewForU1.myHand).toHaveLength(6);
    expect(viewForU1.opponents[0].cardCount).toBe(6);
    // Opponent views do not contain private hand arrays!
    expect((viewForU1.opponents[0] as unknown as { hand?: unknown }).hand).toBeUndefined();
    // Draw pile sequence is never exposed (only total count)
    expect((viewForU1 as unknown as { drawPile?: unknown }).drawPile).toBeUndefined();
    expect(typeof viewForU1.drawPileCount).toBe('number');
  });

  it('handles Card 1 (Hold On) correctly: active player plays again', () => {
    const res = newGame({ roomId: 'room1', players: mockPlayers });
    const state = res.state;

    // Inject a Hold On card (1) into Ada's hand
    state.players[0].hand = [
      { id: 'c1', shape: state.activeShape, number: 1, specialType: 'hold_on' },
      { id: 'c2', shape: 'star', number: 7 },
    ];

    const playRes = playCard(state, {
      userId: 'u1',
      cardId: 'c1',
      calledLastCard: true,
    });

    expect(playRes.success).toBe(true);
    // Turn remains with player index 0 (Ada)
    expect(playRes.state.activePlayerIndex).toBe(0);
    expect(playRes.state.lastActionMessage).toContain('HOLD ON');
  });

  it('handles Card 2 (Pick Two) and accumulation / passing', () => {
    const res = newGame({ roomId: 'room1', players: mockPlayers });
    const state = res.state;

    // Give Ada a Pick 2
    state.players[0].hand = [
      { id: 'p2_ada', shape: state.activeShape, number: 2, specialType: 'pick_two' },
      { id: 'other_ada', shape: 'circle', number: 4 },
    ];

    // Give Tobi a Pick 2 to pass it on
    state.players[1].hand = [
      { id: 'p2_tobi', shape: 'triangle', number: 2, specialType: 'pick_two' },
      { id: 'other_tobi', shape: 'star', number: 3 },
    ];

    // Ada plays Pick 2
    const play1 = playCard(state, { userId: 'u1', cardId: 'p2_ada' });
    expect(play1.success).toBe(true);
    expect(play1.state.pendingPickCount).toBe(2);
    expect(play1.state.activePlayerIndex).toBe(1); // Now Tobi's turn

    // Tobi passes Pick 2 onto Chi
    const play2 = playCard(play1.state, { userId: 'u2', cardId: 'p2_tobi' });
    expect(play2.success).toBe(true);
    expect(play2.state.pendingPickCount).toBe(4); // Accumulated to 4!
    expect(play2.state.activePlayerIndex).toBe(2); // Now Chi's turn

    // Chi cannot pass, draws 4 penalty cards
    const initialChiCards = play2.state.players[2].hand.length;
    const drawRes = drawCard(play2.state, { userId: 'u3' });
    expect(drawRes.success).toBe(true);
    expect(drawRes.state.players[2].hand).toHaveLength(initialChiCards + 4);
    expect(drawRes.state.pendingPickCount).toBe(0); // Cleared
  });

  it('handles Card 8 (Suspension): skips next player in 3-player game', () => {
    const res = newGame({ roomId: 'room1', players: mockPlayers });
    const state = res.state;

    state.players[0].hand = [
      { id: 's8', shape: state.activeShape, number: 8, specialType: 'suspension' },
      { id: 'c2', shape: 'star', number: 7 },
    ];

    const playRes = playCard(state, { userId: 'u1', cardId: 's8' });
    expect(playRes.success).toBe(true);
    // Skips Tobi (1), play advances to Chi (2)
    expect(playRes.state.activePlayerIndex).toBe(2);
  });

  it('handles Card 14 (General Market): every other player draws 1 card and player who played it MUST play again', () => {
    const res = newGame({ roomId: 'room1', players: mockPlayers });
    const state = res.state;

    const tobiInitial = state.players[1].hand.length;
    const chiInitial = state.players[2].hand.length;

    state.players[0].hand = [
      { id: 'gm14', shape: state.activeShape, number: 14, specialType: 'general_market' },
      { id: 'c2', shape: state.activeShape, number: 7 },
    ];

    const playRes = playCard(state, { userId: 'u1', cardId: 'gm14' });
    expect(playRes.success).toBe(true);
    // Every other player drew 1 card
    expect(playRes.state.players[1].hand).toHaveLength(tobiInitial + 1);
    expect(playRes.state.players[2].hand).toHaveLength(chiInitial + 1);

    // Player who played it MUST play again (same turn)
    expect(playRes.state.activePlayerIndex).toBe(0);
    expect(playRes.state.isPlayAgainTurn).toBe(true);
    expect(playRes.state.generalMarketActive).toBe(true);
    expect(playRes.state.lastActionMessage).toContain('General Market! Everyone picks 1. Play again.');

    // Now player plays their second card in the same turn
    const secondPlayRes = playCard(playRes.state, { userId: 'u1', cardId: 'c2' });
    expect(secondPlayRes.success).toBe(true);
    // Turn now passes to next player (Tobi)
    expect(secondPlayRes.state.activePlayerIndex).toBe(1);
    expect(secondPlayRes.state.isPlayAgainTurn).toBe(false);
  });

  it('General Market: if player has no playable card, they draw 1 from market and turn passes', () => {
    const res = newGame({ roomId: 'room1', players: mockPlayers });
    const state = res.state;

    // Discard is star 4, activeShape is circle
    state.discardPile = [{ id: 'top_card', shape: 'circle', number: 4 }];
    state.activeShape = 'circle';

    // Player 0 plays 14 of circle, with an unplayable square 3 left
    state.players[0].hand = [
      { id: 'gm14', shape: 'circle', number: 14, specialType: 'general_market' },
      { id: 'unplayable', shape: 'square', number: 3 },
    ];

    const playRes = playCard(state, { userId: 'u1', cardId: 'gm14', calledLastCard: true });
    expect(playRes.success).toBe(true);
    expect(playRes.state.activePlayerIndex).toBe(0);

    // Legals should be empty because square 3 does not match circle or 14
    const legals = legalCardIds(playRes.state, 0);
    expect(legals).toEqual([]);

    // Player must draw 1 from market
    const drawRes = drawCard(playRes.state, { userId: 'u1' });
    expect(drawRes.success).toBe(true);
    expect(drawRes.state.players[0].hand).toHaveLength(2); // square 3 + 1 drawn
    // Turn passes to next player
    expect(drawRes.state.activePlayerIndex).toBe(1);
    expect(drawRes.state.isPlayAgainTurn).toBe(false);
  });

  it('reshuffles discard pile (except top card) into market if it runs out during General Market', () => {
    const res = newGame({ roomId: 'room1', players: mockPlayers });
    const state = res.state;

    // Empty the draw pile completely
    state.drawPile = [];

    // Pile up 5 discarded cards
    state.discardPile = [
      { id: 'd1', shape: 'star', number: 3 },
      { id: 'd2', shape: 'circle', number: 5 },
      { id: 'd3', shape: 'triangle', number: 7 },
      { id: 'top_before', shape: 'cross', number: 10 },
    ];
    state.activeShape = 'cross';

    state.players[0].hand = [
      { id: 'gm14', shape: 'cross', number: 14, specialType: 'general_market' },
      { id: 'c_extra', shape: 'star', number: 8 },
    ];

    const tobiInitial = state.players[1].hand.length;
    const chiInitial = state.players[2].hand.length;

    const playRes = playCard(state, { userId: 'u1', cardId: 'gm14' });
    expect(playRes.success).toBe(true);

    // Both players should have successfully received a card from the reshuffled market
    expect(playRes.state.players[1].hand).toHaveLength(tobiInitial + 1);
    expect(playRes.state.players[2].hand).toHaveLength(chiInitial + 1);

    // Top discard remains the played General Market (gm14)
    expect(playRes.state.discardPile).toHaveLength(1);
    expect(playRes.state.discardPile[0].id).toBe('gm14');
  });

  it('room setting "Allow finishing on special cards" (default off): prevents winning on special cards', () => {
    // 1. By default, goOutOnSpecial is false
    expect(DEFAULT_RULESET.goOutOnSpecial).toBe(false);

    const res = newGame({ roomId: 'room1', players: mockPlayers, ruleset: { goOutOnSpecial: false } });
    const state = res.state;

    // Give Ada only 1 card left, and it's a special card (Hold On: 1)
    state.players[0].hand = [
      { id: 's1', shape: state.activeShape, number: 1, specialType: 'hold_on' },
    ];

    // Cannot legally play it to check up/win
    const legals = legalCardIds(state, 0);
    expect(legals).not.toContain('s1');

    // If playCard is forced, they must draw 1 card instead of winning
    const playAttempt = playCard(state, { userId: 'u1', cardId: 's1', calledCheckUp: true });
    // In our engine, playing an illegal card is rejected
    expect(playAttempt.success).toBe(false);
    expect(playAttempt.error).toContain('Illegal move');

    // Drawing from market succeeds
    const drawRes = drawCard(state, { userId: 'u1' });
    expect(drawRes.success).toBe(true);
    expect(drawRes.state.players[0].hand).toHaveLength(2); // Had 1, drew 1
  });

  it('room setting "Allow finishing on special cards": allows winning when set to true', () => {
    const res = newGame({ roomId: 'room1', players: mockPlayers, ruleset: { goOutOnSpecial: true, calloutsRequired: false } });
    const state = res.state;

    state.players[0].hand = [
      { id: 's1', shape: state.activeShape, number: 1, specialType: 'hold_on' },
    ];

    const legals = legalCardIds(state, 0);
    expect(legals).toContain('s1');

    const winPlay = playCard(state, { userId: 'u1', cardId: 's1', calledCheckUp: true });
    expect(winPlay.success).toBe(true);
    expect(winPlay.state.gameStatus).toBe('completed');
    expect(winPlay.state.winnerUserId).toBe('u1');
  });

  it('handles forfeit: if 2 players play and 1 forfeits, the other wins', () => {
    const res = newGame({
      roomId: 'room1',
      players: [mockPlayers[0], mockPlayers[1]],
    });

    const forfeitRes = forfeitPlayer(res.state, 'u2');
    expect(forfeitRes.success).toBe(true);
    expect(forfeitRes.state.gameStatus).toBe('completed');
    expect(forfeitRes.state.winnerUserId).toBe('u1');
  });
});
