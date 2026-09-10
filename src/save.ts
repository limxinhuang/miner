export const SAVE_KEY = 'gold-digger-progress-v1';
export type Checkpoint = {wallet:number;total:number;bombs:number;strength:boolean};
export type Save = {version:1;kind:'level'|'shop';levelIndex:number;checkpoint:Checkpoint;potion:boolean;score:number;contributions?:[number,number]};
export function parseSave(raw:string|null):Save|null {
  try {
    const s=JSON.parse(raw??'null');
    if(!s||s.version!==1||!['level','shop'].includes(s.kind)||!Number.isInteger(s.levelIndex)||s.levelIndex<0||s.levelIndex>4||(s.kind==='shop'&&s.levelIndex===4))return null;
    const c=s.checkpoint;
    if(!c||!Number.isSafeInteger(c.wallet)||c.wallet<0||!Number.isSafeInteger(c.total)||c.total<c.wallet||!Number.isInteger(c.bombs)||c.bombs<0||c.bombs>3||typeof c.strength!=='boolean'||typeof s.potion!=='boolean'||!Number.isSafeInteger(s.score)||s.score<0||s.score>c.total)return null;
    if(s.contributions!==undefined&&(!Array.isArray(s.contributions)||s.contributions.length!==2||s.contributions.some((n:unknown)=>!Number.isSafeInteger(n)||Number(n)<0)||s.contributions[0]+s.contributions[1]!==s.score))return null;
    return {version:1,kind:s.kind,levelIndex:s.levelIndex,checkpoint:{wallet:c.wallet,total:c.total,bombs:c.bombs,strength:c.strength},potion:s.potion,score:s.score,...(s.contributions?{contributions:s.contributions}:{})};
  }catch{return null;}
}
export function saveKey(coop=false){return coop?'gold-digger-coop-progress-v1':SAVE_KEY;}
export function readSave(coop=false):Save|null {try{return parseSave(localStorage.getItem(saveKey(coop)));}catch{return null;}}
export function writeSave(save:Save,coop=false):boolean {try{localStorage.setItem(saveKey(coop),JSON.stringify(save));return true;}catch{return false;}}
export function clearSave(coop=false){try{localStorage.removeItem(saveKey(coop));}catch{}}
