import { useEffect, useRef, type CSSProperties } from "react";

/**
 * HeroMetalScales — brushed-metal scales WebGL background for the CLANCLAST hero.
 *
 * Ported from the Framer "Brushed Metal Scales" component: the shader is unchanged,
 * the Framer-only parts (property controls, kit helpers) are removed, the colours
 * default to the CLANCLAST palette, and it adds:
 *   - pointer tracking on the parent section (so hero content above it doesn't block it)
 *   - pauses while off-screen, one still frame for prefers-reduced-motion
 *   - capped pixel ratio for phones, and clean-up of all GL resources on unmount
 * If WebGL2 is unavailable the parent's background colour simply shows through.
 */

type RGB = [number, number, number];

function toRgb(input: string | undefined, fallback: RGB): RGB {
  if (!input) return fallback;
  const s = input.trim();
  if (s[0] === "#") {
    let h = s.slice(1);
    if (h.length === 3) h = h.split("").map((c) => c + c).join("");
    if (h.length >= 6) {
      const out: RGB = [parseInt(h.slice(0, 2), 16) / 255, parseInt(h.slice(2, 4), 16) / 255, parseInt(h.slice(4, 6), 16) / 255];
      return out.every(Number.isFinite) ? out : fallback;
    }
    return fallback;
  }
  const m = /^rgba?\(([^)]*)\)$/i.exec(s);
  if (m) {
    const p = m[1].split(/[\s,/]+/).filter(Boolean).slice(0, 3).map((x) => parseFloat(x) / 255);
    if (p.length === 3 && p.every(Number.isFinite)) return p as RGB;
  }
  return fallback;
}

/** Tuned values from the original component (baked in). */
const ADV = {
  hover: 50, grain: 0, vignette: 0, drift: 100, foldFreq: 100, waveAmp: 100,
  funnelDepth: 100, funnelSize: 221, rings: 35, finLength: 85, finWidth: 70,
  stretch: 160, thinning: 60, finAngle: 20, bump: 100, bulge: 60, bevel: 55,
  jitter: 25, keyAngle: 225, keyHeight: 35, warmAngle: 45, warmHeight: 30,
  coolStrength: 100, warmStrength: 90, specPower: 60, specStrength: 100,
  glintStrength: 70, ambient: 35, occlusion: 70, seed: 0,
};

const VERT = `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`;

const FRAG = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uMouse;
uniform float uHover;
uniform vec3 uBg;
uniform vec3 uBase;
uniform vec3 uAccent;
uniform float uScale;
uniform float uWarp;
uniform float uDensity;
uniform vec3 uWarmCol;
uniform vec3 uGlintCol;
uniform float uHoverAmt;
uniform float uGrain;
uniform float uVignette;
uniform float uDrift;
uniform float uFold;
uniform float uWave;
uniform float uFunDepth;
uniform float uFunSize;
uniform float uRings;
uniform float uFinLen;
uniform float uFinWid;
uniform float uStretch;
uniform float uThin;
uniform float uFinAngle;
uniform float uBump;
uniform float uBulge;
uniform float uBevel;
uniform float uJitter;
uniform float uKeyAz;
uniform float uKeyEl;
uniform float uWarmAz;
uniform float uWarmEl;
uniform float uCool;
uniform float uWarmStr;
uniform float uSpecPow;
uniform float uSpec;
uniform float uGlint;
uniform float uAmbient;
uniform float uOcc;
uniform float uSeed;
out vec4 outColor;

float h21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }

float funnel(vec2 s, vec2 c, float r, float depth, float t, float k) {
    vec2 d = s - c;
    d.y /= 1.16;
    float rr = max(r * uFunSize, 1e-3);
    float r2 = dot(d, d) / (rr * rr);
    float dep = 0.75 * uFunDepth * depth * (0.75 + 0.25 * sin(t * 0.6 + k));
    float rad = sqrt(r2);
    return dep * (exp(-r2) + uRings * 0.18 * sin(rad * 9.0 - t * 1.0 + k) * exp(-r2 * 0.4));
}

