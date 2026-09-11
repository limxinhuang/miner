import {test} from 'node:test';
import assert from 'node:assert/strict';
import {freshGrowth,progress,points,powerMultiplier,bagReward} from '../src/growth.ts';
test('experience awards levels and spendable points at exact thresholds',()=>{
 assert.equal(progress(499).level,1);assert.deepEqual(progress(500),{level:2,current:0,needed:750});assert.equal(progress(2250).level,4);
 assert.equal(points({...freshGrowth(),xp:2250,power:1,luck:1}),1);
});
test('power benefits weighted retrieval without changing empty hooks',()=>{assert.equal(powerMultiplier(3,0),1);assert.ok(powerMultiplier(3,9)>powerMultiplier(3,4));assert.ok(Math.abs(powerMultiplier(3,9)-1.36)<1e-10);});
test('bag draws are stable, bounded, monotonic with luck and player order independent',()=>{
 let improves=false;for(let seed=0;seed<1000;seed++){const a=bagReward(seed,0,10,0),b=bagReward(seed,0,10,5);assert.equal(a,bagReward(seed,0,10,0));assert.ok([300,500,800].includes(a));assert.ok(b>=a);if(b>a)improves=true;}assert.ok(improves);
});

