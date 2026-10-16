// Biro Battle AI Engine (Easy, Medium, Hard Bot Decisions)

import { PenBody, PlatformType, Obstacle, Vector2D } from './types';
import { isPenOutOfBounds, resolvePenCollision, stepPenPhysics } from './physics';

export interface BotFlickDecision {
  angle: number;   // radians (direction to travel)
  power: number;   // 0.2 to 1.0
  targetPenId?: string;
}

export function calculateBotFlick(
  botPen: PenBody,
  allPens: PenBody[],
  difficulty: 'easy' | 'medium' | 'hard',
  platformType: PlatformType,
  platWidth: number,
  platHeight: number,
  centerX: number,
  centerY: number,
  shrinkFactor: number = 1.0,
  obstacles: Obstacle[] = []
): BotFlickDecision {
  // Filter active opponents
  const opponents = allPens.filter((p) => p.id !== botPen.id && !p.isEliminated);
  if (opponents.length === 0) {
    return { angle: Math.random() * Math.PI * 2, power: 0.5 };
  }

  // 1. EASY BOT:
  // Random opponent, rough aim (+- 25 degrees noise), random power (40%-75%)
  if (difficulty === 'easy') {
    const target = opponents[Math.floor(Math.random() * opponents.length)];
    const dx = target.x - botPen.x;
    const dy = target.y - botPen.y;
    const baseAngle = Math.atan2(dy, dx);
    const noise = (Math.random() - 0.5) * 0.85; // +/- 24 deg
    const power = 0.4 + Math.random() * 0.35;
    return { angle: baseAngle + noise, power, targetPenId: target.id };
  }

  // 2. MEDIUM BOT:
  // Aims at the nearest opponent pen, biased toward pushing them off their closest platform edge
  if (difficulty === 'medium') {
    // Sort opponents by proximity to bot
    const sortedByDist = [...opponents].sort((a, b) => {
      const da = Math.hypot(a.x - botPen.x, a.y - botPen.y);
      const db = Math.hypot(b.x - botPen.x, b.y - botPen.y);
      return da - db;
    });

    const target = sortedByDist[0];

    // Find target's nearest edge vector from center
    const edgeDirX = target.x - centerX;
    const edgeDirY = target.y - centerY;
    const edgeDist = Math.hypot(edgeDirX, edgeDirY) || 1;

    // Ideal attack angle puts bot behind target relative to the nearest edge
    const directDx = target.x - botPen.x;
    const directDy = target.y - botPen.y;
    const directAngle = Math.atan2(directDy, directDx);

    // Blend direct aim with push-out vector
    const pushAngle = Math.atan2(edgeDirY / edgeDist, edgeDirX / edgeDist);
    const blendedAngle = directAngle * 0.75 + pushAngle * 0.25;

    // Small human-like error (+/- 8 deg)
    const noise = (Math.random() - 0.5) * 0.28;
    const distToTarget = Math.hypot(directDx, directDy);

    // Scale power with distance
    const power = Math.min(0.95, Math.max(0.5, 0.45 + (distToTarget / 280) * 0.5));

    return {
      angle: blendedAngle + noise,
      power,
      targetPenId: target.id,
    };
  }

  // 3. HARD BOT (Predictive Simulation & Risk Avoidance):
  // Evaluates multiple candidate flicks using a fast micro-simulation.
  // Goal: Maximize displacement of opponents toward/off the edge,
  // while ensuring the bot's own pen stays safely inside the platform!
  const candidateAngles: number[] = [];
  const candidatePowers = [0.55, 0.75, 0.95];

  // Generate candidate angles towards all active opponents
  opponents.forEach((target) => {
    const baseAngle = Math.atan2(target.y - botPen.y, target.x - botPen.x);
    // Test center hit, slight left glance, and slight right glance
    candidateAngles.push(baseAngle);
    candidateAngles.push(baseAngle - 0.15);
    candidateAngles.push(baseAngle + 0.15);
    candidateAngles.push(baseAngle - 0.3);
    candidateAngles.push(baseAngle + 0.3);
  });

  let bestScore = -Infinity;
  let bestDecision: BotFlickDecision = {
    angle: candidateAngles[0] || 0,
    power: 0.8,
    targetPenId: opponents[0]?.id,
  };

  const MAX_SPEED = 24;

  for (const angle of candidateAngles) {
    for (const power of candidatePowers) {
      // Clone pens state for simulation
      const simBot: PenBody = {
        ...botPen,
        vx: Math.cos(angle) * (power * MAX_SPEED),
        vy: Math.sin(angle) * (power * MAX_SPEED),
        omega: (Math.random() - 0.5) * 0.2,
      };

      const simOpponents = opponents.map((op) => ({ ...op }));

      // Run forward simulation for 35 frames
      let botEliminated = false;
      let opponentEliminated = false;
      let minOpponentEdgeDist = Infinity;

      for (let step = 0; step < 35; step++) {
        stepPenPhysics(simBot);

        // Check if bot falls off
        if (
          isPenOutOfBounds(
            simBot,
            platformType,
            platWidth,
            platHeight,
            centerX,
            centerY,
            shrinkFactor
          )
        ) {
          botEliminated = true;
          break;
        }

        // Check collisions with opponents
        for (const op of simOpponents) {
          if (op.isEliminated) continue;
          resolvePenCollision(simBot, op);
          stepPenPhysics(op);

          if (
            isPenOutOfBounds(
              op,
              platformType,
              platWidth,
              platHeight,
              centerX,
              centerY,
              shrinkFactor
            )
          ) {
            op.isEliminated = true;
            opponentEliminated = true;
          } else {
            // Distance from platform center (higher = closer to falling)
            const dCenter = Math.hypot(op.x - centerX, op.y - centerY);
            minOpponentEdgeDist = Math.min(minOpponentEdgeDist, 1000 - dCenter);
          }
        }
      }

      // Compute utility score
      let score = 0;
      if (botEliminated) {
        score -= 10000; // Never choose a self-eliminating flick!
      } else {
        if (opponentEliminated) {
          score += 5000; // Massive reward for knocking an opponent off!
        }
        // Reward pushing opponents near the edge
        score += (1000 - minOpponentEdgeDist) * 2;

        // Reward bot staying safe near platform center
        const botDistFromCenter = Math.hypot(simBot.x - centerX, simBot.y - centerY);
        score -= botDistFromCenter * 1.5;
      }

      if (score > bestScore) {
        bestScore = score;
        bestDecision = { angle, power, targetPenId: opponents[0]?.id };
      }
    }
  }

  return bestDecision;
}
