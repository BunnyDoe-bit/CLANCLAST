/* Caustic Weave — adapted from Originkit for CLANCLAST.
 *
 * A diagonal travelling wave cinched through a hyperbolic waist, on one
 * full-screen WebGL triangle. One scalar field: frame + rotate → domain-warp
 * (fabric billow) → gaussian "waist" that squeezes the carrier's period in the
 * centre corridor → palette ramp → pseudo-normal specular for the satin glare.
 *
 * CLANCLAST changes vs. the original:
 *  - brand palette presets (see BrandWeave.tsx), typed props, no stray defaults
 *  - `maxDpr` so backgrounds can render below retina (soft imagery, big saving)
 *  - honours prefers-reduced-motion: renders a single still frame
 *  - `onReady` after the first frame so callers can fade it in over a CSS fallback
 *  - pauses off-screen and when the page is hidden (as before)
 */
import { useEffect, useRef, useState, type CSSProperties } from "react";

const MAX_STOPS = 8;

export type WeaveField = { scale: number; angle: number; folds: number; pinch: number; pinchWidth: number; crossFreq: number; crossMix: number; centerX: number; centerY: number };
export type WeaveWarp = { amount: number; scale: number; detail: number };
export type WeaveSurface = { ramp: number; sheen: number; glow: number; grain: number; opacity: number };
export type WeaveTravel = { direction: "forward" | "reverse"; spin: number; breathe: number };

const DEFAULT_FIELD: WeaveField = { scale: 4.1, angle: -112, folds: 31, pinch: 2.6, pinchWidth: 4.1, crossFreq: 6.7, crossMix: 1, centerX: 0, centerY: 0 };
const DEFAULT_WARP: WeaveWarp = { amount: 6.3, scale: 3.3, detail: 3 };
const DEFAULT_SURFACE: WeaveSurface = { ramp: 5.5, sheen: 5.5, glow: 3, grain: 2.5, opacity: 100 };
const DEFAULT_TRAVEL: WeaveTravel = { direction: "forward", spin: 2.5, breathe: 4 };

export type CausticWeaveProps = {
  /** Palette stops, valley → crest (max 8). */
  colors: string[];
  /** Colour filling the troughs. */
  background: string;
  field?: Partial<WeaveField>;
  warp?: Partial<WeaveWarp>;
  surface?: Partial<WeaveSurface>;
  travel?: Partial<WeaveTravel>;
  /** 0–10 rate the wave-fronts travel. */
  speed?: number;
  paused?: boolean;
  interactive?: boolean;
  /** 0–10 pointer influence. */
  sensitivity?: number;
  /** Device-pixel-ratio cap. Backgrounds look identical at 1–1.5 and cost far less. */
  maxDpr?: number;
  onReady?: () => void;
  onFail?: () => void;
  style?: CSSProperties;
  className?: string;
};

/* ------------------------------------------------------------- shaders */

const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() { vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }
`;

const FRAG = `
#define MAX_STOPS ${MAX_STOPS}
varying vec2 vUv;
uniform float uTime; uniform vec3 uColors[MAX_STOPS]; uniform int uCount; uniform float uAspect;
uniform vec2 uCenter; uniform float uScale; uniform float uRotation; uniform float uFolds;
uniform float uPinch; uniform float uPinchWidth; uniform float uCrossFreq; uniform float uCrossMix;
uniform float uWarp; uniform float uWarpFreq; uniform float uDetail; uniform float uPixel;
uniform float uPhase; uniform float uPhaseB; uniform float uRamp; uniform float uSheen;
uniform float uGlow; uniform float uGrain; uniform vec3 uBg; uniform float uOpacity;

const vec3  LIGHT_DIR  = vec3(-0.5503, 0.6003, 0.5803);
const float SPEC_BUMP  = 1.6;
const float SPEC_SHINE = 14.0;

mat2 rot(float a) { float s = sin(a), c = cos(a); return mat2(c, -s, s, c); }
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }

