import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const executablePath=['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(p=>fs.existsSync(p));
const browser=await chromium.launch({executablePath,headless:true});
try{
  const page=await browser.newPage({viewport:{width:1440,height:1150}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:5173');await page.waitForSelector('canvas');await page.waitForFunction(()=>window.__miner?.scene.getScene('mine')?.players?.length>0);
  const run=fn=>page.evaluate(fn);const state=()=>run(()=>{const s=window.__miner.scene.getScene('mine');return{phase:s.phase,coop:s.coop,index:s.levelIndex,score:s.score,bombs:s.bombs,wallet:s.wallet,total:s.total,strength:s.strength,players:s.players.map(p=>({mode:p.mode,score:p.score,caught:!!p.caught}))};});
  await page.locator('#action').click();const solo=await run(()=>localStorage.getItem('gold-digger-progress-v1'));
  await page.locator('#mode-coop').click();assert.equal((await state()).phase,'ready');
  await page.locator('#action').click();await run(()=>window.__miner.loop.sleep());
  assert.equal((await state()).players.length,2);assert.equal((await state()).bombs,2);assert.equal(await page.locator('#target').textContent(),'$1,300');
  await page.keyboard.down('s');await page.keyboard.down('ArrowDown');await page.keyboard.up('s');await page.keyboard.up('ArrowDown');
  assert.deepEqual((await state()).players.map(p=>p.mode),['out','out']);
  await page.keyboard.press('p');const before=await run(()=>{const s=window.__miner.scene.getScene('mine');return[s.remaining,...s.players.map(p=>p.length)];});
  await run(()=>window.__miner.scene.getScene('mine').update(0,1000));
  assert.deepEqual(await run(()=>{const s=window.__miner.scene.getScene('mine');return[s.remaining,...s.players.map(p=>p.length)];}),before);
  await page.keyboard.press('p');await page.locator('#restart').click();
  await run(()=>{const s=window.__miner.scene.getScene('mine');s.players[0].angle=Math.atan2(365-300,192-92);s.players[1].angle=Math.atan2(669-700,184-92);s.trigger(0);s.trigger(1);for(let i=0;i<800&&s.score<100;i++)s.update(0,16);});
  assert.deepEqual((await state()).players.map(p=>p.score),[50,50]);assert.equal((await state()).score,100);
  // Both hooks sweep the same mineral in one frame: exactly one owner and one payout.
  await page.locator('#restart').click();
  await run(()=>{const s=window.__miner.scene.getScene('mine');s.ores.forEach(o=>o.active=false);const o=s.ores[0];o.active=true;o.x=500;o.y=250;o.sprite.setPosition(500,250);for(const p of s.players){p.angle=Math.atan2(o.x-p.origin.x,o.y-p.origin.y);p.length=Math.hypot(o.x-p.origin.x,o.y-p.origin.y)-30;p.mode='out';}s.update(0,100);});
  assert.equal((await state()).players.filter(p=>p.caught).length,1);assert.equal((await state()).phase,'playing');
  await run(()=>{const s=window.__miner.scene.getScene('mine');s.players.find(p=>p.caught).length=29;s.update(0,100);});assert.equal((await state()).score,50);
  // Do not finish while the other player is still bringing the last item home.
  await page.locator('#restart').click();
  await run(()=>{const s=window.__miner.scene.getScene('mine');s.ores.forEach(o=>o.active=false);s.players.forEach((p,i)=>{p.caught=s.ores[i];p.mode='back';p.length=i?200:29;});s.update(0,100);});
  assert.equal((await state()).phase,'playing');assert.equal((await state()).score,50);
  await run(()=>{const s=window.__miner.scene.getScene('mine');s.players[1].length=29;s.update(0,100);});assert.equal((await state()).score,100);
  await page.locator('#restart').click();
  await run(()=>{const s=window.__miner.scene.getScene('mine');s.players.forEach((p,i)=>{p.caught=s.ores[i];p.caught.active=false;p.mode='back';p.length=200;});s.hud();});
  await page.keyboard.press('ArrowUp');assert.deepEqual((await state()).players.map(p=>p.caught),[true,false]);assert.equal((await state()).bombs,1);
  await page.keyboard.press('w');assert.equal((await state()).bombs,0);assert.equal((await state()).score,0);
  await page.locator('#restart').click();
  await run(()=>{const s=window.__miner.scene.getScene('mine');s.players[0].score=800;s.players[1].score=700;s.score=1500;s.remaining=0;s.update(0,16);});
  await page.locator('#action').click();await page.locator('#buy-potion').click();await page.locator('#buy-bomb').click();
  assert.equal((await state()).wallet,1050);assert.equal((await state()).bombs,3);
  await page.reload();await page.waitForSelector('canvas');await page.waitForFunction(()=>window.__miner?.scene.getScene('mine')?.players?.length>0);await page.locator('#mode-coop').click();await page.locator('#resume').click();
  assert.equal((await state()).phase,'shop');assert.deepEqual((await state()).players.map(p=>p.score),[800,700]);assert.equal((await state()).wallet,1050);
  await page.locator('#next-level').click();await run(()=>window.__miner.loop.sleep());
  const gains=await run(()=>{const s=window.__miner.scene.getScene('mine');return s.players.map((p,i)=>{p.caught=s.ores[i];p.mode='back';p.length=300;p.update(.1,s.ores,false,()=>{},()=>{});const base=300-p.length;p.length=300;p.update(.1,s.ores,s.strength,()=>{},()=>{});return(300-p.length)/base;});});assert.ok(gains.every(n=>Math.abs(n-1.65)<.001));
  await run(()=>{const s=window.__miner.scene.getScene('mine');s.remaining=0;s.update(0,16);});await page.locator('#action').click();assert.equal((await state()).index,1);assert.equal((await state()).bombs,3);assert.equal((await state()).strength,true);
  await run(()=>window.__miner.loop.wake());await page.waitForTimeout(150);await page.screenshot({path:'analysis/qa/coop-desktop.png',fullPage:true});await run(()=>window.__miner.loop.sleep());
  for(let i=1;i<5;i++){
    await run(()=>{const s=window.__miner.scene.getScene('mine');s.players[0].score=s.level.target/2;s.players[1].score=s.level.target/2;s.score=s.level.target;s.remaining=0;s.update(0,16);});
    if(i<4){await page.locator('#action').click();await page.locator('#next-level').click();}
  }
  assert.equal((await state()).phase,'complete');assert.equal(await run(()=>localStorage.getItem('gold-digger-coop-progress-v1')),null);
  assert.equal(await run(()=>localStorage.getItem('gold-digger-progress-v1')),solo);
  assert.ok(Number(await run(()=>localStorage.getItem('gold-digger-coop-best')))>0);
  await page.locator('#mode-solo').click();await page.locator('#resume').click();assert.equal((await state()).players.length,1);assert.equal((await state()).bombs,1);
  assert.deepEqual(errors,[]);console.log('PASS: desktop keyboard cooperation, independent hooks, shared timer/pause, unique ownership, last-item collection, per-player explosives, team shop/potion, 5 stages, separate saves/records, single-player restore.');
}finally{await browser.close();}
