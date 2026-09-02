"use client";

/**
 * Soft navy-glass canvas for the dashboard — matches the homepage Harvey/
 * navy-glass system without drowning the content cards.
 */
export default function DashboardBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-[#F4F7FA]" />
      <div
        className="absolute -left-24 top-0 h-[420px] w-[420px] rounded-full opacity-40 blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(3,105,161,0.18) 0%, transparent 70%)",
        }}
      />
      <div
        className="absolute -right-16 top-40 h-[360px] w-[360px] rounded-full opacity-35 blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(13,51,73,0.16) 0%, transparent 70%)",
        }}
      />
      <div
        className="absolute bottom-0 left-1/3 h-[280px] w-[480px] rounded-full opacity-30 blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(14,165,183,0.12) 0%, transparent 70%)",
        }}
      />
    </div>
  );
}
