import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const executablePath=['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(p=>fs.existsSync(p));
const browser=await chromium.launch({executablePath,headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1100}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const run=(fn,arg)=>page.evaluate(fn,arg),state=()=>run(()=>window.__miner.scene.getScene('mine').snapshot());
 const ready=async()=>{await page.waitForFunction(()=>window.__miner?.scene.getScene('mine')?.players?.length===2);await run(()=>window.__miner.loop.sleep());};
 const tick=n=>run(n=>{const s=window.__miner.scene.getScene('mine');for(let i=0;i<n;i++)s.update(0,16);},n);
 const depart=async()=>{await page.locator('#camp-routes').click();await page.locator('[data-route="ruins"][data-player="0"]').click();assert.equal(await page.locator('#next-level').isDisabled(),true);await page.locator('[data-route="ruins"][data-player="1"]').click();await page.locator('#next-level').click();};
 const aim=async(player,id)=>run(({player,id})=>{const s=window.__miner.scene.getScene('mine'),p=s.players[player],o=s.ores[id];p.angle=Math.atan2(o.x-p.origin.x,o.y-p.origin.y);s.trigger(player);},{player,id});
 const restore=async()=>{await run(()=>window.__miner.scene.getScene('mine').persist());const a=await state();await page.reload();await ready();await page.locator('#resume').click();assert.deepEqual(await state(),a);return a;};
 const screenshot=async name=>{await run(()=>window.__miner.loop.wake());await page.waitForTimeout(60);await run(()=>window.__miner.loop.sleep());await page.screenshot({path:`analysis/qa/growth-${name}.png`,fullPage:true});};
 await page.goto('http://127.0.0.1:5173');await ready();await page.locator('#action').click();await depart();
 await aim(0,10);await tick(22);assert.equal((await state()).players[0].caught,10);await restore();await tick(30);assert.equal((await state()).players[0].caught,10);await page.locator('#pause').click();await tick(100);
 const first=(await state()).wallet;assert.ok([300,500,800].includes(first));assert.equal((await state()).growth[0].xp,first);assert.equal((await state()).players[0].score,first);assert.deepEqual((await state()).growth[0].bags,[]);assert.equal((await state()).phase,'playing');
 await aim(1,11);await tick(125);const second=(await state()).wallet-first;assert.ok([300,500,800].includes(second));assert.equal((await state()).growth[1].xp,second);await restore();await page.locator('#pause').click();
 await aim(0,0);await tick(210);assert.equal((await state()).wallet,first+second+20);assert.equal((await state()).growth[0].xp,first+20);
 // Migrate one pending bag from an older save and prove it is paid only once.
 await run(()=>{const s=window.__miner.scene.getScene('mine');s.ores[12].active=false;s.growth[0].bags=[12];s.persist();});
 const beforeMigration=(await state()).wallet;await page.reload();await ready();await page.locator('#resume').click();const migrated=await state();assert.ok(migrated.wallet>beforeMigration);assert.deepEqual(migrated.growth[0].bags,[]);await restore();await page.locator('#pause').click();
 // Finish cannot add any more money or experience.
 await run(()=>{const s=window.__miner.scene.getScene('mine');s.wallet=Math.max(1200,s.wallet);});const beforeFinish=await state();
 await run(()=>window.__miner.scene.getScene('mine').finish());let s=await state();assert.equal(s.wallet,beforeFinish.wallet);assert.deepEqual(s.growth,beforeFinish.growth);assert.equal(s.phase,'settlement');
 assert.ok((await page.locator('#settlement-results').innerText()).includes('本局收入'));assert.equal(await page.locator('.bag-reveal').count(),0);
 const settled=await restore();await run(()=>{const s=window.__miner.scene.getScene('mine');s.finish();s.update(0,1000);s.allocate(0,'luck');});assert.deepEqual(await state(),settled);await screenshot('settlement');
 await page.locator('#settlement-continue').click();assert.equal((await state()).phase,'shop');
 // Ensure both players have earned points for the allocation guard and persistence tests.
 await run(()=>{const s=window.__miner.scene.getScene('mine');s.growth[0].xp=2250;s.growth[1].xp=1250;s.hud();s.persist();});
 await page.locator('[data-stat="power"][data-player="0"]').click();await page.locator('[data-stat="luck"][data-player="1"]').click();
 const xp=(await state()).growth.map(g=>g.xp),balance=(await state()).wallet;
 await page.locator('#buy-potion').click();assert.equal((await state()).wallet,balance-300);assert.deepEqual((await state()).growth.map(g=>g.xp),xp);
 await restore();assert.equal((await state()).growth[0].power,1);assert.equal((await state()).growth[1].luck,1);await screenshot('camp');await depart();
 assert.equal((await state()).strength,true);assert.equal((await state()).growth[0].power,1);
 const speeds=await run(()=>{const s=window.__miner.scene.getScene('mine');return s.players.map((p,i)=>{p.mode='back';p.length=400;p.caught=s.ores[0];p.update(.1,s.ores,true,()=>{},()=>{},s.growth[i].power);const moved=400-p.length;p.reset();return moved;});});assert.ok(speeds[0]>speeds[1]);
 const previous=await state();await run(()=>window.__miner.scene.getScene('mine').allocate(0,'power'));assert.deepEqual((await state()).growth,previous.growth);
 // A hooked but undelivered bag does not enter settlement.
 await aim(0,10);await tick(22);assert.equal((await state()).players[0].caught,10);await run(()=>{const s=window.__miner.scene.getScene('mine');s.wallet=0;s.remaining=0;s.update(0,16);});
 assert.deepEqual((await state()).settlement.rewards,[[],[]]);await restore();await page.locator('#settlement-continue').click();
 assert.deepEqual(await run(()=>{const s=window.__miner.scene.getScene('mine');return[s.phase,s.wallet,s.growth.map(g=>g.xp),localStorage.getItem('gold-digger-expedition-v2')];}),['lost',0,[0,0],null]);
 await page.locator('#action').click();assert.equal((await state()).stage,0);assert.deepEqual((await state()).growth.map(g=>g.power),[0,0]);
 // Keep the full five-station state-machine regression, with explicit injected balances.
 for(let i=0;i<5;i++){await depart();await run(()=>{const s=window.__miner.scene.getScene('mine');s.wallet=s.route.target;s.finish();});await page.locator('#settlement-continue').click();}
 assert.equal(await run(()=>window.__miner.scene.getScene('mine').phase),'complete');assert.equal(await run(()=>localStorage.getItem('gold-digger-expedition-v2')),null);
 assert.deepEqual(errors,[]);console.log('PASS: real bag capture/ownership, instant rewards, exact carried/paid/settled saves, legacy pending migration, no rerolls, XP attribution, camp allocation, power/potion stacking, spending preserves XP, undelivered bags, failure reset, five-stage completion.');
}finally{await browser.close();}
