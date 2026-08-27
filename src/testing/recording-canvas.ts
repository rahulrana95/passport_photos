import type { AnnotatedExportContext } from '@/overlay/export-annotated-png';

/**
 * A 2D context that records what was asked of it.
 *
 * The overlay's correctness is entirely in the numbers it passes to a canvas —
 * where a line starts, how wide it is once the scale is divided out, whether a
 * halo was laid down first. Asserting that from a screenshot means asserting it
 * from pixels, which catches a line in the wrong place only if a human notices
 * the picture looks wrong.
 *
 * So the drawing is recorded instead, and the screenshots are left to do what
 * they are actually good at: telling us it looks right.
 */

export interface RecordedPathOperation {
  readonly operation: 'moveTo' | 'lineTo' | 'rect';
  readonly args: readonly number[];
}

export interface RecordedStroke {
  readonly lineWidth: number;
  readonly strokeStyle: string;
  readonly dash: readonly number[];
  readonly path: readonly RecordedPathOperation[];
}

export interface RecordedFill {
  readonly fillStyle: string;
  readonly globalAlpha: number;
  readonly args: readonly number[];
}

export interface RecordedTransform {
  readonly args: readonly number[];
}

export class RecordingCanvasContext implements AnnotatedExportContext {
  lineWidth = 1;
  lineCap: CanvasLineCap = 'butt';
  strokeStyle: string | CanvasGradient | CanvasPattern = '#000000';
  fillStyle: string | CanvasGradient | CanvasPattern = '#000000';
  globalAlpha = 1;

  readonly strokes: RecordedStroke[] = [];
  readonly fills: RecordedFill[] = [];
  readonly transforms: RecordedTransform[] = [];
  readonly clears: (readonly number[])[] = [];
  readonly images: (readonly number[])[] = [];
  saves = 0;
  restores = 0;

  private dash: readonly number[] = [];
  private path: RecordedPathOperation[] = [];

  save(): void {
    this.saves += 1;
  }

  restore(): void {
    this.restores += 1;
  }

  setTransform(a: number, b: number, c: number, d: number, e: number, f: number): void {
    this.transforms.push({ args: [a, b, c, d, e, f] });
  }

  clearRect(x: number, y: number, width: number, height: number): void {
    this.clears.push([x, y, width, height]);
  }

  fillRect(x: number, y: number, width: number, height: number): void {
    this.fills.push({
      fillStyle: String(this.fillStyle),
      globalAlpha: this.globalAlpha,
      args: [x, y, width, height],
    });
  }

  drawImage(_image: CanvasImageSource, dx: number, dy: number, dw: number, dh: number): void {
    this.images.push([dx, dy, dw, dh]);
  }

  beginPath(): void {
    this.path = [];
  }

  moveTo(x: number, y: number): void {
    this.path.push({ operation: 'moveTo', args: [x, y] });
  }

  lineTo(x: number, y: number): void {
    this.path.push({ operation: 'lineTo', args: [x, y] });
  }

  rect(x: number, y: number, width: number, height: number): void {
    this.path.push({ operation: 'rect', args: [x, y, width, height] });
  }

  setLineDash(segments: number[]): void {
    this.dash = [...segments];
  }

  stroke(): void {
    this.strokes.push({
      lineWidth: this.lineWidth,
      strokeStyle: String(this.strokeStyle),
      dash: this.dash,
      path: [...this.path],
    });
  }
}
