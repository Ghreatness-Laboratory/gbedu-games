// Gbedu Pool AI Engine (Easy, Medium, and Hard AI Bot Decision Making)
import { PoolBall, PoolPocket, TableGeometry, ShotParameters, BallGroup } from './types';

export interface BotShotDecision extends ShotParameters {
  targetBallId: number;
  expectedPocketId: number | null;
  confidence: number;
}

export function computeBotShot(
  allBalls: PoolBall[],
  pockets: PoolPocket[],
  geom: TableGeometry,
  playerGroup: BallGroup | null,
  difficulty: 'easy' | 'medium' | 'hard' = 'medium',
  isBreakShot: boolean = false
): BotShotDecision {
  const cueBall = allBalls.find((b) => b.id === 0);
  if (!cueBall || cueBall.isPocketed) {
    return {
      angle: 0,
      power: 0.6,
      spinX: 0,
      spinY: 0,
      calledPocket: null,
      targetBallId: 1,
      expectedPocketId: null,
      confidence: 0.5,
    };
  }

  // 1. BREAK SHOT SPECIAL LOGIC
  if (isBreakShot) {
    // Break shot from head-string aiming at apex ball #1 with slight random offset
    const apexBall = allBalls.find((b) => b.id === 1 && !b.isPocketed) || allBalls.find((b) => b.id !== 0 && !b.isPocketed);
    if (apexBall) {
      const dx = apexBall.x - cueBall.x;
      const dy = apexBall.y - cueBall.y;
      const baseAngle = Math.atan2(dy, dx);
      // Hard hits center with slight top spin, easy/medium has slight wobble
      const jitter = difficulty === 'hard' ? 0.005 : difficulty === 'medium' ? 0.02 : 0.05;
      const angle = baseAngle + (Math.random() - 0.5) * jitter;
      const power = difficulty === 'hard' ? 0.95 : difficulty === 'medium' ? 0.88 : 0.78;
      return {
        angle,
        power,
        spinX: (Math.random() - 0.5) * 0.2,
        spinY: 0.3, // Top spin forward drive
        calledPocket: null,
        targetBallId: apexBall.id,
        expectedPocketId: null,
        confidence: 0.9,
      };
    }
  }

  // 2. DETERMINE LEGAL TARGET BALLS
  const activeBalls = allBalls.filter((b) => b.id !== 0 && !b.isPocketed);
  const remainingSolids = activeBalls.filter((b) => b.number <= 7);
  const remainingStripes = activeBalls.filter((b) => b.number >= 9 && b.number <= 15);
  const eightBall = activeBalls.find((b) => b.number === 8);

  let eligibleBalls: PoolBall[] = [];

  if (playerGroup === 'solids') {
    if (remainingSolids.length > 0) {
      eligibleBalls = remainingSolids;
    } else if (eightBall) {
      eligibleBalls = [eightBall];
    }
  } else if (playerGroup === 'stripes') {
    if (remainingStripes.length > 0) {
      eligibleBalls = remainingStripes;
    } else if (eightBall) {
      eligibleBalls = [eightBall];
    }
  } else {
    // Open table: can hit any ball 1-15 except 8-ball
    eligibleBalls = activeBalls.filter((b) => b.number !== 8);
    if (eligibleBalls.length === 0 && eightBall) {
      eligibleBalls = [eightBall];
    }
  }

  if (eligibleBalls.length === 0) {
    eligibleBalls = activeBalls;
  }

  // 3. CANDIDATE SHOT EVALUATION
  interface CandidateShot {
    targetBall: PoolBall;
    pocket: PoolPocket;
    angle: number;
    cutAngle: number;
    power: number;
    spinX: number;
    spinY: number;
    score: number; // Higher is better
  }

  const candidateShots: CandidateShot[] = [];
  const r = geom.ballRadius;

  for (const target of eligibleBalls) {
    for (const pocket of pockets) {
      // Vector from pocket to target ball
      const pToTdx = target.x - pocket.x;
      const pToTdy = target.y - pocket.y;
      const distTargetToPocket = Math.hypot(pToTdx, pToTdy);
      if (distTargetToPocket < 1) continue;

      const normPdx = pToTdx / distTargetToPocket;
      const normPdy = pToTdy / distTargetToPocket;

      // Ghost ball position (where cue ball center must be when hitting target)
      const ghostX = target.x + normPdx * (r * 2);
      const ghostY = target.y + normPdy * (r * 2);

      // Vector from cue ball to ghost ball
      const cueToGdx = ghostX - cueBall.x;
      const cueToGdy = ghostY - cueBall.y;
      const distCueToGhost = Math.hypot(cueToGdx, cueToGdy);
      if (distCueToGhost < 1) continue;

      const shotAngle = Math.atan2(cueToGdy, cueToGdx);

      // Cut angle: angle between cue-to-ghost direction and target-to-pocket direction
      // Direction of target to pocket is (-normPdx, -normPdy)
      const targetDirX = -normPdx;
      const targetDirY = -normPdy;
      const cueDirX = cueToGdx / distCueToGhost;
      const cueDirY = cueToGdy / distCueToGhost;

      const dotCut = Math.max(-1, Math.min(1, cueDirX * targetDirX + cueDirY * targetDirY));
      const cutAngle = Math.acos(dotCut); // in radians (0 = straight in, PI/2 = 90 deg cut)

      // Extreme cuts (> 75 degrees = ~1.3 rad) are nearly unmakeable
      if (cutAngle > 1.3) continue;

      // Check obstacle collisions between cue and ghost ball
      let cuePathBlocked = false;
      for (const obstacle of activeBalls) {
        if (obstacle.id === target.id) continue;
        const ox = obstacle.x - cueBall.x;
        const oy = obstacle.y - cueBall.y;
        const proj = ox * cueDirX + oy * cueDirY;
        if (proj > r && proj < distCueToGhost - r) {
          const perpSq = ox * ox + oy * oy - proj * proj;
          if (perpSq < (r * 2.05) ** 2) {
            cuePathBlocked = true;
            break;
          }
        }
      }
      if (cuePathBlocked) continue;

      // Check obstacle collisions between target ball and pocket
      let pocketPathBlocked = false;
      for (const obstacle of activeBalls) {
        if (obstacle.id === target.id) continue;
        const ox = obstacle.x - target.x;
        const oy = obstacle.y - target.y;
        const proj = ox * targetDirX + oy * targetDirY;
        if (proj > r && proj < distTargetToPocket - pocket.radius) {
          const perpSq = ox * ox + oy * oy - proj * proj;
          if (perpSq < (r * 2.05) ** 2) {
            pocketPathBlocked = true;
            break;
          }
        }
      }
      if (pocketPathBlocked) continue;

      // Calculate shot score
      // Preferred: straight-in (low cut angle), close to pocket, close to cue
      const straightnessFactor = Math.cos(cutAngle); // 1.0 = direct, 0 = 90 deg
      const pocketDistFactor = Math.max(0.1, 1 - distTargetToPocket / (geom.feltH * 0.9));
      const cueDistFactor = Math.max(0.1, 1 - distCueToGhost / (geom.feltH * 0.9));

      let score = straightnessFactor * 50 + pocketDistFactor * 30 + cueDistFactor * 20;

      // If targeting 8-ball when valid, give huge bonus
      if (target.id === 8 && eligibleBalls.length === 1) {
        score += 40;
      }

      // Check risk of cue scratch along deflection line
      if (difficulty === 'hard') {
        pockets.forEach((p) => {
          const pdist = Math.hypot(p.x - cueBall.x, p.y - cueBall.y);
          if (pdist < r * 6) {
            score -= 15;
          }
        });
      }

      // Required power based on distance
      const totalDistance = distCueToGhost + distTargetToPocket;
      const basePower = Math.min(0.85, Math.max(0.35, (totalDistance / (geom.feltH * 1.1)) * 0.65 + 0.25));

      candidateShots.push({
        targetBall: target,
        pocket,
        angle: shotAngle,
        cutAngle,
        power: basePower,
        spinX: 0,
        spinY: difficulty === 'hard' && cutAngle > 0.5 ? -0.2 : 0,
        score,
      });
    }
  }

  // 4. SORT BY SCORE & APPLY DIFFICULTY ACCURACY
  if (candidateShots.length > 0) {
    candidateShots.sort((a, b) => b.score - a.score);

    let chosen = candidateShots[0];
    let angleNoise = 0;
    let powerNoise = 0;

    if (difficulty === 'easy') {
      // Pick randomly from top 3 candidates, with wider error
      const idx = Math.min(candidateShots.length - 1, Math.floor(Math.random() * 3));
      chosen = candidateShots[idx];
      angleNoise = (Math.random() - 0.5) * 0.09; // ± 5.1 degrees
      powerNoise = (Math.random() - 0.5) * 0.2;
    } else if (difficulty === 'medium') {
      // Top 2 candidates with moderate error
      const idx = Math.min(candidateShots.length - 1, Math.random() < 0.7 ? 0 : 1);
      chosen = candidateShots[idx];
      angleNoise = (Math.random() - 0.5) * 0.035; // ± 2.0 degrees
      powerNoise = (Math.random() - 0.5) * 0.1;
    } else {
      // Hard: best candidate with surgical laser accuracy
      chosen = candidateShots[0];
      angleNoise = (Math.random() - 0.5) * 0.008; // ± 0.4 degrees
      powerNoise = (Math.random() - 0.5) * 0.03;
    }

    const finalAngle = chosen.angle + angleNoise;
    const finalPower = Math.max(0.25, Math.min(0.95, chosen.power + powerNoise));

    return {
      angle: finalAngle,
      power: finalPower,
      spinX: chosen.spinX,
      spinY: chosen.spinY,
      calledPocket: chosen.targetBall.id === 8 ? chosen.pocket.id : null,
      targetBallId: chosen.targetBall.id,
      expectedPocketId: chosen.pocket.id,
      confidence: Math.min(1.0, chosen.score / 100),
    };
  }

  // 5. FALLBACK DEFENSIVE / CONTACT SHOT IF NO DIRECT POT EXISTS
  // Simply aim directly at the nearest eligible ball to make legal contact and avoid foul
  const nearestTarget = eligibleBalls.reduce((closest, curr) => {
    const dCurr = Math.hypot(curr.x - cueBall.x, curr.y - cueBall.y);
    const dClosest = Math.hypot(closest.x - cueBall.x, closest.y - cueBall.y);
    return dCurr < dClosest ? curr : closest;
  }, eligibleBalls[0]);

  const dx = nearestTarget.x - cueBall.x;
  const dy = nearestTarget.y - cueBall.y;
  const baseAngle = Math.atan2(dy, dx);
  const angle = baseAngle + (Math.random() - 0.5) * (difficulty === 'hard' ? 0.02 : 0.08);
  const power = difficulty === 'hard' ? 0.55 : 0.45;

  return {
    angle,
    power,
    spinX: 0,
    spinY: 0,
    calledPocket: nearestTarget.id === 8 ? 0 : null,
    targetBallId: nearestTarget.id,
    expectedPocketId: null,
    confidence: 0.3,
  };
}
