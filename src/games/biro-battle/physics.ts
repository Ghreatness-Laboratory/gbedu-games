// Biro Battle Physics Engine (Rigid Body with Real 2D Rotation & Impulse)

import { PenBody, PenStats, PenArchetype, PlatformType, Obstacle, Vector2D } from './types';

export const PEN_ARCHETYPES: Record<PenArchetype, PenStats> = {
  classic: {
    id: 'classic',
    name: 'Bic Ballpoint',
    tagline: 'Standard Naija Desk Legend',
    color: '#0284c7', // Sky / Classic blue
    inkColor: '#0284c7',
    capColor: '#0369a1',
    bodyColor: 'rgba(224, 242, 254, 0.85)',
    mass: 1.0,
    length: 64,
    width: 12,
    restitution: 0.65,
    friction: 0.962,
  },
  parker: {
    id: 'parker',
    name: 'Executive Parker',
    tagline: 'Heavy & Hard to Dislodge',
    color: '#ffb703', // Gold / Metallic
    inkColor: '#ffb703',
    capColor: '#d97706',
    bodyColor: '#334155',
    mass: 1.35,
    length: 66,
    width: 13.5,
    restitution: 0.55,
    friction: 0.958,
  },
  fountain: {
    id: 'fountain',
    name: 'Pilot Fountain',
    tagline: 'Lightweight & High Velocity',
    color: '#1fd1a0', // Mint Green
    inkColor: '#1fd1a0',
    capColor: '#0d9488',
    bodyColor: '#064e3b',
    mass: 0.88,
    length: 62,
    width: 11.5,
    restitution: 0.72,
    friction: 0.965,
  },
  stylus: {
    id: 'stylus',
    name: 'Zebra Gel Pen',
    tagline: 'Vibrant & Extra Bouncy',
    color: '#ff7a00', // Gbedu Orange
    inkColor: '#ff7a00',
    capColor: '#ea580c',
    bodyColor: '#18181b',
    mass: 1.05,
    length: 60,
    width: 12.5,
    restitution: 0.68,
    friction: 0.964,
  },
};

// Helper: Segment to Segment minimum distance with closest points
export function closestPointsBetweenSegments(
  p1: Vector2D,
  q1: Vector2D,
  p2: Vector2D,
  q2: Vector2D
): { c1: Vector2D; c2: Vector2D; distSq: number } {
  const d1 = { x: q1.x - p1.x, y: q1.y - p1.y };
  const d2 = { x: q2.x - p2.x, y: q2.y - p2.y };
  const r = { x: p1.x - p2.x, y: p1.y - p2.y };

  const a = d1.x * d1.x + d1.y * d1.y;
  const e = d2.x * d2.x + d2.y * d2.y;
  const f = d2.x * r.x + d2.y * r.y;

  let s = 0.0;
  let t = 0.0;

  if (a <= 0.00001 && e <= 0.00001) {
    // Both segments are points
    s = 0.0;
    t = 0.0;
  } else if (a <= 0.00001) {
    // First segment is a point
    s = 0.0;
    t = Math.max(0.0, Math.min(1.0, f / e));
  } else {
    const c = d1.x * r.x + d1.y * r.y;
    if (e <= 0.00001) {
      // Second segment is a point
      t = 0.0;
      s = Math.max(0.0, Math.min(1.0, -c / a));
    } else {
      // General nondegenerate case
      const b = d1.x * d2.x + d1.y * d2.y;
      const denom = a * e - b * b;

      if (denom !== 0.0) {
        s = Math.max(0.0, Math.min(1.0, (b * f - c * e) / denom));
      } else {
        s = 0.0;
      }

      t = (b * s + f) / e;

      if (t < 0.0) {
        t = 0.0;
        s = Math.max(0.0, Math.min(1.0, -c / a));
      } else if (t > 1.0) {
        t = 1.0;
        s = Math.max(0.0, Math.min(1.0, (b - c) / a));
      }
    }
  }

  const c1 = { x: p1.x + d1.x * s, y: p1.y + d1.y * s };
  const c2 = { x: p2.x + d2.x * t, y: p2.y + d2.y * t };
  const dx = c1.x - c2.x;
  const dy = c1.y - c2.y;

  return { c1, c2, distSq: dx * dx + dy * dy };
}

// Get the two spine endpoints of a pen capsule
export function getPenEndpoints(pen: PenBody): { p1: Vector2D; p2: Vector2D; radius: number } {
  const halfLength = (pen.length - pen.width) / 2;
  const cos = Math.cos(pen.angle);
  const sin = Math.sin(pen.angle);

  return {
    p1: { x: pen.x - cos * halfLength, y: pen.y - sin * halfLength },
    p2: { x: pen.x + cos * halfLength, y: pen.y + sin * halfLength },
    radius: pen.width / 2,
  };
}

// Moment of Inertia for thin capsule/cylinder rotating about center of mass
export function getPenInertia(pen: PenBody): number {
  return (1 / 12) * pen.mass * (pen.length * pen.length + pen.width * pen.width);
}

