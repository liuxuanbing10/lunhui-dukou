/**
 * RainNight.tsx — 2.5D 雨夜高质量视觉（程序化着色器氛围，不加载外部图片 / 不烧 token）
 * ----------------------------------------------------------------------------
 * 设计对标 3A 雨夜氛围，纯程序化：
 *  - 雨：instanced 线条下落并回收（单 draw call，按 dpr 自适应）
 *  - 汤碗暖光：底部中心自发光小碗 + 暖色 pointLight，经 Bloom 发光
 *  - 后期：EffectComposer → Bloom / Vignette / Noise（Bloom 克制、Vignette 收紧暗角）
 *  - 视差：useFrame 中相机随 sin(t) 轻微推拉 / 横移（景深感，不晃眼）
 *  - 模式响应：
 *      silence → 相机缓动推近汤碗、雨 opacity 降低、Vignette 加深、暖光稍压暗（呼应「沉默三秒」留白）
 *      memory  → 叠加琥珀色半透明叠影层（ghost planes），营造记忆回响
 *
 * 注意：颜色用内联常量（与 docs/art-style-standard-2.5d.md 对齐）。
 * TODO(integrate): 切换为 visual/theme 的 injectThemeVars() 接管下方 COLORS。
 *
 * 该组件完全不依赖尚未产出的 audio/* 与 content/livingTown。
 */
import { useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { EffectComposer, Bloom, Vignette, Noise } from '@react-three/postprocessing';
import * as THREE from 'three';

export type RainMode = 'idle' | 'silence' | 'memory';

// 内联颜色常量（与 docs/art-style-standard-2.5d.md 对齐）
// TODO(integrate): 切换为 visual/theme 的 injectThemeVars()
const COLORS = {
  night: '#0b1a2b', // 冷蓝基底
  bowlWarm: '#ffb15c', // 汤碗暖光
  memoryAmber: '#d8a24a', // 记忆琥珀
};

// 雨滴数量（单 instancedMesh = 1 draw call；按设备像素比 dpr=[1,2] 自适应）
const RAIN_COUNT = 500;
const SILENCE_MS = 2600;

interface Drop {
  x: number;
  y: number;
  z: number;
  speed: number;
  len: number;
}

function RainScene({ mode }: { mode: RainMode }) {
  const rainRef = useRef<THREE.InstancedMesh>(null);
  const rainMat = useRef<THREE.MeshBasicMaterial>(null);
  const pointLight = useRef<THREE.PointLight>(null);
  const ghostRef = useRef<THREE.Group>(null);
  const { camera } = useThree();

  const drops = useMemo<Drop[]>(() => {
    const arr: Drop[] = [];
    for (let i = 0; i < RAIN_COUNT; i++) {
      arr.push({
        x: (Math.random() - 0.5) * 22,
        y: Math.random() * 18 - 2,
        z: (Math.random() - 0.5) * 12,
        speed: 6 + Math.random() * 10,
        len: 0.4 + Math.random() * 0.7,
      });
    }
    return arr;
  }, []);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    const k = Math.min(1, dt * 1.5); // 缓动系数，避免帧率敏感

    // 相机视差（景深感，不晃眼）
    const targetX = mode === 'silence' ? 0 : Math.sin(t * 0.3) * 0.7;
    const targetZ = mode === 'silence' ? 4.4 : 6.2 + Math.sin(t * 0.22) * 0.5;
    const targetY = 1.3;
    camera.position.x += (targetX - camera.position.x) * k;
    camera.position.y += (targetY - camera.position.y) * k;
    camera.position.z += (targetZ - camera.position.z) * k;
    camera.lookAt(0, 1.1, 0);

    // 雨：下落并回收
    const mesh = rainRef.current;
    if (mesh) {
      for (let i = 0; i < RAIN_COUNT; i++) {
        const drop = drops[i];
        if (!drop) continue;
        drop.y -= drop.speed * dt;
        if (drop.y < -2.5) {
          drop.y = 14 + Math.random() * 4;
          drop.x = (Math.random() - 0.5) * 22;
        }
        dummy.position.set(drop.x, drop.y, drop.z);
        dummy.scale.set(0.018, drop.len, 0.018);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
    }

    // 雨透明度：silence 压暗（留白）
    if (rainMat.current) {
      const targetOpacity = mode === 'silence' ? 0.12 : 0.5;
      rainMat.current.opacity += (targetOpacity - rainMat.current.opacity) * Math.min(1, dt * 2);
    }

    // 汤碗暖光：silence 稍压暗
    if (pointLight.current) {
      const target = mode === 'silence' ? 1.1 : 2.4;
      pointLight.current.intensity += (target - pointLight.current.intensity) * Math.min(1, dt * 2);
    }

    // 记忆叠影：amber ghost planes 渐显
    if (ghostRef.current) {
      const target = mode === 'memory' ? 0.16 : 0;
      for (const child of ghostRef.current.children) {
        const m = (child as THREE.Mesh).material as THREE.MeshBasicMaterial;
        m.opacity += (target - m.opacity) * Math.min(1, dt * 2);
        m.visible = m.opacity > 0.002;
      }
    }
  });

  return (
    <>
      <ambientLight intensity={0.12} />
      {/* 汤碗暖光：自发光小碗 + 暖色点光，经 Bloom 发光 */}
      <pointLight ref={pointLight} color={COLORS.bowlWarm} intensity={2.4} distance={14} position={[0, 0.6, 0]} />
      <mesh position={[0, 0.55, 0]}>
        <sphereGeometry args={[0.35, 24, 24]} />
        <meshStandardMaterial
          color={COLORS.bowlWarm}
          emissive={COLORS.bowlWarm}
          emissiveIntensity={2.2}
          toneMapped={false}
        />
      </mesh>

      {/* 记忆琥珀叠影层（memory 模式渐显） */}
      <group ref={ghostRef} position={[0, 1.4, -1.5]}>
        <mesh position={[-1.2, 0, 0]}>
          <planeGeometry args={[1.6, 3.2]} />
          <meshBasicMaterial color={COLORS.memoryAmber} transparent opacity={0} depthWrite={false} />
        </mesh>
        <mesh position={[1.4, 0.2, 0.4]}>
          <planeGeometry args={[1.3, 2.6]} />
          <meshBasicMaterial color={COLORS.memoryAmber} transparent opacity={0} depthWrite={false} />
        </mesh>
        <mesh position={[0.2, -0.4, -0.6]}>
          <planeGeometry args={[2.0, 2.2]} />
          <meshBasicMaterial color={COLORS.memoryAmber} transparent opacity={0} depthWrite={false} />
        </mesh>
      </group>

      {/* 雨：instanced 线条（单 draw call） */}
      <instancedMesh
        ref={rainRef}
        args={[undefined, undefined, RAIN_COUNT] as unknown as [THREE.BufferGeometry, THREE.Material, number]}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial ref={rainMat} color="#9fb4d0" transparent opacity={0.5} depthWrite={false} />
      </instancedMesh>
    </>
  );
}

export function RainNight({ mode = 'idle' }: { mode?: RainMode }) {
  return (
    <Canvas
      // 固定全屏、置于相位 UI 之下（UI z-index:1），不拦截指针事件
      style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}
      dpr={[1, 2]}
      camera={{ position: [0, 1.3, 6.2], fov: 50 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
    >
      <color attach="background" args={[COLORS.night]} />
      <fog attach="fog" args={[COLORS.night, 7, 20]} />
      <RainScene mode={mode} />
      <EffectComposer>
        <Bloom
          intensity={mode === 'silence' ? 0.6 : 1.0}
          luminanceThreshold={0.2}
          luminanceSmoothing={0.4}
          mipmapBlur
        />
        <Vignette eskil={false} offset={0.3} darkness={mode === 'silence' ? 0.95 : 0.62} />
        <Noise opacity={0.05} />
      </EffectComposer>
    </Canvas>
  );
}

export { SILENCE_MS };
