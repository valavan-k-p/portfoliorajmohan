import gsap from "gsap";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

/**
 * A 3D red satin stage curtain. Each drape is a dense plane whose shape is computed in the
 * vertex shader: folds that deepen as the cloth gathers, a top-first opening (the gap opens as a
 * V, as real drapes do when drawn from the rod), a little swing on the free edge, and normals
 * taken from the displaced surface so the satin catches the light correctly.
 */
export type CurtainGL = {
  /** Sweeps the drapes closed, calls onClosed behind them, then opens them. */
  play: (onClosed: () => void) => Promise<void>;
  dispose: () => void;
};

const CLOTH_GLSL = /* glsl */ `
uniform float uProgress;  // 1 = fully open (off-frame), 0 = closed
uniform float uLag;       // how far the hem trails the rod
uniform float uTime;
uniform float uHalfW;
uniform float uH;
uniform float uSide;      // 1 = left drape, -1 = right drape (mirrored)
uniform float uDepth;     // pushes the right drape in front where the two overlap
varying float vClothV;

// u: 0 at the wing (outer edge) to 1 at the centre. v: 0 at the hem to 1 at the rod.
vec3 clothAt(float u, float v) {
  float trail = pow(1.0 - v, 1.35) * uLag;
  float p = clamp(uProgress * (1.0 + uLag) - trail, 0.0, 1.0);
  p = p * p * (3.0 - 2.0 * p);

  // Drawn toward the wing: the cloth bunches into a fraction of its width, then leaves the frame.
  float gathered = 1.0 - 0.84 * p;
  float slide = smoothstep(0.72, 1.0, p) * 0.32;
  float x = (u * gathered * 1.07 - slide) * uHalfW;

  // Folds deepen as the cloth gathers, and wander slightly with height so they never read as stripes.
  float f1 = sin(u * 6.2831 * 6.5 + sin(v * 2.1 + u * 3.7) * 1.1);
  float f2 = sin(u * 6.2831 * 2.7 + 1.7 + v * 1.4);
  float f3 = sin(u * 6.2831 * 14.0 + v * 0.9) * 0.16;
  // Uneven fold depth across the width, so some folds are deep troughs and some shallow.
  float unevenness = 0.55 + 0.45 * sin(u * 11.3 + 1.3) * sin(u * 4.7 + 0.4);
  float depth = (0.038 + 0.07 * p) * uHalfW * unevenness;
  float z = (f1 * 0.6 + f2 * 0.32 + f3) * depth;

  // While it moves, the free edge swings and the hem lifts toward the wing like a tie-back.
  float moving = p * (1.0 - p) * 4.0;
  z += sin(uTime * 2.3 + v * 5.0 + u * 3.0) * 0.014 * uHalfW * moving * u;
  x += sin(uTime * 1.6 + v * 3.0) * 0.012 * uHalfW * moving * u;
  float y = (v - 0.5) * uH + p * p * pow(1.0 - v, 2.0) * 0.08 * uH * u;
  return vec3(x, y, z + uDepth);
}

void clothSample(vec2 uv, out vec3 pos, out vec3 nrm) {
  float e = 0.0015;
  vec3 p0 = clothAt(uv.x, uv.y);
  vec3 pu = clothAt(uv.x + e, uv.y);
  vec3 pv = clothAt(uv.x, uv.y + e);
  vec3 n = normalize(cross(pu - p0, pv - p0));
  pos = vec3(uSide * (p0.x - uHalfW), p0.y, p0.z);
  nrm = vec3(uSide * n.x, n.y, n.z);
}
`;