// Resolves collision between two pens using continuous impulse response & rotational torque
export function resolvePenCollision(
  pA: PenBody,
  pB: PenBody
): { collided: boolean; impactIntensity: number; contactX: number; contactY: number } {
  if (pA.isEliminated || pB.isEliminated) {
    return { collided: false, impactIntensity: 0, contactX: 0, contactY: 0 };
  }

  const spineA = getPenEndpoints(pA);
  const spineB = getPenEndpoints(pB);

  const { c1, c2, distSq } = closestPointsBetweenSegments(spineA.p1, spineA.p2, spineB.p1, spineB.p2);
  const minDist = spineA.radius + spineB.radius;

  if (distSq >= minDist * minDist) {
    return { collided: false, impactIntensity: 0, contactX: 0, contactY: 0 };
  }

  const dist = Math.sqrt(distSq);
  let nx = 0;
  let ny = 0;

  if (dist > 0.0001) {
    nx = (c1.x - c2.x) / dist;
    ny = (c1.y - c2.y) / dist;
  } else {
    // Perfectly overlapping closest points: push along perpendicular to pA
    nx = -Math.sin(pA.angle);
    ny = Math.cos(pA.angle);
  }

  const penetration = minDist - dist;
  const contact = { x: (c1.x + c2.x) * 0.5, y: (c1.y + c2.y) * 0.5 };

  // Positional correction to resolve penetration
  const totalInvMass = 1 / pA.mass + 1 / pB.mass;
  const percent = 0.6;
  const corrX = nx * (penetration * percent);
  const corrY = ny * (penetration * percent);

  pA.x += corrX * ((1 / pA.mass) / totalInvMass);
  pA.y += corrY * ((1 / pA.mass) / totalInvMass);
  pB.x -= corrX * ((1 / pB.mass) / totalInvMass);
  pB.y -= corrY * ((1 / pB.mass) / totalInvMass);

  // Moment arms from center of mass to contact point
  const rAx = contact.x - pA.x;
  const rAy = contact.y - pA.y;
  const rBx = contact.x - pB.x;
  const rBy = contact.y - pB.y;

  // Linear velocity of contact points (v + omega x r)
  const vAx = pA.vx - pA.omega * rAy;
  const vAy = pA.vy + pA.omega * rAx;
  const vBx = pB.vx - pB.omega * rBy;
  const vBy = pB.vy + pB.omega * rBx;

  const relVx = vAx - vBx;
  const relVy = vAy - vBy;
  const velAlongNormal = relVx * nx + relVy * ny;

  // Only apply impulse if objects are closing in
  if (velAlongNormal >= 0) {
    return {
      collided: true,
      impactIntensity: Math.abs(velAlongNormal),
      contactX: contact.x,
      contactY: contact.y,
    };
  }

  const IA = getPenInertia(pA);
  const IB = getPenInertia(pB);

  // 2D Cross product (r x n)
  const rACrossN = rAx * ny - rAy * nx;
  const rBCrossN = rBx * ny - rBy * nx;

  const invMassNormal =
    1 / pA.mass +
    1 / pB.mass +
    (rACrossN * rACrossN) / IA +
    (rBCrossN * rBCrossN) / IB;

  const restitution = (pA.restitution + pB.restitution) * 0.5;
  const impulseMag = -(1 + restitution) * velAlongNormal / invMassNormal;

  // Apply Normal Impulse
  const impX = nx * impulseMag;
  const impY = ny * impulseMag;

  pA.vx += impX / pA.mass;
  pA.vy += impY / pA.mass;
  pA.omega += (rACrossN * impulseMag) / IA;

  pB.vx -= impX / pB.mass;
  pB.vy -= impY / pB.mass;
  pB.omega -= (rBCrossN * impulseMag) / IB;

  // Apply Tangent Friction Impulse (adds authentic spin from glancing blows!)
  const tx = -ny;
  const ty = nx;
  const velAlongTangent = relVx * tx + relVy * ty;

  const rACrossT = rAx * ty - rAy * tx;
  const rBCrossT = rBx * ty - rBy * tx;

  const invMassTangent =
    1 / pA.mass +
    1 / pB.mass +
    (rACrossT * rACrossT) / IA +
    (rBCrossT * rBCrossT) / IB;

  let frictionImpulse = -velAlongTangent / invMassTangent;
  const frictionCoeff = 0.32;
  frictionImpulse = Math.max(-frictionCoeff * impulseMag, Math.min(frictionCoeff * impulseMag, frictionImpulse));

  const fImpX = tx * frictionImpulse;
  const fImpY = ty * frictionImpulse;

  pA.vx += fImpX / pA.mass;
  pA.vy += fImpY / pA.mass;
  pA.omega += (rACrossT * frictionImpulse) / IA;

  pB.vx -= fImpX / pB.mass;
  pB.vy -= fImpY / pB.mass;
  pB.omega -= (rBCrossT * frictionImpulse) / IB;

  const impactIntensity = Math.abs(impulseMag) / (pA.mass + pB.mass);

  return {
    collided: true,
    impactIntensity,
    contactX: contact.x,
    contactY: contact.y,
  };
}

