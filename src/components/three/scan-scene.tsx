"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

/**
 * Document-scanning scene.
 *
 * The beam position is driven by real pipeline progress, never by a timer, so the
 * animation is an honest representation of the work being done. The render loop is
 * paused when the tab is hidden and the WebGL context is released on unmount.
 */

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  uniform float uTime;
  uniform float uProgress;

  void main() {
    vUv = uv;
    vec3 pos = position;
    // Subtle paper flex so the page reads as a physical object.
    float wave = sin(pos.x * 2.2 + uTime * 0.9) * 0.012 + cos(pos.y * 1.7 - uTime * 0.6) * 0.01;
    pos.z += wave * (1.0 - uProgress * 0.4);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  precision highp float;

  varying vec2 vUv;
  uniform float uTime;
  uniform float uProgress;
  uniform vec3 uPaper;
  uniform vec3 uInk;
  uniform vec3 uAccent;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  // Procedural "text": rows of dashes whose length varies per row and per block.
  float textMask(vec2 uv) {
    float rows = 34.0;
    float row = floor(uv.y * rows);
    float rowSeed = hash(vec2(row, 3.0));

    // Leave gutters between sections.
    float sectionBreak = step(0.86, hash(vec2(floor(row / 5.0), 11.0)));
    if (sectionBreak > 0.5 && fract(row / 5.0) < 0.2) return 0.0;

    float indent = rowSeed > 0.72 ? 0.14 : 0.08;
    float lineEnd = 0.5 + rowSeed * 0.42;

    float inLine = step(indent, uv.x) * step(uv.x, lineEnd);
    float band = smoothstep(0.16, 0.28, fract(uv.y * rows)) * (1.0 - smoothstep(0.6, 0.74, fract(uv.y * rows)));

    // Word gaps.
    float words = step(0.22, hash(vec2(floor(uv.x * 46.0), row)));
    return inLine * band * words;
  }

  void main() {
    vec2 uv = vUv;

    vec3 color = uPaper;
    float grain = hash(uv * 720.0) * 0.03;
    color -= grain;

    float text = textMask(uv);

    // Heading rows render heavier.
    float headingRow = step(0.93, hash(vec2(floor(uv.y * 34.0), 7.0)));
    vec3 inkColor = mix(uInk, uInk * 0.55, headingRow);

    // The beam sweeps from the top of the page to uProgress.
    float beamY = 1.0 - uProgress;
    float beam = smoothstep(0.035, 0.0, abs(uv.y - beamY));
    float trail = smoothstep(0.0, 0.34, uv.y - beamY) * step(uv.y, beamY + 0.34);

    // Text already scanned is highlighted in the accent colour.
    float scanned = step(beamY, uv.y);
    vec3 scannedInk = mix(inkColor, uAccent, 0.85);
    vec3 ink = mix(inkColor, scannedInk, scanned);

    color = mix(color, ink, text * 0.92);
    color += uAccent * beam * 0.85;
    color += uAccent * trail * 0.06;

    // Vignette keeps focus on the page centre.
    float vignette = smoothstep(1.15, 0.35, length(uv - 0.5) * 1.6);
    color *= vignette;

    float edge = smoothstep(0.0, 0.012, uv.x) * smoothstep(1.0, 0.988, uv.x)
               * smoothstep(0.0, 0.009, uv.y) * smoothstep(1.0, 0.991, uv.y);

    gl_FragColor = vec4(color, edge);
  }
`;

function DocumentMesh({ progress }: { progress: number }) {
  const material = useRef<THREE.ShaderMaterial>(null);
  const group = useRef<THREE.Group>(null);
  const smoothed = useRef(0);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uProgress: { value: 0 },
      uPaper: { value: new THREE.Color("#11151f") },
      uInk: { value: new THREE.Color("#5c667a") },
      uAccent: { value: new THREE.Color("#7c7cf9") },
    }),
    [],
  );

  useFrame((state, delta) => {
    smoothed.current += (progress - smoothed.current) * Math.min(1, delta * 3.2);
    if (material.current) {
      material.current.uniforms.uTime.value = state.clock.elapsedTime;
      material.current.uniforms.uProgress.value = smoothed.current;
    }
    if (group.current) {
      const t = state.clock.elapsedTime;
      group.current.rotation.y = Math.sin(t * 0.28) * 0.14;
      group.current.rotation.x = -0.12 + Math.sin(t * 0.21) * 0.05;
      group.current.position.y = Math.sin(t * 0.5) * 0.03;
    }
  });

  return (
    <group ref={group}>
      <mesh>
        <planeGeometry args={[2.1, 2.85, 48, 64]} />
        <shaderMaterial
          ref={material}
          uniforms={uniforms}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          transparent
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

/** Seeded PRNG so particle layout is deterministic and the render stays pure. */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Particles that converge toward the beam as extraction progresses. */
function ExtractionParticles({ progress }: { progress: number }) {
  const points = useRef<THREE.Points>(null);
  const count = 420;

  const { positions, seeds } = useMemo(() => {
    const random = mulberry32(0x5eed);
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    for (let i = 0; i < count; i += 1) {
      positions[i * 3] = (random() - 0.5) * 3.6;
      positions[i * 3 + 1] = (random() - 0.5) * 3.6;
      positions[i * 3 + 2] = (random() - 0.5) * 1.4;
      seeds[i] = random();
    }
    return { positions, seeds };
  }, []);

  useFrame((state) => {
    const geometry = points.current?.geometry as THREE.BufferGeometry | undefined;
    if (!geometry) return;
    const array = geometry.attributes.position.array as Float32Array;
    const t = state.clock.elapsedTime;
    const beamY = (1 - progress) * 2.85 - 1.42;

    for (let i = 0; i < count; i += 1) {
      const seed = seeds[i];
      const pull = progress * (0.4 + seed * 0.6);
      array[i * 3 + 1] += (beamY - array[i * 3 + 1]) * 0.004 * pull;
      array[i * 3] += Math.sin(t * (0.3 + seed) + seed * 6.28) * 0.0016;
      array[i * 3 + 2] += Math.cos(t * (0.24 + seed) + seed * 3.14) * 0.0014;
    }
    geometry.attributes.position.needsUpdate = true;
    if (points.current) points.current.rotation.y = Math.sin(t * 0.15) * 0.1;
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.018}
        color="#7c7cf9"
        transparent
        opacity={0.55}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

/** Pauses rendering when the tab is hidden to protect battery on laptops and phones. */
function VisibilityGate() {
  const { invalidate, setFrameloop } = useThree();
  useEffect(() => {
    const onVisibility = () => {
      setFrameloop(document.hidden ? "never" : "always");
      if (!document.hidden) invalidate();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [invalidate, setFrameloop]);
  return null;
}

export default function ScanScene({ progress, simplified = false }: { progress: number; simplified?: boolean }) {
  return (
    <Canvas
      camera={{ position: [0, 0, 4.2], fov: 42 }}
      dpr={simplified ? 1 : [1, 1.75]}
      gl={{ antialias: !simplified, alpha: true, powerPreference: "high-performance" }}
      style={{ width: "100%", height: "100%" }}
      aria-hidden="true"
    >
      <VisibilityGate />
      <ambientLight intensity={0.7} />
      <DocumentMesh progress={progress} />
      {simplified ? null : <ExtractionParticles progress={progress} />}
    </Canvas>
  );
}
