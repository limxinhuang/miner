import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const executablePath=['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(p=>fs.existsSync(p));
const browser=await chromium.launch({executablePath,headless:true});
try{
  const page=await browser.newPage({viewport:{width:1440,height:1100}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:5173');await page.waitForSelector('canvas');await page.waitForFunction(()=>window.__miner?.scene.getScene('mine')?.players?.length>0);
  await page.locator('#action').click();await page.evaluate(()=>window.__miner.loop.sleep());
  const run=fn=>page.evaluate(fn);
  await run(()=>{const s=window.__miner.scene.getScene('mine');s.score=1250;s.remaining=0;s.update(0,16);});
  await page.locator('#action').click();await page.locator('#buy-bomb').click();await page.locator('#buy-potion').click();
  await page.reload();await page.waitForSelector('canvas');await page.waitForFunction(()=>window.__miner?.scene.getScene('mine')?.players?.length>0);assert.equal(await page.locator('#resume').isVisible(),true);
  // Loading must stay on a ready screen until explicitly resumed.
  assert.equal(await run(()=>window.__miner.scene.getScene('mine').phase),'ready');
  await page.locator('#resume').click();
  assert.deepEqual(await run(()=>{const s=window.__miner.scene.getScene('mine');return [s.phase,s.wallet,s.total,s.bombs,s.potion,s.score];}),['shop',800,1250,2,true,1250]);
  await page.locator('#next-level').click();await run(()=>window.__miner.loop.sleep());
  await run(()=>{const s=window.__miner.scene.getScene('mine');s.bombs=0;s.score=500;s.remaining=20;});
  await page.reload();await page.waitForSelector('canvas');await page.waitForFunction(()=>window.__miner?.scene.getScene('mine')?.players?.length>0);await run(()=>window.__miner.loop.sleep());await page.locator('#resume').click();
  assert.deepEqual(await run(()=>{const s=window.__miner.scene.getScene('mine');return [s.phase,s.levelIndex,s.wallet,s.total,s.bombs,s.strength,s.score,s.remaining];}),['playing',1,800,1250,2,true,0,60]);
  // Effects use the real grab/return path, and the goal only triggers once.
  await run(()=>{const s=window.__miner.scene.getScene('mine');s.angle=Math.atan2(245-500,220-92);s.trigger();for(let i=0;i<150&&!s.caught;i++)s.update(0,16);});
  assert.equal(await run(()=>!!window.__miner.scene.getScene('mine').caught),true);
  const rotations=await run(()=>{const s=window.__miner.scene.getScene('mine');const a=s.crank.rotation;s.update(0,100);return[a,s.crank.rotation,s.minerArt.y];});assert.notEqual(rotations[0],rotations[1]);assert.notEqual(rotations[2],0);
  await run(()=>{const s=window.__miner.scene.getScene('mine');s.score=s.level.target-100;s.length=29;s.update(0,100);});
  assert.equal(await page.locator('#progress-label').textContent(),'本关目标已达成');
  await run(()=>{const s=window.__miner.scene.getScene('mine');s.remaining=9;s.hud();window.__miner.loop.wake();});
  await page.waitForTimeout(100);assert.equal(await page.locator('body').evaluate(el=>el.classList.contains('time-warning')),true);
  await page.screenshot({path:'analysis/qa/polish-desktop.png',fullPage:true});
  await page.locator('#pause').click();assert.equal(await page.locator('body').evaluate(el=>el.classList.contains('time-warning')),false);
  assert.equal(await run(()=>document.documentElement.scrollWidth<=innerWidth),true);
  // Completion removes resumable progress; restart replaces it with level one.
  await run(()=>{const s=window.__miner.scene.getScene('mine');s.paused=false;s.levelIndex=4;s.score=2600;s.finish();});
  assert.equal(await run(()=>localStorage.getItem('gold-digger-progress-v1')),null);
  await page.reload();await page.waitForSelector('canvas');await page.waitForFunction(()=>window.__miner?.scene.getScene('mine')?.players?.length>0);assert.equal(await page.locator('#resume').isHidden(),true);
  await run(()=>localStorage.setItem('gold-digger-progress-v1','{invalid'));
  await page.reload();await page.waitForSelector('canvas');await page.waitForFunction(()=>window.__miner?.scene.getScene('mine')?.players?.length>0);assert.equal(await page.locator('#resume').isHidden(),true);
  await page.locator('#action').click();assert.equal(await run(()=>JSON.parse(localStorage.getItem('gold-digger-progress-v1')).levelIndex),0);
  // Browser storage failure remains playable and is communicated honestly.
  await page.addInitScript(()=>{Storage.prototype.setItem=function(){throw new Error('blocked');};});
  await page.reload();await page.waitForSelector('canvas');await page.waitForFunction(()=>window.__miner?.scene.getScene('mine')?.players?.length>0);await page.locator('#action').click();
  assert.match(await page.locator('#save-status').textContent(),/未能保存/);
  assert.deepEqual(errors,[]);console.log('PASS: reload from shop, purchases retained, level checkpoint restore, no auto-start, animation, goal feedback, warning/pause, desktop layout, completion cleanup, invalid saves, storage failure.');
}finally{await browser.close();}
