import { useEffect, type RefObject } from "react";
import * as THREE from "three";
import continentSphere from "./continentSphere.json";

/**
 * Interactive hero visual for the ClanClast Health landing page.
 *
 * Same interaction model as the original ClanClast prototype:
 *  - Nodes connected to their two nearest neighbours form a network mesh.
 *  - Reacts to the cursor: nearby nodes are pushed away and spring back
 *    (the "giggle"/bounce), damped as the user scrolls.
 *  - As the hero section is scrolled through, the point cloud morphs
 *    smoothly into a standing human figure.
 *
 * The one change from the original: instead of an even Fibonacci
 * distribution, the 620 base node positions are sampled from real landmass
 * coordinates (public-domain Natural Earth data, baked into
 * continentSphere.json), so the resting sphere reads as continents rather
 * than a uniform dot field. Everything else — mesh, bounce, morph, colours —
 * is unchanged.
 */

const PRIMARY_TEAL = 0x145c52; // matches --primary exactly (dark bg no longer needs the brightened variant)
const PRIMARY_TEAL_COOL = 0x2f8c78; // the "settled" tone the material eases toward once morphed into a person
const HEARTBEAT_GLOW = 0x8fd9c4; // soft mint used for the central pulsing glow

// The globe is pushed back slightly (smaller, further away) so the two-line
// wordmark reads clearly inside its silhouette instead of overwhelming it.
// continentSphere.json was baked at R=2.35, so its coordinates are rescaled
// at load time to this target radius.
const TARGET_R = 2.55;

export interface NetworkSphereHandles {
  canvasRef: RefObject<HTMLCanvasElement>;
  sectionRef: RefObject<HTMLDivElement>;
  titleRef: RefObject<HTMLDivElement>;
  captionRef: RefObject<HTMLDivElement>;
  progressRef: RefObject<HTMLDivElement>;
}

