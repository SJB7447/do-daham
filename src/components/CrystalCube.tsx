import React, { useEffect, useRef } from 'react';

interface CrystalCubeProps {
  size: number;
  pfx: string;
  className?: string;
  interactive?: boolean;
}

interface FacetDef {
  pts: [[number, number], [number, number], [number, number]];
  c1: string;
  c2: string;
  normal: [number, number, number]; // 3D surface normal for sculpted relief shading
}

export function CrystalCube({ size, pfx, className = '', interactive = false }: CrystalCubeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointerRef = useRef({ x: 0.5, y: 0.35, tx: 0.5, ty: 0.35, active: false, tActive: 0 });

  const sc = size / 280;
  const V = {
    top: [140, 30],
    tr: [240, 88],
    br: [240, 202],
    bot: [140, 260],
    bl: [40, 202],
    tl: [40, 88],
    ctr: [140, 145],
    tfc: [140, 88],
    rfc: [190, 174],
    lfc: [90, 174]
  };

  useEffect(() => {
    if (!interactive) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr;
    canvas.height = size * dpr;

    const s = (pt: number[]): [number, number] => [pt[0] * sc, pt[1] * sc];
    const top = s(V.top);
    const tr = s(V.tr);
    const br = s(V.br);
    const bot = s(V.bot);
    const bl = s(V.bl);
    const tl = s(V.tl);
    const ctr = s(V.ctr);
    const tfc = s(V.tfc);
    const rfc = s(V.rfc);
    const lfc = s(V.lfc);

    // 12 sculpted diamond-cut facets with 3D surface normals (creates tangible relief & curvature)
    const facets: FacetDef[] = [
      // Top face (angled upward + sculpted pyramid relief)
      { pts: [top, tr, tfc], c1: '#FFF000', c2: '#C6FF00', normal: [0.28, -0.82, 0.5] },
      { pts: [tr, ctr, tfc], c1: '#FF8A00', c2: '#E02898', normal: [0.42, -0.58, 0.7] },
      { pts: [ctr, tl, tfc], c1: '#D020A0', c2: '#8028D8', normal: [-0.35, -0.62, 0.7] },
      { pts: [tl, top, tfc], c1: '#8C38C8', c2: '#D6FF00', normal: [-0.28, -0.85, 0.44] },
      // Right face (angled right + sculpted relief)
      { pts: [tr, br, rfc], c1: '#28C8F0', c2: '#18A0E0', normal: [0.85, -0.1, 0.52] },
      { pts: [br, bot, rfc], c1: '#18B8D0', c2: '#9ECC00', normal: [0.68, 0.45, 0.58] },
      { pts: [bot, ctr, rfc], c1: '#B6E020', c2: '#6090C0', normal: [0.45, 0.35, 0.82] },
      { pts: [ctr, tr, rfc], c1: '#5870C8', c2: '#32C0E0', normal: [0.62, -0.32, 0.72] },
      // Left face (angled left + deeper shadow relief)
      { pts: [tl, ctr, lfc], c1: '#8830D0', c2: '#5028C0', normal: [-0.62, -0.3, 0.72] },
      { pts: [ctr, bot, lfc], c1: '#4428C0', c2: '#1860C0', normal: [-0.45, 0.35, 0.82] },
      { pts: [bot, bl, lfc], c1: '#1870C0', c2: '#28B0D0', normal: [-0.68, 0.45, 0.58] },
      { pts: [bl, tl, lfc], c1: '#28A0C8', c2: '#7030D0', normal: [-0.85, -0.1, 0.52] }
    ];

    const tracePoly = (pts: [number, number][]) => {
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
      ctx.closePath();
    };

    let rafId = 0;

    const render = () => {
      const p = pointerRef.current;
      p.x += (p.tx - p.x) * 0.12;
      p.y += (p.ty - p.y) * 0.12;
      p.tActive += ((p.active ? 1 : 0) - p.tActive) * 0.12;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size, size);

      // 3D directional light vector controlled by cursor
      const lx = (p.x - 0.5) * 1.9;
      const ly = (p.y - 0.5) * 1.9 - 0.35;
      const lz = 1.0;
      const lLen = Math.hypot(lx, ly, lz);
      const L: [number, number, number] = [lx / lLen, ly / lLen, lz / lLen];

      const hueShift = Math.round(((p.x - 0.5) * 38 + (p.y - 0.5) * 24) * p.tActive);

      ctx.save();
      if (hueShift !== 0) {
        ctx.filter = `hue-rotate(${hueShift}deg) saturate(${1 + 0.18 * p.tActive})`;
      }

      // 1. Render each of the 12 facets with sculpted 3D bevel curvature & normal-based lighting
      for (const f of facets) {
        const [p0, p1, p2] = f.pts;
        const cxFacet = (p0[0] + p1[0] + p2[0]) / 3;
        const cyFacet = (p0[1] + p1[1] + p2[1]) / 3;

        // Dot product between facet 3D normal and cursor light direction
        const dot = Math.max(-0.5, Math.min(1, f.normal[0] * L[0] + f.normal[1] * L[1] + f.normal[2] * L[2]));

        tracePoly(f.pts);

        // Base color gradient
        const grad = ctx.createLinearGradient(p0[0], p0[1], p1[0], p1[1]);
        grad.addColorStop(0, f.c1);
        grad.addColorStop(1, f.c2);
        ctx.fillStyle = grad;
        ctx.fill();

        // Sculpted 3D curvature shading: inner highlight + soft edge falloff (rounded bevel feel)
        const rad = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) * 0.72;
        const curveGrad = ctx.createRadialGradient(
          cxFacet + L[0] * rad * 0.25,
          cyFacet + L[1] * rad * 0.25,
          rad * 0.05,
          cxFacet,
          cyFacet,
          rad
        );
        if (dot > 0.2) {
          curveGrad.addColorStop(0, `rgba(255,255,255,${(0.16 + dot * 0.26).toFixed(3)})`);
          curveGrad.addColorStop(0.65, 'rgba(255,255,255,0)');
          curveGrad.addColorStop(1, 'rgba(0,0,0,0.22)');
        } else {
          curveGrad.addColorStop(0, 'rgba(0,0,0,0.06)');
          curveGrad.addColorStop(0.65, 'rgba(0,0,0,0.18)');
          curveGrad.addColorStop(1, 'rgba(0,0,0,0.38)');
        }
        ctx.fillStyle = curveGrad;
        ctx.fill();
      }
      ctx.restore();

      // 2. Curved glossy glass dome highlight wrapping across the top & right faces
      ctx.save();
      tracePoly([top, tr, br, bot, bl, tl]);
      ctx.clip();

      const glossX = cxPos(size, p.x, 0.35);
      const glossY = cxPos(size, p.y, 0.25);
      const gloss = ctx.createRadialGradient(glossX, glossY, size * 0.02, glossX, glossY, size * 0.44);
      gloss.addColorStop(0, `rgba(255,255,255,${(0.28 + 0.16 * p.tActive).toFixed(2)})`);
      gloss.addColorStop(0.4, 'rgba(255,255,255,0.07)');
      gloss.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = gloss;
      ctx.fillRect(0, 0, size, size);

      // Soft ambient occlusion rim inside the hexagon silhouette for 3D thickness
      ctx.lineWidth = 10 * sc;
      ctx.strokeStyle = 'rgba(0,0,0,0.28)';
      tracePoly([top, tr, br, bot, bl, tl]);
      ctx.stroke();
      ctx.restore();

      // 3. Softly beveled 3D Y-ridges & outer rim
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Soft dark crease under ridges for relief depth
      ctx.lineWidth = 3.2 * sc;
      ctx.strokeStyle = 'rgba(0,0,0,0.22)';
      ctx.beginPath();
      ctx.moveTo(tl[0], tl[1]); ctx.lineTo(ctr[0], ctr[1]);
      ctx.moveTo(tr[0], tr[1]); ctx.lineTo(ctr[0], ctr[1]);
      ctx.moveTo(ctr[0], ctr[1]); ctx.lineTo(bot[0], bot[1]);
      ctx.stroke();

      // Specular bevel highlight on Y-ridges
      ctx.lineWidth = 1.4 * sc;
      ctx.strokeStyle = `rgba(255,255,255,${(0.45 + 0.25 * p.tActive).toFixed(2)})`;
      ctx.beginPath();
      ctx.moveTo(tl[0], tl[1]); ctx.lineTo(ctr[0], ctr[1]);
      ctx.moveTo(tr[0], tr[1]); ctx.lineTo(ctr[0], ctr[1]);
      ctx.moveTo(ctr[0], ctr[1]); ctx.lineTo(bot[0], bot[1]);
      ctx.stroke();

      // Outer crystal bevel rim
      ctx.lineWidth = 1.2 * sc;
      ctx.strokeStyle = `rgba(255,255,255,${(0.32 + 0.22 * p.tActive).toFixed(2)})`;
      tracePoly([top, tr, br, bot, bl, tl]);
      ctx.stroke();

      // Center vertex specular gleam
      const cg = ctx.createRadialGradient(ctr[0], ctr[1], 0, ctr[0], ctr[1], 9 * sc);
      cg.addColorStop(0, 'rgba(255,255,255,0.85)');
      cg.addColorStop(0.5, 'rgba(255,255,255,0.18)');
      cg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = cg;
      ctx.beginPath();
      ctx.arc(ctr[0], ctr[1], 9 * sc, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      const stillMoving =
        Math.abs(p.tx - p.x) > 0.002 ||
        Math.abs(p.ty - p.y) > 0.002 ||
        Math.abs((p.active ? 1 : 0) - p.tActive) > 0.005;

      if (stillMoving) {
        rafId = requestAnimationFrame(render);
      } else {
        rafId = 0;
      }
    };

    const kick = () => {
      if (!rafId) rafId = requestAnimationFrame(render);
    };

    render();

    const el = canvas.parentElement;
    el?.addEventListener('pointermove', kick);
    el?.addEventListener('pointerleave', kick);
    return () => {
      cancelAnimationFrame(rafId);
      el?.removeEventListener('pointermove', kick);
      el?.removeEventListener('pointerleave', kick);
    };
  }, [interactive, size, sc]);

  if (!interactive) {
    const p = (pts: number[][]) => pts.map(([x, y]) => `${(x * sc).toFixed(2)},${(y * sc).toFixed(2)}`).join(' ');
    const g = (n: number) => (n * sc).toFixed(2);
    const grads = [
      { id: `${pfx}t1`, x1: g(140), y1: g(30), x2: g(240), y2: g(88), c1: '#FFF000', c2: '#C6FF00' },
      { id: `${pfx}t2`, x1: g(240), y1: g(88), x2: g(140), y2: g(145), c1: '#FF8A00', c2: '#E02898' },
      { id: `${pfx}t3`, x1: g(140), y1: g(145), x2: g(40), y2: g(88), c1: '#D020A0', c2: '#8028D8' },
      { id: `${pfx}t4`, x1: g(40), y1: g(88), x2: g(140), y2: g(30), c1: '#8C38C8', c2: '#D6FF00' },
      { id: `${pfx}r1`, x1: g(240), y1: g(88), x2: g(190), y2: g(174), c1: '#28C8F0', c2: '#18A0E0' },
      { id: `${pfx}r2`, x1: g(240), y1: g(202), x2: g(140), y2: g(260), c1: '#18B8D0', c2: '#9ECC00' },
      { id: `${pfx}r3`, x1: g(140), y1: g(260), x2: g(190), y2: g(174), c1: '#B6E020', c2: '#6090C0' },
      { id: `${pfx}r4`, x1: g(140), y1: g(145), x2: g(240), y2: g(88), c1: '#5870C8', c2: '#32C0E0' },
      { id: `${pfx}l1`, x1: g(40), y1: g(88), x2: g(140), y2: g(145), c1: '#8830D0', c2: '#5028C0' },
      { id: `${pfx}l2`, x1: g(140), y1: g(145), x2: g(140), y2: g(260), c1: '#4428C0', c2: '#1860C0' },
      { id: `${pfx}l3`, x1: g(140), y1: g(260), x2: g(40), y2: g(202), c1: '#1870C0', c2: '#28B0D0' },
      { id: `${pfx}l4`, x1: g(40), y1: g(202), x2: g(40), y2: g(88), c1: '#28A0C8', c2: '#7030D0' },
    ];
    const { top, tr, br, bot, bl, tl, ctr, tfc, rfc, lfc } = V;
    const tris = [
      { pts: p([top, tr, tfc]), gid: `${pfx}t1` },
      { pts: p([tr, ctr, tfc]), gid: `${pfx}t2` },
      { pts: p([ctr, tl, tfc]), gid: `${pfx}t3` },
      { pts: p([tl, top, tfc]), gid: `${pfx}t4` },
      { pts: p([tr, br, rfc]), gid: `${pfx}r1` },
      { pts: p([br, bot, rfc]), gid: `${pfx}r2` },
      { pts: p([bot, ctr, rfc]), gid: `${pfx}r3` },
      { pts: p([ctr, tr, rfc]), gid: `${pfx}r4` },
      { pts: p([tl, ctr, lfc]), gid: `${pfx}l1` },
      { pts: p([ctr, bot, lfc]), gid: `${pfx}l2` },
      { pts: p([bot, bl, lfc]), gid: `${pfx}l3` },
      { pts: p([bl, tl, lfc]), gid: `${pfx}l4` },
    ];
    const sw = sc.toFixed(2);
    const sw2 = (sc * 0.8).toFixed(2);

    return (
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} className={`crystal-svg ${className}`} aria-hidden="true">
        <defs>
          {grads.map(grad => (
            <linearGradient key={grad.id} id={grad.id} gradientUnits="userSpaceOnUse" x1={grad.x1} y1={grad.y1} x2={grad.x2} y2={grad.y2}>
              <stop offset="0%" stopColor={grad.c1} />
              <stop offset="100%" stopColor={grad.c2} />
            </linearGradient>
          ))}
        </defs>
        {tris.map((t, idx) => (
          <polygon key={idx} points={t.pts} fill={`url(#${t.gid})`} />
        ))}
        <polygon points={p([top, tr, br, bot, bl, tl])} fill="none" stroke="rgba(255,255,255,.30)" strokeWidth={sw} />
        <line x1={g(140)} y1={g(30)} x2={g(140)} y2={g(145)} stroke="rgba(255,255,255,.15)" strokeWidth={sw2} />
        <line x1={g(240)} y1={g(88)} x2={g(90)} y2={g(174)} stroke="rgba(255,255,255,.15)" strokeWidth={sw2} />
        <line x1={g(40)} y1={g(88)} x2={g(190)} y2={g(174)} stroke="rgba(255,255,255,.15)" strokeWidth={sw2} />
      </svg>
    );
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    pointerRef.current.tx = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    pointerRef.current.ty = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    pointerRef.current.active = true;
  };

  const handlePointerLeave = () => {
    pointerRef.current.tx = 0.5;
    pointerRef.current.ty = 0.35;
    pointerRef.current.active = false;
  };

  return (
    <div
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className="cursor-pointer inline-block"
    >
      <canvas
        ref={canvasRef}
        style={{ width: size, height: size }}
        className={`crystal-svg block ${className}`}
        aria-hidden="true"
      />
    </div>
  );
}

function cxPos(size: number, norm: number, fallback: number): number {
  return size * (0.2 + norm * 0.6) * 0.8 + size * fallback * 0.2;
}