float field(vec2 p, vec2 mp) {
    float t = uTime * uDrift + uSeed * 11.0;
    vec2 s = p / max(uScale, 0.05);
    vec2 q = s * 3.2 * uFold;
    vec2 w = vec2(sin(q.y * 1.3 + t * 0.41) + 0.5 * sin(q.y * 2.9 - q.x * 1.1 + t * 0.57),
                  sin(q.x * 1.5 - t * 0.37) + 0.5 * sin(q.x * 2.3 + q.y * 1.7 - t * 0.53));
    q += uWarp * 0.9 * w;
    float h = sin(q.x * 0.9 + t * 0.23) * cos(q.y * 1.1 - t * 0.19)
            + 0.55 * sin(dot(q, vec2(1.6, -1.2)) + t * 0.31)
            + 0.3 * sin(dot(q, vec2(-0.8, 2.4)) - t * 0.29);
    h *= 0.35 * uWave;
    h -= funnel(s, vec2(-0.08 + 0.2 * sin(t * 0.21), -0.04 + 0.12 * sin(t * 0.29 + 1.0)), 0.24, 1.0, t, 0.0);
    h -= funnel(s, vec2(0.52 + 0.15 * sin(t * 0.17 + 2.0), 0.16 * cos(t * 0.25 + 0.5)), 0.17, 0.65, t, 2.1);
    h -= funnel(s, vec2(-0.6 + 0.12 * cos(t * 0.19 + 4.0), 0.3 + 0.12 * sin(t * 0.15)), 0.15, 0.5, t, 4.2);
    vec2 m = p - mp;
    h += uHoverAmt * uHover * 0.6 * exp(-dot(m, m) / 0.05);
    return h;
}

