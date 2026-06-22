"use client";

// Clean, flat light backdrop for the dashboard. No grid, gradients, or glow —
// just a very light gray canvas that lets white cards float with soft shadows.
export default function DashboardBackground() {
  return <div className="pointer-events-none fixed inset-0 -z-10 bg-[#F7F8FA]" />;
}