vec3 palette(float t) {
  t = clamp(t, 0.0, 1.0);
  float span = float(uCount - 1);
  if (span < 0.5) return uColors[0];
  float u = t * span;
  float i = min(floor(u), span - 1.0);
  float k = clamp(u - i, 0.0, 1.0);
  k = k * k * (3.0 - 2.0 * k);
  vec3 a = uColors[0]; vec3 b = uColors[0];
  for (int n = 0; n < MAX_STOPS; n++) {
    if (float(n) == i) a = uColors[n];
    if (float(n) == i + 1.0) b = uColors[n];
  }
  return mix(a, b, k);
}

void main() {
  vec2 p = vUv * 2.0 - 1.0;
  p *= vec2(max(uAspect, 1.0), max(1.0 / uAspect, 1.0));
  p = (p - uCenter) / max(uScale, 0.01);
  p = rot(uRotation) * p;

  vec2 q = p;
  for (int i = 0; i < 3; i++) {
    float fi = float(i) + 1.0;
    float on = step(fi - 0.5, uDetail);
    q += on * (uWarp / fi) * vec2(
      sin(uWarpFreq * fi * q.y + uPhase * 0.70 + fi * 1.7),
      sin(uWarpFreq * fi * q.x - uPhase * 0.50 + fi * 2.3));
  }

  float e = exp(-uPinchWidth * q.x * q.x);
  float pinch = 1.0 + uPinch * e;
  float dPinch = uPinch * e * (-2.0 * uPinchWidth * q.x);
  float phi  = q.y * pinch * uFolds + uPhase;
  float cphi = q.x * uCrossFreq + uPhaseB;

  float gx = uFolds * q.y * dPinch - uCrossMix * uCrossFreq * sin(cphi);
  float gy = uFolds * pinch;
#ifdef HAS_DERIV
  float pix = length(vec2(fwidth(q.x), fwidth(q.y)));
#else
  float pix = uPixel;
#endif
  float fw = pix * length(vec2(gx, gy));
  float fade = 1.0 / (1.0 + fw * fw * 0.35);

  float w = (sin(phi) + uCrossMix * cos(cphi)) * fade;
  float t = clamp(w / (1.0 + uCrossMix) * 0.5 + 0.5, 0.0, 1.0);
  float shaped = pow(t, uRamp);

  vec2 g = vec2(gx, gy);
  vec2 slope = cos(phi) * fade * (g / max(length(g), 1e-6));
  vec3 N = normalize(vec3(-slope * SPEC_BUMP, 1.0));
  float spec = pow(max(dot(N, LIGHT_DIR), 0.0), SPEC_SHINE) * uSheen;

#ifdef HAS_DERIV
  float dt = fwidth(shaped) * 0.5;
#else
  float dt = 0.004;
#endif
  dt = clamp(dt, 0.0005, 0.25);
  vec3 col = (palette(shaped) + palette(shaped - dt) + palette(shaped + dt)) / 3.0;
  col += uGlow * smoothstep(0.72, 1.0, shaped) + spec;
  col += uBg * (1.0 - smoothstep(0.0, 0.35, shaped));
  col += (hash(gl_FragCoord.xy + fract(uTime) * 137.0) - 0.5) * uGrain;
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), uOpacity);
}
`;

/* ------------------------------------------------------------- helpers */

function hexToRGB(hex: string): [number, number, number] {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h.slice(0, 6), 16) || 0;
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const sh = gl.createShader(type);
  if (!sh) return null;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) { gl.deleteShader(sh); return null; }
  return sh;
}

const UNIFORMS = ["uTime", "uColors[0]", "uCount", "uAspect", "uCenter", "uScale", "uRotation", "uFolds", "uPinch", "uPinchWidth", "uCrossFreq", "uCrossMix", "uWarp", "uWarpFreq", "uDetail", "uPixel", "uPhase", "uPhaseB", "uRamp", "uSheen", "uGlow", "uGrain", "uBg", "uOpacity"] as const;

/* ----------------------------------------------------------- component */

export default function CausticWeave({
  colors, background, field, warp, surface, travel, speed = 10, paused = false, interactive = true, sensitivity = 10,
  maxDpr = 2, onReady, onFail, style, className,
}: CausticWeaveProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [, setFailed] = useState(false);

  // Live mirror read by the render loop, so prop changes never tear down the GL context.
  const props = {
    colors: colors.slice(0, MAX_STOPS), background,
    field: { ...DEFAULT_FIELD, ...field }, warp: { ...DEFAULT_WARP, ...warp },
    surface: { ...DEFAULT_SURFACE, ...surface }, travel: { ...DEFAULT_TRAVEL, ...travel },
    speed, paused, interactive, sensitivity, maxDpr, onReady, onFail,
  };
  const propsRef = useRef(props);
  propsRef.current = props;

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;

    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    let disposed = false, raf = 0, readyFired = false;
    let gl: WebGLRenderingContext | null = null;
    let program: WebGLProgram | null = null;
    let buffer: WebGLBuffer | null = null;
    let uni: Record<string, WebGLUniformLocation | null> = {};
    let onScreen = true, pageVisible = true;
    let elapsed = 0, phase = 0, phaseB = 0, rotation = 0, breathePhase = 0, lastNow = 0;
    let px = 0, py = 0, tx = 0, ty = 0;
    const colorBuf = new Float32Array(MAX_STOPS * 3);

    function fail() { setFailed(true); propsRef.current.onFail?.(); }

    function init(): boolean {
      const ctx = canvas!.getContext("webgl", { alpha: true, antialias: false, premultipliedAlpha: false, powerPreference: "low-power" }) as WebGLRenderingContext | null;
      if (!ctx) return false;
      gl = ctx;
      const deriv = gl.getExtension("OES_standard_derivatives");
      const hp = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT);
      const prelude = (deriv ? "#extension GL_OES_standard_derivatives : enable\n#define HAS_DERIV 1\n" : "") + `precision ${hp && hp.precision > 0 ? "highp" : "mediump"} float;\n`;
      const vs = compile(gl, gl.VERTEX_SHADER, VERT);
      const fs = compile(gl, gl.FRAGMENT_SHADER, prelude + FRAG);
      if (!vs || !fs) return false;
      const prog = gl.createProgram();
      if (!prog) return false;
      gl.attachShader(prog, vs); gl.attachShader(prog, fs);
      gl.bindAttribLocation(prog, 0, "aPos");
      gl.linkProgram(prog);
      gl.deleteShader(vs); gl.deleteShader(fs);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return false;
      program = prog;
      gl.useProgram(prog);
      buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      uni = {};
      for (const n of UNIFORMS) uni[n] = gl.getUniformLocation(prog, n);
      gl.clearColor(0, 0, 0, 0);
      return true;
    }

    function resize() {
      if (!gl) return;
      const dpr = Math.min(window.devicePixelRatio || 1, propsRef.current.maxDpr);
      const w = Math.max(1, Math.round(host!.clientWidth * dpr));
      const h = Math.max(1, Math.round(host!.clientHeight * dpr));
      if (canvas!.width !== w || canvas!.height !== h) { canvas!.width = w; canvas!.height = h; gl.viewport(0, 0, w, h); }
    }

    function draw(dt: number) {
      if (!gl || !program) return;
      const p = propsRef.current;
      const f = p.field, wp = p.warp, s = p.surface, tv = p.travel;
      if (!p.paused) {
        elapsed += dt;
        const step = dt * p.speed * 0.35 * (tv.direction === "reverse" ? 1 : -1);
        phase += step;
        phaseB -= step * (0.5 + tv.breathe * 0.03 * Math.sin(breathePhase));
        rotation += dt * tv.spin * 0.01;
        breathePhase += dt * 0.22;
      }
      const k = Math.min(1, dt * 4);
      px += (tx - px) * k; py += (ty - py) * k;
      const pull = p.interactive ? p.sensitivity * 0.045 : 0;

      colorBuf.fill(0);
      p.colors.forEach((c, i) => { const [r, g, b] = hexToRGB(c); colorBuf[i * 3] = r; colorBuf[i * 3 + 1] = g; colorBuf[i * 3 + 2] = b; });
      const bg = hexToRGB(p.background);
      const w = canvas!.width, h = canvas!.height;

      gl.uniform1f(uni.uTime, elapsed);
      gl.uniform3fv(uni["uColors[0]"], colorBuf);
      gl.uniform1i(uni.uCount, Math.max(1, p.colors.length));
      gl.uniform1f(uni.uAspect, w / Math.max(1, h));
      gl.uniform2f(uni.uCenter, f.centerX / 100 + px * pull, -f.centerY / 100 - py * pull);
      const scale = Math.pow(2.4, (f.scale - 5) / 2.5);
      gl.uniform1f(uni.uScale, scale);
      gl.uniform1f(uni.uPixel, 2 / Math.max(1, Math.min(w, h)) / scale);
      gl.uniform1f(uni.uRotation, (f.angle * Math.PI) / 180 + rotation);
      gl.uniform1f(uni.uFolds, f.folds);
      gl.uniform1f(uni.uPinch, f.pinch);
      gl.uniform1f(uni.uPinchWidth, f.pinchWidth);
      gl.uniform1f(uni.uCrossFreq, f.crossFreq);
      gl.uniform1f(uni.uCrossMix, f.crossMix);
      const swell = 1 + tv.breathe * 0.05 * Math.sin(breathePhase);
      gl.uniform1f(uni.uWarp, wp.amount * 0.055 * swell);
      gl.uniform1f(uni.uWarpFreq, 0.4 + wp.scale * 0.22);
      gl.uniform1f(uni.uDetail, Math.round(wp.detail));
      gl.uniform1f(uni.uPhase, phase);
      gl.uniform1f(uni.uPhaseB, phaseB);
      gl.uniform1f(uni.uRamp, 0.6 + s.ramp * 0.26);
      gl.uniform1f(uni.uSheen, s.sheen * 0.022);
      gl.uniform1f(uni.uGlow, s.glow * 0.035);
      gl.uniform1f(uni.uGrain, s.grain * 0.006);
      gl.uniform3f(uni.uBg, bg[0], bg[1], bg[2]);
      gl.uniform1f(uni.uOpacity, Math.max(0, Math.min(1, s.opacity / 100)));
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      if (!readyFired) { readyFired = true; p.onReady?.(); }
    }

    function loop(now: number) {
      if (disposed) return;
      if (reduceMotion) { resize(); draw(0); return; } // one still frame, no loop
      raf = requestAnimationFrame(loop);
      if (!onScreen || !pageVisible) { lastNow = now; return; }
      const dt = lastNow ? Math.min((now - lastNow) / 1000, 0.05) : 0;
      lastNow = now;
      resize();
      draw(dt);
    }

    if (!init()) { fail(); return; }

    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => { resize(); if (reduceMotion) draw(0); }) : null;
    ro?.observe(host);
    const io = typeof IntersectionObserver !== "undefined" ? new IntersectionObserver((es) => { onScreen = es.some((e) => e.isIntersecting); }, { rootMargin: "128px" }) : null;
    io?.observe(host);
    const onVisibility = () => { pageVisible = document.visibilityState !== "hidden"; };
    document.addEventListener("visibilitychange", onVisibility);
    // Pointer is read at window level so the weave still responds under overlaid content.
    const onPointer = (e: PointerEvent) => {
      const r = host.getBoundingClientRect();
      if (!r.width || !r.height) return;
      tx = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1));
      ty = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height) * 2 - 1));
    };
    const onLeave = () => { tx = 0; ty = 0; };
    window.addEventListener("pointermove", onPointer, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    const onLost = (e: Event) => { e.preventDefault(); cancelAnimationFrame(raf); };
    const onRestored = () => { if (disposed) return; lastNow = 0; if (init()) raf = requestAnimationFrame(loop); else fail(); };
    canvas.addEventListener("webglcontextlost", onLost);
    canvas.addEventListener("webglcontextrestored", onRestored);

    resize();
    raf = requestAnimationFrame(loop);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      ro?.disconnect(); io?.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pointermove", onPointer);
      document.removeEventListener("pointerleave", onLeave);
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("webglcontextrestored", onRestored);
      if (gl) {
        if (buffer) gl.deleteBuffer(buffer);
        if (program) gl.deleteProgram(program);
        gl.getExtension("WEBGL_lose_context")?.loseContext();
      }
    };
  }, []);

  return (
    <div ref={hostRef} className={className} style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden", ...style }}>
      <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }} />
    </div>
  );
}
