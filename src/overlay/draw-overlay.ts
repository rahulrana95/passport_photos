import { BOTH_SIDES, HALF } from './overlay-layout.constants';
import { HALO_COLOUR, OVERLAY_ROLE_STYLES } from './overlay-role.constants';
import type { OverlayInstruction, OverlayLine, OverlaySpan } from './overlay-instruction.types';
import type { OverlayRoleStyle } from './overlay-role.constants';
import type { OverlaySize, OverlayTransform } from './overlay-transform.utils';

/**
 * The slice of a 2D context this module actually uses.
 *
 * Declared structurally rather than taking CanvasRenderingContext2D whole, for
 * two reasons that both matter. It documents the drawing vocabulary in one
 * place — anything not listed here is something the overlay does not do. And it
 * lets the tests pass a recorder, so every annotation's exact geometry is
 * asserted without a canvas implementation anywhere in the unit suite: jsdom
 * has no 2D context at all, and a module tested only through a browser is a
 * module tested only where it is slowest to test.
 */
export interface OverlayDrawingContext {
  lineWidth: number;
  lineCap: CanvasLineCap;
  strokeStyle: string | CanvasGradient | CanvasPattern;
  fillStyle: string | CanvasGradient | CanvasPattern;
  globalAlpha: number;
  save: () => void;
  restore: () => void;
  setTransform: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
  clearRect: (x: number, y: number, width: number, height: number) => void;
  fillRect: (x: number, y: number, width: number, height: number) => void;
  beginPath: () => void;
  moveTo: (x: number, y: number) => void;
  lineTo: (x: number, y: number) => void;
  rect: (x: number, y: number, width: number, height: number) => void;
  stroke: () => void;
  setLineDash: (segments: number[]) => void;
}

/**
 * Traces a shape without stroking it, so the same path can be stroked twice.
 *
 * The halo and the visible line must follow exactly the same path, including
 * the same dash phase — a halo drawn from its own path would show through the
 * gaps of the line above it as a second, offset dashed line.
 */
type PathTracer = (context: OverlayDrawingContext) => void;

const traceLine =
  (line: OverlayLine): PathTracer =>
  (context) => {
    context.beginPath();
    context.moveTo(line.fromX, line.fromY);
    context.lineTo(line.toX, line.toY);
  };

const traceSpan =
  (span: OverlaySpan): PathTracer =>
  (context) => {
    const halfCap = span.capWidthPx / HALF;
    context.beginPath();
    context.moveTo(span.x, span.fromY);
    context.lineTo(span.x, span.toY);
    context.moveTo(span.x - halfCap, span.fromY);
    context.lineTo(span.x + halfCap, span.fromY);
    context.moveTo(span.x - halfCap, span.toY);
    context.lineTo(span.x + halfCap, span.toY);
  };

/**
 * Strokes a path twice: a wide dark halo, then the narrow visible line.
 *
 * Widths arrive in screen pixels and are divided by the scale on the way in.
 * Without that division a two-pixel line over a 4000-pixel photograph fitted
 * into a 400-pixel box is drawn a fifth of a pixel wide, which is to say not
 * drawn — and the same overlay over a small scan would be drawn twenty pixels
 * thick. The annotation should be the same weight on screen whatever the
 * photograph's resolution, because it is a thing the reader looks at rather
 * than a thing in the photograph.
 */
const strokeWithHalo = (
  context: OverlayDrawingContext,
  trace: PathTracer,
  style: OverlayRoleStyle,
  scale: number,
): void => {
  const dash = style.dashPx.map((segment) => segment / scale);

  context.setLineDash(dash);
  context.lineWidth = (style.strokeWidthPx + style.haloWidthPx * BOTH_SIDES) / scale;
  context.strokeStyle = HALO_COLOUR;
  trace(context);
  context.stroke();

  context.lineWidth = style.strokeWidthPx / scale;
  context.strokeStyle = style.colour;
  trace(context);
  context.stroke();
};

const traceRect =
  (rectangle: { x: number; y: number; widthPx: number; heightPx: number }): PathTracer =>
  (context) => {
    context.beginPath();
    context.rect(rectangle.x, rectangle.y, rectangle.widthPx, rectangle.heightPx);
  };

const drawInstruction = (
  context: OverlayDrawingContext,
  instruction: OverlayInstruction,
  scale: number,
): void => {
  const style = OVERLAY_ROLE_STYLES[instruction.role];

  if (instruction.kind === 'shade') {
    context.globalAlpha = style.shadeAlpha;
    context.fillStyle = style.colour;
    context.fillRect(instruction.x, instruction.y, instruction.widthPx, instruction.heightPx);
    // Restored immediately rather than at the end of the frame. A shade that
    // leaked its alpha would fade every annotation drawn after it, and the
    // paint order puts the crop frame last — the one mark that must not be
    // faint.
    context.globalAlpha = 1;
    return;
  }

  if (instruction.kind === 'rect') {
    strokeWithHalo(context, traceRect(instruction), style, scale);
    return;
  }

  strokeWithHalo(
    context,
    instruction.kind === 'line' ? traceLine(instruction) : traceSpan(instruction),
    style,
    scale,
  );
};

/**
 * Wipes the canvas before a redraw.
 *
 * Separate from drawOverlay, and the separation is load-bearing rather than
 * tidy. Clearing is about reusing one canvas across frames, which is the screen
 * renderer's problem and nobody else's — the export composes onto a canvas that
 * already holds the photograph, and an overlay that cleared as it drew would
 * erase the photograph it was annotating and hand the reader a blank PNG.
 *
 * The transform is the device pixel ratio alone, so the rectangle is given in
 * CSS pixels however many device pixels back it.
 */
export const clearOverlay = (
  context: OverlayDrawingContext,
  cssSize: OverlaySize,
  devicePixelRatio: number,
): void => {
  context.save();
  context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  context.clearRect(0, 0, cssSize.widthPx, cssSize.heightPx);
  context.restore();
};

/**
 * Draws the whole overlay for one frame.
 *
 * The transform folds the fit into the device pixel ratio, so every instruction
 * can be written in source-image coordinates and land in the right place on
 * screen without a single call site converting anything.
 */
export const drawOverlay = (
  context: OverlayDrawingContext,
  instructions: readonly OverlayInstruction[],
  transform: OverlayTransform,
  devicePixelRatio: number,
): void => {
  context.save();

  const drawScale = transform.scale * devicePixelRatio;
  context.setTransform(
    drawScale,
    0,
    0,
    drawScale,
    transform.offsetX * devicePixelRatio,
    transform.offsetY * devicePixelRatio,
  );
  // Butt caps, so a dimension line stops exactly at the row it measures.
  // Round caps would overhang by half the stroke width, which at the crown is
  // the difference the whole measurement is about.
  context.lineCap = 'butt';

  for (const instruction of instructions) drawInstruction(context, instruction, transform.scale);

  context.restore();
};
