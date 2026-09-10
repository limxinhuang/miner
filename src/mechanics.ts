export type Point = { x: number; y: number };
// Swept segment test prevents a fast hook skipping a small mineral between frames.
export function segmentHitsCircle(a: Point, b: Point, c: Point, radius: number): boolean {
  const dx=b.x-a.x, dy=b.y-a.y, length=dx*dx+dy*dy;
  const t=length ? Math.max(0,Math.min(1,((c.x-a.x)*dx+(c.y-a.y)*dy)/length)) : 0;
  return (a.x+t*dx-c.x)**2+(a.y+t*dy-c.y)**2<=radius*radius;
}
export function pullSpeed(weight: number): number { return 390 / (1 + weight * .48); }
