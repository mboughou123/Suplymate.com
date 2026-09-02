"use client";

/**
 * @author: @kokonutui
 * @description: AI Loading State (Suplymate procurement task sequences)
 * @version: 1.0.0
 * @date: 2025-06-26
 * @license: MIT
 * @website: https://kokonutui.com
 * @github: https://github.com/kokonut-labs/kokonutui
 */

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const TASK_SEQUENCES = [
  {
    status: "Scanning supplier directories",
    lines: [
      "Opening verified mill index…",
      "Filtering by category and region…",
      "Reading factory certifications…",
      "Checking public business listings…",
      "Ranking phase-1 mills first…",
    ],
  },
  {
    status: "Matching specs",
    lines: [
      "Parsing material grade and dimensions…",
      "Matching tube, cable, and steel SKUs…",
      "Cross-checking MOQ and Incoterms…",
      "Scoring reliability and response time…",
      "Building a shortlist of mills…",
    ],
  },
  {
    status: "Comparing quotes",
    lines: [
      "Collecting RFQ-ready price signals…",
      "Aligning lead times across mills…",
      "Flagging delivery risk…",
      "Preparing Scout / Compare / Watch summary…",
      "Ready for your next prompt…",
    ],
  },
];

const LoadingAnimation = ({ progress }: { progress: number }) => (
  <div className="relative h-6 w-6">
    <svg
      aria-label={`Loading progress: ${Math.round(progress)}%`}
      className="h-full w-full"
      fill="none"
      viewBox="0 0 240 240"
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>Loading Progress Indicator</title>
      <defs>
        <mask id="progress-mask-suplymate">
          <rect fill="black" height="240" width="240" />
          <circle
            cx="120"
            cy="120"
            fill="white"
            r="120"
            strokeDasharray={`${(progress / 100) * 754}, 754`}
            transform="rotate(-90 120 120)"
          />
        </mask>
      </defs>
      <style>
        {`
          @keyframes rotate-cw { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          @keyframes rotate-ccw { from { transform: rotate(360deg); } to { transform: rotate(0deg); } }
          .g-spin-sm circle { transform-origin: 120px 120px; }
          .g-spin-sm circle:nth-child(1) { animation: rotate-cw 8s linear infinite; }
          .g-spin-sm circle:nth-child(2) { animation: rotate-ccw 8s linear infinite; }
          .g-spin-sm circle:nth-child(3) { animation: rotate-cw 8s linear infinite; }
          .g-spin-sm circle:nth-child(4) { animation: rotate-ccw 8s linear infinite; }
          .g-spin-sm circle:nth-child(5) { animation: rotate-cw 8s linear infinite; }
          .g-spin-sm circle:nth-child(6) { animation: rotate-ccw 8s linear infinite; }
        `}
      </style>
      <g
        className="g-spin-sm"
        mask="url(#progress-mask-suplymate)"
        strokeDasharray="18% 40%"
        strokeWidth="16"
      >
        <circle cx="120" cy="120" opacity="0.95" r="150" stroke="#0d3349" />
        <circle cx="120" cy="120" opacity="0.95" r="130" stroke="#0369a1" />
        <circle cx="120" cy="120" opacity="0.95" r="110" stroke="#0ea5b7" />
        <circle cx="120" cy="120" opacity="0.95" r="90" stroke="#14b8a6" />
        <circle cx="120" cy="120" opacity="0.95" r="70" stroke="#1a4a6b" />
        <circle cx="120" cy="120" opacity="0.95" r="50" stroke="#C9A84C" />
      </g>
    </svg>
  </div>
);

type Props = {
  className?: string;
};

export default function AILoadingState({ className }: Props) {
  const [sequenceIndex, setSequenceIndex] = useState(0);
  const [visibleLines, setVisibleLines] = useState<
    Array<{ text: string; number: number }>
  >([]);
  const [scrollPosition, setScrollPosition] = useState(0);
  const codeContainerRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(true);
  const lineHeight = 28;

  useEffect(() => {
    const element = rootRef.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { rootMargin: "100px" }
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const currentSequence = TASK_SEQUENCES[sequenceIndex];
  const totalLines = currentSequence.lines.length;

  useEffect(() => {
    const initialLines = [];
    for (let i = 0; i < Math.min(5, totalLines); i++) {
      initialLines.push({
        text: currentSequence.lines[i],
        number: i + 1,
      });
    }
    setVisibleLines(initialLines);
    setScrollPosition(0);
  }, [sequenceIndex, currentSequence.lines, totalLines]);

  useEffect(() => {
    if (!isVisible) return;
    const advanceTimer = setInterval(() => {
      const firstVisibleLineIndex = Math.floor(scrollPosition / lineHeight);
      const nextLineIndex = (firstVisibleLineIndex + 3) % totalLines;
      if (nextLineIndex < firstVisibleLineIndex && nextLineIndex !== 0) {
        setSequenceIndex((prev) => (prev + 1) % TASK_SEQUENCES.length);
        return;
      }
      if (nextLineIndex >= visibleLines.length && nextLineIndex < totalLines) {
        setVisibleLines((prev) => [
          ...prev,
          {
            text: currentSequence.lines[nextLineIndex],
            number: nextLineIndex + 1,
          },
        ]);
      }
      setScrollPosition((prev) => prev + lineHeight);
    }, 1800);
    return () => clearInterval(advanceTimer);
  }, [
    isVisible,
    scrollPosition,
    visibleLines,
    totalLines,
    sequenceIndex,
    currentSequence.lines,
    lineHeight,
  ]);

  useEffect(() => {
    if (codeContainerRef.current) {
      codeContainerRef.current.scrollTop = scrollPosition;
    }
  }, [scrollPosition]);

  return (
    <div
      className={cn("flex w-full items-center justify-center py-2", className)}
      ref={rootRef}
    >
      <div className="w-full max-w-md space-y-3">
        <div className="flex items-center gap-2 font-medium text-ink-muted">
          <LoadingAnimation
            progress={((sequenceIndex + 1) / TASK_SEQUENCES.length) * 100}
          />
          <span className="text-sm">{currentSequence.status}…</span>
        </div>

        <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
          <div
            className="relative h-[84px] w-full overflow-hidden font-mono text-xs"
            ref={codeContainerRef}
            style={{ scrollBehavior: "smooth" }}
          >
            {visibleLines.map((line) => (
              <div
                className="flex h-[28px] items-center px-2"
                key={`${line.number}-${line.text}`}
              >
                <div className="w-6 select-none pr-3 text-right text-ink-dim">
                  {line.number}
                </div>
                <div className="ml-1 flex-1 text-ink">{line.text}</div>
              </div>
            ))}
          </div>
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-slate-50/90 via-transparent to-slate-50/90" />
        </div>
      </div>
    </div>
  );
}
