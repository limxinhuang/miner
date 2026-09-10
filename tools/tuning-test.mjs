import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const executablePath=['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(p=>fs.existsSync(p));
const browser=await chromium.launch({executablePath,headless:true});
try{
const page=await browser.newPage({viewport:{width:1440,height:1200},permissions:['clipboard-read','clipboard-write']});const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:5173');await page.waitForFunction(()=>window.__miner?.scene.getScene('mine')?.players?.length>0);
const run=fn=>page.evaluate(fn);await page.locator('#mode-coop').click();await page.locator('#action').click();await run(()=>window.__miner.loop.sleep());
await page.locator('#tuning-swing-number').fill('2');await page.locator('#tuning-pull-number').fill('1.5');
const motion=await run(()=>{const s=window.__miner.scene.getScene('mine');return s.players.map(p=>{p.angle=0;p.direction=1;p.mode='swing';p.update(.1,s.ores,false,()=>{},()=>{});const swing=p.angle;p.mode='back';p.length=400;p.caught=undefined;p.update(.1,s.ores,false,()=>{},()=>{});const empty=400-p.length;p.length=400;p.caught=s.ores[0];p.update(.1,s.ores,false,()=>{},()=>{});const heavy=400-p.length;p.length=400;p.update(.1,s.ores,true,()=>{},()=>{});return {swing,empty,heavy,potion:400-p.length};});});
for(const p of motion){assert.ok(Math.abs(p.swing-.23)<.0001);assert.ok(Math.abs(p.empty-58.5)<.0001);assert.ok(Math.abs(p.heavy-58.5/(1+3*.48))<.0001);assert.ok(Math.abs(p.potion/p.heavy-1.65)<.0001);}
// Invalid edits do not change the active setting; input arrow keys never fire hooks.
await page.locator('#tuning-swing-number').fill('');await page.locator('#tuning-pull-number').fill('99');
assert.deepEqual(await run(()=>JSON.parse(localStorage.getItem('gold-digger-tuning-v1'))),{swing:2,pull:1.5});
await run(()=>{const s=window.__miner.scene.getScene('mine');s.players.forEach(p=>p.reset());});await page.locator('#tuning-swing-number').focus();await page.keyboard.press('ArrowDown');
assert.deepEqual(await run(()=>window.__miner.scene.getScene('mine').players.map(p=>p.mode)),['swing','swing']);
await page.locator('#tuning-swing-number').fill('2');await page.locator('#tuning-pull-number').fill('1.5');
await page.locator('#tuning-swing').evaluate(el=>{el.value='0.75';el.dispatchEvent(new Event('input',{bubbles:true}));});
assert.equal(await page.locator('#tuning-swing-number').inputValue(),'0.75');
await page.locator('#tuning-copy').click();await page.waitForFunction(()=>/复制|选中/.test(document.getElementById('tuning-message').textContent));
assert.match(await page.locator('#tuning-values').inputValue(),/0.75 倍；拉取 1.50 倍/);
await page.reload();await page.waitForFunction(()=>window.__miner?.scene.getScene('mine')?.players?.length>0);
assert.equal(await page.locator('#tuning-swing-number').inputValue(),'0.75');assert.equal(await page.locator('#tuning-pull-number').inputValue(),'1.50');
await page.screenshot({path:'analysis/qa/tuning-desktop.png',fullPage:true});
await page.locator('#tuning-reset').click();assert.deepEqual(await run(()=>JSON.parse(localStorage.getItem('gold-digger-tuning-v1'))),{swing:1,pull:1});
assert.deepEqual(errors,[]);console.log('PASS: live motion for both players, empty/weighted returns, potion stacking, invalid input, keyboard isolation, slider sync, share text, persistence, defaults.');
}finally{await browser.close();}
