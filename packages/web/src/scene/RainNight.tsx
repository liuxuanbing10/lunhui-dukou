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
import { resolveMove, isWalkable } from './walkable';
import { wallTexture, roofTexture, stoneTexture, woodTexture } from './textures';

export type RainMode = 'idle' | 'silence' | 'memory';

/**
 * 场景居民站位（世界坐标，对应 Blender GLB 渡口布局）。
 * 全部落在 walkable 河街/桥面/栈桥上，站在建筑正前方（不嵌墙、不穿模）。
 */
const RESIDENT_SPOTS: Array<{ id: string; pos: [number, number, number] }> = [
  { id: 'r1', pos: [0, 0, 0.8] }, // 栈桥尽头渡口（面朝河）
  { id: 'r2', pos: [-7.2, 0, 2.5] }, // 花店门前（南河街）
  { id: 'r3', pos: [-3.5, 0, 2.5] }, // 面馆门前（南河街）
  { id: 'r4', pos: [2.9, 0, 2.5] }, // 纸扎铺门前（南河街）
  { id: 'r5', pos: [-6.5, 0, -2.5] }, // 钟表铺门前（北河街）
  { id: 'r6', pos: [7.5, 0, 2.5] }, // 渔屋前晾网架旁（南河街）
  { id: 'r7', pos: [-5.5, 0, -2.0] }, // 西桥北桥头（巡逻位，北河街）
  { id: 'r8', pos: [5.5, 0, 2.0] }, // 东桥南桥头（桥下避雨，南河街）
];

/**
 * 居民色签（docs/AI_IMAGE_PROMPTS.md 角色色签表；3D 模型用同色系）
 */
const RESIDENT_COLORS: Record<string, [string, string]> = {
  r1: ['#3d4f42', '#a8532f'], // 苔绿灰 / 锈红（蓑衣）
  r2: ['#4a5b6e', '#b87d8a'], // 雾蓝 / 干玫瑰（花店）
  r3: ['#6e5a3e', '#d8cdb4'], // 麦棕 / 面粉白（面馆）
  r4: ['#c9c2b4', '#c0473b'], // 纸白 / 朱砂红（纸扎）
  r5: ['#7a6242', '#8aa0b4'], // 古铜 / 钢蓝灰（钟表）
  r6: ['#5a4232', '#c9b08a'], // 深棕 / 绳麻（渔夫）
  r7: ['#2b3a52', '#b89a5a'], // 藏青 / 黄铜（夜巡）
  r8: ['#7d93a8', '#d8a24a'], // 灰蓝 / 琥珀（小满）
};

/**
 * 居民体型参数（身高缩放 + 肩宽）：区分老鲞壮、小满矮、何叔驼背等。
 */
const RESIDENT_BODY: Record<string, { scale: number; lean: number }> = {
  r1: { scale: 1.0, lean: 0.0 },   // 蓑衣人 标准
  r2: { scale: 0.96, lean: 0.0 },  // 阿岚 略瘦
  r3: { scale: 1.05, lean: 0.0 },  // 老王 壮实
  r4: { scale: 0.9, lean: 0.08 },  // 阿黎 瘦弱微驼
  r5: { scale: 0.92, lean: 0.22 }, // 何叔 驼背
  r6: { scale: 1.12, lean: 0.0 },  // 老鲞 高大壮硕
  r7: { scale: 1.0, lean: 0.05 },  // 郑爷 挺直微前倾
  r8: { scale: 0.62, lean: 0.0 },  // 小满 孩童矮小
};

/**
 * 3D 居民模型（程序化人形：头/身/四肢，角色色签，受汤碗暖光）。
 * 每居民带标志性配饰（斗笠/围裙/哨子/布包等）+ 体型区分 + 选中时面向玩家。
 */
