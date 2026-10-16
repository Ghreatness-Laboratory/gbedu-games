// Offscreen Pre-Rendered Ball Sprites Cache for 60fps Rendering
import { STANDARD_BALL_COLORS } from './types';

export class BallSpriteCache {
  private cacheCanvas: HTMLCanvasElement | null = null;
  private spriteSize: number = 48; // crisp resolution per ball sprite

  public init() {
    if (typeof document === 'undefined') return;
    if (this.cacheCanvas) return;

    const size = this.spriteSize;
    const canvas = document.createElement('canvas');
    canvas.width = size * 16; // 16 balls side by side
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    for (let i = 0; i <= 15; i++) {
      this.renderBallSprite(ctx, i, i * size, 0, size);
    }

    this.cacheCanvas = canvas;
  }

  private renderBallSprite(
    ctx: CanvasRenderingContext2D,
    ballNumber: number,
    offsetX: number,
    offsetY: number,
    size: number
  ) {
    const cx = offsetX + size / 2;
    const cy = offsetY + size / 2;
    const r = size * 0.44;

    ctx.save();

    // 1. Drop shadow under ball
    ctx.beginPath();
    ctx.arc(cx + 1, cy + 2, r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fill();

    // 2. Ball Base
    const isCue = ballNumber === 0;
    const isStripe = ballNumber >= 9 && ballNumber <= 15;
    const isEight = ballNumber === 8;
    const baseColor = STANDARD_BALL_COLORS[ballNumber];

    if (isCue) {
      // White Cue Ball
      const grad = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.35, r * 0.1, cx, cy, r);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.75, '#f1f5f9');
      grad.addColorStop(1, '#cbd5e1');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();

      // Red aim dots on cue ball
      ctx.fillStyle = '#dc2626';
      const dotOffsets = [
        { dx: 0, dy: 0 },
        { dx: -r * 0.45, dy: 0 },
        { dx: r * 0.45, dy: 0 },
        { dx: 0, dy: -r * 0.45 },
        { dx: 0, dy: r * 0.45 },
      ];
      dotOffsets.forEach((d) => {
        ctx.beginPath();
        ctx.arc(cx + d.dx, cy + d.dy, r * 0.12, 0, Math.PI * 2);
        ctx.fill();
      });
    } else if (isStripe) {
      // White body with broad colored stripe band
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = '#f8fafc';
      ctx.fill();

      // Colored Stripe Band
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.clip();

      ctx.fillStyle = baseColor;
      ctx.fillRect(cx - r, cy - r * 0.52, r * 2, r * 1.04);
      ctx.restore();

      // White center number disc
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.38, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();

      // Number text
      ctx.fillStyle = '#0f172a';
      ctx.font = `bold ${Math.round(r * 0.45)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(ballNumber), cx, cy + 0.5);

      // Shading overlay
      const shade = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.35, r * 0.1, cx, cy, r);
      shade.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
      shade.addColorStop(0.6, 'rgba(255, 255, 255, 0)');
      shade.addColorStop(1, 'rgba(0, 0, 0, 0.45)');
      ctx.fillStyle = shade;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Solids (1-7 & 8-Ball)
      const grad = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.35, r * 0.1, cx, cy, r);
      grad.addColorStop(0, isEight ? '#374151' : '#ffffff');
      grad.addColorStop(0.2, baseColor);
      grad.addColorStop(1, isEight ? '#000000' : '#0f172a');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();

      // White center number disc
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.42, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();

      // Number text
      ctx.fillStyle = '#000000';
      ctx.font = `bold ${Math.round(r * 0.5)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(ballNumber), cx, cy + 0.5);
    }

    ctx.restore();
  }

  public drawBall(
    ctx: CanvasRenderingContext2D,
    ballNumber: number,
    x: number,
    y: number,
    radius: number,
    scale: number = 1.0
  ) {
    if (!this.cacheCanvas) {
      this.init();
    }
    if (!this.cacheCanvas) return;

    const size = this.spriteSize;
    const destSize = radius * 2 * scale;

    ctx.drawImage(
      this.cacheCanvas,
      ballNumber * size,
      0,
      size,
      size,
      x - destSize / 2,
      y - destSize / 2,
      destSize,
      destSize
    );
  }
}

export const ballSpriteCache = new BallSpriteCache();
