import { describe, it, expect } from 'vitest';
import { createRoom, joinRoom, setPlayerReady } from '../src/rooms';
import { startGameSession, executePlayerMove, executePlayerDraw, getActiveSession } from '../src/gameManager';

describe('Server Turn Validation: Consecutive moves', () => {
  it('allows two consecutive moves ONLY on General Market or Hold On play-again turns, and rejects in normal turns', () => {
    // 1. Setup room with 2 seeded players: Ada (usr_ada) and Tobi (usr_tobi)
    const room = createRoom('usr_ada', { calloutsRequired: false, turnTimerSec: 0 });
    const joinRes = joinRoom(room.code, 'usr_tobi');
    expect(joinRes.success).toBe(true);

    const readyRes = setPlayerReady(room.id, 'usr_tobi', true);
    expect(readyRes.success).toBe(true);

    const startRes = startGameSession(room.id, 'usr_ada', () => {}, () => {});
    expect(startRes.success).toBe(true);

    const session = getActiveSession(room.id);
    expect(session).not.toBeNull();
    if (!session) return;

    // Discard is star 4, activeShape is circle
    session.engineState.discardPile = [{ id: 'top_disc', shape: 'circle', number: 4 }];
    session.engineState.activeShape = 'circle';
    session.engineState.activePlayerIndex = 0; // Ada

    // Give Ada a normal card (circle 7) and another circle card (circle 3)
    session.engineState.players[0].hand = [
      { id: 'norm_c7', shape: 'circle', number: 7 },
      { id: 'norm_c3', shape: 'circle', number: 3 },
    ];
    session.engineState.players[1].hand = [
      { id: 'tobi_c1', shape: 'circle', number: 7 },
      { id: 'tobi_c2', shape: 'circle', number: 8 },
    ];

    // Ada plays circle 7 (a normal non-special move)
    const move1 = executePlayerMove(room.id, 'usr_ada', { cardId: 'norm_c7' }, () => {}, () => {});
    expect(move1.success).toBe(true);

    // Turn has moved to Tobi (player 1)
    expect(session.engineState.activePlayerIndex).toBe(1);

    // If Ada tries to make a second consecutive move, it must be rejected!
    const illegalSecondMove = executePlayerMove(room.id, 'usr_ada', { cardId: 'norm_c3' }, () => {}, () => {});
    expect(illegalSecondMove.success).toBe(false);
    expect(illegalSecondMove.error).toBe('Not your turn');

    // Now test General Market play-again:
    // Set active turn to Ada with General Market (cross 14) and cross 11
    session.engineState.activePlayerIndex = 0;
    session.lastMoverId = undefined;
    session.allowedPlayAgainUserId = undefined;
    session.engineState.discardPile = [{ id: 'disc_cross', shape: 'cross', number: 2 }];
    session.engineState.activeShape = 'cross';

    session.engineState.players[0].hand = [
      { id: 'gm_14', shape: 'cross', number: 14, specialType: 'general_market' },
      { id: 'cross_11', shape: 'cross', number: 11 },
      { id: 'cross_13', shape: 'cross', number: 13 },
    ];

    const tobiInitialCards = session.engineState.players[1].hand.length;

    // Ada plays General Market
    const gmMove = executePlayerMove(room.id, 'usr_ada', { cardId: 'gm_14' }, () => {}, () => {});
    expect(gmMove.success).toBe(true);

    // Tobi drew 1 card from the market
    expect(session.engineState.players[1].hand).toHaveLength(tobiInitialCards + 1);

    // Turn is STILL Ada's turn!
    expect(session.engineState.activePlayerIndex).toBe(0);
    expect(session.engineState.isPlayAgainTurn).toBe(true);
    expect(session.allowedPlayAgainUserId).toBe('usr_ada');

    // Ada makes a consecutive move (plays cross 11) - this MUST be allowed!
    const gmSecondMove = executePlayerMove(room.id, 'usr_ada', { cardId: 'cross_11' }, () => {}, () => {});
    expect(gmSecondMove.success).toBe(true);

    // After this second move, turn moves to Tobi and play-again is cleared
    expect(session.engineState.activePlayerIndex).toBe(1);
    expect(session.allowedPlayAgainUserId).toBeUndefined();
  });
});
