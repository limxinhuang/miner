import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const executablePath=['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(p=>fs.existsSync(p));
const browser=await chromium.launch({executablePath,headless:true});
try{
const page=await browser.newPage();await page.goto('http://127.0.0.1:5173');await page.waitForSelector('canvas');await page.waitForFunction(()=>window.__miner?.scene.getScene('mine')?.players?.length>0);
const results=await page.evaluate(()=>{
  const game=window.__miner;game.loop.sleep();const s=game.scene.getScene('mine');const results=[];
  for(const coop of [false,true]){s.chooseMode(coop);for(let level=0;level<5;level++){
    s.start();s.levelIndex=level;s.strength=false;s.startLevel();const targets=[];
    for(let frame=0;frame<5000&&s.phase==='playing';frame++){
      for(const p of s.players){if(p.mode==='swing'){
        let target=targets[p.index];if(target&&!target.o.active)target=undefined;
        if(!target){
          const candidates=s.ores.filter(o=>o.active).map(o=>{
            const dx=o.x-p.origin.x,dy=o.y-p.origin.y,d=Math.hypot(dx,dy),angle=Math.atan2(dx,dy);
            const blocked=s.ores.some(other=>{if(other===o||!other.active)return false;const projection=((other.x-p.origin.x)*dx+(other.y-p.origin.y)*dy)/d;const cross=Math.abs((other.x-p.origin.x)*dy-(other.y-p.origin.y)*dx)/d;return projection>28&&projection<d-o.r&&cross<other.r+5;});
            const wait=(p.direction*(angle-p.angle)>=0?Math.abs(angle-p.angle):Math.abs(p.direction*1.27-p.angle)+Math.abs(p.direction*1.27-angle))/1.15;
            return {o,angle,blocked,utility:o.value/(wait+d/440+d/(390/(1+o.weight*.48)))};
          }).filter(c=>!c.blocked&&Math.abs(c.angle)<=1.27).sort((a,b)=>b.utility-a.utility);
          target=candidates[0];
        }
        if(target&&Math.abs(p.angle-target.angle)<.012){s.trigger(p.index);target=undefined;}targets[p.index]=target;
      }}
      s.update(0,16);
    }
    results.push({mode:coop?'coop':'solo',level:level+1,target:s.level.target,score:s.score,passed:s.score>=s.level.target});
  }}
  return results;
});
fs.writeFileSync('analysis/qa/balance.json',JSON.stringify({method:'Deterministic greedy aiming through normal swing and update; no bombs or potion. This is a feasibility check, not a human difficulty assessment.',results},null,2));
console.log(JSON.stringify(results));assert.ok(results.every(r=>r.passed),'Each level must be achievable without purchasing items.');
}finally{await browser.close();}
