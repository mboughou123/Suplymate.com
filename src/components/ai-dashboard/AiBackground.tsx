"use client";

export default function AiBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Base gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-ai-mist/40" />

      {/* Animated grid */}
      <div className="ai-grid-bg absolute inset-0 opacity-60 animate-grid-drift" />

      {/* Glow orbs */}
      <div className="absolute -left-32 top-20 h-96 w-96 rounded-full bg-ai-glow/30 blur-3xl" />
      <div className="absolute -right-24 bottom-32 h-80 w-80 rounded-full bg-gold/10 blur-3xl" />
      <div className="absolute left-1/2 top-0 h-64 w-[600px] -translate-x-1/2 rounded-full bg-cyan/5 blur-3xl" />

      {/* Floating particles */}
      {Array.from({ length: 12 }).map((_, i) => (
        <span
          key={i}
          className="absolute h-1 w-1 rounded-full bg-gold/30"
          style={{
            left: `${8 + (i * 7.5) % 85}%`,
            top: `${12 + (i * 11) % 75}%`,
            animation: `float ${5 + (i % 4)}s ease-in-out ${i * 0.4}s infinite`,
          }}
        />
      ))}
    </div>
  );
}
