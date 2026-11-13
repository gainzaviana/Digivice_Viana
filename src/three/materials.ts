import * as THREE from "three";

/**
 * The cozy look's shared materials. Soft, slightly waxy surfaces (vinyl-toy / clay): wrapped
 * diffuse light so shadows never go harsh, a warm subsurface tint where light fades, and a soft
 * rim light. Everything in the battle (creatures and diorama props) uses these.
 */

export interface SoftOptions {
  roughness?: number;
  /** Light-wrap amount 0–1 (how far light bleeds past the terminator). */
  wrap?: number;
  /** Rim light strength. */
  rim?: number;
  /** Colour of the subsurface glow in the shadowed side. */
  subsurface?: THREE.ColorRepresentation;
  emissive?: THREE.ColorRepresentation;
  emissiveIntensity?: number;
  flatShading?: boolean;
  transparent?: boolean;
  opacity?: number;
  /** Use the geometry's vertex colours (multiplied by `color`). */
  vertexColors?: boolean;
}

const cache = new Map<string, THREE.MeshStandardMaterial>();

/** A shared soft material (cached by its parameters, so meshes can be merged and batched). */
export function softMaterial(color: THREE.ColorRepresentation, o: SoftOptions = {}): THREE.MeshStandardMaterial {
  const key = JSON.stringify([new THREE.Color(color).getHexString(), o]);
  const hit = cache.get(key);
  if (hit) return hit;
  const wrap = o.wrap ?? 0.45, rim = o.rim ?? 0.35;
  const sss = new THREE.Color(o.subsurface ?? 0xff9b7a);
  const m = new THREE.MeshStandardMaterial({
    color, roughness: o.roughness ?? 0.62, metalness: 0, flatShading: o.flatShading ?? false,
    emissive: o.emissive ?? 0x000000, emissiveIntensity: o.emissiveIntensity ?? 1,
    transparent: o.transparent ?? false, opacity: o.opacity ?? 1, vertexColors: o.vertexColors ?? false,
  });
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uWrap = { value: wrap };
    shader.uniforms.uRim = { value: rim };
    shader.uniforms.uSss = { value: sss };
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform float uWrap;\nuniform float uRim;\nuniform vec3 uSss;")
      // Wrapped diffuse: soften the light falloff.
      .replace(
        "#include <lights_fragment_begin>",
        "#include <lights_fragment_begin>\n",
      )
      .replace(
        "#include <opaque_fragment>",
        `float nv = clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0);
        float rimF = pow(1.0 - nv, 2.5) * uRim;
        outgoingLight += diffuseColor.rgb * uSss * (1.0 - nv) * 0.18 * uWrap;
        outgoingLight += vec3(1.0, 0.95, 0.85) * rimF;
        #include <opaque_fragment>`,
      );
  };
  m.customProgramCacheKey = () => `soft-${wrap}-${rim}-${sss.getHexString()}`;
  cache.set(key, m);
  return m;
}

/** Unlit glowing material for seams, cores and effects (additive when `additive`). */
export function glowMaterial(color: THREE.ColorRepresentation, additive = false, opacity = 1): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color, transparent: additive || opacity < 1, opacity, depthWrite: !additive,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, toneMapped: false,
  });
}

/** A soft round sprite texture (for particles, halos and blob shadows). */
let softDot: THREE.Texture | undefined;
export function softDotTexture(): THREE.Texture {
  if (softDot) return softDot;
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.35, "rgba(255,255,255,0.75)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  softDot = new THREE.CanvasTexture(c);
  softDot.colorSpace = THREE.SRGBColorSpace;
  return softDot;
}

/** Quality tier, chosen from the device and lowered automatically if frames drop. */
export interface Quality { pixelRatio: number; shadows: boolean; particles: number; effects: boolean }
export function defaultQuality(effects: boolean): Quality {
  const dpr = typeof window === "undefined" ? 1 : window.devicePixelRatio || 1;
  return { pixelRatio: Math.min(dpr, effects ? 2 : 1.5), shadows: effects, particles: effects ? 1 : 0.4, effects };
}