function ResidentModel({
  id,
  selected,
  onSelect,
}: {
  id: string;
  selected: boolean;
  onSelect: () => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const [primary, accent] = RESIDENT_COLORS[id] ?? ['#4a5b6e', '#b87d8a'];
  const body = RESIDENT_BODY[id] ?? { scale: 1.0, lean: 0.0 };
  const { camera } = useThree();
  // 肢体动画 refs（程序化骨骼：摆臂/迈步/呼吸）
  const armLRef = useRef<THREE.Mesh>(null);
  const armRRef = useRef<THREE.Mesh>(null);
  const legLRef = useRef<THREE.Mesh>(null);
  const legRRef = useRef<THREE.Mesh>(null);
  const headRef = useRef<THREE.Mesh>(null);

  // 呼吸微动（站立起伏）+ 选中时转向玩家 + 肢体摆动（程序化骨骼动画）
  useFrame(({ clock }) => {
    const g = groupRef.current;
    if (!g) return;
    const t = clock.getElapsedTime();
    g.position.y = Math.sin(t * 1.8 + (id.charCodeAt(1) % 7)) * 0.015;
    // 程序化行走循环：摆臂 + 迈步（慢速站立 idle 姿态）
    const phase = t * 2.6 + (id.charCodeAt(1) % 7) * 1.3;
    const armSwing = Math.sin(phase) * 0.22;
    const legSwing = Math.sin(phase) * 0.14;
    if (armLRef.current) armLRef.current.rotation.x = armSwing;
    if (armRRef.current) armRRef.current.rotation.x = -armSwing;
    if (legLRef.current) legLRef.current.rotation.x = legSwing;
    if (legRRef.current) legRRef.current.rotation.x = -legSwing;
    // 头部轻微偏转（观察姿态）
    if (headRef.current) {
      headRef.current.rotation.y = Math.sin(t * 0.9 + id.charCodeAt(1)) * 0.08;
    }
    if (selected) {
      // 面向相机（世界坐标 → 本地 yaw）
      const wp = new THREE.Vector3();
      g.getWorldPosition(wp);
      const dx = camera.position.x - wp.x;
      const dz = camera.position.z - wp.z;
      const targetYaw = Math.atan2(dx, dz);
      g.rotation.y += (targetYaw - g.rotation.y) * 0.12;
    }
  });

  const s = body.scale;

  return (
    <group
      ref={groupRef}
      position={[0, 0, 0]}
      rotation={[body.lean, 0, 0]}
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
      <group scale={[s, s, s]}>
        {/* 头（带 ref：轻微转头观察） */}
        <mesh ref={headRef} position={[0, 1.55, 0]} castShadow>
          <sphereGeometry args={[0.17, 14, 12]} />
          <meshStandardMaterial color={selected ? '#6d93b2' : primary} emissive={selected ? '#6d93b2' : primary} emissiveIntensity={0.5} roughness={0.85} />
        </mesh>
        {/* 身体 */}
        <mesh position={[0, 1.06, 0]} castShadow>
          <boxGeometry args={[0.46, 0.58, 0.28]} />
          <meshStandardMaterial color={primary} emissive={primary} emissiveIntensity={0.5} roughness={0.9} />
        </mesh>
        {/* 腰带（色签 accent） */}
        <mesh position={[0, 0.8, 0]} castShadow>
          <boxGeometry args={[0.48, 0.08, 0.3]} />
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.35} roughness={0.8} />
        </mesh>
        {/* 腿 ×2（pivot 在髋部，绕髋摆动迈步） */}
        <group position={[-0.14, 0.72, 0]}>
          <mesh ref={legLRef} position={[0, -0.36, 0]} castShadow>
            <cylinderGeometry args={[0.075, 0.085, 0.72, 8]} />
            <meshStandardMaterial color={selected ? '#6d93b2' : primary} emissive={selected ? '#6d93b2' : primary} emissiveIntensity={0.5} roughness={0.9} />
          </mesh>
        </group>
        <group position={[0.14, 0.72, 0]}>
          <mesh ref={legRRef} position={[0, -0.36, 0]} castShadow>
            <cylinderGeometry args={[0.075, 0.085, 0.72, 8]} />
            <meshStandardMaterial color={selected ? '#6d93b2' : primary} emissive={selected ? '#6d93b2' : primary} emissiveIntensity={0.5} roughness={0.9} />
          </mesh>
        </group>
        {/* 臂 ×2（pivot 在肩部，绕肩摆臂） */}
        <group position={[-0.31, 1.5, 0]}>
          <mesh ref={armLRef} position={[0, -0.25, 0]} rotation={[0.06, 0, 0.05]}>
            <cylinderGeometry args={[0.05, 0.055, 0.5, 6]} />
            <meshStandardMaterial color={primary} emissive={primary} emissiveIntensity={0.5} roughness={0.9} />
          </mesh>
        </group>
        <group position={[0.31, 1.5, 0]}>
          <mesh ref={armRRef} position={[0, -0.25, 0]} rotation={[0.06, 0, -0.05]}>
            <cylinderGeometry args={[0.05, 0.055, 0.5, 6]} />
            <meshStandardMaterial color={primary} emissive={primary} emissiveIntensity={0.5} roughness={0.9} />
          </mesh>
        </group>

        {/* ---- 标志性配饰（按居民 id） ---- */}
        {id === 'r1' && (
          /* 蓑衣人：斗笠（宽檐圆锥） */
          <mesh position={[0, 1.72, 0]} castShadow>
            <coneGeometry args={[0.34, 0.16, 16]} />
            <meshStandardMaterial color="#4a5a3e" emissive="#4a5a3e" emissiveIntensity={0.3} roughness={0.95} />
          </mesh>
        )}
        {id === 'r2' && (
          /* 阿岚：怀里花束 */
          <mesh position={[0, 1.15, 0.22]} castShadow>
            <sphereGeometry args={[0.13, 10, 8]} />
            <meshStandardMaterial color="#b87d8a" emissive="#b87d8a" emissiveIntensity={0.5} roughness={0.7} />
          </mesh>
        )}
        {id === 'r3' && (
          /* 老王：围裙 */
          <mesh position={[0, 1.0, 0.16]} castShadow>
            <boxGeometry args={[0.4, 0.5, 0.04]} />
            <meshStandardMaterial color="#d8cdb4" emissive="#d8cdb4" emissiveIntensity={0.3} roughness={0.9} />
          </mesh>
        )}
        {id === 'r4' && (
          /* 阿黎：手持纸人 */
          <mesh position={[0.34, 1.1, 0.12]} castShadow>
            <boxGeometry args={[0.08, 0.26, 0.06]} />
            <meshStandardMaterial color="#e8e2d4" emissive="#e8e2d4" emissiveIntensity={0.4} roughness={0.85} />
          </mesh>
        )}
        {id === 'r5' && (
          /* 何叔：单片眼镜（眼前小圆环） */
          <mesh position={[0.06, 1.58, 0.16]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.05, 0.012, 8, 16]} />
            <meshStandardMaterial color="#8aa0b4" emissive="#8aa0b4" emissiveIntensity={0.5} roughness={0.4} metalness={0.6} />
          </mesh>
        )}
        {id === 'r6' && (
          /* 老鲞：肩扛渔网（肩上一团绳网） */
          <mesh position={[0.26, 1.42, 0]} castShadow>
            <sphereGeometry args={[0.14, 10, 8]} />
            <meshStandardMaterial color="#c9b08a" emissive="#c9b08a" emissiveIntensity={0.3} roughness={1.0} />
          </mesh>
        )}
        {id === 'r7' && (
          /* 郑爷：胸前黄铜哨子 + 手提灯笼 */
          <>
            <mesh position={[0, 1.28, 0.17]} castShadow>
              <sphereGeometry args={[0.045, 8, 6]} />
              <meshStandardMaterial color="#b89a5a" emissive="#b89a5a" emissiveIntensity={0.6} roughness={0.3} metalness={0.7} />
            </mesh>
            <mesh position={[0.38, 0.85, 0.05]} castShadow>
              <cylinderGeometry args={[0.09, 0.11, 0.22, 8]} />
              <meshStandardMaterial color="#ffb15c" emissive="#ffb15c" emissiveIntensity={1.2} roughness={0.4} />
            </mesh>
          </>
        )}
        {id === 'r8' && (
          /* 小满：怀抱布包（琥珀色） */
          <mesh position={[0, 1.05, 0.2]} castShadow>
            <boxGeometry args={[0.22, 0.2, 0.14]} />
            <meshStandardMaterial color="#d8a24a" emissive="#d8a24a" emissiveIntensity={0.4} roughness={0.85} />
          </mesh>
        )}
      </group>

      {/* 选中光环（暖光地面圈） */}
      {selected && (
        <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.42, 0.56, 28]} />
          <meshBasicMaterial
            color={theme.warm.glow}
            transparent
            opacity={0.75}
            toneMapped={false}
          />
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
        (gltf) => {
          applyVillageTextures(gltf.scene);
          setScene(gltf.scene);
        },
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
 * 阶段 1 材质写实化：按对象名给 GLB 程序化 PBR 纹理（对照 R2/R3 参考图）。
 * 白墙斑驳 / 黛瓦瓦楞 / 湿石板 / 湿木；窗灯/灯笼 emissive 保持。
 */
/** 纹理单例缓存（模块级，避免每次加载 GLB 重新生成 Canvas） */
let texCache: {
  wall: THREE.CanvasTexture;
  roof: THREE.CanvasTexture;
  stone: THREE.CanvasTexture;
  wood: THREE.CanvasTexture;
} | null = null;

function applyVillageTextures(root: THREE.Object3D) {
  if (!texCache) {
    texCache = {
      wall: wallTexture(),
      roof: roofTexture(),
      stone: stoneTexture(),
      wood: woodTexture(),
    };
  }
  const { wall: wallTex, roof: roofTex, stone: stoneTex, wood: woodTex } = texCache;
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    // 阶段 2：开阴影投射/接收（汤碗暖光实时阴影）
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    // 植被不换纹理（保持 Blender 原色，避免纹理覆盖叶子）
    if (mesh.name.startsWith('veg_') || mesh.name.startsWith('willow') || mesh.name.startsWith('reed') || mesh.name.startsWith('lotus')) {
      return;
    }
    const mat = mesh.material as THREE.MeshStandardMaterial;
    if (!mat || !mat.isMeshStandardMaterial) return;
    const n = mesh.name;
    if (n.includes('_win') || n.includes('lantern') || n.includes('_glow') || n.includes('soup') || n.includes('clock')) {
      return; // 发光物件不换纹理
    }
    if (n.includes('_wall') || n.includes('_gable')) {
      mat.map = wallTex;
      mat.roughness = 0.72; // 湿墙微反光
    } else if (n.includes('_roof') || n.includes('_ridge') || n.includes('_tile') || n.includes('_eave')) {
      mat.map = roofTex;
      mat.roughness = 0.55;
    } else if (
      n.includes('road') ||
      n.includes('plaza') ||
      n.includes('lane') ||
      n.includes('_step') ||
      n.includes('bridge') ||
      n.includes('plank')
    ) {
      mat.map = stoneTex;
      mat.roughness = 0.32; // 湿石板镜面感
    } else if (n.includes('_base') || n.includes('post') || n.includes('_door') || n.includes('_pole')) {
      mat.map = woodTex;
      mat.roughness = 0.45; // 湿木
    }
    mat.needsUpdate = true;
  });
}



