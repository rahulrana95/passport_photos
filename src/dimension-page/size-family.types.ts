import type { PhotoSpec } from '@/photo-spec/photo-spec.schemas';

/**
 * A requirement people search for by its number rather than by their country.
 *
 * "2x2 photo", "35x45mm photo", "resize photo to 240kb" are all searches with
 * no country in them: the person has been told a number by a form and wants to
 * know what it means. A page per number, listing every country that uses it,
 * answers that search — and it is a different search from "us passport photo",
 * which is why these are separate pages rather than anchors on a country one.
 *
 * Three kinds, because the numbers people are given are three different things:
 * a printed size in millimetres or inches, a pixel size for an upload, and a
 * file-size ceiling. Modelled as a union rather than one shape with optional
 * fields, so a family cannot half-declare itself.
 */
export type SizeFamily =
  | {
      readonly kind: 'print';
      readonly slug: string;
      readonly widthMm: number;
      readonly heightMm: number;
      /**
       * The unit the size is WRITTEN in, which is not always the one it is
       * stored in. 50.8mm exactly is two inches, and the people searching for
       * it type "2x2" — writing the page in millimetres would answer a
       * question in a unit the reader was never given.
       */
      readonly unit: 'inch' | 'mm';
    }
  | {
      readonly kind: 'pixels';
      readonly slug: string;
      /** A square upload of this many pixels on each edge. */
      readonly edgePx: number;
    }
  | {
      readonly kind: 'file-size';
      readonly slug: string;
      readonly maxBytes: number;
    };

/** A family together with the specifications that actually require it. */
export interface ServedSizeFamily {
  readonly family: SizeFamily;
  readonly specs: readonly PhotoSpec[];
}
