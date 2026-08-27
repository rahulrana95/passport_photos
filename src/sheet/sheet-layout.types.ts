export interface Millimetres {
  readonly widthMm: number;
  readonly heightMm: number;
}

/** Where one photograph sits on the sheet, from the top-left corner. */
export interface SheetSlot {
  readonly xMm: number;
  readonly yMm: number;
}

export const SHEET_LAYOUT_FAILURES = ['photo-larger-than-sheet'] as const;

export type SheetLayoutFailure = (typeof SHEET_LAYOUT_FAILURES)[number];

export interface SheetPlan {
  /** The sheet as it will be printed, which may be the size turned sideways. */
  readonly sheet: Millimetres;
  /** The photograph as placed, which may be the photograph turned sideways. */
  readonly photo: Millimetres;
  /** True when the photograph is laid on its side to fit more of them. */
  readonly rotated: boolean;
  readonly columns: number;
  readonly rows: number;
  readonly count: number;
  readonly slots: readonly SheetSlot[];
}

export type SheetLayoutResult =
  | { readonly ok: true; readonly plan: SheetPlan }
  | { readonly ok: false; readonly reason: SheetLayoutFailure };
