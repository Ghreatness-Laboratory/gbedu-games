// Jackpot Computer Opponent AI (Easy, Medium, Hard Bots)
import { Shape } from '@gbedu/shared';
import { JackpotCard, JackpotPlayer, JackpotWinCondition, JackpotSettings } from './types';
import { BASIC_SHAPES, countHandShapes } from './engine';

export interface BotDecision {
  cardToPass: JackpotCard;
  delayMs: number;
}

export interface BotSuspectDecision {
  targetPlayerId: string;
  shape: Shape;
}

export class JackpotBotBrain {
  // Track history of shapes passed to this bot and discarded by left neighbor
  private receivedShapesHistory: Shape[] = [];
  private leftNeighborDiscards: Shape[] = [];
  // Per-player discard tracking
  private playerDiscards: Map<string, Shape[]> = new Map();

  public recordReceivedCard(shape: Shape) {
    this.receivedShapesHistory.push(shape);
    if (this.receivedShapesHistory.length > 15) this.receivedShapesHistory.shift();
  }

  public recordLeftNeighborDiscard(shape: Shape) {
    this.leftNeighborDiscards.push(shape);
    if (this.leftNeighborDiscards.length > 15) this.leftNeighborDiscards.shift();
  }

  public recordPlayerDiscard(playerId: string, shape: Shape) {
    const list = this.playerDiscards.get(playerId) || [];
    list.push(shape);
    if (list.length > 12) list.shift();
    this.playerDiscards.set(playerId, list);
  }

  public decideCardToPass(
    bot: JackpotPlayer,
    condition: JackpotWinCondition = 'match_set',
    allowWhotWilds: boolean = true,
    difficulty: 'easy' | 'medium' | 'hard' = 'medium'
  ): BotDecision {
    const hand = bot.hand;
    if (hand.length === 0) {
      return { cardToPass: { id: 'fallback', shape: 'circle' }, delayMs: 1500 };
    }

    // 1. Mandatory Exposed Shape Check: if bot is exposed, MUST pass exposed shape!
    if (bot.isExposed && bot.exposedShape) {
      const expCard = hand.find(
        (c) => c.shape === bot.exposedShape || (allowWhotWilds && c.shape === 'whot')
      );
      if (expCard) {
        return { cardToPass: expCard, delayMs: 1000 };
      }
    }

    const { counts } = countHandShapes(hand);

    // 2. EASY BOT:
    // Passes a random card, moderate thinking delay (2.0 - 4.5s)
    if (difficulty === 'easy') {
      const delayMs = 2000 + Math.random() * 2500;
      const candidates = allowWhotWilds ? hand.filter((c) => c.shape !== 'whot') : hand;
      const pick = candidates[Math.floor(Math.random() * (candidates.length || hand.length))] || hand[0];
      return { cardToPass: pick, delayMs };
    }

    // 3. MEDIUM BOT:
    // Commits to the shape it holds the most of, passes the rest. (1.5 - 3.2s delay)
    if (difficulty === 'medium') {
      const delayMs = 1500 + Math.random() * 1800;

      if (condition === 'match_set') {
        // Target majority shape
        let bestShape: Shape = 'circle';
        let maxCount = -1;

        for (const shape of BASIC_SHAPES) {
          if (counts[shape] > maxCount) {
            maxCount = counts[shape];
            bestShape = shape;
          }
        }

        // Pass any card that is not the bestShape (keep wilds)
        const discardCandidates = hand.filter(
          (c) => c.shape !== bestShape && (allowWhotWilds ? c.shape !== 'whot' : true)
        );

        const cardToPass = discardCandidates[0] || hand[0];
        return { cardToPass, delayMs };
      } else {
        // collect_all: discard duplicate shapes first
        for (const shape of BASIC_SHAPES) {
          if (counts[shape] > 1) {
            const dup = hand.find((c) => c.shape === shape);
            if (dup) return { cardToPass: dup, delayMs };
          }
        }

        const nonWild = hand.filter((c) => (allowWhotWilds ? c.shape !== 'whot' : true));
        return { cardToPass: nonWild[0] || hand[0], delayMs };
      }
    }

    // 4. HARD BOT:
    // Adaptive tracking: checks incoming supply frequency from left neighbor
    // Quick lock-in (0.8 - 1.8s delay)
    const delayMs = 800 + Math.random() * 1000;

    if (condition === 'match_set') {
      // Score each basic shape by: current count in hand + recent influx from neighbor
      let bestScore = -Infinity;
      let targetShape: Shape = 'circle';

      for (const shape of BASIC_SHAPES) {
        const inHand = counts[shape];
        // Weight recent received history
        const influxBonus = this.receivedShapesHistory.filter((s) => s === shape).length * 0.4;
        // Penalize if left neighbor is hoarding this shape (discarding other things)
        const neighborHoardingPenalty =
          this.leftNeighborDiscards.filter((s) => s !== shape).length * 0.2;

        const totalScore = inHand * 2.5 + influxBonus - neighborHoardingPenalty;
        if (totalScore > bestScore) {
          bestScore = totalScore;
          targetShape = shape;
        }
      }

      // Keep targetShape and Whot wilds; discard non-targets
      const discards = hand.filter(
        (c) => c.shape !== targetShape && (allowWhotWilds ? c.shape !== 'whot' : true)
      );

      // Discard least valuable shape
      if (discards.length > 0) {
        discards.sort((a, b) => counts[a.shape] - counts[b.shape]);
        return { cardToPass: discards[0], delayMs };
      }

      return { cardToPass: hand[0], delayMs };
    } else {
      // collect_all
      for (const shape of BASIC_SHAPES) {
        if (counts[shape] > 1) {
          const dup = hand.find((c) => c.shape === shape);
          if (dup) return { cardToPass: dup, delayMs };
        }
      }
      const nonWild = hand.filter((c) => (allowWhotWilds ? c.shape !== 'whot' : true));
      return { cardToPass: nonWild[0] || hand[0], delayMs };
    }
  }

