import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const executablePath=['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(p=>fs.existsSync(p));
const browser=await chromium.launch({executablePath,headless:true});
try{
  const page=await browser.newPage({viewport:{width:1440,height:1100}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:5173');await page.waitForSelector('canvas');await page.waitForFunction(()=>window.__miner?.scene.getScene('mine')?.players?.length>0);
  await page.locator('#action').click();await page.evaluate(()=>window.__miner.loop.sleep());
  const run=fn=>page.evaluate(fn);
  const state=()=>run(()=>{const s=window.__miner.scene.getScene('mine');return {phase:s.phase,index:s.levelIndex,wallet:s.wallet,total:s.total,bombs:s.bombs,strength:s.strength,potion:s.potion,score:s.score};});
  // Empty or paused bomb actions must never consume inventory.
  await run(()=>window.__miner.scene.getScene('mine').useBomb());assert.equal((await state()).bombs,1);
  await run(()=>{const s=window.__miner.scene.getScene('mine');s.angle=Math.atan2(464-500,252-92);s.trigger();for(let i=0;i<100&&!s.caught;i++)s.update(0,16);});
  assert.equal(await run(()=>window.__miner.scene.getScene('mine').caught.kind),'rock');
  await page.locator('#pause').click();await run(()=>window.__miner.scene.getScene('mine').useBomb());assert.equal((await state()).bombs,1);
  await page.locator('#pause').click();await page.locator('#bomb').click();
  assert.equal((await state()).bombs,0);assert.equal((await state()).score,0);
  assert.equal(await run(()=>!!window.__miner.scene.getScene('mine').caught),false);
  // Fail and retry restores the entire entry checkpoint.
  await run(()=>{const s=window.__miner.scene.getScene('mine');s.remaining=0;s.update(0,16);});
  await page.locator('#action').click();assert.equal((await state()).bombs,1);assert.equal((await state()).index,0);
  await run(()=>{const s=window.__miner.scene.getScene('mine');s.score=1250;s.remaining=0;s.update(0,16);s.finish();});
  assert.equal((await state()).wallet,1250);assert.equal((await state()).total,1250); // no double payout
  await page.locator('#action').click();assert.equal((await state()).phase,'shop');
  await page.locator('#buy-potion').click();assert.equal((await state()).wallet,950);assert.equal(await page.locator('#buy-potion').isDisabled(),true);
  await run(()=>window.__miner.scene.getScene('mine').buy('potion'));assert.equal((await state()).wallet,950);
  await page.locator('#buy-bomb').click();await page.locator('#buy-bomb').click();assert.equal((await state()).bombs,3);assert.equal((await state()).wallet,650);
  await run(()=>window.__miner.scene.getScene('mine').buy('bomb'));assert.equal((await state()).wallet,650);
  await run(()=>window.__miner.loop.wake());await page.waitForTimeout(250);
  fs.mkdirSync('analysis/qa',{recursive:true});await page.screenshot({path:'analysis/qa/shop-desktop.png',fullPage:true});
  assert.equal(await run(()=>document.documentElement.scrollWidth<=innerWidth),true);await run(()=>window.__miner.loop.sleep());
  await page.locator('#next-level').click();assert.equal((await state()).index,1);assert.equal((await state()).strength,true);assert.equal((await state()).potion,false);
  // Same time interval, same load: potion must make actual recovery faster.
  const speeds=await run(()=>{const s=window.__miner.scene.getScene('mine');const o=s.ores[0];o.active=false;s.caught=o;s.mode='back';s.length=300;s.strength=false;s.update(0,100);const normal=300-s.length;s.length=300;s.strength=true;s.update(0,100);return [normal,300-s.length];});
  assert.ok(Math.abs(speeds[1]/speeds[0]-1.65)<.001);
  await run(()=>{const s=window.__miner.scene.getScene('mine');s.remaining=0;s.update(0,16);});await page.locator('#action').click();
  assert.equal((await state()).strength,true);assert.equal((await state()).wallet,650);assert.equal((await state()).total,1250);
  // Exercise all remaining level transitions and unboosted expiry.
  for(let index=1;index<5;index++){
    assert.equal((await state()).index,index);
    await run(()=>{const s=window.__miner.scene.getScene('mine');s.score=s.level.target;s.remaining=0;s.update(0,16);});
    if(index===4){assert.equal((await state()).phase,'complete');break;}
    await page.locator('#action').click();
    if(index===2){ // Insufficient balance: neither mutation nor debit.
      await run(()=>{const s=window.__miner.scene.getScene('mine');s.wallet=100;s.bombs=0;s.shopHud();s.buy('bomb');s.buy('potion');});
      assert.equal((await state()).wallet,100);assert.equal((await state()).bombs,0);assert.equal((await state()).potion,false);
    }
    await page.locator('#next-level').click();assert.equal((await state()).strength,false);
  }
  assert.equal((await state()).total,9250);assert.equal(await page.locator('#shop').isHidden(),true);
  await run(()=>window.__miner.loop.wake());await page.waitForTimeout(250);await page.screenshot({path:'analysis/qa/campaign-complete.png',fullPage:true});await run(()=>window.__miner.loop.sleep());
  await page.locator('#action').click();assert.deepEqual(await state(),{phase:'playing',index:0,wallet:0,total:0,bombs:1,strength:false,potion:false,score:0});
  assert.deepEqual(errors,[]);
  console.log('PASS: 5-level campaign, shop debit/caps/insufficient funds, bomb guards and consumption, potion speed/expiry, retry checkpoints, idempotent payout, final completion, new run, desktop shop.');
} finally {await browser.close();}
