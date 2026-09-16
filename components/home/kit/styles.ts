/** Shared marketing button styles (plain module so server components can import them). */
export const ctaClass =
  "inline-flex h-9 items-center justify-center gap-1.5 rounded-[9px] bg-brand-strong px-4 text-[14px] font-medium text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.18)] transition-colors hover:bg-[#ad2621]";

export const ctaLargeClass =
  "group inline-flex h-12 items-center justify-center gap-2 rounded-[11px] bg-brand-strong px-6 text-[15px] font-medium text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.18),0_10px_30px_-10px_rgb(196_42_37/0.7)] transition-[background-color,transform] hover:bg-[#ad2621] active:translate-y-px";

export const ghostLargeDarkClass =
  "group inline-flex h-12 items-center justify-center gap-2 rounded-[11px] px-6 text-[15px] font-medium text-white ring-1 ring-white/15 transition-[background-color,box-shadow] hover:bg-white/[0.06] hover:ring-white/25";

export const ghostLargeLightClass =
  "group inline-flex h-12 items-center justify-center gap-2 rounded-[11px] px-6 text-[15px] font-medium text-ink ring-1 ring-black/12 transition-[background-color,box-shadow] hover:bg-black/[0.04] hover:ring-black/20";
