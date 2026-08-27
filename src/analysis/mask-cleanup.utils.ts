import { CHANNEL_MAX, CHANNEL_MIN } from '@/testing/fixtures/pixel-format.constants';

export interface Mask {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8ClampedArray;
}

/** A pixel is subject when it is nearer the top of the range than the bottom. */
export const SUBJECT_THRESHOLD = 128;

export const isSubject = (mask: Mask, x: number, y: number): boolean => {
  if (x < 0 || y < 0 || x >= mask.width || y >= mask.height) return false;
  return (mask.data[y * mask.width + x] ?? CHANNEL_MIN) >= SUBJECT_THRESHOLD;
};

const emptyLike = (mask: Mask): Mask => ({
  width: mask.width,
  height: mask.height,
  data: new Uint8ClampedArray(mask.width * mask.height),
});

const NEIGHBOUR_OFFSETS: readonly (readonly [number, number])[] = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];

/**
 * Four-connectivity, not eight.
 *
 * Under eight-connectivity a single diagonally-touching speckle joins the head,
 * and one stray pixel above the hair then becomes the crown. Requiring an edge
 * rather than a corner is what makes "connected to the head" mean something.
 */
const forEachNeighbour = (x: number, y: number, visit: (nx: number, ny: number) => void): void => {
  for (const [dx, dy] of NEIGHBOUR_OFFSETS) visit(x + dx, y + dy);
};

const dilate = (mask: Mask): Mask => {
  const output = emptyLike(mask);

  for (let y = 0; y < mask.height; y += 1) {
    for (let x = 0; x < mask.width; x += 1) {
      let on = isSubject(mask, x, y);
      forEachNeighbour(x, y, (nx, ny) => {
        if (isSubject(mask, nx, ny)) on = true;
      });
      output.data[y * mask.width + x] = on ? CHANNEL_MAX : CHANNEL_MIN;
    }
  }

  return output;
};

const erode = (mask: Mask): Mask => {
  const output = emptyLike(mask);

  for (let y = 0; y < mask.height; y += 1) {
    for (let x = 0; x < mask.width; x += 1) {
      if (!isSubject(mask, x, y)) continue;

      let survives = true;
      forEachNeighbour(x, y, (nx, ny) => {
        // Outside the frame counts as subject, so erosion does not eat the
        // mask inward from every edge. A head that reaches the bottom of the
        // frame is normal; a head shrunk by the frame boundary is a bug.
        const outside = nx < 0 || ny < 0 || nx >= mask.width || ny >= mask.height;
        if (!outside && !isSubject(mask, nx, ny)) survives = false;
      });

      output.data[y * mask.width + x] = survives ? CHANNEL_MAX : CHANNEL_MIN;
    }
  }

  return output;
};

/**
 * Morphological close: dilate then erode.
 *
 * Fills pinholes and bridges gaps that would otherwise split one object into
 * two. Extensive, not boundary-preserving: it can add pixels and never removes
 * them, and near the frame edge — where erosion treats the outside as subject
 * so a body reaching the edge is not eaten away — it can grow the silhouette
 * by a pixel. That is why the crown pipeline closes BEFORE it selects a
 * component and measures, never after.
 */
export const closeMask = (mask: Mask, passes = 1): Mask => {
  let current = mask;
  for (let pass = 0; pass < passes; pass += 1) current = dilate(current);
  for (let pass = 0; pass < passes; pass += 1) current = erode(current);
  return current;
};

/**
 * Morphological open: erode then dilate.
 *
 * Removes speckle and thin attachments — a glasses arm, an earring — without
 * shrinking the body of the mask.
 */
export const openMask = (mask: Mask, passes = 1): Mask => {
  let current = mask;
  for (let pass = 0; pass < passes; pass += 1) current = erode(current);
  for (let pass = 0; pass < passes; pass += 1) current = dilate(current);
  return current;
};

export interface ConnectedComponent {
  readonly pixelCount: number;
  readonly minX: number;
  readonly maxX: number;
  readonly minY: number;
  readonly maxY: number;
  /** Index into the mask's data of one pixel known to be in this component. */
  readonly seedIndex: number;
}

/**
 * Labels every connected region of subject pixels.
 *
 * Iterative rather than recursive: a full-frame mask is hundreds of thousands
 * of pixels, and a recursive flood fill overflows the stack on exactly the
 * images that matter most — the ones where the subject fills the frame.
 */
