// Gbedu Pool Physics Engine (Deterministic 2D Rigid Body Mechanics, Collisions & 8-Ball Rules)
import {
  PoolBall,
  PoolPocket,
  TableGeometry,
  CushionSegment,
  TrajectoryProjection,
  TurnOutcome,
  BallGroup,
  PoolPlayer,
} from './types';

// Standard 8-ball rack pattern (15 balls in triangle)
// Row 1: 1 ball
// Row 2: 2 balls
// Row 3: 3 balls (8-ball in center!)
// Row 4: 4 balls
// Row 5: 5 balls (corner 1 solid, corner 2 stripe)
export const RACK_LAYOUT = [
  1,             // Apex (solid)
  9, 2,          // Row 2 (stripe, solid)
  3, 8, 10,      // Row 3 (solid, 8-BALL IN CENTER, stripe)
  11, 4, 12, 5,  // Row 4
  13, 6, 14, 7, 15, // Row 5 (back corners: 13 stripe, 15 stripe, 7 solid)
];

// Initialize standard 16 balls on portrait table
export function initializeRack(geom: TableGeometry): PoolBall[] {
  const balls: PoolBall[] = [];
  const r = geom.ballRadius;
  const cx = geom.feltX + geom.feltW / 2;
  const footY = geom.footSpotY;

  // 1. Cue Ball placed behind head-string line
  balls.push({
    id: 0,
    number: 0,
    type: 'cue',
    color: '#ffffff',
    x: cx,
    y: geom.headStringY,
    vx: 0,
    vy: 0,
    radius: r,
    isPocketed: false,
  });

  // 2. Triangle Rack at Foot Spot
  // In portrait: apex faces down towards head-string (towards break shot)
  const dy = -r * Math.sqrt(3) * 1.02; // Row spacing going upwards
  const dx = r * 2.04;

  let ballIdx = 0;
  for (let row = 0; row < 5; row++) {
    const rowY = footY + row * dy;
    const startX = cx - (row * dx) / 2;

    for (let col = 0; col <= row; col++) {
      const num = RACK_LAYOUT[ballIdx++];
      const x = startX + col * dx;
      const y = rowY;

      let type: 'solid' | 'stripe' | '8ball' = 'solid';
      if (num === 8) type = '8ball';
      else if (num >= 9) type = 'stripe';

      balls.push({
        id: num,
        number: num,
        type,
        color: '', // handled by renderer
        x,
        y,
        vx: 0,
        vy: 0,
        radius: r,
        isPocketed: false,
      });
    }
  }

  return balls;
}

// Generate the 6 Pockets
export function createPockets(geom: TableGeometry): PoolPocket[] {
  const fx = geom.feltX;
  const fy = geom.feltY;
  const fw = geom.feltW;
  const fh = geom.feltH;
  const cornerR = geom.ballRadius * 1.95;
  const sideR = geom.ballRadius * 1.85;

  return [
    { id: 0, name: 'Top Left', x: fx, y: fy, radius: cornerR, mouthRadius: cornerR * 1.15 },
    { id: 1, name: 'Top Right', x: fx + fw, y: fy, radius: cornerR, mouthRadius: cornerR * 1.15 },
    { id: 2, name: 'Middle Left', x: fx, y: fy + fh / 2, radius: sideR, mouthRadius: sideR * 1.1 },
    { id: 3, name: 'Middle Right', x: fx + fw, y: fy + fh / 2, radius: sideR, mouthRadius: sideR * 1.1 },
    { id: 4, name: 'Bottom Left', x: fx, y: fy + fh, radius: cornerR, mouthRadius: cornerR * 1.15 },
    { id: 5, name: 'Bottom Right', x: fx + fw, y: fy + fh, radius: cornerR, mouthRadius: cornerR * 1.15 },
  ];
}