function satin(shared: Record<string, THREE.IUniform>, side: number) {
  const material = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color("#5e0610"),
    roughness: 0.4,
    metalness: 0,
    sheen: 0.7,
    sheenRoughness: 0.38,
    sheenColor: new THREE.Color("#a3132a"),
    envMapIntensity: 0.35,
  });
  const own = { uSide: { value: side }, uDepth: { value: side < 0 ? 0.03 : 0 } };
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, shared, own);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", `#include <common>\n${CLOTH_GLSL}`)
      .replace(
        "#include <beginnormal_vertex>",
        `vec3 clothPos; vec3 clothNormal;
         clothSample(position.xy, clothPos, clothNormal);
         vClothV = position.y;
         vec3 objectNormal = clothNormal;
         #ifdef USE_TANGENT
           vec3 objectTangent = vec3(tangent.xyz);
         #endif`,
      )
      .replace("#include <begin_vertex>", "vec3 transformed = clothPos;");
    // Darker toward the hem and up in the flies, like stage cloth lit from the front.
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying float vClothV;")
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
         diffuseColor.rgb *= mix(0.4, 1.0, smoothstep(0.0, 0.22, vClothV)) * mix(0.45, 1.0, smoothstep(1.0, 0.78, vClothV));`,
      );
  };
  return material;
}

/** A unit grid (x, y in 0..1). The right drape is mirrored in the shader, so its winding is flipped here. */
function clothGeometry(segX: number, segY: number, mirrored: boolean) {
  const geometry = new THREE.PlaneGeometry(1, 1, segX, segY).translate(0.5, 0.5, 0);
  if (mirrored) {
    const index = geometry.getIndex()!;
    const a = index.array as Uint16Array | Uint32Array;
    for (let i = 0; i < a.length; i += 3) [a[i + 1], a[i + 2]] = [a[i + 2], a[i + 1]];
    index.needsUpdate = true;
  }
  return geometry;
}

export function createCurtainGL(canvas: HTMLCanvasElement): CurtainGL | null {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "high-performance" });
  } catch {
    return null;
  }
  const small = window.innerWidth < 768;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, small ? 1.5 : 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.9;
  renderer.setClearColor(0x000000, 0);
  // Some platform shader compilers print harmless precision notes; linking is checked below instead.
  renderer.debug.checkShaderErrors = false;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = environment;
  scene.environmentIntensity = 0.28;

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  camera.position.set(0, 0, 10);

  // Stage lighting: a warm key raking from the left (deep fold shadows) and a low red fill.
  const key = new THREE.DirectionalLight("#ffe7d6", 2.1);
  key.position.set(-6, 3.5, 4.5);
  const fill = new THREE.DirectionalLight("#ff4a4a", 0.35);
  fill.position.set(6, -1, 3);
  scene.add(key, fill, new THREE.AmbientLight("#1c0204", 0.5));

  const shared = {
    uProgress: { value: 1 },
    uLag: { value: 0.55 },
    uTime: { value: 0 },
    uHalfW: { value: 1 },
    uH: { value: 1 },
  };
  const segX = small ? 140 : 240;
  const segY = small ? 50 : 80;
  const left = new THREE.Mesh(clothGeometry(segX, segY, false), satin(shared, 1));
  const right = new THREE.Mesh(clothGeometry(segX, segY, true), satin(shared, -1));
  left.frustumCulled = false;
  right.frustumCulled = false;
  scene.add(left, right);

  const resize = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    const halfH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
    shared.uHalfW.value = halfH * camera.aspect;
    shared.uH.value = halfH * 2 * 1.08;
  };
  resize();
  window.addEventListener("resize", resize);

  let last = 0;
  const frame = (time: number) => {
    shared.uTime.value += last ? time - last : 0;
    last = time;
    renderer.render(scene, camera);
  };

  const dispose = () => {
    gsap.ticker.remove(frame);
    window.removeEventListener("resize", resize);
    left.geometry.dispose();
    right.geometry.dispose();
    (left.material as THREE.Material).dispose();
    (right.material as THREE.Material).dispose();
    environment.dispose();
    pmrem.dispose();
    renderer.dispose();
  };

  // Compile now, while the visitor is still watching the film, so the click starts instantly.
  // If the cloth shader cannot link on this device, the CSS curtain is used instead.
  renderer.compile(scene, camera);
  const context = renderer.getContext();
  const linked = (renderer.info.programs ?? []).every((program) =>
    context.getProgramParameter(program.program as WebGLProgram, context.LINK_STATUS),
  );
  if (!linked) {
    dispose();
    return null;
  }
  renderer.render(scene, camera);

  return {
    play: (onClosed) =>
      new Promise<void>((resolve) => {
        last = 0;
        gsap.ticker.add(frame);
        const CLOSE = 1.5;
        const HOLD = 0.55;
        gsap
          .timeline({
            onComplete: () => {
              gsap.ticker.remove(frame);
              renderer.clear();
              resolve();
            },
          })
          // The drapes sweep in together from the wings...
          .set(shared.uLag, { value: 0.15 }, 0)
          .fromTo(shared.uProgress, { value: 1 }, { value: 0, duration: CLOSE, ease: "power2.inOut" }, 0)
          // ...the house light warms on the closed curtain while the page changes behind it...
          .to(key, { intensity: 2.9, duration: 0.6, ease: "sine.inOut" }, CLOSE - 0.2)
          .call(onClosed, [], CLOSE + 0.1)
          .to(key, { intensity: 2.1, duration: 0.8, ease: "sine.inOut" }, CLOSE + HOLD)
          // ...then they open from the rod down, gathering into the wings and clearing the frame.
          .set(shared.uLag, { value: 0.55 }, CLOSE + HOLD)
          .to(shared.uProgress, { value: 1, duration: 3.1, ease: "power1.inOut" }, CLOSE + HOLD);
      }),
    dispose,
  };
}