  // 5. Intelligent Suspect Decision Engine
  // Medium and Hard bots track which shapes they've received/seen from neighbors
  // Hard bot only accuses with strong statistical evidence (discards show shape avoidance)
  public decideSuspect(
    bot: JackpotPlayer,
    allPlayers: JackpotPlayer[],
    currentStep: number,
    settings: JackpotSettings,
    difficulty: 'easy' | 'medium' | 'hard' = 'medium'
  ): BotSuspectDecision | null {
    if (settings.suspectTokensPerRound === 0) return null;
    if (bot.suspectTokens <= 0 || bot.isSkipped) return null;

    // Check 5s cooldown
    const now = Date.now();
    if (bot.lastSuspectTimestamp && now - bot.lastSuspectTimestamp < 5000) {
      return null;
    }

    // Eligible opponents (not self, not currently exposed)
    const opponents = allPlayers.filter((p) => p.id !== bot.id && !p.isExposed);
    if (opponents.length === 0) return null;

    if (difficulty === 'easy') {
      // Easy bots almost never suspect
      return null;
    }

    if (difficulty === 'medium') {
      // Medium bot considers suspecting after step 3 if it has 2 tokens
      if (currentStep < 3 || bot.suspectTokens < 1) return null;
      if (Math.random() > 0.18) return null; // sparingly

      // Pick an opponent who hasn't discarded shape X recently
      const target = opponents[Math.floor(Math.random() * opponents.length)];
      const discards = this.playerDiscards.get(target.id) || [];

      // Find a shape that this target has NEVER discarded in last 3 rounds
      const withheldShapes = BASIC_SHAPES.filter((s) => !discards.includes(s));
      if (withheldShapes.length > 0) {
        const pickedShape = withheldShapes[Math.floor(Math.random() * withheldShapes.length)];
        return { targetPlayerId: target.id, shape: pickedShape };
      }
      return null;
    }

    if (difficulty === 'hard') {
      // Hard bot: analytical deduction!
      // Requires at least step 2 and evidence of shape hoarding
      if (currentStep < 2) return null;

      const { counts: botCounts } = countHandShapes(bot.hand);

      for (const target of opponents) {
        const discards = this.playerDiscards.get(target.id) || [];
        if (discards.length < 2) continue;

        // Check if target has repeatedly discarded 2+ shapes, indicating they are collecting a different shape
        for (const candidateShape of BASIC_SHAPES) {
          // If the bot holds few or zero of this shape, the probability opponent has 3+ is high
          if (botCounts[candidateShape] <= 1 && !discards.includes(candidateShape)) {
            // Discard count of other shapes is high (at least 2 consecutive non-candidate discards)
            const otherDiscards = discards.filter((d) => d !== candidateShape).length;
            if (otherDiscards >= 2) {
              return { targetPlayerId: target.id, shape: candidateShape };
            }
          }
        }
      }
      return null;
    }

    return null;
  }

  // Calculate Jackpot Call reaction time when winning
  public getJackpotCallReactionDelay(difficulty: 'easy' | 'medium' | 'hard'): number {
    switch (difficulty) {
      case 'easy':
        return 1200 + Math.random() * 900; // 1.2 - 2.1s
      case 'medium':
        return 700 + Math.random() * 600; // 0.7 - 1.3s
      case 'hard':
        return 420 + Math.random() * 380; // 0.42 - 0.8s
    }
  }
}
