export type RouteKind='gold'|'crystal'|'ruins'|'danger';
export type Mineral=[number,number,number,'gold'|'rock'|'diamond'|'bag',number,number];
export type Route={id:RouteKind;name:string;description:string;target:number;seconds:number;background:number};
export const STAGES=5;
export const SHOP={bombPrice:150,potionPrice:300,maxBombs:3};
const DESCRIPTIONS={
  gold:{name:'富金矿区',description:'大金块丰富 · 回收较慢',seconds:65,background:0,extra:0},
  crystal:{name:'水晶矿脉',description:'钻石较多 · 瞄准要求高',seconds:60,background:2,extra:150},
  ruins:{name:'遗迹矿区',description:'福袋丰富 · 拉回即开 · 个人运气加成',seconds:70,background:4,extra:0},
  danger:{name:'危险矿洞',description:'岩石较多 · 黄金价值 +25%',seconds:60,background:3,extra:250},
};
export function random(seed:number){let state=seed>>>0;return()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};}
export function routes(seed:number,stage:number):Route[]{
  const rng=random(seed+stage*9187),other:RouteKind[]=['gold','crystal','danger'];
  for(let i=other.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[other[i],other[j]]=[other[j],other[i]];}
  return ['ruins',other[0],other[1]].map(id=>{const kind=id as RouteKind,d=DESCRIPTIONS[kind];return{id:kind,...d,target:[1200,2500,3900,5400,7200][stage]+d.extra};});
}
export function minerals(seed:number,stage:number,kind:RouteKind):Mineral[]{
  const rng=random(seed+stage*413+['gold','crystal','ruins','danger'].indexOf(kind)*913);
  const slots=kind==='ruins'?[[110,230],[890,230],[130,355],[870,355],[260,410],[740,410],[400,420],[600,420],[95,435],[905,435]]:
    [[160,200],[390,195],[610,195],[840,200],[100,300],[300,310],[500,310],[700,310],[900,300],[160,425],[385,430],[615,430],[840,425]];
  const result:Mineral[]=slots.map(([x,y],i)=>{
    const dx=Math.round((rng()-.5)*20),dy=Math.round((rng()-.5)*14);
    let type:'gold'|'rock'|'diamond'=i%4===0?'rock':i%3===0?'diamond':'gold';
    if(kind==='crystal'&&i%2===1)type='diamond';
    if(kind==='danger'&&i%3===0)type='rock';
    if(kind==='gold'&&type==='diamond')type='gold';
    if(type==='rock')return[x+dx,y+dy,24,type,20,7];
    if(type==='diamond')return[x+dx,y+dy,13,type,600,2];
    const large=i%2===0||kind==='gold';return[x+dx,y+dy,large?37:28,type,Math.round((large?500:250)*(kind==='danger'?1.25:1)),large?9:8];
  });
  const bags=kind==='ruins'?[[350,250],[650,250],[450,345],[550,345]]:[[240,360],[760,360]];
  for(const [x,y] of bags)result.push([x+Math.round((rng()-.5)*14),y,22,'bag',0,4]);
  return result;
}
