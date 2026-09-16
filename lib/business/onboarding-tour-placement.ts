/** Desktop placement for the tour card: beside the sidebar, centred on the spotlight. Pure. */

/** Tailwind `w-72` — the fixed business sidebar. */
export const SIDEBAR_WIDTH_PX = 288;
export const CARD_GAP_PX = 28;
export const VIEWPORT_MARGIN_PX = 16;
/** Keeps the pointer arrow clear of the card's rounded corners. */
const ARROW_INSET_PX = 28;

export interface AnchorRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface CardAnchor {
  top: number;
  left: number;
  /** Arrow centre, relative to the card's top edge. */
  arrowTop: number;
}

export function anchorCard(rect: AnchorRect, viewportHeight: number, cardHeight: number): CardAnchor {
  const targetCenter = rect.top + rect.height / 2;
  const maxTop = Math.max(VIEWPORT_MARGIN_PX, viewportHeight - cardHeight - VIEWPORT_MARGIN_PX);
  const top = Math.min(Math.max(targetCenter - cardHeight / 2, VIEWPORT_MARGIN_PX), maxTop);
  const left = Math.max(rect.left + rect.width, SIDEBAR_WIDTH_PX) + CARD_GAP_PX;
  const arrowTop = Math.min(Math.max(targetCenter - top, ARROW_INSET_PX), cardHeight - ARROW_INSET_PX);
  return { top, left, arrowTop };
}
