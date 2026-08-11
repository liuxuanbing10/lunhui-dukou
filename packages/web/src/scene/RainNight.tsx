/**
 * RainNight.tsx — 2.5D 雨夜高质量视觉（程序化着色器氛围，不加载外部图片 / 不烧 token）
 * ----------------------------------------------------------------------------
 * 设计对标 3A 雨夜氛围，纯程序化：
 *  - 雨：instanced 线条下落并回收（单 draw call，按 dpr 自适应；silence 段雨势减弱）
 *  - 汤碗暖光：底部中心自发光小碗 + 暖色 pointLight，经 Bloom 发光
 *  - 水面涟漪：噪声 + 正弦扰动 GLSL 着色器（标准 §4.3），命中真相进入 silence 时涟漪脉冲一次
 *  - 后期：EffectComposer → Bloom / Vignette / Noise（Bloom 克制、Vignette 收紧暗角）
 *  - 视差：useFrame 中相机随 sin(t) 轻微推拉 / 横移（景深感，不晃眼）
 *  - 记忆叠影：琥珀/锈红/残光三色 ghost planes，offset 漂移 + 色相分层（标准 §4.4）
 *  - 模式响应：
 *      silence → 相机缓动推近汤碗、雨势减弱、冷蓝环境光淡出至 ~20%、Vignette 加深、暖光稍压暗、涟漪脉冲
 *      memory  → 叠加琥珀/锈红半透明叠影层（ghost planes），营造记忆回响
 *
 * 颜色全部引用 visual/theme 的 theme token（与 docs/art-style-standard-2.5d.md 对齐），
 * 禁止内联 hex 字面量，确保美术可在 theme.ts 统一微调。
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { EffectComposer, Bloom, Vignette, Noise } from '@react-three/postprocessing';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { theme } from '../visual/theme';

export type RainMode = 'idle' | 'silence' | 'memory';

/**
 * 场景居民站位（世界坐标，对应 Blender GLB 渡口布局）。
 * r1 用写实立绘 billboard；其余暂用剪影人形（立绘生产后逐个替换）。
 */
const RESIDENT_SPOTS: Array<{ id: string; pos: [number, number, number] }> = [
  { id: 'r1', pos: [0.85, 0, 0.1] }, // 栈桥汤碗旁（立绘，屏幕内已验证）
  { id: 'r2', pos: [2.0, 0, -0.5] }, // 栈桥右侧中景
  { id: 'r3', pos: [-2.0, 0, -0.5] }, // 栈桥左侧中景
  { id: 'r4', pos: [-0.8, 0, -2.2] }, // 左中远
  { id: 'r5', pos: [1.6, 0, -2.4] }, // 右中远
  { id: 'r6', pos: [3.0, 0, -1.6] }, // 渡船边
  { id: 'r7', pos: [-2.4, 0, -1.2] }, // 左
  { id: 'r8', pos: [0.4, 0, -3.4] }, // 中央远（钟楼方向）
];

/** 剪影人形（未出立绘的居民占位；点击选中） */
function ResidentSilhouette({
  id,
  pos,
  selected,
  onSelect,
}: {
  id: string;
  pos: [number, number, number];
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const bodyColor = selected ? '#2f5570' : '#1a2e42';
  const headColor = selected ? '#3d6582' : '#203650';
  return (
    <group
      position={pos}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(id);
      }}
      onPointerOver={() => {
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'auto';
      }}
    >
      {/* 身体（蓑衣/长袍轮廓） */}
      <mesh position={[0, 0.7, 0]}>
        <cylinderGeometry args={[0.2, 0.28, 1.4, 8]} />
        <meshBasicMaterial color={bodyColor} />
      </mesh>
      {/* 头 */}
      <mesh position={[0, 1.55, 0]}>
        <sphereGeometry args={[0.17, 8, 8]} />
        <meshBasicMaterial color={headColor} />
      </mesh>
      {/* 选中光环 */}
      {selected && (
        <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.4, 0.52, 24]} />
          <meshBasicMaterial color={theme.warm.glow} transparent opacity={0.75} toneMapped={false} />
        </mesh>
      )}
    </group>
  );
}

