"use client";

/**
 * @author: @dorianbaffier
 * @description: Beams Background (canvas layer only — no stock title)
 * @version: 1.0.0
 * @date: 2025-06-26
 * @license: MIT
 * @website: https://kokonutui.com
 * @github: https://github.com/kokonut-labs/kokonutui
 */

import { motion } from "framer-motion";
import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface AnimatedGradientBackgroundProps {
  className?: string;
  children?: ReactNode;
  intensity?: "subtle" | "medium" | "strong";
}

interface Beam {
  x: number;
  y: number;
  width: number;
  length: number;
  angle: number;
  speed: number;
  opacity: number;
  hue: number;
  pulse: number;
  pulseSpeed: number;
}

/** Navy / azure hues only — not the stock sky/violet sweep. */
function createBeam(width: number, height: number): Beam {
  const angle = -35 + Math.random() * 10;
  return {
    x: Math.random() * width * 1.5 - width * 0.25,
    y: Math.random() * height * 1.5 - height * 0.25,
    width: 30 + Math.random() * 60,
    length: height * 2.5,
    angle,
    speed: 0.6 + Math.random() * 1.2,
    opacity: 0.1 + Math.random() * 0.12,
    hue: 196 + Math.random() * 18,
    pulse: Math.random() * Math.PI * 2,
    pulseSpeed: 0.02 + Math.random() * 0.03,
  };
}

export default function BeamsBackground({
  className,
  children,
  intensity = "subtle",
}: AnimatedGradientBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const beamsRef = useRef<Beam[]>([]);
  const animationFrameRef = useRef(0);
  const MINIMUM_BEAMS = 16;

  const opacityMap = {
    subtle: 0.55,
    medium: 0.8,
    strong: 1,
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const updateCanvasSize = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.clientWidth || window.innerWidth;
      const h = canvas.clientHeight || window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      beamsRef.current = Array.from({ length: MINIMUM_BEAMS }, () =>
        createBeam(w, h)
      );
    };

    updateCanvasSize();
    window.addEventListener("resize", updateCanvasSize);

    function resetBeam(beam: Beam, index: number, totalBeams: number) {
      const w = canvas!.clientWidth || window.innerWidth;
      const h = canvas!.clientHeight || window.innerHeight;
      const column = index % 3;
      const spacing = w / 3;
      beam.y = h + 100;
      beam.x = column * spacing + spacing / 2 + (Math.random() - 0.5) * spacing * 0.5;
      beam.width = 80 + Math.random() * 80;
      beam.speed = 0.4 + Math.random() * 0.35;
      beam.hue = 196 + (index * 18) / totalBeams;
      beam.opacity = 0.12 + Math.random() * 0.08;
      beam.length = h * 2.5;
      return beam;
    }

    function drawBeam(context: CanvasRenderingContext2D, beam: Beam) {
      context.save();
      context.translate(beam.x, beam.y);
      context.rotate((beam.angle * Math.PI) / 180);
      const pulsingOpacity =
        beam.opacity * (0.8 + Math.sin(beam.pulse) * 0.2) * opacityMap[intensity];
      const gradient = context.createLinearGradient(0, 0, 0, beam.length);
      const saturation = "62%";
      const lightness = "38%";
      gradient.addColorStop(0, `hsla(${beam.hue}, ${saturation}, ${lightness}, 0)`);
      gradient.addColorStop(
        0.1,
        `hsla(${beam.hue}, ${saturation}, ${lightness}, ${pulsingOpacity * 0.45})`
      );
      gradient.addColorStop(
        0.4,
        `hsla(${beam.hue}, ${saturation}, ${lightness}, ${pulsingOpacity})`
      );
      gradient.addColorStop(
        0.9,
        `hsla(${beam.hue}, ${saturation}, ${lightness}, ${pulsingOpacity * 0.4})`
      );
      gradient.addColorStop(1, `hsla(${beam.hue}, ${saturation}, ${lightness}, 0)`);
      context.fillStyle = gradient;
      context.fillRect(-beam.width / 2, 0, beam.width, beam.length);
      context.restore();
    }

    if (reduceMotion) {
      ctx.filter = "blur(35px)";
      beamsRef.current.forEach((beam) => drawBeam(ctx, beam));
      return () => window.removeEventListener("resize", updateCanvasSize);
    }

    function animate() {
      if (!ctx || !canvas) return;
      const w = canvas.clientWidth || window.innerWidth;
      const h = canvas.clientHeight || window.innerHeight;
      ctx.clearRect(0, 0, w, h);
      ctx.filter = "blur(35px)";
      const totalBeams = beamsRef.current.length;
      beamsRef.current.forEach((beam, index) => {
        beam.y -= beam.speed;
        beam.pulse += beam.pulseSpeed;
        if (beam.y + beam.length < -100) resetBeam(beam, index, totalBeams);
        drawBeam(ctx, beam);
      });
      animationFrameRef.current = requestAnimationFrame(animate);
    }

    animate();

    return () => {
      window.removeEventListener("resize", updateCanvasSize);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [intensity]);

  return (
    <div className={cn("relative isolate overflow-hidden", className)}>
      <canvas
        ref={canvasRef}
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full"
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[#F7F8FA]/55"
        animate={{ opacity: [0.45, 0.62, 0.45] }}
        transition={{ duration: 12, ease: "easeInOut", repeat: Infinity }}
      />
      {children ? <div className="relative z-10">{children}</div> : null}
    </div>
  );
}
