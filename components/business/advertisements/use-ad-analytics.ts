"use client";

import * as React from "react";

import { fetchAdAnalytics } from "@/app/business/advertisements/actions";
import type { AdAnalytics } from "@/lib/business/ad-analytics-types";

/** Real ad analytics for a date-range label, refetched when it changes. While
 * a new range loads, the previous result stays on screen. */
export function useAdAnalytics(range: string): { data: AdAnalytics | null; loading: boolean; failed: boolean } {
  const [result, setResult] = React.useState<{ range: string; data: AdAnalytics | null; failed: boolean } | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    fetchAdAnalytics(range)
      .then((data) => {
        if (!cancelled) setResult({ range, data, failed: false });
      })
      .catch(() => {
        if (!cancelled) setResult({ range, data: null, failed: true });
      });
    return () => {
      cancelled = true;
    };
  }, [range]);

  return { data: result?.data ?? null, loading: result?.range !== range, failed: !!result?.failed };
}
