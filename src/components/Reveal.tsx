"use client";

import {
  createElement,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

type RevealProps = {
  children: ReactNode;
  className?: string;
  /** Stagger delay in ms */
  delay?: number;
  as?: "div" | "section" | "li" | "article";
};

export default function Reveal({
  children,
  className = "",
  delay = 0,
  as = "div",
}: RevealProps) {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Safety: if the element is already in or above the viewport on mount
    // (e.g. restored scroll position, short pages), reveal it immediately
    // so content can never get stuck hidden.
    const inViewport = () => el.getBoundingClientRect().top < window.innerHeight;
    if (inViewport()) {
      setVisible(true);
      return;
    }

    let revealed = false;
    const cleanups: (() => void)[] = [];
    const reveal = () => {
      if (revealed) return;
      revealed = true;
      setVisible(true);
      cleanups.forEach((fn) => fn());
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) reveal();
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );
    observer.observe(el);
    cleanups.push(() => observer.disconnect());

    // Belt-and-braces fallback: also check on scroll (rAF-throttled), so a
    // missed/late IntersectionObserver can never leave content hidden.
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        if (inViewport()) reveal();
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    cleanups.push(() => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    });

    return () => cleanups.forEach((fn) => fn());
  }, []);

  // createElement avoids ElementType JSX casts that explode under @types/three.
  return createElement(
    as,
    {
      ref,
      className: `reveal ${visible ? "is-visible" : ""} ${className}`,
      style: { transitionDelay: `${delay}ms` },
    },
    children
  );
}