// Cushion Rail Segments (top, bottom, and split side rails)
export function createCushions(geom: TableGeometry): CushionSegment[] {
  const fx = geom.feltX;
  const fy = geom.feltY;
  const fw = geom.feltW;
  const fh = geom.feltH;
  const cornerIndent = geom.ballRadius * 1.9;
  const sideIndent = geom.ballRadius * 1.7;

  return [
    // Top Cushion (Between TL and TR pockets)
    {
      id: 'top',
      p1: { x: fx + cornerIndent, y: fy },
      p2: { x: fx + fw - cornerIndent, y: fy },
      normal: { x: 0, y: 1 },
    },
    // Bottom Cushion (Between BL and BR pockets)
    {
      id: 'bottom',
      p1: { x: fx + cornerIndent, y: fy + fh },
      p2: { x: fx + fw - cornerIndent, y: fy + fh },
      normal: { x: 0, y: -1 },
    },
    // Left-Top Cushion (Between TL and Middle Left)
    {
      id: 'left_top',
      p1: { x: fx, y: fy + cornerIndent },
      p2: { x: fx, y: fy + fh / 2 - sideIndent },
      normal: { x: 1, y: 0 },
    },
    // Left-Bottom Cushion (Between Middle Left and BL)
    {
      id: 'left_bottom',
      p1: { x: fx, y: fy + fh / 2 + sideIndent },
      p2: { x: fx, y: fy + fh - cornerIndent },
      normal: { x: 1, y: 0 },
    },
    // Right-Top Cushion (Between TR and Middle Right)
    {
      id: 'right_top',
      p1: { x: fx + fw, y: fy + cornerIndent },
      p2: { x: fx + fw, y: fy + fh / 2 - sideIndent },
      normal: { x: -1, y: 0 },
    },
    // Right-Bottom Cushion (Between Middle Right and BR)
    {
      id: 'right_bottom',
      p1: { x: fx + fw, y: fy + fh / 2 + sideIndent },
      p2: { x: fx + fw, y: fy + fh - cornerIndent },
      normal: { x: -1, y: 0 },
    },
  ];
}

// Sub-step Physics Integration with Elastic Impulse & Energy Transfer
export function stepPoolPhysics(
  balls: PoolBall[],
  cushions: CushionSegment[],
  pockets: PoolPocket[],
  callbacks?: {
    onBallCollision?: (vRel: number) => void;
    onCushionCollision?: (speed: number) => void;
    onPocketDrop?: (ball: PoolBall, pocket: PoolPocket) => void;
  }
): { newlyPocketed: number[]; cushionHitCount: number; firstContactBallId: number | null } {
  const SUBSTEPS = 4;
  const newlyPocketed: number[] = [];
  let cushionHitCount = 0;
  let firstContactBallId: number | null = null;

  for (let step = 0; step < SUBSTEPS; step++) {
    // 1. Move balls and apply rolling kinetic friction
    balls.forEach((b) => {
      if (b.isPocketed) return;

      b.x += b.vx / SUBSTEPS;
      b.y += b.vy / SUBSTEPS;

      // Natural rolling friction on felt (smooth deceleration)
      const friction = Math.pow(0.988, 1 / SUBSTEPS);
      b.vx *= friction;
      b.vy *= friction;

      // Stop threshold
      const speedSq = b.vx * b.vx + b.vy * b.vy;
      if (speedSq < 0.004) {
        b.vx = 0;
        b.vy = 0;
      }
    });

    // 2. Ball-to-Ball Elastic Collisions
    for (let i = 0; i < balls.length; i++) {
      for (let j = i + 1; j < balls.length; j++) {
        const b1 = balls[i];
        const b2 = balls[j];
        if (b1.isPocketed || b2.isPocketed) continue;

        const dx = b2.x - b1.x;
        const dy = b2.y - b1.y;
        const distSq = dx * dx + dy * dy;
        const minDist = b1.radius + b2.radius;

        if (distSq < minDist * minDist) {
          const dist = Math.sqrt(distSq) || 0.001;
          const nx = dx / dist;
          const ny = dy / dist;

          // Record first contact of cue ball
          if (b1.id === 0 && firstContactBallId === null) {
            firstContactBallId = b2.id;
          } else if (b2.id === 0 && firstContactBallId === null) {
            firstContactBallId = b1.id;
          }

          // Positional overlap resolution (push apart equally)
          const overlap = minDist - dist;
          b1.x -= nx * (overlap * 0.5);
          b1.y -= ny * (overlap * 0.5);
          b2.x += nx * (overlap * 0.5);
          b2.y += ny * (overlap * 0.5);

          // Relative velocity along normal
          const kx = b1.vx - b2.vx;
          const ky = b1.vy - b2.vy;
          const p = 2 * (nx * kx + ny * ky) / 2; // Equal mass = 1

          // Restitution (elastic collision ~0.94)
          const RESTITUTION = 0.94;
          if (p > 0) {
            b1.vx -= p * nx * ((1 + RESTITUTION) / 2);
            b1.vy -= p * ny * ((1 + RESTITUTION) / 2);
            b2.vx += p * nx * ((1 + RESTITUTION) / 2);
            b2.vy += p * ny * ((1 + RESTITUTION) / 2);

            if (callbacks?.onBallCollision && p > 0.4) {
              callbacks.onBallCollision(p);
            }
          }
        }
      }
    }

    // 3. Ball-to-Cushion Collisions
    balls.forEach((b) => {
      if (b.isPocketed) return;

      cushions.forEach((cush) => {
        // Point to line segment distance
        const segDx = cush.p2.x - cush.p1.x;
        const segDy = cush.p2.y - cush.p1.y;
        const segLenSq = segDx * segDx + segDy * segDy;

        const t = Math.max(0, Math.min(1, ((b.x - cush.p1.x) * segDx + (b.y - cush.p1.y) * segDy) / segLenSq));
        const projX = cush.p1.x + t * segDx;
        const projY = cush.p1.y + t * segDy;

        const distDx = b.x - projX;
        const distDy = b.y - projY;
        const distSq = distDx * distDx + distDy * distDy;

        if (distSq < b.radius * b.radius) {
          const dist = Math.sqrt(distSq) || 0.001;
          const nx = cush.normal.x;
          const ny = cush.normal.y;

          // Repel from cushion
          b.x = projX + nx * (b.radius + 0.1);
          b.y = projY + ny * (b.radius + 0.1);

          // Dot product of velocity with cushion normal
          const dot = b.vx * nx + b.vy * ny;
          if (dot < 0) {
            const CUSHION_RESTITUTION = 0.82;
            b.vx = (b.vx - (1 + CUSHION_RESTITUTION) * dot * nx);
            b.vy = (b.vy - (1 + CUSHION_RESTITUTION) * dot * ny);
            cushionHitCount++;

            if (callbacks?.onCushionCollision && Math.abs(dot) > 0.4) {
              callbacks.onCushionCollision(Math.abs(dot));
            }
          }
        }
      });
    });

    // 4. Pocket Capture Check
    balls.forEach((b) => {
      if (b.isPocketed) return;

      for (const pocket of pockets) {
        const pdx = b.x - pocket.x;
        const pdy = b.y - pocket.y;
        const pdistSq = pdx * pdx + pdy * pdy;

        // Ball center enters pocket capture mouth
        if (pdistSq < pocket.mouthRadius * pocket.mouthRadius) {
          b.isPocketed = true;
          b.vx = 0;
          b.vy = 0;
          b.pocketAnim = {
            progress: 0,
            scale: 1.0,
            targetX: pocket.x,
            targetY: pocket.y,
          };
          newlyPocketed.push(b.id);

          if (callbacks?.onPocketDrop) {
            callbacks.onPocketDrop(b, pocket);
          }
          break;
        }
      }
    });
  }

  return { newlyPocketed, cushionHitCount, firstContactBallId };
}

