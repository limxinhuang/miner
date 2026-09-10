import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const executablePath=['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(p=>fs.existsSync(p));
const browser=await chromium.launch({executablePath,headless:true});
try{
const page=await browser.newPage({viewport:{width:1440,height:1100}});const errors=[],missing=[];
page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.url().includes('/assets/')&&r.status()>=400)missing.push(r.url());});
await page.goto('http://127.0.0.1:5173');await page.waitForFunction(()=>window.__miner?.scene.getScene('mine')?.players?.length>0);
const run=fn=>page.evaluate(fn);await page.locator('#mode-coop').click();await page.locator('#action').click();
const textures=await run(()=>window.__miner.textures.getTextureKeys());
assert.equal(textures.filter(t=>/^(bg_|miner_|claw_|ore_|winch_|item_|fx_)/.test(t)).length,25);
await page.screenshot({path:'analysis/qa/hd-coop.png',fullPage:true});
for(let i=0;i<5;i++){
  await page.evaluate(i=>{const s=window.__miner.scene.getScene('mine');s.levelIndex=i;s.startLevel();},i);
  const key=await run(()=>window.__miner.scene.getScene('mine').sky.texture.key);assert.ok(key.startsWith('bg_0'+(i+1)));
  await page.waitForTimeout(50);await page.locator('#game').screenshot({path:`analysis/qa/hd-level-${i+1}.png`});
}
await run(()=>{const s=window.__miner.scene.getScene('mine');s.start();window.__miner.loop.sleep();s.players.forEach((p,i)=>{p.caught=s.ores[i];p.caught.active=false;p.mode='back';p.length=200;});s.update(0,16);});
assert.deepEqual(await run(()=>window.__miner.scene.getScene('mine').players.map(p=>p.minerArt.texture.key)),['miner_p1_pull','miner_p2_pull']);
await run(()=>{const s=window.__miner.scene.getScene('mine');s.players[0].score=700;s.players[1].score=700;s.score=1400;s.finish();});
assert.deepEqual(await run(()=>window.__miner.scene.getScene('mine').players.map(p=>p.minerArt.texture.key)),['miner_p1_win','miner_p2_win']);
await page.locator('#action').click();await run(()=>window.__miner.loop.wake());await page.waitForTimeout(100);await page.screenshot({path:'analysis/qa/hd-shop.png',fullPage:true});
assert.equal(await page.locator('.shop .item-icon').evaluateAll(els=>els.every(e=>e.complete&&e.naturalWidth>0)),true);
assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);console.log('PASS: 25 textures, all five backgrounds, two player pose sets, shop icons, no missing assets or runtime errors.');
}finally{await browser.close();}