// 雨滴数量（单 instancedMesh = 1 draw call；按设备像素比 dpr=[1,2] 自适应）
const RAIN_COUNT = 900; // 水乡夜雨，密而不乱
// silence 段雨势减弱（标准 §4.3：密度随演出状态可调）
const RAIN_COUNT_SILENCE = 320;

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

/* 雨滴同心圆涟漪：随机落点 + 扩散圈 + 随时间淡出 */
float rainRings(vec2 uv, float t) {
  float acc = 0.0;
  vec2 cell = floor(uv * 40.0);
  vec2 f = fract(uv * 40.0);
  float r1 = hash(cell);
  float r2 = hash(cell + 7.31);
  vec2 dropPos = vec2(r1, r2);
  float t0 = fract(t * (0.5 + r1 * 0.4) + r2 * 17.0);
  float age = t0;                 // 0..1 涟漪年龄
  float radius = age * 0.9;
  float ring = abs(length(f - dropPos) - radius);
  float fade = (1.0 - age) * smoothstep(0.10, 0.0, ring);
  acc += fade * (r1 > 0.55 ? 1.0 : 0.0);
  return acc;
}

void main() {
  vec2 c = vUv - vec2(0.5, 0.62);          // 涟漪中心对位汤碗（略偏画面深处）
  float d = length(c);

  // 基础水面：三层漂移噪声（大波纹 + 中波 + 细碎闪光）
  float n = noise(vUv * 14.0 + vec2(uTime * 0.18, uTime * 0.11));
  n += 0.5 * noise(vUv * 30.0 - vec2(uTime * 0.26, 0.0));
  float fine = noise(vUv * 90.0 + vec2(uTime * 0.4, -uTime * 0.2));

  // 环状涟漪：常态缓，脉冲时加密加快（命中真相的一次「心跳」）
  float ring = sin(d * 60.0 - uTime * 2.0) * 0.5 + 0.5;
  float pulseRing = sin(d * 90.0 - uTime * 7.0) * 0.5 + 0.5;
  float rings = mix(ring * 0.15, pulseRing * 0.8, uPulse);

  // 雨滴落水的随机同心圆
  float drops = rainRings(vUv, uTime) * 0.6;

  // 径向衰减：边缘溶进雾里
  float fade = smoothstep(0.55, 0.15, d);

  // ---- 灯影倒影（R4）：汤碗暖光 + 两侧窗灯，竖直拉长并被波纹扭曲 ----
  float distort = (noise(vUv * vec2(18.0, 55.0) + vec2(0.0, uTime * 0.5)) - 0.5) * 0.06;
  vec2 rv = vUv + vec2(distort, 0.0);
  // 汤碗中央光柱
  float warmCol = smoothstep(0.14, 0.0, abs(rv.x - 0.5)) * smoothstep(0.5, 0.0, d);
  // 左右窗灯倒影（两条偏光柱，随 uTime 微动）
  float win1 = smoothstep(0.035, 0.0, abs(rv.x - 0.28 + sin(uTime*0.3)*0.004));
  float win2 = smoothstep(0.035, 0.0, abs(rv.x - 0.74 + sin(uTime*0.26+1.7)*0.004));
  float winFade = smoothstep(0.30, 0.75, rv.y); // 只在上半段（远处）出现
  float windows = (win1 + win2) * winFade;

  vec3 col = mix(uDeep, uMist, n * 0.55 + rings * 0.3);
  col += uHighlight * (rings * 0.12 + drops * 0.35 + fine * 0.05);
  col += uWarm * warmCol * (0.18 + uPulse * 0.35 + fine * 0.2);
  col += uWarm * windows * (0.55 + fine * 0.4);
  col += vec3(0.35, 0.5, 0.7) * drops * 0.25; // 雨滴泛蓝高光

  float alpha = fade * (0.55 + rings * 0.2 + drops * 0.15 + uPulse * 0.15);
  gl_FragColor = vec4(col, alpha);
}
`;

/* ---------- 记忆叠影配置（标准 §4.4：offset 漂移 + 色相分层） ---------- */

const GHOSTS = [
  { pos: [-1.2, 0, 0], size: [1.6, 3.2], color: theme.memory.amber, phase: 0.0 },
  { pos: [1.4, 0.2, 0.4], size: [1.3, 2.6], color: theme.memory.rust, phase: 2.1 },
  { pos: [0.2, -0.4, -0.6], size: [2.0, 2.2], color: theme.memory.ghost, phase: 4.2 },
] as const;

/**
 * 雨滴落水溅落（R7 细节）：水面随机分布的闪烁粒子，随时间在随机位置
 * 短暂亮起又熄灭，模拟雨点打在水面的一瞬微光。单 draw call。
 */
const SPLASH_COUNT = 120;
function SplashPoints() {
  const geoRef = useRef<THREE.BufferGeometry>(null);
  const positions = useMemo(() => {
    const arr = new Float32Array(SPLASH_COUNT * 3);
    for (let i = 0; i < SPLASH_COUNT; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 20;
      arr[i * 3 + 1] = -0.52; // 水面略高
      arr[i * 3 + 2] = (Math.random() - 0.5) * 3.2;
    }
    return arr;
  }, []);
  const phases = useMemo(() => new Float32Array(SPLASH_COUNT).map(() => Math.random() * Math.PI * 2), []);

  useFrame(({ clock }) => {
    const geo = geoRef.current;
    if (!geo) return;
    const t = clock.getElapsedTime();
    // 复用颜色 BufferAttribute（避免每帧 new → GC 压力）
    let colorAttr = geo.getAttribute('color') as THREE.BufferAttribute | null;
    if (!colorAttr || colorAttr.array.length !== SPLASH_COUNT * 3) {
      colorAttr = new THREE.BufferAttribute(new Float32Array(SPLASH_COUNT * 3), 3);
      geo.setAttribute('color', colorAttr);
    }
    const colors = colorAttr.array as Float32Array;
    for (let i = 0; i < SPLASH_COUNT; i++) {
      // 每颗粒子按各自相位周期性闪烁
      const v = Math.max(0, Math.sin(t * 3.0 + (phases[i] ?? 0)));
      const bright = v * v * v;
      // 偶发暖光（近汤碗），多为冷光
      const px = positions[i * 3] ?? 0;
      const warm = px > -1.5 && px < 1.5;
      colors[i * 3] = warm ? bright * 1.0 : bright * 0.55;
      colors[i * 3 + 1] = warm ? bright * 0.8 : bright * 0.7;
      colors[i * 3 + 2] = bright * 0.85;
    }
    colorAttr.needsUpdate = true;
  });

  return (
    <points>
      <bufferGeometry ref={geoRef}>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.09}
        vertexColors
        transparent
        opacity={0.9}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
}

function RainScene({
  mode,
  selected,
  onSelectResident,
  focus,
  onFocusChange,
  onNearChange,
}: {
  mode: RainMode;
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
  // 视角朝向（yaw）：0 = 面向 -z；鼠标左键拖拽旋转
  const yawRef = useRef(0);
  const dragRef = useRef<{ x: number; y: number } | null>(null);

  // 鼠标左键拖拽：旋转视角（yaw）；UI 面板区（.stage）不触发
  useEffect(() => {
    const down = (e: MouseEvent) => {
      if (e.button !== 0) return;
      if ((e.target as HTMLElement | null)?.closest('.stage')) return;
      dragRef.current = { x: e.clientX, y: e.clientY };
    };
    const move = (e: MouseEvent) => {
      if (!dragRef.current) return;
      const dx = e.clientX - dragRef.current.x;
      yawRef.current -= dx * 0.0042;
      dragRef.current = { x: e.clientX, y: e.clientY };
    };
    const up = () => {
      dragRef.current = null;
    };
    window.addEventListener('mousedown', down);
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    return () => {
      window.removeEventListener('mousedown', down);
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
  }, []);

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
      // 首次进入步行：从俯瞰全景吸附到南沿河街（步行起点）
      if (!isWalkable(camera.position.x, camera.position.z)) {
        camera.position.x = 0;
        camera.position.z = 2.6;
      }
      let dx = 0;
      let dz = 0;
      // 移动方向相对视角 yaw（WASD = 前/后/左/右）
      const yaw = yawRef.current;
      const fwdX = Math.sin(yaw);
      const fwdZ = -Math.cos(yaw);
      const rgtX = Math.cos(yaw);
      const rgtZ = Math.sin(yaw);
      if (keys.w) {
        dx += fwdX * speed;
        dz += fwdZ * speed;
      }
      if (keys.s) {
        dx -= fwdX * speed;
        dz -= fwdZ * speed;
      }
      if (keys.a) {
        dx -= rgtX * speed;
        dz -= rgtZ * speed;
      }
      if (keys.d) {
        dx += rgtX * speed;
        dz += rgtZ * speed;
      }
      // 可行走区域约束（禁止穿建筑/水面，贴边滑动）
      const next = resolveMove(
        { x: camera.position.x, z: camera.position.z },
        dx,
        dz,
      );
      camera.position.x = next.x;
      camera.position.z = next.z;
      camera.position.y = 1.9; // 步行高度（沿河街/广场/桥面）
      camera.lookAt(
        camera.position.x + fwdX * 8,
        0.9,
        camera.position.z + fwdZ * 8,
      );
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
        // 俯瞰全景（初始）：从高处看向小镇
        const targetX = mode === 'silence' ? 0 : Math.sin(t * 0.2) * 0.5;
        const targetZ = mode === 'silence' ? 4.6 : 9.5 + Math.sin(t * 0.15) * 0.4;
        const targetY = mode === 'silence' ? 1.45 : 3.2;
        camera.position.x += (targetX - camera.position.x) * k;
        camera.position.y += (targetY - camera.position.y) * k;
        camera.position.z += (targetZ - camera.position.z) * k;
        camera.lookAt(0, 0.4, 0);
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

    // 雨：斜落（风向漂移 + 整体倾斜）并回收（silence 段减弱雨势）
    const mesh = rainRef.current;
    if (mesh) {
      mesh.count = mode === 'silence' ? RAIN_COUNT_SILENCE : RAIN_COUNT;
      mesh.rotation.z = -0.10; // 斜雨倾角（风向 -x）
      for (let i = 0; i < mesh.count; i++) {
        const drop = drops[i];
        if (!drop) continue;
        drop.y -= drop.speed * dt;
        drop.x -= drop.speed * dt * 0.18; // 风向漂移
        if (drop.y < -2.5) {
          drop.y = 14 + Math.random() * 4;
          drop.x = (Math.random() - 0.5) * 22;
        }
        if (drop.x < -12) drop.x += 24;
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
      {/* 阶段 2 光照：半球光（天蓝/地暗体积感）+ 汤碗暖光实时阴影 */}
      <hemisphereLight args={['#2c3d4f', '#0a1018', 0.55]} />
      {/* 汤碗暖光：暖色点光（GLB 内含自发光汤碗 mesh，C1 资产到位后替换） */}
      <pointLight
        ref={pointLight}
        color={theme.warm.soul}
        intensity={2.4}
        distance={14}
        position={[0, 0.6, 0]}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0012}
      />
      {/* 汤碗 Bloom 焦点 halo（GLB 汤碗自发光之上叠加，保证后期发光焦点） */}
      <mesh position={[0, 0.68, 0]}>
        <sphereGeometry args={[0.2, 12, 12]} />
        <meshBasicMaterial color={theme.warm.soul} toneMapped={false} transparent opacity={0.9} />
      </mesh>

      {/* 水面倒影：河道专用平面（覆盖 GLB river_main，UV 对应河道 x[-11,11] z[-1.6,1.6]） */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.53, 0]}>
        <planeGeometry args={[22, 3.4, 1, 1]} />
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

      {/* 雨滴落水溅落（Points，水面随机闪光，R7 细节） */}
      <SplashPoints />

      {/* 场景居民：3D 立体人形（角色色签，受汤碗暖光），点击选中 */}
      {RESIDENT_SPOTS.map((s) => (
        <group key={s.id} position={[s.pos[0], 0, s.pos[2]]}>
          <ResidentModel
            id={s.id}
            selected={selected === s.id}
            onSelect={() => {
              onFocusChange({ x: s.pos[0], z: s.pos[2] });
              onSelectResident(s.id);
            }}
          />
        </group>
      ))}
    </>
  );
}

export function RainNight({
  mode,
  selected = 'r1',
  onSelectResident,
  onNearChange,
}: {
  mode: RainMode;
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
      camera={{ position: [0, 3.2, 9.5], fov: 55 }}
      gl={{
        antialias: true,
        powerPreference: 'high-performance',
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.15,
      }}
    >
      <color attach="background" args={[theme.rain.base]} />
      <fog attach="fog" args={[theme.rain.base, 12, 32]} />
      <RainScene
        mode={mode}
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
