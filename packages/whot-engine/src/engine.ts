import { Card, Shape, Ruleset, PlayerGameView, OpponentView } from '@gbedu/shared';
import { createStandardDeck, shuffleDeck } from './deck';
import { DEFAULT_RULESET, validateRuleset, detectPreset } from './ruleset';
import { EngineState, EnginePlayer, cloneState } from './state';

export interface NewGameParams {
  roomId: string;
  players: { userId: string; username: string; displayName: string; avatarUrl: string }[];
  ruleset?: Partial<Ruleset>;
  rng?: () => number;
}

export interface EngineResult {
  success: boolean;
  state: EngineState;
  error?: string;
  events?: { type: string; message: string; userId?: string }[];
}

export function newGame(params: NewGameParams): EngineResult {
  const { roomId, players: rawPlayers, rng = Math.random } = params;

  if (!rawPlayers || rawPlayers.length < 2 || rawPlayers.length > 6) {
    throw new Error('Whot game requires between 2 and 6 players');
  }

  const validated = validateRuleset(params.ruleset || DEFAULT_RULESET);
  const ruleset = validated.ruleset;

  let deck = shuffleDeck(createStandardDeck(), rng);

  // Deal starting cards to each player
  const players: EnginePlayer[] = rawPlayers.map((p, seatIndex) => {
    const hand = deck.splice(0, ruleset.startingCards);
    return {
      userId: p.userId,
      username: p.username,
      displayName: p.displayName,
      avatarUrl: p.avatarUrl,
      hand,
      seatIndex,
      hasCalledLastCard: false,
      hasCalledCheckUp: false,
      isForfeited: false,
      isConnected: true,
    };
  });

  // Flip initial card for discard pile (must not be Whot 20)
  let initialCardIndex = deck.findIndex((c) => c.number !== 20);
  if (initialCardIndex === -1) {
    initialCardIndex = 0;
  }
  const [initialCard] = deck.splice(initialCardIndex, 1);
  const discardPile = [initialCard];
  const activeShape: Shape = initialCard.shape;

  const state: EngineState = {
    id: `game_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    roomId,
    ruleset,
    players,
    drawPile: deck,
    discardPile,
    activePlayerIndex: 0,
    activeShape,
    turnDirection: 1,
    pendingPickCount: 0,
    pendingPickType: null,
    turnStep: 1,
    lastActionMessage: `Game started! First card is ${initialCard.shape.toUpperCase()} ${initialCard.number}.`,
    gameStatus: 'playing',
    winnerUserId: null,
    startedAt: Date.now(),
  };

  return {
    success: true,
    state,
    events: [{ type: 'game_start', message: state.lastActionMessage }],
  };
}

export function legalCardIds(state: EngineState, playerIndex: number): string[] {
  if (state.gameStatus !== 'playing') return [];
  if (playerIndex !== state.activePlayerIndex) return [];

  const player = state.players[playerIndex];
  if (!player || player.isForfeited) return [];

  const topCard = state.discardPile[state.discardPile.length - 1];
  if (!topCard) return [];

  // 1. Pending penalty state (Pick Two or Pick Three in play)
  if (state.pendingPickCount > 0) {
    const candidates: string[] = [];

    player.hand.forEach((card) => {
      // Pick Two defence / passing
      if (state.pendingPickType === 'pick_two') {
        if (state.ruleset.pickTwoPassing && card.number === 2 && state.ruleset.specials.pickTwo) {
          candidates.push(card.id);
        } else if (state.ruleset.crossPassing && card.number === 5 && state.ruleset.specials.pickThree) {
          candidates.push(card.id);
        } else if (state.ruleset.whot20DefendsAgainstPicks && card.number === 20 && state.ruleset.specials.whot) {
          candidates.push(card.id);
        }
      }
      // Pick Three defence / passing
      else if (state.pendingPickType === 'pick_three') {
        if (state.ruleset.pickThreePassing && card.number === 5 && state.ruleset.specials.pickThree) {
          candidates.push(card.id);
        } else if (state.ruleset.crossPassing && card.number === 2 && state.ruleset.specials.pickTwo) {
          candidates.push(card.id);
        } else if (state.ruleset.whot20DefendsAgainstPicks && card.number === 20 && state.ruleset.specials.whot) {
          candidates.push(card.id);
        }
      }
    });

    return candidates;
  }

  // 2. Normal play state
  const isLastCard = player.hand.length === 1;

  return player.hand
    .filter((card) => {
      // If goOutOnSpecial is false ("Allow finishing on special cards" off),
      // player cannot win on a special card (1, 2, 5, 8, 14, 20) and must draw 1 card instead
      if (isLastCard && !state.ruleset.goOutOnSpecial) {
        if ([1, 2, 5, 8, 14, 20].includes(card.number)) return false;
      }

      // Whot 20 is wild and always playable (unless restricted by goOutOnSpecial above)
      if (card.number === 20) {
        return true;
      }

      // Match either the active shape or the top card number
      return card.shape === state.activeShape || card.number === topCard.number;
    })
    .map((c) => c.id);
}

export function canDraw(state: EngineState, playerIndex: number): boolean {
  if (state.gameStatus !== 'playing') return false;
  if (playerIndex !== state.activePlayerIndex) return false;

  // If facing a penalty, player can always draw (accepting penalty)
  if (state.pendingPickCount > 0) return true;

  // Normal turn: can only draw if no legal card can be played
  const legals = legalCardIds(state, playerIndex);
  return legals.length === 0;
}

// Reshuffles discard pile (except top card) into draw pile if draw pile is exhausted
export function ensureDrawPileCards(state: EngineState, countNeeded: number, rng: () => number = Math.random): void {
  if (state.drawPile.length >= countNeeded) return;

  // Keep top card on discard pile, take all other cards for reshuffle
  if (state.discardPile.length > 1) {
    const top = state.discardPile[state.discardPile.length - 1];
    const cardsToShuffle = state.discardPile.slice(0, state.discardPile.length - 1);
    state.discardPile = [top];
    state.drawPile.push(...shuffleDeck(cardsToShuffle, rng));
  }
}

function getNextActivePlayerIndex(state: EngineState, skipCount: number = 0): number {
  const total = state.players.length;
  let idx = state.activePlayerIndex;
  let steps = 1 + skipCount;

  while (steps > 0) {
    idx = (idx + state.turnDirection + total) % total;
    if (!state.players[idx].isForfeited) {
      steps--;
    }
  }

  return idx;
}

export function playCard(
  rawState: EngineState,
  params: {
    userId: string;
    cardId: string;
    chosenShape?: Shape;
    calledLastCard?: boolean;
    calledCheckUp?: boolean;
    rng?: () => number;
  }
): EngineResult {
  const state = cloneState(rawState);
  const rng = params.rng || Math.random;

  if (state.gameStatus !== 'playing') {
    return { success: false, state: rawState, error: 'Game is not currently active' };
  }

  const activePlayer = state.players[state.activePlayerIndex];
  if (!activePlayer || activePlayer.userId !== params.userId) {
    return { success: false, state: rawState, error: 'Not your turn' };
  }

  const cardIndex = activePlayer.hand.findIndex((c) => c.id === params.cardId);
  if (cardIndex === -1) {
    return { success: false, state: rawState, error: 'Card not in your hand' };
  }

  const legals = legalCardIds(state, state.activePlayerIndex);
  if (!legals.includes(params.cardId)) {
    return { success: false, state: rawState, error: 'Illegal move' };
  }

  const card = activePlayer.hand.splice(cardIndex, 1)[0];
  state.discardPile.push(card);

  const events: { type: string; message: string; userId?: string }[] = [];
  const playerName = activePlayer.username;

  // 1. Callout verification
  let calloutPenaltyCards = 0;
  if (state.ruleset.calloutsRequired) {
    // If hand has 1 card left, must call "Last Card"
    if (activePlayer.hand.length === 1) {
      if (!params.calledLastCard) {
        calloutPenaltyCards += state.ruleset.calloutPenalty;
        events.push({
          type: 'penalty_last_card',
          message: `${playerName} forgot to call "Last Card"! Penalty: +${state.ruleset.calloutPenalty} cards.`,
          userId: activePlayer.userId,
        });
      } else {
        activePlayer.hasCalledLastCard = true;
        events.push({
          type: 'callout_last_card',
          message: `${playerName} called "Last Card!" 🔔`,
          userId: activePlayer.userId,
        });
      }
    }

    // If hand has 0 cards left, must call "Check Up"
    if (activePlayer.hand.length === 0) {
      if (!params.calledCheckUp) {
        calloutPenaltyCards += state.ruleset.calloutPenalty;
        events.push({
          type: 'penalty_check_up',
          message: `${playerName} forgot to call "Check Up"! Penalty: +${state.ruleset.calloutPenalty} cards. Not winning yet!`,
          userId: activePlayer.userId,
        });
      } else {
        activePlayer.hasCalledCheckUp = true;
      }
    }

    // Apply callout penalty if incurred
    if (calloutPenaltyCards > 0) {
      ensureDrawPileCards(state, calloutPenaltyCards, rng);
      const drawn = state.drawPile.splice(0, Math.min(calloutPenaltyCards, state.drawPile.length));
      activePlayer.hand.push(...drawn);
    }
  }

  // 2. Win Check (only if hand is completely empty and no check-up penalty)
  if (activePlayer.hand.length === 0) {
    // If goOutOnSpecial is false ("Allow finishing on special cards" off),
    // a player whose last card is a special (1, 2, 5, 8, 14, 20) must draw 1 card instead of winning
    if (!state.ruleset.goOutOnSpecial && [1, 2, 5, 8, 14, 20].includes(card.number)) {
      ensureDrawPileCards(state, 1, rng);
      if (state.drawPile.length > 0) {
        activePlayer.hand.push(state.drawPile.shift()!);
      }
      events.push({
        type: 'penalty_special_finish',
        message: `${playerName} cannot finish on special card (${card.number})! Drew 1 card instead of winning.`,
        userId: activePlayer.userId,
      });
      // Fall through to card effect processing and turn continuation
    } else {
      state.gameStatus = 'completed';
      state.winnerUserId = activePlayer.userId;
      state.endedAt = Date.now();
      state.lastActionMessage = `CHECK UP! ${playerName} has won the Whot game! 🏆`;
      events.push({
        type: 'game_win',
        message: state.lastActionMessage,
        userId: activePlayer.userId,
      });
      return { success: true, state, events };
    }
  }

  // 3. Process Card Effects
  let nextPlayerIndex = getNextActivePlayerIndex(state);
  let actionDesc = `${playerName} played ${card.shape.toUpperCase()} ${card.number}.`;
  let isPlayAgain = false;
  let playAgainReason: 'general_market' | 'hold_on' | 'suspension' | null = null;
  let generalMarketActive = false;

  // Defending / Canceling pick with Whot 20
  if (card.number === 20 && state.pendingPickCount > 0 && state.ruleset.whot20DefendsAgainstPicks) {
    state.pendingPickCount = 0;
    state.pendingPickType = null;
    actionDesc += ' Whot 20 defended against the penalty!';
  }

  // Special Card: 1 (Hold On)
  if (card.number === 1 && state.ruleset.specials.holdOn) {
    state.activeShape = card.shape;
    nextPlayerIndex = state.activePlayerIndex; // Play again!
    isPlayAgain = true;
    playAgainReason = 'hold_on';
    actionDesc += ' HOLD ON! Play again.';
    events.push({ type: 'hold_on', message: `${playerName}: Hold On! Plays again.`, userId: activePlayer.userId });
  }
  // Special Card: 2 (Pick Two)
  else if (card.number === 2 && state.ruleset.specials.pickTwo) {
    state.activeShape = card.shape;
    state.pendingPickCount += 2;
    state.pendingPickType = 'pick_two';
    actionDesc += ` PICK TWO! Next player must pick ${state.pendingPickCount} or pass.`;
    events.push({ type: 'pick_two', message: actionDesc, userId: activePlayer.userId });
  }
  // Special Card: 5 (Pick Three)
  else if (card.number === 5 && state.ruleset.specials.pickThree) {
    state.activeShape = card.shape;
    state.pendingPickCount += 3;
    state.pendingPickType = 'pick_three';
    actionDesc += ` PICK THREE! Next player must pick ${state.pendingPickCount} or pass.`;
    events.push({ type: 'pick_three', message: actionDesc, userId: activePlayer.userId });
  }
  // Special Card: 8 (Suspension)
  else if (card.number === 8 && state.ruleset.specials.suspension) {
    state.activeShape = card.shape;
    const activeNonForfeited = state.players.filter((p) => !p.isForfeited);

    if (activeNonForfeited.length === 2) {
      // In a 2-player game, suspension acts as play again
      nextPlayerIndex = state.activePlayerIndex;
      isPlayAgain = true;
      playAgainReason = 'suspension';
      actionDesc += ' SUSPENSION! Opponent skipped, you play again.';
    } else {
      // Skip next player
      nextPlayerIndex = getNextActivePlayerIndex(state, 1);
      const skippedPlayer = state.players[getNextActivePlayerIndex(state, 0)];
      actionDesc += ` SUSPENSION! ${skippedPlayer.username} was skipped!`;
    }
    events.push({ type: 'suspension', message: actionDesc, userId: activePlayer.userId });
  }
  // Special Card: 14 (General Market)
  else if (card.number === 14 && state.ruleset.specials.generalMarket) {
    state.activeShape = card.shape;
    actionDesc += ' General Market! Everyone picks 1. Play again.';

    // Every other player draws 1 card from market.
    // Discard pile (except the top card 14) is reshuffled into market if market runs out.
    state.players.forEach((p, idx) => {
      if (idx !== state.activePlayerIndex && !p.isForfeited) {
        ensureDrawPileCards(state, 1, rng);
        if (state.drawPile.length > 0) {
          p.hand.push(state.drawPile.shift()!);
        }
      }
    });

    // The player who played it MUST play again (same turn).
    // If they have no playable card, they draw 1 from market and turn passes to next player.
    nextPlayerIndex = state.activePlayerIndex;
    isPlayAgain = true;
    playAgainReason = 'general_market';
    generalMarketActive = true;

    events.push({
      type: 'general_market',
      message: 'General Market! Everyone picks 1. Play again.',
      userId: activePlayer.userId,
    });
  }
  // Special Card: 20 (Whot - Wild Shape)
  else if (card.number === 20) {
    if (state.ruleset.specials.whot) {
      const chosen = params.chosenShape || 'circle';
      state.activeShape = chosen;
      actionDesc += ` WHOT! Shape requested: ${chosen.toUpperCase()}.`;
      events.push({ type: 'whot_called', message: `${playerName} called Whot shape: ${chosen.toUpperCase()}` });
    } else {
      // Plain joker: keep current active shape
      actionDesc += ' Played plain Whot (no special).';
    }
  }
  // Regular Card
  else {
    state.activeShape = card.shape;
  }

  state.activePlayerIndex = nextPlayerIndex;
  state.isPlayAgainTurn = isPlayAgain;
  state.playAgainReason = playAgainReason;
  state.generalMarketActive = generalMarketActive;
  state.turnStep += 1;
  state.lastActionMessage = actionDesc;

  return { success: true, state, events };
}

export function drawCard(
  rawState: EngineState,
  params: { userId: string; forced?: boolean; rng?: () => number }
): EngineResult {
  const state = cloneState(rawState);
  const rng = params.rng || Math.random;

  if (state.gameStatus !== 'playing') {
    return { success: false, state: rawState, error: 'Game is not currently active' };
  }

  const activePlayer = state.players[state.activePlayerIndex];
  if (!activePlayer || activePlayer.userId !== params.userId) {
    return { success: false, state: rawState, error: 'Not your turn' };
  }

  const events: { type: string; message: string; userId?: string }[] = [];
  const playerName = activePlayer.username;

  // Case A: Resolving accumulated Pick Two / Pick Three penalty
  if (state.pendingPickCount > 0) {
    const penaltyCount = state.pendingPickCount;
    ensureDrawPileCards(state, penaltyCount, rng);

    const cardsDrawn = state.drawPile.splice(0, Math.min(penaltyCount, state.drawPile.length));
    activePlayer.hand.push(...cardsDrawn);

    const message = `${playerName} picked up ${cardsDrawn.length} penalty card(s)!`;
    events.push({ type: 'penalty_drawn', message, userId: activePlayer.userId });

    state.pendingPickCount = 0;
    state.pendingPickType = null;
    state.isPlayAgainTurn = false;
    state.playAgainReason = null;
    state.generalMarketActive = false;
    state.activePlayerIndex = getNextActivePlayerIndex(state);
    state.turnStep += 1;
    state.lastActionMessage = message;

    return { success: true, state, events };
  }

  // Case B: Normal draw
  if (!params.forced && !canDraw(state, state.activePlayerIndex)) {
    return {
      success: false,
      state: rawState,
      error: 'Cannot draw while holding a playable card!',
    };
  }

  ensureDrawPileCards(state, 1, rng);
  if (state.drawPile.length > 0) {
    const drawn = state.drawPile.shift()!;
    activePlayer.hand.push(drawn);
  }

  const message = `${playerName} drew a card.`;
  events.push({ type: 'card_drawn', message, userId: activePlayer.userId });

  state.isPlayAgainTurn = false;
  state.playAgainReason = null;
  state.generalMarketActive = false;
  state.activePlayerIndex = getNextActivePlayerIndex(state);
  state.turnStep += 1;
  state.lastActionMessage = message;

  return { success: true, state, events };
}

export function forfeitPlayer(rawState: EngineState, userId: string, rng: () => number = Math.random): EngineResult {
  const state = cloneState(rawState);
  const player = state.players.find((p) => p.userId === userId);

  if (!player || player.isForfeited) {
    return { success: false, state: rawState, error: 'Player already forfeited or not found' };
  }

  player.isForfeited = true;

  // Return cards to draw pile (shuffled)
  if (player.hand.length > 0) {
    state.drawPile.push(...player.hand);
    state.drawPile = shuffleDeck(state.drawPile, rng);
    player.hand = [];
  }

  const remaining = state.players.filter((p) => !p.isForfeited);

  // If only 1 player remains, they win automatically!
  if (remaining.length === 1) {
    state.gameStatus = 'completed';
    state.winnerUserId = remaining[0].userId;
    state.endedAt = Date.now();
    state.lastActionMessage = `${remaining[0].username} wins! All other players forfeited. 🏆`;
    return {
      success: true,
      state,
      events: [{ type: 'game_win', message: state.lastActionMessage, userId: remaining[0].userId }],
    };
  }

  // If all forfeited somehow
  if (remaining.length === 0) {
    state.gameStatus = 'abandoned';
    return { success: true, state, events: [{ type: 'abandoned', message: 'Game abandoned.' }] };
  }

  // If active player forfeited, advance turn
  if (state.players[state.activePlayerIndex].userId === userId) {
    state.activePlayerIndex = getNextActivePlayerIndex(state);
    state.turnStep += 1;
  }

  state.lastActionMessage = `${player.username} has forfeited the game.`;
  return {
    success: true,
    state,
    events: [{ type: 'player_forfeited', message: state.lastActionMessage, userId }],
  };
}

export function abandonGame(rawState: EngineState): EngineResult {
  const state = cloneState(rawState);
  state.gameStatus = 'abandoned';
  state.lastActionMessage = 'Game was abandoned.';
  return {
    success: true,
    state,
    events: [{ type: 'game_abandoned', message: state.lastActionMessage }],
  };
}

// Sanitized player view: NEVER exposes opponents' private hands or the draw pile sequence!
export function getPlayerView(state: EngineState, userId: string): PlayerGameView {
  const myPlayerIndex = state.players.findIndex((p) => p.userId === userId);
  const myPlayer = state.players[myPlayerIndex];

  const opponents: OpponentView[] = state.players
    .filter((p) => p.userId !== userId)
    .map((p) => ({
      userId: p.userId,
      username: p.username,
      displayName: p.displayName,
      avatarUrl: p.avatarUrl,
      cardCount: p.hand.length,
      seatIndex: p.seatIndex,
      isConnected: p.isConnected,
      hasCalledLastCard: p.hasCalledLastCard,
    }));

  const isMyTurn = state.gameStatus === 'playing' && myPlayerIndex === state.activePlayerIndex;
  const legals = isMyTurn ? legalCardIds(state, myPlayerIndex) : [];
  const topDiscard = state.discardPile.length > 0 ? state.discardPile[state.discardPile.length - 1] : null;

  return {
    roomId: state.roomId,
    ruleset: state.ruleset,
    myUserId: userId,
    mySeatIndex: myPlayer ? myPlayer.seatIndex : -1,
    myHand: myPlayer ? myPlayer.hand : [],
    legalCardIds: legals,
    canDraw: isMyTurn ? canDraw(state, myPlayerIndex) : false,
    mustCallLastCard: myPlayer ? myPlayer.hand.length === 2 : false,
    mustCallCheckUp: myPlayer ? myPlayer.hand.length === 1 : false,
    opponents,
    topDiscard,
    activeShape: state.activeShape,
    activePlayerIndex: state.activePlayerIndex,
    activeUserId: state.players[state.activePlayerIndex]?.userId || '',
    turnDirection: state.turnDirection,
    drawPileCount: state.drawPile.length,
    discardPileCount: state.discardPile.length,
    pendingPickCount: state.pendingPickCount,
    pendingPickType: state.pendingPickType,
    isGameOver: state.gameStatus === 'completed',
    winnerUserId: state.winnerUserId,
    gameStatus: state.gameStatus,
    lastActionMessage: state.lastActionMessage,
    turnTimerSec: state.ruleset.turnTimerSec,
    isPlayAgainTurn: state.isPlayAgainTurn ?? false,
    playAgainReason: state.playAgainReason ?? null,
    generalMarketActive: state.generalMarketActive ?? false,
  };
}
