import type * as React from "react";

export function ReportDocumentShell({
  title,
  dateRangeLabel,
  children,
}: {
  title: string;
  dateRangeLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div className="w-full rounded-2xl border border-border bg-card p-6 sm:p-8 lg:p-10">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-xs font-bold tracking-[0.2em] text-violet-400">TAZAMA</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground uppercase lg:text-3xl">{title}</h1>
        </div>
        <p className="text-sm text-muted-foreground">{dateRangeLabel}</p>
      </div>
      {children}
    </div>
  );
}

export function ReportSection({ title, first = false, children }: { title: string; first?: boolean; children: React.ReactNode }) {
  return (
    <>
      <div className={first ? "mt-6 mb-6 border-t border-dashed border-border" : "my-6 border-t border-dashed border-border"} />
      <section>
        <p className="mb-3 text-xs font-semibold tracking-widest text-muted-foreground uppercase">{title}</p>
        {children}
      </section>
    </>
  );
}

/** Two sections side by side on wide screens, stacked on narrow ones — used to fill the width with a natural pair instead of one column stretched thin. */
export function ReportTwoColumn({ left, right }: { left: React.ReactNode; right: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
      <div>{left}</div>
      <div>{right}</div>
    </div>
  );
}

export function ReportStatGrid({ children, columns = 4 }: { children: React.ReactNode; columns?: 3 | 4 | 5 }) {
  const colsClass = columns === 5 ? "sm:grid-cols-5" : columns === 3 ? "sm:grid-cols-3" : "sm:grid-cols-4";
  return <div className={`grid grid-cols-2 gap-3 ${colsClass}`}>{children}</div>;
}

export function ReportStatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-muted/20 p-4">
      <p className="font-mono text-2xl font-bold tracking-tight text-foreground tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