export const findComponents = (mask: Mask): readonly ConnectedComponent[] => {
  const visited = new Uint8Array(mask.width * mask.height);
  const components: ConnectedComponent[] = [];

  for (let startY = 0; startY < mask.height; startY += 1) {
    for (let startX = 0; startX < mask.width; startX += 1) {
      const startIndex = startY * mask.width + startX;
      if (visited[startIndex] === 1 || !isSubject(mask, startX, startY)) continue;

      let pixelCount = 0;
      let minX = startX;
      let maxX = startX;
      let minY = startY;
      let maxY = startY;

      const stack: number[] = [startIndex];
      visited[startIndex] = 1;

      // The pop is the loop condition. Popping inside a `length > 0` loop
      // needs an undefined check that can never fire, and an unreachable
      // branch is worse than no branch.
      for (let index = stack.pop(); index !== undefined; index = stack.pop()) {
        const x = index % mask.width;
        const y = Math.floor(index / mask.width);

        pixelCount += 1;
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);

        forEachNeighbour(x, y, (nx, ny) => {
          if (!isSubject(mask, nx, ny)) return;
          const neighbourIndex = ny * mask.width + nx;
          if (visited[neighbourIndex] === 1) return;
          visited[neighbourIndex] = 1;
          stack.push(neighbourIndex);
        });
      }

      components.push({ pixelCount, minX, maxX, minY, maxY, seedIndex: startIndex });
    }
  }

  return components;
};

export interface IsolatedComponent {
  readonly mask: Mask;
  /** Topmost row of the component, known from the walk rather than re-scanned. */
  readonly minY: number;
}

/**
 * Renders only the component containing the given pixel, and reports its top.
 *
 * The top row comes back with it because the walk already visits every pixel.
 * Re-scanning for it afterwards would mean a second pass and, worse, a
 * "found nothing" branch that cannot happen — the component provably contains
 * the pixel it was seeded from.
 */
export const componentContaining = (
  mask: Mask,
  x: number,
  y: number,
): IsolatedComponent | undefined => {
  if (!isSubject(mask, x, y)) return undefined;

  let minY = y;
  const output = emptyLike(mask);
  const visited = new Uint8Array(mask.width * mask.height);
  const startIndex = y * mask.width + x;
  const stack: number[] = [startIndex];
  visited[startIndex] = 1;

  for (let index = stack.pop(); index !== undefined; index = stack.pop()) {
    output.data[index] = CHANNEL_MAX;
    const currentX = index % mask.width;
    const currentY = Math.floor(index / mask.width);
    minY = Math.min(minY, currentY);

    forEachNeighbour(currentX, currentY, (nx, ny) => {
      if (!isSubject(mask, nx, ny)) return;
      const neighbourIndex = ny * mask.width + nx;
      if (visited[neighbourIndex] === 1) return;
      visited[neighbourIndex] = 1;
      stack.push(neighbourIndex);
    });
  }

  return { mask: output, minY };
};

/**
 * Fills enclosed holes without filling the background.
 *
 * Flood-filled from the border inward: anything the background cannot reach is
 * enclosed, and therefore a hole. Filling by "small area" instead would fill a
 * genuine gap between an arm and a body on some photographs, which is how this
 * check goes wrong when it is done the easy way.
 */
export const fillHoles = (mask: Mask): Mask => {
  const reachable = new Uint8Array(mask.width * mask.height);
  const stack: number[] = [];

  const pushIfBackground = (x: number, y: number): void => {
    if (x < 0 || y < 0 || x >= mask.width || y >= mask.height) return;
    const index = y * mask.width + x;
    if (reachable[index] === 1 || isSubject(mask, x, y)) return;
    reachable[index] = 1;
    stack.push(index);
  };

  for (let x = 0; x < mask.width; x += 1) {
    pushIfBackground(x, 0);
    pushIfBackground(x, mask.height - 1);
  }
  for (let y = 0; y < mask.height; y += 1) {
    pushIfBackground(0, y);
    pushIfBackground(mask.width - 1, y);
  }

  for (let index = stack.pop(); index !== undefined; index = stack.pop()) {
    forEachNeighbour(index % mask.width, Math.floor(index / mask.width), pushIfBackground);
  }

  const output = emptyLike(mask);
  for (let index = 0; index < mask.data.length; index += 1) {
    output.data[index] = reachable[index] === 1 ? CHANNEL_MIN : CHANNEL_MAX;
  }

  return output;
};
