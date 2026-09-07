import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, extend } from '@react-three/fiber';
import { OrbitControls, Effects } from '@react-three/drei';
import { UnrealBloomPass } from 'three-stdlib';
import * as THREE from 'three';

extend({ UnrealBloomPass });

const ParticleSwarm = () => {
  const meshRef = useRef();
  const count = 20000;
  const speedMult = 1;
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const target = useMemo(() => new THREE.Vector3(), []);
  const pColor = useMemo(() => new THREE.Color(), []);
  const color = pColor; // Alias for user code compatibility
  
  const positions = useMemo(() => {
     const pos = [];
     for(let i=0; i<count; i++) pos.push(new THREE.Vector3((Math.random()-0.5)*100, (Math.random()-0.5)*100, (Math.random()-0.5)*100));
     return pos;
  }, []);

  // Material & Geom
  const material = useMemo(() => new THREE.MeshBasicMaterial({ color: 0xffffff }), []);
  const geometry = useMemo(() => new THREE.TetrahedronGeometry(0.25), []);

  const PARAMS = useMemo(() => ({"radius":60,"flow":0.8,"turb":0.45,"shell":0.25,"hueShift":0.35}), []);
  const addControl = (id, l, min, max, val) => {
      return PARAMS[id] !== undefined ? PARAMS[id] : val;
  };
  const setInfo = () => {};
  const annotate = () => {};

  useFrame((state) => {
    if (!meshRef.current) return;
    const time = state.clock.getElapsedTime() * speedMult;
    const THREE_LIB = THREE;

    if(material.uniforms && material.uniforms.uTime) {
         material.uniforms.uTime.value = time;
    }

    for (let i = 0; i < count; i++) {
        // USER CODE START
        const radius = addControl("radius", "Orb Radius", 20, 120, 60);
        const flow = addControl("flow", "Flow Speed", 0, 3, 0.8);
        const turb = addControl("turb", "Turbulence", 0, 1, 0.45);
        const shell = addControl("shell", "Glass Depth", 0, 1, 0.25);
        const hueShift = addControl("hueShift", "Hue Drift", 0, 1, 0.35);
        
        const t = time * flow;
        
        // Fibonacci sphere distribution for even coverage
        const golden = 2.399963229728653;
        const frac = (i + 0.5) / count;
        const y0 = 1.0 - 2.0 * frac;
        const r0 = Math.sqrt(Math.max(0.0, 1.0 - y0 * y0));
        const th = golden * i;
        
        let x = r0 * Math.cos(th);
        let y = y0;
        let z = r0 * Math.sin(th);
        
        // Layered sine "curl" turbulence — swirling energy ribbons inside the glass
        const w1 = Math.sin(3.0 * x + t * 1.7 + Math.cos(2.0 * z - t)) * Math.cos(2.0 * y - t * 1.3);
        const w2 = Math.sin(4.0 * z - t * 1.1 + Math.cos(3.0 * x + t * 0.7)) * Math.cos(3.0 * y + t);
        const w3 = Math.sin(2.0 * y + t * 2.1 + Math.cos(4.0 * x - t * 0.5)) * Math.cos(2.0 * z + t * 0.9);
        
        // Gentle breathing of the whole orb
        const breath = 1.0 + 0.06 * Math.sin(t * 1.2) + 0.03 * Math.sin(t * 2.7 + 1.3);
        
        // Two populations blended by pure math: outer glass shell + inner energy core
        const band = 0.5 + 0.5 * Math.sin(frac * 6.28318 * 3.0 + t * 0.6);
        const shellMix = band * shell;
        
        // Radial modulation: shell particles hug the surface, core particles swirl deeper
        const rMod = breath * (1.0 - shellMix * (0.55 + 0.35 * Math.sin(th * 0.5 + t)));
        const dist = turb * 0.22;
        
        // Slow global rotation for that idle Siri drift
        const rotA = t * 0.25;
        const cA = Math.cos(rotA);
        const sA = Math.sin(rotA);
        const xr = x * cA - z * sA;
        const zr = x * sA + z * cA;
        
        const px = (xr + w1 * dist) * radius * rMod;
        const py = (y + w2 * dist * 1.15) * radius * rMod;
        const pz = (zr + w3 * dist) * radius * rMod;
        
        target.set(px, py, pz);
        
        // Iridescent glass palette: cyan -> violet -> magenta flowing across the surface
        const swirl = 0.5 + 0.5 * Math.sin(y * 2.0 + xr * 1.5 + t * 1.4 + w1 * 2.0);
        const hue = 0.52 + hueShift * 0.28 * swirl + 0.05 * Math.sin(t * 0.5 + frac * 6.28318);
        const edge = Math.abs(y0);
        const light = 0.55 + 0.25 * w2 * turb + 0.12 * edge;
        const sat = 0.75 + 0.2 * swirl;
        
        color.setHSL(hue % 1.0, Math.min(1.0, Math.max(0.0, sat)), Math.min(0.92, Math.max(0.15, light)));
        
        if (i === 0) {
          setInfo("Glass Orb // Siri iOS 27", "Iridescent breathing sphere with internal curl-flow energy ribbons. Tune Glass Depth for shell layering, Turbulence for inner chaos.");
          annotate("core", new THREE.Vector3(0, 0, 0), "Neural Core");
        }
        // USER CODE END

        positions[i].lerp(target, 0.1);
        dummy.position.copy(positions[i]);
        dummy.updateMatrix();
        meshRef.current.setMatrixAt(i, dummy.matrix);
        meshRef.current.setColorAt(i, pColor);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[geometry, material, count]} />
  );
};

export default function App() {
  return (
    <div style={{ width: '100vw', height: '100vh', background: '#000' }}>
      <Canvas camera={{ position: [0, 0, 100], fov: 60 }}>
        <fog attach="fog" args={['#000000', 0.01]} />
        <ParticleSwarm />
        <OrbitControls autoRotate={true} />
        <Effects disableGamma>
            <unrealBloomPass threshold={0} strength={1.8} radius={0.4} />
        </Effects>
      </Canvas>
    </div>
  );
}