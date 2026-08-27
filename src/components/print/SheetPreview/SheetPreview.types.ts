import type { SheetPlan } from '@/sheet/sheet-layout.types';

export interface SheetPreviewProps {
  readonly plan: SheetPlan;
  /** The photograph to show in each slot. Omitted, the slots are drawn empty. */
  readonly photoSrc?: string | undefined;
}