// Raycast Trajectory Prediction (Ghost ball contact and deflection path)
export function projectTrajectory(
  cueBall: PoolBall,
  aimAngle: number,
  allBalls: PoolBall[],
  geom: TableGeometry
): TrajectoryProjection {
  const r = cueBall.radius;
  const dirX = Math.cos(aimAngle);
  const dirY = Math.sin(aimAngle);

  let closestHitDist = 700;
  let hitBall: PoolBall | null = null;
  let ghostBallPos: { x: number; y: number } | null = null;

  // Check object balls along ray
  for (const b of allBalls) {
    if (b.id === 0 || b.isPocketed) continue;

    // Vector from cue to object ball
    const ox = b.x - cueBall.x;
    const oy = b.y - cueBall.y;

    // Projection along aim line
    const proj = ox * dirX + oy * dirY;
    if (proj <= 0) continue; // Behind cue ball

    // Perpendicular distance squared
    const perpSq = ox * ox + oy * oy - proj * proj;
    const combinedRadius = r * 2;

    if (perpSq < combinedRadius * combinedRadius) {
      // Intersection distance
      const d = proj - Math.sqrt(combinedRadius * combinedRadius - perpSq);
      if (d > 0 && d < closestHitDist) {
        closestHitDist = d;
        hitBall = b;
        ghostBallPos = {
          x: cueBall.x + dirX * d,
          y: cueBall.y + dirY * d,
        };
      }
    }
  }

  if (hitBall && ghostBallPos) {
    // Normal vector from ghost ball center to object ball center
    const nx = hitBall.x - ghostBallPos.x;
    const ny = hitBall.y - ghostBallPos.y;
    const len = Math.hypot(nx, ny) || 1;
    const normX = nx / len;
    const normY = ny / len;

    // Object ball departure vector
    const objLineLen = 65;
    const objectBallLine = {
      x1: hitBall.x,
      y1: hitBall.y,
      x2: hitBall.x + normX * objLineLen,
      y2: hitBall.y + normY * objLineLen,
    };

    // Cue ball 90-degree tangent deflection line
    const tangX = -normY;
    const tangY = normX;
    // Check which direction of tangent aligns with initial shot direction
    const dotTang = dirX * tangX + dirY * tangY;
    const sign = dotTang >= 0 ? 1 : -1;
    const cueDeflectLen = 45;

    const cueBallDeflectionLine = {
      x1: ghostBallPos.x,
      y1: ghostBallPos.y,
      x2: ghostBallPos.x + tangX * sign * cueDeflectLen,
      y2: ghostBallPos.y + tangY * sign * cueDeflectLen,
    };

    return {
      ghostBall: ghostBallPos,
      hitBallId: hitBall.id,
      objectBallLine,
      cueBallDeflectionLine,
      cushionHitPoint: null,
    };
  }

  // No ball hit -> Aim line hits cushion
  const cushionHit = {
    x: cueBall.x + dirX * closestHitDist,
    y: cueBall.y + dirY * closestHitDist,
  };

  return {
    ghostBall: null,
    hitBallId: null,
    objectBallLine: null,
    cueBallDeflectionLine: null,
    cushionHitPoint: cushionHit,
  };
}

