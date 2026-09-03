"use client";

/**
 * Particle orb / atmosphere for Mate (Scout / Compare / Watch).
 * Supports a solid card variant (legacy) and a translucent background variant
 * used behind the homepage console and the AI assistant page.
 */

import { useMemo, useRef, useState, useEffect } from "react";
import { Canvas, useFrame, extend } from "@react-three/fiber";
import { OrbitControls, Effects } from "@react-three/drei";
import { UnrealBloomPass } from "three-stdlib";
import * as THREE from "three";

extend({ UnrealBloomPass });

function ParticleSwarm({ count }: { count: number }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const target = useMemo(() => new THREE.Vector3(), []);
  const pColor = useMemo(() => new THREE.Color(), []);

  const positions = useMemo(() => {
    const pos: THREE.Vector3[] = [];
    for (let i = 0; i < count; i++) {
      pos.push(
        new THREE.Vector3(
          (Math.random() - 0.5) * 100,
          (Math.random() - 0.5) * 100,
          (Math.random() - 0.5) * 100
        )
      );
    }
    return pos;
  }, [count]);

  const material = useMemo(
    () => new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 }),
    []
  );
  const geometry = useMemo(() => new THREE.TetrahedronGeometry(0.25), []);

  const PARAMS = useMemo(
    () => ({ radius: 52, flow: 0.75, turb: 0.4, shell: 0.28, hueShift: 0.28 }),
    []
  );

  useFrame((state) => {
    if (!meshRef.current) return;
    const time = state.clock.getElapsedTime();
    const { radius, flow, turb, shell, hueShift } = PARAMS;
    const t = time * flow;

    for (let i = 0; i < count; i++) {
      const golden = 2.399963229728653;
      const frac = (i + 0.5) / count;
      const y0 = 1.0 - 2.0 * frac;
      const r0 = Math.sqrt(Math.max(0.0, 1.0 - y0 * y0));
      const th = golden * i;

      let x = r0 * Math.cos(th);
      const y = y0;
      let z = r0 * Math.sin(th);

      const w1 =
        Math.sin(3.0 * x + t * 1.7 + Math.cos(2.0 * z - t)) *
        Math.cos(2.0 * y - t * 1.3);
      const w2 =
        Math.sin(4.0 * z - t * 1.1 + Math.cos(3.0 * x + t * 0.7)) *
        Math.cos(3.0 * y + t);
      const w3 =
        Math.sin(2.0 * y + t * 2.1 + Math.cos(4.0 * x - t * 0.5)) *
        Math.cos(2.0 * z + t * 0.9);

      const breath =
        1.0 + 0.06 * Math.sin(t * 1.2) + 0.03 * Math.sin(t * 2.7 + 1.3);
      const band = 0.5 + 0.5 * Math.sin(frac * 6.28318 * 3.0 + t * 0.6);
      const shellMix = band * shell;
      const rMod =
        breath * (1.0 - shellMix * (0.55 + 0.35 * Math.sin(th * 0.5 + t)));

      x = x * radius * rMod + w1 * turb * 4.5;
      const yy = y * radius * rMod + w2 * turb * 3.5;
      z = z * radius * rMod + w3 * turb * 4.5;

      target.set(x, yy, z);

      const swirl = 0.5 + 0.5 * Math.sin(th + t * 0.8);
      const hue = 0.48 + hueShift * swirl + 0.04 * Math.sin(t + frac * 12.0);
      const edge = Math.abs(y0);
      const light = 0.5 + 0.22 * w2 * turb + 0.12 * edge;
      const sat = 0.7 + 0.18 * swirl;

      pColor.setHSL(
        hue % 1.0,
        Math.min(1.0, Math.max(0.0, sat)),
        Math.min(0.9, Math.max(0.18, light))
      );

      positions[i].lerp(target, 0.1);
      dummy.position.copy(positions[i]);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
      meshRef.current.setColorAt(i, pColor);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  });

  return <instancedMesh ref={meshRef} args={[geometry, material, count]} />;
}

function OrbCanvas({ count, transparent }: { count: number; transparent?: boolean }) {
  return (
    <Canvas
      camera={{ position: [0, 0, 95], fov: 55 }}
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true }}
      className="h-full w-full"
      style={{ background: "transparent" }}
    >
      {!transparent && <color attach="background" args={["#061018"]} />}
      {!transparent && <fog attach="fog" args={["#061018", 40, 160]} />}
      <ParticleSwarm count={count} />
      <OrbitControls
        enableZoom={false}
        enablePan={false}
        enableRotate={false}
        autoRotate
        autoRotateSpeed={0.35}
      />
      <Effects disableGamma>
        {/* @ts-expect-error drei Effects JSX for UnrealBloomPass */}
        <unrealBloomPass threshold={0} strength={transparent ? 1.1 : 1.35} radius={0.45} />
      </Effects>
    </Canvas>
  );
}

type Props = {
  /** "card" = solid panel; "background" = translucent atmosphere behind UI */
  variant?: "card" | "background";
  className?: string;
};

export default function HomeAgentOrb({ variant = "card", className = "" }: Props) {
  const [count, setCount] = useState(variant === "background" ? 9000 : 12000);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mqMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const mqNarrow = window.matchMedia("(max-width: 768px)");
    const apply = () => {
      setReduced(mqMotion.matches);
      if (variant === "background") {
        setCount(mqNarrow.matches ? 4500 : 9000);
      } else {
        setCount(mqNarrow.matches ? 7000 : 14000);
      }
    };
    apply();
    mqMotion.addEventListener("change", apply);
    mqNarrow.addEventListener("change", apply);
    return () => {
      mqMotion.removeEventListener("change", apply);
      mqNarrow.removeEventListener("change", apply);
    };
  }, [variant]);

  if (variant === "background") {
    if (reduced) {
      return (
        <div
          aria-hidden
          className={`pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-navy/40 via-cyan/10 to-transparent ${className}`}
        />
      );
    }
    return (
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-0 -z-10 overflow-hidden ${className}`}
      >
        <OrbCanvas count={count} transparent />
        <div className="absolute inset-0 bg-gradient-to-b from-base/20 via-transparent to-base/40" />
      </div>
    );
  }

  if (reduced) {
    return (
      <div className={`flex h-full min-h-[260px] items-center justify-center rounded-2xl bg-navy-gradient ${className}`}>
        <div className="h-28 w-28 rounded-full bg-gradient-to-br from-cyan/40 via-navy-mid to-navy shadow-[0_0_60px_rgba(14,165,183,0.35)]" />
      </div>
    );
  }

  return (
    <div
      className={`relative h-full min-h-[280px] overflow-hidden rounded-2xl border border-white/10 bg-[#061018] shadow-card sm:min-h-[360px] ${className}`}
    >
      <OrbCanvas count={count} />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#061018]/90 to-transparent px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan/90">
          Scout · Compare · Watch
        </p>
        <p className="mt-0.5 text-xs text-white/60">Mate atmosphere</p>
      </div>
    </div>
  );
}
