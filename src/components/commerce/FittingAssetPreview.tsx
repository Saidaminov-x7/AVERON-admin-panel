import { Component, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Canvas, useLoader } from '@react-three/fiber';
import { BufferGeometry, CatmullRomCurve3, Float32BufferAttribute, MeshStandardMaterial, TubeGeometry, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

type PreviewTransform = { scale: number; positionX: number; positionY: number; positionZ: number };

function LoadedModel({ url, transform, onLoaded }: { url: string; transform: PreviewTransform; onLoaded: (url: string) => void }) {
  const gltf = useLoader(GLTFLoader, url);
  const scene = useMemo(() => gltf.scene.clone(true), [gltf.scene]);
  useEffect(() => () => {
    scene.traverse((object) => {
      const mesh = object as typeof object & { geometry?: BufferGeometry; material?: unknown };
      mesh.geometry?.dispose();
      const materials = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : [];
      for (const material of materials) {
        if (!material || typeof material !== 'object' || !('dispose' in material) || typeof material.dispose !== 'function') continue;
        for (const value of Object.values(material)) {
          if (value && typeof value === 'object' && 'isTexture' in value && value.isTexture === true && 'dispose' in value && typeof value.dispose === 'function') value.dispose();
        }
        material.dispose();
      }
    });
    useLoader.clear(GLTFLoader, url);
  }, [scene, url]);
  useEffect(() => onLoaded(url), [onLoaded, url]);
  return <primitive object={scene} position={[transform.positionX, transform.positionY, transform.positionZ]} scale={transform.scale} />;
}

type Ring = { y: number; centerX: number; radiusX: number; radiusZ: number };

function createProfileGeometry(rings: Ring[], segments = 48) {
  const positions: number[] = [];
  const indices: number[] = [];
  rings.forEach((ring) => {
    for (let index = 0; index < segments; index += 1) {
      const angle = index / segments * Math.PI * 2;
      positions.push(ring.centerX + Math.cos(angle) * ring.radiusX, ring.y, Math.sin(angle) * ring.radiusZ);
    }
  });
  for (let ringIndex = 0; ringIndex < rings.length - 1; ringIndex += 1) {
    for (let segment = 0; segment < segments; segment += 1) {
      const next = (segment + 1) % segments;
      const a = ringIndex * segments + segment;
      const b = ringIndex * segments + next;
      const c = (ringIndex + 1) * segments + next;
      const d = (ringIndex + 1) * segments + segment;
      indices.push(a, d, b, b, d, c);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function NeutralMannequin() {
  const geometry = useMemo(() => ({
    torso: createProfileGeometry([
      { y: 0.84, centerX: 0, radiusX: 0.13, radiusZ: 0.11 }, { y: 0.96, centerX: 0, radiusX: 0.17, radiusZ: 0.12 },
      { y: 1.10, centerX: 0, radiusX: 0.155, radiusZ: 0.105 }, { y: 1.28, centerX: 0, radiusX: 0.195, radiusZ: 0.115 },
      { y: 1.43, centerX: 0, radiusX: 0.225, radiusZ: 0.12 }, { y: 1.55, centerX: 0, radiusX: 0.185, radiusZ: 0.105 },
      { y: 1.62, centerX: 0, radiusX: 0.075, radiusZ: 0.07 },
    ]),
    leftLeg: createProfileGeometry([
      { y: 0.06, centerX: -0.09, radiusX: 0.047, radiusZ: 0.05 }, { y: 0.23, centerX: -0.09, radiusX: 0.065, radiusZ: 0.07 },
      { y: 0.45, centerX: -0.095, radiusX: 0.072, radiusZ: 0.075 }, { y: 0.68, centerX: -0.1, radiusX: 0.095, radiusZ: 0.095 },
      { y: 0.9, centerX: -0.09, radiusX: 0.09, radiusZ: 0.09 }, { y: 1.02, centerX: -0.075, radiusX: 0.07, radiusZ: 0.075 },
    ]),
    rightLeg: createProfileGeometry([
      { y: 0.06, centerX: 0.09, radiusX: 0.047, radiusZ: 0.05 }, { y: 0.23, centerX: 0.09, radiusX: 0.065, radiusZ: 0.07 },
      { y: 0.45, centerX: 0.095, radiusX: 0.072, radiusZ: 0.075 }, { y: 0.68, centerX: 0.1, radiusX: 0.095, radiusZ: 0.095 },
      { y: 0.9, centerX: 0.09, radiusX: 0.09, radiusZ: 0.09 }, { y: 1.02, centerX: 0.075, radiusX: 0.07, radiusZ: 0.075 },
    ]),
  }), []);
  const arms = useMemo(() => [
    new TubeGeometry(new CatmullRomCurve3([new Vector3(-0.16, 1.5, 0), new Vector3(-0.29, 1.43, 0), new Vector3(-0.37, 1.24, 0), new Vector3(-0.4, 1.02, 0)]), 36, 0.052, 16, false),
    new TubeGeometry(new CatmullRomCurve3([new Vector3(0.16, 1.5, 0), new Vector3(0.29, 1.43, 0), new Vector3(0.37, 1.24, 0), new Vector3(0.4, 1.02, 0)]), 36, 0.052, 16, false),
  ], []);
  const skin = useMemo(() => new MeshStandardMaterial({ color: '#d6d1c8', roughness: 0.84, metalness: 0 }), []);
  useEffect(() => () => {
    Object.values(geometry).forEach((item) => item.dispose());
    arms.forEach((item) => item.dispose());
    skin.dispose();
  }, [arms, geometry, skin]);

  return <group>
    <mesh geometry={geometry.torso} material={skin} />
    <mesh geometry={geometry.leftLeg} material={skin} />
    <mesh geometry={geometry.rightLeg} material={skin} />
    {arms.map((item, index) => <mesh key={index} geometry={item} material={skin} />)}
    <mesh position={[0, 1.655, 0]} rotation={[0.12, 0, 0]} material={skin}><cylinderGeometry args={[0.047, 0.055, 0.12, 32]} /></mesh>
    <mesh position={[0, 1.81, 0]} scale={[0.105, 0.135, 0.095]} material={skin}><sphereGeometry args={[1, 32, 24]} /></mesh>
    {[-1, 1].map((side) => <mesh key={side} position={[side * 0.09, 0.035, 0.045]} material={skin}><boxGeometry args={[0.105, 0.07, 0.22]} /></mesh>)}
  </group>;
}

class PreviewErrorBoundary extends Component<{ children: ReactNode; unavailable: ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onError(); }
  render() { return this.state.failed ? this.props.unavailable : this.props.children; }
}

export function FittingAssetPreview({ url, transform, labels }: { url: string; transform: PreviewTransform; labels: { loading: string; unavailable: string; left: string; right: string } }) {
  const [rotation, setRotation] = useState(0);
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const onLoaded = useCallback((loaded: string) => setLoadedUrl(loaded), []);
  const modelLoaded = loadedUrl === url;
  const modelFailed = failedUrl === url;
  const min = -Math.PI / 3;
  const max = Math.PI / 3;
  const adjust = (value: number) => setRotation(Math.max(min, Math.min(max, value)));

  return <div className="overflow-hidden rounded-lg border border-app bg-surface">
    <div className="h-56 bg-app">
      <PreviewErrorBoundary onError={() => setFailedUrl(url)} unavailable={<div role="alert" className="grid h-full place-items-center p-4 text-center text-xs text-muted">{labels.unavailable}</div>}>
        <Canvas camera={{ position: [0, 1.15, 4.1], fov: 31 }} frameloop="demand" dpr={[1, 1.5]} fallback={<div className="grid h-full place-items-center text-xs text-muted">{labels.unavailable}</div>}>
          <color attach="background" args={['#f4f2ef']} />
          <ambientLight intensity={1.7} />
          <directionalLight position={[3, 4, 5]} intensity={2.1} />
          <mesh position={[0, -0.025, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[0.55, 48]} /><meshStandardMaterial color="#e4e0da" roughness={1} /></mesh>
          <Suspense fallback={null}><group rotation={[0, rotation, 0]}><NeutralMannequin /><LoadedModel url={url} transform={transform} onLoaded={onLoaded} /></group></Suspense>
        </Canvas>
      </PreviewErrorBoundary>
    </div>
    <div className="flex items-center gap-3 p-3">
      <button type="button" aria-label={labels.left} onClick={() => adjust(rotation - 0.16)} className="grid size-10 place-items-center rounded-md border border-app text-app">‹</button>
      <input aria-label="Model rotation" type="range" min={-60} max={60} value={rotation * 180 / Math.PI} onChange={(event) => adjust(Number(event.target.value) * Math.PI / 180)} className="min-w-0 flex-1" />
      <button type="button" aria-label={labels.right} onClick={() => adjust(rotation + 0.16)} className="grid size-10 place-items-center rounded-md border border-app text-app">›</button>
      <span className="w-10 text-right text-xs tabular-nums text-muted">{Math.round(rotation * 180 / Math.PI)}°</span>
    </div>
    {!modelLoaded && !modelFailed && <p role="status" className="px-3 py-2 text-center text-xs text-muted">{labels.loading}</p>}
  </div>;
}
