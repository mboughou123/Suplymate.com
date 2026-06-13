"use client";

export default function DashboardBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#0B1220]">
      <div className="absolute inset-0 bg-gradient-to-br from-[#0B1220] via-[#0F172A] to-[#111827]" />
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
          backgroundSize: "56px 56px",
        }}
      />
      <div className="absolute -left-40 top-0 h-[500px] w-[500px] rounded-full bg-ai-glow/10 blur-[120px]" />
      <div className="absolute -right-32 top-1/3 h-96 w-96 rounded-full bg-gold/8 blur-[100px]" />
      <div className="absolute bottom-0 left-1/3 h-72 w-[480px] rounded-full bg-cyan/5 blur-[90px]" />
    </div>
  );
}
