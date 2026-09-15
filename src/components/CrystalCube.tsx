export function CrystalCube({ size, pfx }: { size: number; pfx: string }) {
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
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} className="crystal-svg">
      <defs>
        {grads.map(g => (
          <linearGradient key={g.id} id={g.id} gradientUnits="userSpaceOnUse" x1={g.x1} y1={g.y1} x2={g.x2} y2={g.y2}>
            <stop offset="0%" stopColor={g.c1} />
            <stop offset="100%" stopColor={g.c2} />
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
