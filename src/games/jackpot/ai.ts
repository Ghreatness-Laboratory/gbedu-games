// Jackpot Computer Opponent AI (Easy, Medium, Hard Bots)
import { Shape } from '@gbedu/shared';
import { JackpotCard, JackpotPlayer, JackpotWinCondition } from './types';
import { BASIC_SHAPES, checkWinningHand, countHandShapes } from './engine';

export interface BotDecision {
  cardToPass: JackpotCard;
  delayMs: number;
}

export class JackpotBotBrain {
  // Track history of shapes passed to this bot and discarded by left neighbor
  private receivedShapesHistory: Shape[] = [];
  private leftNeighborDiscards: Shape[] = [];

  public recordReceivedCard(shape: Shape) {
    this.receivedShapesHistory.push(shape);
    if (this.receivedShapesHistory.length > 15) this.receivedShapesHistory.shift();
  }

  public recordLeftNeighborDiscard(shape: Shape) {
    this.leftNeighborDiscards.push(shape);
    if (this.leftNeighborDiscards.length > 15) this.leftNeighborDiscards.shift();
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

    const { counts, wildCount } = countHandShapes(hand);

    // 1. EASY BOT:
    // Passes a random card, moderate thinking delay (2.0 - 4.5s)
    if (difficulty === 'easy') {
      const delayMs = 2000 + Math.random() * 2500;
      // Filter out wilds if possible, else random card
      const candidates = allowWhotWilds ? hand.filter((c) => c.shape !== 'whot') : hand;
      const pick = candidates[Math.floor(Math.random() * (candidates.length || hand.length))] || hand[0];
      return { cardToPass: pick, delayMs };
    }

    // 2. MEDIUM BOT:
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

    // 3. HARD BOT:
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
        // Sort by least common in hand
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