// Check and resolve collision with an obstacle (e.g. Eraser or Ruler)
export function resolveObstacleCollision(
  pen: PenBody,
  obs: Obstacle
): { collided: boolean; impactIntensity: number } {
  if (pen.isEliminated) return { collided: false, impactIntensity: 0 };

  // Transform pen spine into obstacle local coordinates
  const cosO = Math.cos(-obs.rotation);
  const sinO = Math.sin(-obs.rotation);

  const localX = (x: number, y: number) => (x - obs.x) * cosO - (y - obs.y) * sinO;
  const localY = (x: number, y: number) => (x - obs.x) * sinO + (y - obs.y) * cosO;

  const spine = getPenEndpoints(pen);
  const p1L = { x: localX(spine.p1.x, spine.p1.y), y: localY(spine.p1.y, spine.p1.y) };
  const p2L = { x: localX(spine.p2.x, spine.p2.y), y: localY(spine.p2.y, spine.p2.y) };

  // Obstacle AABB in local space
  const halfW = obs.width / 2;
  const halfH = obs.height / 2;

  // Check pen center distance to local box
  const penCenterL = { x: localX(pen.x, pen.y), y: localY(pen.x, pen.y) };
  const clampedX = Math.max(-halfW, Math.min(halfW, penCenterL.x));
  const clampedY = Math.max(-halfH, Math.min(halfH, penCenterL.y));

  const dxL = penCenterL.x - clampedX;
  const dyL = penCenterL.y - clampedY;
  const distSq = dxL * dxL + dyL * dyL;
  const minDist = spine.radius + 2;

  if (distSq < minDist * minDist) {
    const dist = Math.sqrt(distSq) || 0.001;
    const nxL = dxL / dist;
    const nyL = dyL / dist;

    // Convert normal back to world
    const cosOW = Math.cos(obs.rotation);
    const sinOW = Math.sin(obs.rotation);
    const nx = nxL * cosOW - nyL * sinOW;
    const ny = nxL * sinOW + nyL * cosOW;

    // Separate
    const overlap = minDist - dist;
    pen.x += nx * overlap;
    pen.y += ny * overlap;

    // Reflect velocity with bounce
    const dot = pen.vx * nx + pen.vy * ny;
    if (dot < 0) {
      pen.vx = (pen.vx - 1.8 * dot * nx) * 0.85;
      pen.vy = (pen.vy - 1.8 * dot * ny) * 0.85;
      pen.omega *= -0.7;
      return { collided: true, impactIntensity: Math.abs(dot) };
    }
  }

  return { collided: false, impactIntensity: 0 };
}

// Platform bounds check: determines if pen center of mass has fallen off platform
export function isPenOutOfBounds(
  pen: PenBody,
  platformType: PlatformType,
  platWidth: number,
  platHeight: number,
  centerX: number,
  centerY: number,
  shrinkFactor: number = 1.0 // Sudden death shrink multiplier
): boolean {
  const currentW = platWidth * shrinkFactor;
  const currentH = platHeight * shrinkFactor;

  switch (platformType) {
    case 'round': {
      // Circle platform
      const radius = (Math.min(currentW, currentH) / 2);
      const dx = pen.x - centerX;
      const dy = pen.y - centerY;
      // Center of mass crossing edge (> 50% overhang)
      return dx * dx + dy * dy > radius * radius;
    }
    case 'book': {
      // Small book: tighter bounds
      const halfW = (currentW * 0.82) / 2;
      const halfH = (currentH * 0.82) / 2;
      return (
        pen.x < centerX - halfW ||
        pen.x > centerX + halfW ||
        pen.y < centerY - halfH ||
        pen.y > centerY + halfH
      );
    }
    case 'notebook':
    case 'desk':
    default: {
      // Rectangular desk or notebook
      const halfW = currentW / 2;
      const halfH = currentH / 2;
      return (
        pen.x < centerX - halfW ||
        pen.x > centerX + halfW ||
        pen.y < centerY - halfH ||
        pen.y > centerY + halfH
      );
    }
  }
}

// Integration step for 1 frame (friction, velocity damping, rotation)
export function stepPenPhysics(pen: PenBody, frictionMultiplier: number = 1.0) {
  if (pen.isEliminated) return;

  pen.x += pen.vx;
  pen.y += pen.vy;
  pen.angle += pen.omega;

  // Natural table surface friction
  const effFriction = pen.friction * frictionMultiplier;
  pen.vx *= effFriction;
  pen.vy *= effFriction;
  pen.omega *= 0.945; // Angular damping

  // Clean stop threshold: prevent eternal sub-pixel jitter
  const speedSq = pen.vx * pen.vx + pen.vy * pen.vy;
  if (speedSq < 0.03 && Math.abs(pen.omega) < 0.005) {
    pen.vx = 0;
    pen.vy = 0;
    pen.omega = 0;
  }
}

// Check if all non-eliminated pens have completely stopped moving
export function areAllPensStopped(pens: PenBody[]): boolean {
  return pens.every((p) => {
    if (p.isEliminated) return true;
    return p.vx === 0 && p.vy === 0 && p.omega === 0;
  });
}
