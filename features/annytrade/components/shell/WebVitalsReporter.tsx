"use client";

import { useReportWebVitals } from "next/web-vitals";

/** Lightweight web-vitals reporter for desk performance visibility. */
export function WebVitalsReporter() {
  useReportWebVitals((metric) => {
    if (process.env.NODE_ENV === "development") {
      console.info("[annytrade:web-vital]", metric.name, metric.value);
    }
  });
  return null;
}