void main() {
    vec2 res = max(uRes, vec2(1.0));
    vec2 uv = gl_FragCoord.xy / res;
    vec2 p = (gl_FragCoord.xy - 0.5 * res) / res.y;
    vec2 mp = (uMouse * res - 0.5 * res) / res.y;
    float dens = max(uDensity, 1.0);

    float e = 0.5 / dens;
    float f0 = field(p, mp);
    vec2 g = vec2(field(p + vec2(e, 0.0), mp) - f0, field(p + vec2(0.0, e), mp) - f0) / e;
    float gm = length(g);
    vec2 gd = gm > 1e-4 ? g / gm : vec2(0.0, 1.0);
    float st = clamp(gm / 4.0, 0.0, 1.5);

    vec2 a0 = vec2(-gd.y, gd.x);
    float ca = cos(uFinAngle), sa = sin(uFinAngle);
    vec2 along = vec2(ca * a0.x - sa * a0.y, sa * a0.x + ca * a0.y);
    vec2 across = vec2(-along.y, along.x);
    float halfLen = min(1.4, 0.5 * (uFinLen + uStretch * st));
    float halfWid = min(0.7, 0.5 * uFinWid / (1.0 + uThin * st));
    float rnd = min(0.12, halfWid * 0.9);
    float aaw = 0.8 * dens / res.y;

    vec2 cp = p * dens;
    float row0 = floor(cp.y);
    float bestZ = -1e9;
    float bestD = 1e9;
    vec2 bestL = vec2(0.0);
    float bestH = 0.0;
    for (int j = -1; j <= 1; j++) {
        float row = row0 + float(j);
        float off = 0.5 * mod(row, 2.0);
        float col0 = floor(cp.x - off);
        for (int i = -1; i <= 1; i++) {
            vec2 id = vec2(col0 + float(i), row);
            vec2 c = vec2(id.x + 0.5 + off, row + 0.5);
            vec2 d = cp - c;
            vec2 l = vec2(dot(d, along), dot(d, across));
            vec2 qq = abs(l) - vec2(halfLen, halfWid) + rnd;
            float sd = length(max(qq, 0.0)) + min(max(qq.x, qq.y), 0.0) - rnd;
            if (sd < aaw) {
                float hh = h21(id + uSeed * 7.31);
                float z = dot(c, gd) + hh * 0.5;
                if (z > bestZ) { bestZ = z; bestD = sd; bestL = l; bestH = hh; }
            }
        }
    }

    float ao = smoothstep(-0.9, 0.3, f0);
    float aoMul = mix(1.0, 0.3 + 0.7 * ao, uOcc);
    vec3 col = uBg * (0.6 + 0.4 * ao);

    if (bestZ > -1e8) {
        vec3 N = normalize(vec3(-g * 0.33 * uBump, 1.0));
        float nb = clamp(bestL.y / max(halfWid, 1e-4), -1.0, 1.0);
        float na = clamp(bestL.x / max(halfLen, 1e-4), -1.0, 1.0);
        vec2 jit = (vec2(bestH, fract(bestH * 7.13)) - 0.5) * uJitter;
        vec3 n = normalize(N + vec3(across * nb * uBulge + along * na * 0.25 * uBulge + jit, 0.0));

        vec3 V = vec3(0.0, 0.0, 1.0);
        vec3 L1 = vec3(cos(uKeyAz) * cos(uKeyEl), sin(uKeyAz) * cos(uKeyEl), sin(uKeyEl));
        vec3 L2 = vec3(cos(uWarmAz) * cos(uWarmEl), sin(uWarmAz) * cos(uWarmEl), sin(uWarmEl));
        float d1 = max(dot(n, L1), 0.0);
        float d2 = max(dot(n, L2), 0.0);
        float s1 = pow(max(dot(n, normalize(L1 + V)), 0.0), uSpecPow);
        float s2 = pow(max(dot(n, normalize(L2 + V)), 0.0), uSpecPow);

        vec3 fc = uBase * (uAmbient + 0.5 * d1 + 0.3 * d2)
                + uAccent * uCool * (0.55 * pow(d1, 3.0) + 0.6 * s1 * uSpec)
                + uWarmCol * uWarmStr * (0.5 * pow(d2, 3.0) + 0.5 * s2 * uSpec)
                + uGlintCol * uGlint * pow(s1, 3.0) * step(0.45, bestH);
        float under = smoothstep(0.15, 1.0, na) * uBevel;
        fc *= 1.0 - under * 0.8;
        fc *= aoMul;

        float cover = 1.0 - smoothstep(-aaw, aaw, bestD);
        col = mix(col, fc, cover);
    }

    vec2 vv = uv - 0.5;
    vv.x *= res.x / res.y;
    col *= 1.0 - uVignette * smoothstep(0.25, 0.95, length(vv));
    col += (h21(gl_FragCoord.xy + floor(uTime * 24.0) * vec2(17.0, 31.0)) - 0.5) * uGrain * 0.2;
    outColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;

export interface HeroMetalScalesProps {
  /** Colours default to the CLANCLAST palette (deep green / brand green / mint / warm gold). */
  background?: string;
  baseColor?: string;
  accentColor?: string;
  warmLight?: string;
  glintColor?: string;
  speed?: number; // 0–100
  scale?: number; // 10–300 (%)
  density?: number; // 30–120
  warp?: number; // 0–200 (%)
  className?: string;
  style?: CSSProperties;
}

export function HeroMetalScales({
  background = "#0a1d18",
  baseColor = "#1b7a68",
  accentColor = "#7ee2b5",
  warmLight = "#e1c27a",
  glintColor = "#eafff6",
  speed = 40,
  scale = 100,
  density = 64,
  warp = 100,
  className,
  style,
}: HeroMetalScalesProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const propsRef = useRef({ background, baseColor, accentColor, warmLight, glintColor, speed, scale, density, warp });
  propsRef.current = { background, baseColor, accentColor, warmLight, glintColor, speed, scale, density, warp };

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas) return;
    const gl = canvas.getContext("webgl2", { alpha: false, antialias: false, depth: false });
    if (!gl) return;
    const reduced = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error("HeroMetalScales shader:", gl.getShaderInfoLog(s));
      return s;
    };
    const vs = compile(gl.VERTEX_SHADER, VERT);
    const fs = compile(gl.FRAGMENT_SHADER, FRAG);
    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error("HeroMetalScales link:", gl.getProgramInfoLog(prog));
      return;
    }
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "aPos");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const cache = new Map<string, WebGLUniformLocation | null>();
    const u = (name: string) => {
      if (!cache.has(name)) cache.set(name, gl.getUniformLocation(prog, name));
      return cache.get(name) ?? null;
    };
    const f = (name: string, v: number) => gl.uniform1f(u(name), v);
    const rad = Math.PI / 180;

    let W = 0;
    let H = 0;
    let drawStill: (() => void) | null = null;
    const resize = () => {
      W = root.offsetWidth;
      H = root.offsetHeight;
      const maxDpr = W < 700 ? 1 : 1.5;
      const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
      canvas.width = Math.max(1, Math.round(W * dpr));
      canvas.height = Math.max(1, Math.round(H * dpr));
      if (drawStill) drawStill();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(root);

    // Track the pointer on the parent section so hero content above the canvas doesn't block it.
    const host = root.parentElement?.parentElement ?? root.parentElement ?? root;
    let mx = 0.5, my = 0.5, tx = 0.5, ty = 0.5, over = 0, hov = 0;
    const onMove = (e: PointerEvent) => {
      const r = host.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) return;
      tx = (e.clientX - r.left) / r.width;
      ty = 1 - (e.clientY - r.top) / r.height;
      over = 1;
    };
    const onLeave = () => { over = 0; };
    host.addEventListener("pointermove", onMove);
    host.addEventListener("pointerleave", onLeave);

    let clock = reduced ? 12 : 0;
    const draw = () => {
      const p = propsRef.current;
      const bg = toRgb(p.background, [0.04, 0.11, 0.09]);
      const base = toRgb(p.baseColor, [0.11, 0.48, 0.41]);
      const acc = toRgb(p.accentColor, [0.49, 0.89, 0.71]);
      const warm = toRgb(p.warmLight, [0.88, 0.76, 0.48]);
      const glint = toRgb(p.glintColor, [0.92, 1, 0.96]);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(u("uRes"), canvas.width, canvas.height);
      f("uTime", clock);
      gl.uniform2f(u("uMouse"), mx, my);
      f("uHover", hov);
      gl.uniform3f(u("uBg"), bg[0], bg[1], bg[2]);
      gl.uniform3f(u("uBase"), base[0], base[1], base[2]);
      gl.uniform3f(u("uAccent"), acc[0], acc[1], acc[2]);
      gl.uniform3f(u("uWarmCol"), warm[0], warm[1], warm[2]);
      gl.uniform3f(u("uGlintCol"), glint[0], glint[1], glint[2]);
      f("uScale", Math.max(10, Math.min(300, p.scale)) / 100);
      f("uWarp", Math.max(0, Math.min(200, p.warp)) / 100);
      f("uDensity", Math.max(10, Math.min(200, p.density)));
      f("uHoverAmt", ADV.hover / 50);
      f("uGrain", ADV.grain / 100);
      f("uVignette", ADV.vignette / 100);
      f("uDrift", ADV.drift / 100);
      f("uFold", Math.max(0.05, ADV.foldFreq / 100));
      f("uWave", ADV.waveAmp / 100);
      f("uFunDepth", ADV.funnelDepth / 100);
      f("uFunSize", Math.max(0.05, ADV.funnelSize / 100));
      f("uRings", ADV.rings / 100);
      f("uFinLen", Math.max(0.1, ADV.finLength / 100));
      f("uFinWid", Math.max(0.1, ADV.finWidth / 100));
      f("uStretch", ADV.stretch / 100);
      f("uThin", ADV.thinning / 100);
      f("uFinAngle", ADV.finAngle * rad);
      f("uBump", ADV.bump / 100);
      f("uBulge", ADV.bulge / 100);
      f("uBevel", ADV.bevel / 100);
      f("uJitter", ADV.jitter / 100);
      f("uKeyAz", ADV.keyAngle * rad);
      f("uKeyEl", ADV.keyHeight * rad);
      f("uWarmAz", ADV.warmAngle * rad);
      f("uWarmEl", ADV.warmHeight * rad);
      f("uCool", ADV.coolStrength / 100);
      f("uWarmStr", ADV.warmStrength / 100);
      f("uSpecPow", Math.max(1, ADV.specPower));
      f("uSpec", ADV.specStrength / 100);
      f("uGlint", ADV.glintStrength / 100);
      f("uAmbient", ADV.ambient / 100);
      f("uOcc", ADV.occlusion / 100);
      f("uSeed", ADV.seed);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    resize();

    let raf = 0;
    let io: IntersectionObserver | null = null;
    if (reduced) {
      // One calm still frame; redraw only when the size changes.
      drawStill = draw;
      draw();
    } else {
      let visible = true;
      let last = -1;
      const frame = (now: number) => {
        raf = requestAnimationFrame(frame);
        const dt = last < 0 ? 0 : Math.min((now - last) / 1000, 1 / 20);
        last = now;
        if (!visible) return;
        const p = propsRef.current;
        clock = (clock + dt * (Math.max(0, Math.min(100, p.speed)) / 50)) % 3600;
        const k = 1 - Math.exp(-dt * 6);
        mx += (tx - mx) * k;
        my += (ty - my) * k;
        hov += (over - hov) * k;
        draw();
      };
      raf = requestAnimationFrame(frame);
      if (typeof IntersectionObserver !== "undefined") {
        io = new IntersectionObserver((entries) => { visible = entries[0]?.isIntersecting ?? true; });
        io.observe(root);
      }
    }

    return () => {
      cancelAnimationFrame(raf);
      io?.disconnect();
      ro.disconnect();
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerleave", onLeave);
      gl.deleteBuffer(buf);
      gl.deleteProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, []);

  return (
    <div
      ref={rootRef}
      className={className}
      style={{ position: "absolute", inset: 0, overflow: "hidden", background, ...style }}
    >
      <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }} />
    </div>
  );
}

export default HeroMetalScales;
