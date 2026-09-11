import {random} from './expedition.ts';
export type Growth={xp:number;power:number;luck:number;bags:number[]};
export type Settlement={before:number;target:number;rewards:number[][]};
export const freshGrowth=():Growth=>({xp:0,power:0,luck:0,bags:[]});
export function progress(xp:number){let level=1,spent=0,needed=500;while(xp>=spent+needed){spent+=needed;level++;needed=500+(level-1)*250;}return{level,current:xp-spent,needed};}
export const points=(g:Growth)=>progress(g.xp).level-1-g.power-g.luck;
export const powerMultiplier=(power:number,weight:number)=>1+power*.12*Math.min(1,weight/8);
export function bagReward(seed:number,stage:number,id:number,luck:number){
  const roll=random((seed^Math.imul(stage+1,0x9e3779b9)^Math.imul(id+1,0x85ebca6b))>>>0)();
  // One immutable draw per bag: luck improves its tier, never the draw itself.
  if(roll<Math.min(.25,.05+luck*.02))return 800;
  if(roll<Math.min(.75,.30+luck*.05))return 500;
  return 300;
}