/**
 * 渡口小镇（Blender 建模 GLB：栈桥/建筑剪影/渡船/灯笼/汤碗台座）。
 * 异步加载，加载完成前不渲染（避免挂起影响 EffectComposer）。
 */
function DukouModel() {
  const [scene, setScene] = useState<THREE.Group | null>(null);
  useEffect(() => {
    try {
      const loader = new GLTFLoader();
      loader.load(
        '/src/assets/scene/dukou.glb',
        (gltf) => setScene(gltf.scene),
        undefined,
        (e) => console.error('[scene] GLB 加载失败', e),
      );
    } catch (e) {
      // jsdom/测试环境无 URL 解析，静默降级（Canvas 仍渲染）
      console.error('[scene] GLB 加载跳过', e);
    }
  }, []);
  if (!scene) return null;
  return <primitive object={scene} />;
}


/**
 * NPC billboard：居民立绘贴进 3D 场景（渡口汤碗旁），始终面向相机。
 * 切换贴图（换人/换表情）时通过 key 强制重挂载 → opacity 从 0 淡入。
 */
function NpcBillboard({
  textureUrl,
  selected,
  onSelect,
}: {
  textureUrl: string;
  selected: boolean;
  onSelect: () => void;
}) {
  const [ready, setReady] = useState(false);
  const texture = useMemo(() => {
    const t = new THREE.TextureLoader().load(textureUrl, () => setReady(true));
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [textureUrl]);
  const meshRef = useRef<THREE.Mesh>(null);

  // billboard：每帧对齐相机朝向（纹理加载完成前不挂 mesh，避免挂起影响 EffectComposer）
  useFrame(({ camera }) => {
    if (meshRef.current) {
      meshRef.current.quaternion.copy(camera.quaternion);
    }
  });

  if (!ready) return null;
  return (
    <mesh
      ref={meshRef}
      position={[0.85, 1.72, 0.1]}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onPointerOver={() => {
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'auto';
      }}
    >
      <planeGeometry args={[1.25, 3.4]} />
      <meshBasicMaterial
        map={texture}
        alphaMap={texture}
        transparent
        alphaTest={0.3}
        depthWrite={false}
        side={THREE.DoubleSide}
        toneMapped={false}
      />
      {/* 选中光环 */}
      {selected && (
        <mesh position={[0, -1.68, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.45, 0.58, 24]} />
          <meshBasicMaterial color={theme.warm.glow} transparent opacity={0.8} toneMapped={false} />
        </mesh>
      )}
    </mesh>
  );
}

// 雨滴数量（单 instancedMesh = 1 draw call；按设备像素比 dpr=[1,2] 自适应）
const RAIN_COUNT = 500;
// silence 段雨势减弱（标准 §4.3：密度随演出状态可调）
const RAIN_COUNT_SILENCE = 280;

interface Drop {
  x: number;
  y: number;
  z: number;
  speed: number;
  len: number;
}

/* ---------- 水面涟漪着色器（标准 §4.3：噪声 + 正弦扰动，无贴图，单 draw call） ---------- */

const RIPPLE_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const RIPPLE_FRAG = /* glsl */ `
uniform float uTime;
uniform float uPulse;      // 0..1 涟漪脉冲（命中真相进入 silence 时触发）
uniform vec3 uDeep;        // 深水色（rain.fog）
uniform vec3 uMist;        // 雾蓝（rain.mist）
uniform vec3 uHighlight;   // 雨丝高光（rain.drop）
uniform vec3 uWarm;        // 汤碗暖光（warm.soul）
varying vec2 vUv;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
    f.y
  );
}

void main() {
  vec2 c = vUv - vec2(0.5, 0.62);          // 涟漪中心对位汤碗（略偏画面深处）
  float d = length(c);

  // 基础水面：两层漂移噪声
  float n = noise(vUv * 14.0 + vec2(uTime * 0.18, uTime * 0.11));
  n += 0.5 * noise(vUv * 30.0 - vec2(uTime * 0.26, 0.0));

  // 环状涟漪：常态缓，脉冲时加密加快（命中真相的一次「心跳」）
  float ring = sin(d * 60.0 - uTime * 2.0) * 0.5 + 0.5;
  float pulseRing = sin(d * 90.0 - uTime * 7.0) * 0.5 + 0.5;
  float rings = mix(ring * 0.15, pulseRing * 0.8, uPulse);

  // 径向衰减：边缘溶进雾里
  float fade = smoothstep(0.55, 0.15, d);

  // 汤碗暖光在水面的倒影光柱
  float warmCol = smoothstep(0.16, 0.0, abs(c.x)) * smoothstep(0.45, 0.0, d);

  vec3 col = mix(uDeep, uMist, n * 0.55 + rings * 0.3);
  col += uHighlight * rings * 0.12;
  col += uWarm * warmCol * (0.18 + uPulse * 0.35);

  float alpha = fade * (0.55 + rings * 0.2 + uPulse * 0.15);
  gl_FragColor = vec4(col, alpha);
}
`;

/* ---------- 记忆叠影配置（标准 §4.4：offset 漂移 + 色相分层） ---------- */

const GHOSTS = [
  { pos: [-1.2, 0, 0], size: [1.6, 3.2], color: theme.memory.amber, phase: 0.0 },
  { pos: [1.4, 0.2, 0.4], size: [1.3, 2.6], color: theme.memory.rust, phase: 2.1 },
  { pos: [0.2, -0.4, -0.6], size: [2.0, 2.2], color: theme.memory.ghost, phase: 4.2 },
] as const;

function RainScene({
  mode,
  npcTexture,
  selected,
  onSelectResident,
  focus,
  onFocusChange,
  onNearChange,
}: {
  mode: RainMode;
  npcTexture: string | null;
  selected: string;
  onSelectResident: (id: string) => void;
  focus: { x: number; z: number } | null;
  onFocusChange: (f: { x: number; z: number } | null) => void;
  onNearChange: (id: string | null) => void;
}) {
  const keysRef = useRef({ w: false, a: false, s: false, d: false });
  const nearRef = useRef<string | null>(null);
  // 行走后的相机位置：松开按键不回跳全景，停留在玩家所在处
  const walkPosRef = useRef<{ x: number; z: number } | null>(null);

  // WASD 行走（第一人称平移；行走打断镜头焦点）
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === 'w' || k === 'a' || k === 's' || k === 'd') {
        keysRef.current[k] = true;
        onFocusChange(null);
      }
    };
    const up = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === 'w' || k === 'a' || k === 's' || k === 'd') {
        keysRef.current[k] = false;
      }
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, [onFocusChange]);

  // 选中变化 → 镜头自动推近面对（点击人物 / F 键对话统一生效）
  useEffect(() => {
    const spot = RESIDENT_SPOTS.find((s) => s.id === selected);
    if (spot) {
      onFocusChange({ x: spot.pos[0], z: spot.pos[2] });
    }
  }, [selected, onFocusChange]);
  const rainRef = useRef<THREE.InstancedMesh>(null);
  const rainMat = useRef<THREE.MeshBasicMaterial>(null);
  const pointLight = useRef<THREE.PointLight>(null);
  const ambientLight = useRef<THREE.AmbientLight>(null);
  const ghostRef = useRef<THREE.Group>(null);
  const prevModeRef = useRef<RainMode>(mode);
  const pulseRef = useRef(0);
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

  // 水面涟漪材质：theme token 注入 uniform（禁止内联 hex）
  const rippleMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: {
          uTime: { value: 0 },
          uPulse: { value: 0 },
          uDeep: { value: new THREE.Color(theme.rain.fog) },
          uMist: { value: new THREE.Color(theme.rain.mist) },
          uHighlight: { value: new THREE.Color(theme.rain.drop) },
          uWarm: { value: new THREE.Color(theme.warm.soul) },
        },
        vertexShader: RIPPLE_VERT,
        fragmentShader: RIPPLE_FRAG,
      }),
    [],
  );

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    const k = Math.min(1, dt * 1.5); // 缓动系数，避免帧率敏感

    // 涟漪脉冲：进入 silence（命中真相）瞬间触发一次，约 1.4s 衰减
    if (mode === 'silence' && prevModeRef.current !== 'silence') pulseRef.current = 1;
    prevModeRef.current = mode;
    pulseRef.current = Math.max(0, pulseRef.current - dt / 1.4);
    rippleMat.uniforms.uTime!.value = t;
    rippleMat.uniforms.uPulse!.value =
      mode === 'silence' ? Math.max(pulseRef.current, 0.35) : pulseRef.current;

    // 相机：WASD 行走（第一人称）> 选中人物推近 > silence 推近渡口 > 全景缓动
    const keys = keysRef.current;
    const moving = keys.w || keys.a || keys.s || keys.d;
    if (moving) {
      const speed = dt * 4.0;
      if (keys.w) camera.position.z -= speed;
      if (keys.s) camera.position.z += speed;
      if (keys.a) camera.position.x -= speed;
      if (keys.d) camera.position.x += speed;
      // 渡口区域边界
      camera.position.x = Math.max(-4.5, Math.min(4.5, camera.position.x));
      camera.position.z = Math.max(-8.5, Math.min(3.5, camera.position.z));
      camera.lookAt(camera.position.x, 0.9, camera.position.z - 8);
      walkPosRef.current = { x: camera.position.x, z: camera.position.z };
    } else if (mode !== 'silence' && focus) {
      walkPosRef.current = null; // 对话镜头接管，退出行走位置
      const k = Math.min(1, dt * 2.2);
      const tx = focus.x * 0.55;
      const ty = 1.55;
      const tz = focus.z + 2.6;
      camera.position.x += (tx - camera.position.x) * k;
      camera.position.y += (ty - camera.position.y) * k;
      camera.position.z += (tz - camera.position.z) * k;
      camera.lookAt(focus.x, 1.45, focus.z);
    } else {
      if (mode !== 'silence' && walkPosRef.current) {
        // 保持行走位置（不回跳全景）
        camera.lookAt(camera.position.x, 0.9, camera.position.z - 8);
      } else {
        const targetX = mode === 'silence' ? 0 : Math.sin(t * 0.3) * 0.7;
        const targetZ = mode === 'silence' ? 4.6 : 8.2 + Math.sin(t * 0.22) * 0.5;
        const targetY = mode === 'silence' ? 1.45 : 1.9;
        camera.position.x += (targetX - camera.position.x) * k;
        camera.position.y += (targetY - camera.position.y) * k;
        camera.position.z += (targetZ - camera.position.z) * k;
        camera.lookAt(0, 0.9, -0.6);
      }
    }

    // 近身检测：最近人物 < 2 单位 → 通知 App 显示"按 F 对话"
    let nearest: { id: string; dist: number } | null = null;
    for (const s of RESIDENT_SPOTS) {
      const dx = camera.position.x - s.pos[0];
      const dz = camera.position.z - s.pos[2];
      const dist = Math.hypot(dx, dz);
      if (dist < 2.0 && (!nearest || dist < nearest.dist)) {
        nearest = { id: s.id, dist };
      }
    }
    const nearId = nearest?.id ?? null;
    if (nearId !== nearRef.current) {
      nearRef.current = nearId;
      onNearChange(nearId);
    }

    // 雨：下落并回收（silence 段减弱雨势）
    const mesh = rainRef.current;
    if (mesh) {
      mesh.count = mode === 'silence' ? RAIN_COUNT_SILENCE : RAIN_COUNT;
      for (let i = 0; i < mesh.count; i++) {
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

    // 冷蓝环境光：silence 淡出至 ~20%（标准 §4.2），让暖光成为唯一剩的话
    if (ambientLight.current) {
      const target = mode === 'silence' ? 0.025 : 0.12;
      ambientLight.current.intensity +=
        (target - ambientLight.current.intensity) * Math.min(1, dt * 2);
    }

    // 记忆叠影：琥珀/锈红/残光三层渐显 + offset 漂移（标准 §4.4）
    if (ghostRef.current) {
      const target = mode === 'memory' ? 0.16 : 0;
      for (const child of ghostRef.current.children) {
        const m = (child as THREE.Mesh).material as THREE.MeshBasicMaterial;
        m.opacity += (target - m.opacity) * Math.min(1, dt * 2);
        m.visible = m.opacity > 0.002;
        const { base, phase } = child.userData as { base: readonly number[]; phase: number };
        child.position.x = base[0]! + Math.sin(t * 0.4 + phase) * 0.18;
        child.position.y = base[1]! + Math.sin(t * 0.27 + phase * 1.3) * 0.1;
      }
    }
  });

  return (
    <>
      <ambientLight ref={ambientLight} intensity={0.12} />
      {/* 汤碗暖光：暖色点光（GLB 内含自发光汤碗 mesh，C1 资产到位后替换） */}
      <pointLight ref={pointLight} color={theme.warm.soul} intensity={2.4} distance={14} position={[0, 0.6, 0]} />
      {/* 汤碗 Bloom 焦点 halo（GLB 汤碗自发光之上叠加，保证后期发光焦点） */}
      <mesh position={[0, 0.68, 0]}>
        <sphereGeometry args={[0.2, 12, 12]} />
        <meshBasicMaterial color={theme.warm.soul} toneMapped={false} transparent opacity={0.9} />
      </mesh>

      {/* 水面涟漪：噪声 + 正弦扰动着色器（单 draw call，无贴图） */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.55, -2]}>
        <planeGeometry args={[44, 34, 1, 1]} />
        <primitive object={rippleMat} attach="material" />
      </mesh>

      {/* 记忆叠影层（memory 模式渐显，三色分层 + 漂移） */}
      <group ref={ghostRef} position={[0, 1.4, -1.5]}>
        {GHOSTS.map((g, i) => (
          <mesh key={i} position={[g.pos[0], g.pos[1], g.pos[2]]} userData={{ base: g.pos, phase: g.phase }}>
            <planeGeometry args={[g.size[0], g.size[1]]} />
            <meshBasicMaterial color={g.color} transparent opacity={0} depthWrite={false} />
          </mesh>
        ))}
      </group>

      {/* 渡口小镇（Blender GLB：栈桥/灯柱/渡船/建筑剪影） */}
      <DukouModel />

      {/* 雨：instanced 线条（单 draw call） */}
      <instancedMesh
        ref={rainRef}
        args={[undefined, undefined, RAIN_COUNT] as unknown as [THREE.BufferGeometry, THREE.Material, number]}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial ref={rainMat} color={theme.rain.drop} transparent opacity={0.5} depthWrite={false} />
      </instancedMesh>

      {/* 居民立绘（billboard）：站在渡口汤碗旁，始终面向玩家 */}
      {/* 场景居民：r1 写实立绘 + 其余剪影，点击选中（替代按钮选择） */}
      {RESIDENT_SPOTS.filter((s) => s.id !== 'r1').map((s) => (
        <ResidentSilhouette
          key={s.id}
          id={s.id}
          pos={s.pos}
          selected={selected === s.id}
          onSelect={(id) => {
            onSelectResident(id);
            onFocusChange({ x: s.pos[0], z: s.pos[2] });
          }}
        />
      ))}
      {npcTexture && (
        <NpcBillboard
          key={npcTexture}
          textureUrl={npcTexture}
          selected={selected === 'r1'}
          onSelect={() => {
            onSelectResident('r1');
            onFocusChange({ x: 0.85, z: 0.1 });
          }}
        />
      )}
    </>
  );
}

