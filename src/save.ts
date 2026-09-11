import {minerals,routes,type RouteKind} from './expedition.ts';
import {points,type Growth,type Settlement} from './growth.ts';
export const SAVE_KEY='gold-digger-expedition-v2';
export type PlayerSave={mode:'swing'|'out'|'back';angle:number;direction:number;length:number;score:number;caught:number|null};
export type Save={version:2;seed:number;stage:number;phase:'route'|'playing'|'shop'|'settlement';wallet:number;bombs:number;potion:boolean;strength:boolean;remaining:number;selected:RouteKind|null;votes:[RouteKind|null,RouteKind|null];history:RouteKind[];players:PlayerSave[];active:boolean[];growth:Growth[];settlement:Settlement|null};
const kinds=['gold','crystal','ruins','danger'];
const num=(x:unknown,lo:number,hi:number)=>typeof x==='number'&&Number.isFinite(x)&&x>=lo&&x<=hi;
const int=(x:unknown,lo:number,hi:number)=>num(x,lo,hi)&&Number.isInteger(x);
export function parseSave(raw:string|null):Save|null{
 try{
  const s=JSON.parse(raw??'null');
  if(!s||s.version!==2||!int(s.seed,0,4294967295)||!int(s.stage,0,4)||!['route','playing','shop','settlement'].includes(s.phase)||!int(s.wallet,0,1000000)||!int(s.bombs,0,3)||typeof s.potion!=='boolean'||typeof s.strength!=='boolean'||!num(s.remaining,0,70))return null;
  const choices=routes(s.seed,s.stage);
  if(!Array.isArray(s.history)||s.history.length!==s.stage||s.history.some((k:unknown)=>!kinds.includes(String(k)))||!Array.isArray(s.votes)||s.votes.length!==2||s.votes.some((k:RouteKind|null)=>k!==null&&!choices.some(r=>r.id===k)))return null;
  const mining=s.phase==='playing',settling=s.phase==='settlement',route=choices.find(r=>r.id===s.selected);
  if((mining||settling)?!route:s.selected!==null)return null;
  if(!Array.isArray(s.players)||s.players.length!==2||!Array.isArray(s.active)||!Array.isArray(s.growth)||s.growth.length!==2)return null;
  const layout=s.selected?minerals(s.seed,s.stage,s.selected):[];
  if(mining?(s.active.length!==layout.length||s.active.some((v:unknown)=>typeof v!=='boolean')):s.active.length!==0)return null;
  const owned=new Set<number>();
  for(const p of s.players){
   if(!p||!['swing','out','back'].includes(p.mode)||!num(p.angle,-Math.PI,Math.PI)||![1,-1].includes(p.direction)||!num(p.length,0,1200)||!int(p.score,0,1000000))return null;
   if(p.caught!==null){if(!mining||p.mode!=='back'||!int(p.caught,0,layout.length-1)||s.active[p.caught]||owned.has(p.caught))return null;owned.add(p.caught);}
  }
  for(const g of s.growth){
   if(!g||!int(g.xp,0,1000000)||!int(g.power,0,100)||!int(g.luck,0,100)||points(g)<0||!Array.isArray(g.bags))return null;
   if(!mining&&g.bags.length)return null;
   for(const id of g.bags){if(!int(id,0,layout.length-1)||layout[id][3]!=='bag'||s.active[id]||owned.has(id))return null;owned.add(id);}
  }
  if(settling){
   const r=s.settlement;if(!r||!int(r.before,0,1000000)||r.target!==route!.target||!Array.isArray(r.rewards)||r.rewards.length!==2)return null;
   if(r.rewards.some((a:unknown)=>!Array.isArray(a)||a.some(v=>![300,500,800].includes(v))))return null;
   if(r.rewards.flat().length>layout.filter(o=>o[3]==='bag').length||r.before+r.rewards.flat().reduce((a:number,b:number)=>a+b,0)!==s.wallet)return null;
  }else if(s.settlement!==null)return null;
  return s as Save;
 }catch{return null;}
}
export function readSave(){try{return parseSave(localStorage.getItem(SAVE_KEY));}catch{return null;}}
export function writeSave(save:Save){try{localStorage.setItem(SAVE_KEY,JSON.stringify(save));return true;}catch{return false;}}
export function clearSave(){try{localStorage.removeItem(SAVE_KEY);}catch{}}