// Check if all active balls on table have come to a complete stop
export function areAllBallsStopped(balls: PoolBall[]): boolean {
  return balls.every((b) => {
    if (b.isPocketed) return true;
    return b.vx === 0 && b.vy === 0;
  });
}

// 8-Ball Rules Referee & Turn Arbiter
export function evaluateTurnOutcome(
  shooter: PoolPlayer,
  opponent: PoolPlayer,
  allBalls: PoolBall[],
  firstBallHitId: number | null,
  newlyPocketed: number[],
  cushionHitsAfterContact: number,
  calledPocket: number | null,
  isBreakShot: boolean,
  eightBallOnBreakSetting: 're_rack' | 'win' = 're_rack'
): TurnOutcome {
  const cueScratched = newlyPocketed.includes(0);
  const eightBallPocketed = newlyPocketed.includes(8);

  const shooterGroup = shooter.group; // 'solids' | 'stripes' | null
  const opponentGroup = opponent.group;

  // Remaining balls on table in shooter's group
  const shooterGroupRemaining = allBalls.filter((b) => {
    if (b.id === 0 || b.id === 8 || b.isPocketed) return false;
    if (shooterGroup === 'solids') return b.number <= 7;
    if (shooterGroup === 'stripes') return b.number >= 9;
    return false;
  }).length;

  let foul = false;
  let foulReason: string | null = null;
  let claimedGroup: BallGroup | null = null;
  let isRackOver = false;
  let winnerPlayerId: string | null = null;
  let loserPlayerId: string | null = null;
  let winReason: string | null = null;

  // --- 1. SPECIAL CASE: 8-BALL ON THE BREAK ---
  if (isBreakShot && eightBallPocketed) {
    if (eightBallOnBreakSetting === 'win' && !cueScratched) {
      isRackOver = true;
      winnerPlayerId = shooter.id;
      loserPlayerId = opponent.id;
      winReason = `${shooter.displayName} made the 8-Ball on the break! Golden Break!`;
    } else {
      // Re-rack
      winReason = `8-Ball pocketed on break. Re-rack!`;
    }
    return {
      foul: cueScratched,
      foulReason: cueScratched ? 'Scratch on 8-ball break' : null,
      cueScratched,
      eightBallPocketed: true,
      pocketedBalls: newlyPocketed,
      firstBallHit: firstBallHitId,
      cushionsHitAfterContact: cushionHitsAfterContact,
      isLegalBreak: true,
      claimedGroup: null,
      isRackOver,
      winnerPlayerId,
      loserPlayerId,
      winReason,
      switchPlayer: true,
      ballInHand: true,
    };
  }

  // --- 2. CUE SCRATCH FOUL ---
  if (cueScratched) {
    foul = true;
    foulReason = 'Scratch! Cue ball was pocketed.';
  }

  // --- 3. FIRST CONTACT FOUL ---
  if (!foul) {
    if (firstBallHitId === null) {
      foul = true;
      foulReason = 'Foul! No object ball was contacted.';
    } else if (shooterGroup !== null) {
      // Table is claimed
      if (shooterGroupRemaining > 0) {
        // Must hit assigned group first
        const isSolid = firstBallHitId <= 7;
        const isShooterGroup = shooterGroup === 'solids' ? isSolid : !isSolid;
        if (firstBallHitId === 8) {
          foul = true;
          foulReason = 'Foul! Hit 8-ball before clearing your group.';
        } else if (!isShooterGroup) {
          foul = true;
          foulReason = `Foul! First ball hit was not ${shooterGroup}.`;
        }
      } else {
        // Group is cleared! Must hit the 8-ball first!
        if (firstBallHitId !== 8) {
          foul = true;
          foulReason = 'Foul! Must hit 8-ball when group is cleared.';
        }
      }
    }
  }

  // --- 4. CUSHION AFTER CONTACT FOUL ---
  if (!foul && !isBreakShot && newlyPocketed.length === 0) {
    if (cushionHitsAfterContact === 0) {
      foul = true;
      foulReason = 'Foul! No ball reached a cushion after contact.';
    }
  }

  // --- 5. 8-BALL ENDGAME EVALUATION ---
  if (eightBallPocketed) {
    isRackOver = true;

    if (cueScratched) {
      // Scratch while pocketing 8-ball -> Instant Loss!
      winnerPlayerId = opponent.id;
      loserPlayerId = shooter.id;
      winReason = `${shooter.displayName} scratched on the 8-ball. ${opponent.displayName} wins!`;
    } else if (shooterGroupRemaining > 0) {
      // Pocketed 8-ball before clearing group -> Instant Loss!
      winnerPlayerId = opponent.id;
      loserPlayerId = shooter.id;
      winReason = `${shooter.displayName} pocketed the 8-ball early! ${opponent.displayName} wins!`;
    } else if (foul) {
      // Foul while pocketing 8-ball -> Instant Loss!
      winnerPlayerId = opponent.id;
      loserPlayerId = shooter.id;
      winReason = `Foul on the 8-ball! ${opponent.displayName} wins!`;
    } else {
      // Legally pocketed the 8-ball -> Victory!
      winnerPlayerId = shooter.id;
      loserPlayerId = opponent.id;
      winReason = `${shooter.displayName} legally pocketed the 8-ball for the WIN!`;
    }

    return {
      foul,
      foulReason,
      cueScratched,
      eightBallPocketed: true,
      pocketedBalls: newlyPocketed,
      firstBallHit: firstBallHitId,
      cushionsHitAfterContact: cushionHitsAfterContact,
      isLegalBreak: true,
      claimedGroup: null,
      isRackOver: true,
      winnerPlayerId,
      loserPlayerId,
      winReason,
      switchPlayer: true,
      ballInHand: false,
    };
  }

  // --- 6. GROUP CLAIMING (OPEN TABLE) ---
  const regularPots = newlyPocketed.filter((id) => id >= 1 && id <= 15 && id !== 8);
  if (!foul && !isBreakShot && shooterGroup === null && regularPots.length > 0) {
    // First regular pot claims group!
    const firstPot = regularPots[0];
    claimedGroup = firstPot <= 7 ? 'solids' : 'stripes';
  }

  // --- 7. CONTINUE OR SWITCH TURN ---
  let shooterPotCount = 0;
  if (!foul) {
    const effectiveGroup = shooterGroup || claimedGroup;
    if (effectiveGroup) {
      shooterPotCount = regularPots.filter((id) =>
        effectiveGroup === 'solids' ? id <= 7 : id >= 9
      ).length;
    }
  }

  // If shooter committed a foul or pocketed zero of their own balls, turn switches
  const switchPlayer = foul || shooterPotCount === 0;

  return {
    foul,
    foulReason,
    cueScratched,
    eightBallPocketed: false,
    pocketedBalls: newlyPocketed,
    firstBallHit: firstBallHitId,
    cushionsHitAfterContact: cushionHitsAfterContact,
    isLegalBreak: true,
    claimedGroup,
    isRackOver: false,
    winnerPlayerId: null,
    loserPlayerId: null,
    winReason: null,
    switchPlayer,
    ballInHand: foul, // Opponent gets ball in hand on any foul!
  };
}