export function useNetworkSphereScene(handles: NetworkSphereHandles) {
  const { canvasRef, sectionRef, titleRef, captionRef, progressRef } = handles;

  useEffect(() => {
    const canvas = canvasRef.current;
    const heroSection = sectionRef.current;
    if (!canvas || !heroSection) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let width = window.innerWidth;
    let height = window.innerHeight;

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
    camera.position.set(0, 0, 7.7); // pushed back so the smaller globe sits comfortably behind the title

    const group = new THREE.Group();
    scene.add(group);

    // ---- glow sprite texture (soft-edged dot, alpha fades to transparent) ----
    function makeGlowTexture(hex: number, opaqueCore = true) {
      const size = 128;
      const c = document.createElement("canvas");
      c.width = c.height = size;
      const ctx = c.getContext("2d")!;
      const color = new THREE.Color(hex);
      const r = Math.round(color.r * 255), g = Math.round(color.g * 255), b = Math.round(color.b * 255);
      const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
      if (opaqueCore) {
        grad.addColorStop(0, `rgba(${r},${g},${b},1)`);
        grad.addColorStop(0.55, `rgba(${r},${g},${b},0.85)`);
        grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
      } else {
        grad.addColorStop(0, `rgba(${r},${g},${b},0.9)`);
        grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
      }
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);
      return new THREE.CanvasTexture(c);
    }
    const glowTex = makeGlowTexture(PRIMARY_TEAL);
    const heartbeatTex = makeGlowTexture(HEARTBEAT_GLOW, false);

    // ---- node count & base positions (continents, not an even distribution) ----
    const COUNT: number = continentSphere.count;
    const spherePositions = new Float32Array(continentSphere.sphere);
    // continentSphere.json was baked at continentSphere.R; rescale to TARGET_R
    // so the resting globe is bigger without re-baking the dataset.
    const scaleFactor = TARGET_R / continentSphere.R;
    for (let i = 0; i < spherePositions.length; i++) spherePositions[i] *= scaleFactor;

    // ---- humanoid figure target positions (patient journey motif) ----
    function sampleHuman(n: number) {
      const pts: [number, number, number][] = [];
      const rand = (a: number, b: number) => a + Math.random() * (b - a);
      const regions: { w: number; fn: () => [number, number, number] }[] = [
        { w: 0.14, fn: () => { const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * 0.42; return [Math.cos(a) * r, 3.15 + Math.sin(a) * r * 1.15, rand(-0.35, 0.35)]; } },
        { w: 0.34, fn: () => { const t = Math.random(); const yy = 2.55 - t * 1.7; const wob = 0.62 - Math.abs(t - 0.45) * 0.35; return [rand(-wob, wob), yy, rand(-0.3, 0.3)]; } },
        { w: 0.16, fn: () => { const t = Math.random(); const sx = -0.65, sy = 2.45, ex = -1.15, ey = 1.05; return [sx + (ex - sx) * t + rand(-0.09, 0.09), sy + (ey - sy) * t + rand(-0.09, 0.09), rand(-0.22, 0.22)]; } },
        { w: 0.16, fn: () => { const t = Math.random(); const sx = 0.65, sy = 2.45, ex = 1.15, ey = 1.05; return [sx + (ex - sx) * t + rand(-0.09, 0.09), sy + (ey - sy) * t + rand(-0.09, 0.09), rand(-0.22, 0.22)]; } },
        { w: 0.10, fn: () => { const t = Math.random(); return [-0.32 + rand(-0.08, 0.08), 0.85 - t * 2.1, rand(-0.25, 0.25)]; } },
        { w: 0.10, fn: () => { const t = Math.random(); return [0.32 + rand(-0.08, 0.08), 0.85 - t * 2.1, rand(-0.25, 0.25)]; } },
      ];
      for (let i = 0; i < n; i++) {
        let r = Math.random(), acc = 0, chosen = regions[0];
        for (const reg of regions) { acc += reg.w; if (r <= acc) { chosen = reg; break; } }
        pts.push(chosen.fn());
      }
      return pts;
    }
    const humanPts = sampleHuman(COUNT);
    const humanPositions = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      humanPositions[i * 3] = humanPts[i][0] * 0.98;
      humanPositions[i * 3 + 1] = humanPts[i][1] * 0.98 - 0.9;
      humanPositions[i * 3 + 2] = humanPts[i][2];
    }

    // ---- live buffers ----
    const livePositions = new Float32Array(spherePositions);
    const bounceOffset = new Float32Array(COUNT * 3);
    const bounceVel = new Float32Array(COUNT * 3);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(livePositions, 3));

    const material = new THREE.PointsMaterial({
      size: 0.24, // bumped up further; on a light background dots need a touch more presence
      map: glowTex,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending, // switched from additive: additive washes out against a light backdrop
      color: new THREE.Color(PRIMARY_TEAL),
    });
    const points = new THREE.Points(geometry, material);
    group.add(points);

    // ---- connecting lines (nearest neighbours within each landmass) ----
    const lineIdx: number[] = [];
    {
      const k = 2;
      for (let i = 0; i < COUNT; i++) {
        const dists: [number, number][] = [];
        const xi = spherePositions[i * 3], yi = spherePositions[i * 3 + 1], zi = spherePositions[i * 3 + 2];
        for (let j = 0; j < COUNT; j++) {
          if (i === j) continue;
          const dx = spherePositions[j * 3] - xi, dy = spherePositions[j * 3 + 1] - yi, dz = spherePositions[j * 3 + 2] - zi;
          dists.push([dx * dx + dy * dy + dz * dz, j]);
        }
        dists.sort((a, b) => a[0] - b[0]);
        for (let m = 0; m < k; m++) lineIdx.push(i, dists[m][1]);
      }
    }
    const linePositions = new Float32Array(lineIdx.length * 3);
    const lineGeometry = new THREE.BufferGeometry();
    lineGeometry.setAttribute("position", new THREE.BufferAttribute(linePositions, 3));
    const lineMaterial = new THREE.LineBasicMaterial({ color: PRIMARY_TEAL_COOL, transparent: true, opacity: 0.16, blending: THREE.NormalBlending });
    const lines = new THREE.LineSegments(lineGeometry, lineMaterial);
    group.add(lines);

    // ---- central "heartbeat" glow: a soft pulse in the middle of the globe ----
    const heartbeatMat = new THREE.SpriteMaterial({
      map: heartbeatTex,
      color: new THREE.Color(HEARTBEAT_GLOW),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      opacity: 0.5,
    });
    const heartbeatSprite = new THREE.Sprite(heartbeatMat);
    heartbeatSprite.position.set(0, 0, 0);
    const HEARTBEAT_BASE_SCALE = TARGET_R * 0.62;
    heartbeatSprite.scale.set(HEARTBEAT_BASE_SCALE, HEARTBEAT_BASE_SCALE, 1);
    scene.add(heartbeatSprite); // added to scene (not group) so it stays perfectly centred regardless of globe rotation

    // Two-bump "lub-dub" waveform, repeating on a ~1.1s cycle, then resting
    // until the next beat — the same rhythm as a resting pulse.
    function heartbeatPulse(tSeconds: number) {
      const period = 1.1;
      const phase = (tSeconds % period) / period; // 0..1
      const bump = (center: number, width: number, height: number) => {
        const d = (phase - center) / width;
        return height * Math.exp(-d * d);
      };
      return bump(0.05, 0.045, 1) + bump(0.17, 0.055, 0.55);
    }

    function updateLines() {
      for (let n = 0; n < lineIdx.length; n++) {
        const idx = lineIdx[n];
        linePositions[n * 3] = livePositions[idx * 3] + bounceOffset[idx * 3];
        linePositions[n * 3 + 1] = livePositions[idx * 3 + 1] + bounceOffset[idx * 3 + 1];
        linePositions[n * 3 + 2] = livePositions[idx * 3 + 2] + bounceOffset[idx * 3 + 2];
      }
      lineGeometry.attributes.position.needsUpdate = true;
    }

    // ---- mouse tracking ----
    const mouse = new THREE.Vector2(-10, -10);
    let mouseActive = false;
    const onPointerMove = (e: PointerEvent) => {
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
      mouseActive = true;
    };
    const onPointerLeave = () => { mouseActive = false; };
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerleave", onPointerLeave);

    const projected = new THREE.Vector3();

    // ---- scroll progress across the hero section ----
    let scrollT = 0;
    function computeScroll() {
      if (!heroSection) return;
      const rect = heroSection.getBoundingClientRect();
      const total = heroSection.offsetHeight - window.innerHeight;
      const scrolled = -rect.top;
      scrollT = total > 0 ? Math.min(1, Math.max(0, scrolled / total)) : 0;
    }
    const onScroll = () => computeScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    computeScroll();

    const onResize = () => {
      width = window.innerWidth; height = window.innerHeight;
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      computeScroll();
    };
    window.addEventListener("resize", onResize);

    let rafId = 0;
    let t0 = performance.now();
    let idleAngle = 0;

    function frame() {
      rafId = requestAnimationFrame(frame);
      const now = performance.now();
      const dt = Math.min(0.05, (now - t0) / 1000);
      t0 = now;

      computeScroll();
      const easedT = scrollT * scrollT * (3 - 2 * scrollT); // smoothstep

      // morph sphere -> human
      for (let i = 0; i < COUNT; i++) {
        livePositions[i * 3] = spherePositions[i * 3] + (humanPositions[i * 3] - spherePositions[i * 3]) * easedT;
        livePositions[i * 3 + 1] = spherePositions[i * 3 + 1] + (humanPositions[i * 3 + 1] - spherePositions[i * 3 + 1]) * easedT;
        livePositions[i * 3 + 2] = spherePositions[i * 3 + 2] + (humanPositions[i * 3 + 2] - spherePositions[i * 3 + 2]) * easedT;
      }

      // slow idle rotation, fades out as it becomes a figure. Respect
      // prefers-reduced-motion by freezing the continuous parts while still
      // allowing the scroll-linked morph, which is driven by user action.
      if (!prefersReducedMotion) {
        idleAngle += dt * 0.12 * (1 - easedT * 0.85);
      }
      group.rotation.y = idleAngle + (mouse.x * 0.35 - group.rotation.y * 0.02) * 0.02;
      group.rotation.x += ((-mouse.y * 0.18) - group.rotation.x) * 0.03;

      // cursor bounce / giggle (only meaningful while still sphere-ish)
      const bounceStrength = prefersReducedMotion ? 0 : (1 - easedT * 0.9);
      for (let i = 0; i < COUNT; i++) {
        const wx = livePositions[i * 3], wy = livePositions[i * 3 + 1], wz = livePositions[i * 3 + 2];
        projected.set(wx, wy, wz).applyMatrix4(group.matrix);
        projected.project(camera);

        let fx = 0, fy = 0, fz = 0;
        if (mouseActive && bounceStrength > 0) {
          const dx = projected.x - mouse.x;
          const dy = projected.y - mouse.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          const radius = 0.28;
          if (d < radius) {
            const force = (1 - d / radius) * 0.9 * bounceStrength;
            fx = dx * force;
            fy = dy * force;
            fz = (Math.random() - 0.5) * force * 0.4;
          }
        }
        bounceVel[i * 3] += (fx - bounceOffset[i * 3]) * 0.22;
        bounceVel[i * 3 + 1] += (fy - bounceOffset[i * 3 + 1]) * 0.22;
        bounceVel[i * 3 + 2] += (fz - bounceOffset[i * 3 + 2]) * 0.22;
        bounceVel[i * 3] *= 0.82; bounceVel[i * 3 + 1] *= 0.82; bounceVel[i * 3 + 2] *= 0.82;
        bounceOffset[i * 3] += bounceVel[i * 3];
        bounceOffset[i * 3 + 1] += bounceVel[i * 3 + 1];
        bounceOffset[i * 3 + 2] += bounceVel[i * 3 + 2];
      }

      const posAttr = geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < COUNT; i++) {
        posAttr.array[i * 3] = livePositions[i * 3] + bounceOffset[i * 3];
        posAttr.array[i * 3 + 1] = livePositions[i * 3 + 1] + bounceOffset[i * 3 + 1];
        posAttr.array[i * 3 + 2] = livePositions[i * 3 + 2] + bounceOffset[i * 3 + 2];
      }
      posAttr.needsUpdate = true;
      updateLines();

      // heartbeat glow: pulses on its own rhythm, fading out as the globe
      // dissolves into the patient figure
      const beat = heartbeatPulse(now / 1000);
      const heartbeatFade = 1 - easedT;
      heartbeatSprite.scale.setScalar(HEARTBEAT_BASE_SCALE * (1 + beat * 0.5));
      heartbeatMat.opacity = (0.28 + beat * 0.34) * heartbeatFade;

      // material eases from the bright active teal toward the cooler settled
      // tone as the sphere becomes a person
      const settled = new THREE.Color(PRIMARY_TEAL).lerp(new THREE.Color(PRIMARY_TEAL_COOL), easedT * 0.6);
      material.color.copy(settled);
      lineMaterial.opacity = 0.16 * (1 - easedT * 0.7);

      if (titleRef.current) {
        titleRef.current.style.opacity = String(1 - easedT * 1.3);
        titleRef.current.style.transform = `translate(-50%,-50%) scale(${1 - easedT * 0.25}) translateY(${-easedT * 40}px)`;
      }
      if (captionRef.current) {
        captionRef.current.style.opacity = String(easedT > 0.55 ? Math.min(1, (easedT - 0.55) / 0.35) : 0);
      }
      if (progressRef.current) {
        progressRef.current.textContent = "SCROLL — " + String(Math.round(easedT * 100)).padStart(3, "0");
      }

      renderer.render(scene, camera);
    }
    frame();

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerleave", onPointerLeave);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      geometry.dispose();
      material.dispose();
      lineGeometry.dispose();
      lineMaterial.dispose();
      glowTex.dispose();
      heartbeatTex.dispose();
      heartbeatMat.dispose();
      renderer.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
