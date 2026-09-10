import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const executablePath=['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(p=>fs.existsSync(p));
const browser=await chromium.launch({executablePath,headless:true});
try{
const page=await browser.newPage({viewport:{width:1440,height:1050}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:5173');await page.waitForSelector('canvas');
await page.locator('#action').click();
await page.evaluate(()=>window.__miner.loop.sleep());
const run=fn=>page.evaluate(fn);
assert.equal(await run(()=>window.__miner.scene.getScene('mine').phase),'playing');
await page.locator('#pause').click();assert.equal(await run(()=>window.__miner.scene.getScene('mine').paused),true);
await page.locator('#action').click();assert.equal(await run(()=>window.__miner.scene.getScene('mine').paused),false);
// Deterministic game updates exercise real collision, recovery, and score code.
const caught=await run(()=>{const s=window.__miner.scene.getScene('mine');s.angle=Math.atan2(365-500,192-92);s.trigger();for(let i=0;i<800&&s.score===0;i++)s.update(0,16);return{score:s.score,mode:s.mode};});
assert.equal(caught.score,50);assert.equal(caught.mode,'swing');
await run(()=>{const s=window.__miner.scene.getScene('mine');s.remaining=.01;s.update(0,16);});assert.equal(await run(()=>window.__miner.scene.getScene('mine').phase),'lost');
await page.locator('#restart').click();
const reset=await run(()=>{const s=window.__miner.scene.getScene('mine');return [s.score,s.remaining,s.ores.filter(o=>o.active).length];});assert.deepEqual(reset,[0,60,14]);
await run(()=>{const s=window.__miner.scene.getScene('mine');s.score=1250;s.remaining=.01;s.update(0,16);});assert.equal(await run(()=>window.__miner.scene.getScene('mine').phase),'won');assert.equal(await page.locator('#best').textContent(),'$1,250');
await page.locator('#restart').click();await page.locator('canvas').click({position:{x:100,y:100}});assert.equal(await run(()=>window.__miner.scene.getScene('mine').mode),'out');
await page.locator('#restart').click();await page.locator('canvas').click({position:{x:100,y:100}});await page.keyboard.press('p');assert.equal(await run(()=>window.__miner.scene.getScene('mine').paused),true);await page.keyboard.press('p');
fs.mkdirSync('analysis/qa',{recursive:true});await page.screenshot({path:'analysis/qa/desktop.png',fullPage:true});
assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
const bounds=await page.locator('canvas').boundingBox();assert.ok(Math.abs(bounds.width/bounds.height-1000/490)<.02);assert.ok(bounds.x>=0&&bounds.x+bounds.width<=1440);
await page.locator('#restart').click();await page.locator('canvas').click({position:{x:80,y:60}});assert.equal(await run(()=>window.__miner.scene.getScene('mine').mode),'out');
await page.reload();await page.waitForSelector('canvas');assert.equal(await page.locator('#best').textContent(),'$1,250');
assert.deepEqual(errors,[]);console.log('PASS: start, pause/resume, swept catch, score, failure, success, restart, pointer input, keyboard, persistence, desktop bounds, browser errors.');
}finally{await browser.close();}