export function RainNight({
  mode,
  npcTexture = null,
  selected = 'r1',
  onSelectResident,
  onNearChange,
}: {
  mode: RainMode;
  npcTexture?: string | null;
  selected?: string;
  onSelectResident?: (id: string) => void;
  onNearChange?: (id: string | null) => void;
}) {
  // 镜头焦点：点击人物后推近面对；点击空白恢复全景
  const [focus, setFocus] = useState<{ x: number; z: number } | null>(null);
  return (
    <Canvas
      // 固定全屏、置于相位 UI 之下（UI z-index:1）；开启指针事件以支持"点击场景人物"
      style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'auto' }}
      onPointerMissed={() => setFocus(null)}
      dpr={[1, 2]}
      camera={{ position: [0, 1.9, 8.5], fov: 50 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
    >
      <color attach="background" args={[theme.rain.base]} />
      <fog attach="fog" args={[theme.rain.base, 8, 22]} />
      <RainScene
        mode={mode}
        npcTexture={npcTexture}
        selected={selected}
        onSelectResident={onSelectResident ?? (() => {})}
        focus={focus}
        onFocusChange={setFocus}
        onNearChange={onNearChange ?? (() => {})}
      />
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

// 默认导出供 App 侧 React.lazy 动态分包（three/R3F 不阻塞首屏）
export default RainNight;
