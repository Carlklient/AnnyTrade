"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const HEADER_OFFSET_PX = 80;

/**
 * Ensures hash targets (e.g. /#contact, /#featured-work) land correctly
 * after Next.js client navigations, respecting the sticky header.
 */
export function HashScroll() {
  const pathname = usePathname();

  useEffect(() => {
    function scrollToHash() {
      const hash = window.location.hash.replace(/^#/, "");
      if (!hash || hash === "top") {
        if (hash === "top") window.scrollTo({ top: 0, behavior: "auto" });
        return;
      }

      const el = document.getElementById(hash);
      if (!el) return;

      const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      const top =
        el.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET_PX;

      window.scrollTo({
        top: Math.max(0, top),
        behavior: reduceMotion ? "auto" : "smooth",
      });
    }

    // Defer until layout settles (images/fonts).
    const id = window.setTimeout(scrollToHash, 50);
    window.addEventListener("hashchange", scrollToHash);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener("hashchange", scrollToHash);
    };
  }, [pathname]);

  return null;
}
