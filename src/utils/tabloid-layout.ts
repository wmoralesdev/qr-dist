/**
 * Tabloid layout utilities for computing a symmetric grid of card slots.
 */

export interface TabloidConfig {
  pageWidthIn: number;
  pageHeightIn: number;
  cardWidthIn: number;
  cardHeightIn: number;
}

export interface SlotRect {
  x: number; // inches from left edge
  y: number; // inches from top edge
  width: number;
  height: number;
}

export interface TabloidLayout {
  cols: number;
  rows: number;
  marginX: number; // left/right margin in inches
  marginY: number; // top/bottom margin in inches
  slotsPerPage: number;
  slots: SlotRect[]; // all slot rects for one page
}

const DEFAULT_CONFIG: TabloidConfig = {
  pageWidthIn: 11,
  pageHeightIn: 17,
  cardWidthIn: 3.5,  // base card width for calculating grid (3 cols)
  cardHeightIn: 2,   // base card height for calculating grid (8 rows)
};

/**
 * Compute a grid layout where cards stretch to fill the entire page.
 * Cards are placed in row-major order (left-to-right, top-to-bottom).
 */
export function computeTabloidLayout(
  config: Partial<TabloidConfig> = {}
): TabloidLayout {
  const { pageWidthIn, pageHeightIn, cardWidthIn, cardHeightIn } = {
    ...DEFAULT_CONFIG,
    ...config,
  };

  // Calculate grid dimensions
  const cols = Math.floor(pageWidthIn / cardWidthIn);   // 3 cols
  const rows = Math.floor(pageHeightIn / cardHeightIn); // 8 rows

  // Stretch cards to fill entire page (no margins, no gaps)
  const stretchedCardWidth = pageWidthIn / cols;   // 11/3 = 3.667"
  const stretchedCardHeight = pageHeightIn / rows; // 17/8 = 2.125"

  // Build slot rects in row-major order
  const slots: SlotRect[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      slots.push({
        x: col * stretchedCardWidth,
        y: row * stretchedCardHeight,
        width: stretchedCardWidth,
        height: stretchedCardHeight,
      });
    }
  }

  return {
    cols,
    rows,
    marginX: 0,
    marginY: 0,
    slotsPerPage: cols * rows,
    slots,
  };
}

/**
 * Calculate how many tabloid pages are needed for a given card count.
 */
export function computePageCount(cardCount: number, slotsPerPage: number): number {
  return Math.ceil(cardCount / slotsPerPage);
}
