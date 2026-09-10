import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseSave} from '../src/save.ts';
import {saveKey} from '../src/save.ts';
const valid={version:1,kind:'shop',levelIndex:2,checkpoint:{wallet:500,total:3000,bombs:2,strength:false},potion:true,score:1800};
test('valid shop save preserves purchases and balances',()=>assert.deepEqual(parseSave(JSON.stringify(valid)),valid));
test('malformed and unsupported saves fail safely',()=>{for(const raw of [null,'oops','null','{}',JSON.stringify({...valid,version:2}),JSON.stringify({...valid,levelIndex:4})])assert.equal(parseSave(raw),null);});
test('reject invalid money and inventory',()=>{for(const patch of [{wallet:-1},{wallet:4000},{bombs:4},{bombs:1.5},{total:NaN},{strength:'yes'}])assert.equal(parseSave(JSON.stringify({...valid,checkpoint:{...valid.checkpoint,...patch}})),null);});
test('co-op contributions survive saves without mixing single-player keys',()=>{
  const coop={...valid,contributions:[800,1000]};assert.deepEqual(parseSave(JSON.stringify(coop)),coop);assert.notEqual(saveKey(true),saveKey(false));
  for(const contributions of [[1800,1800],[-1,1801],[1800],['800',1000]])assert.equal(parseSave(JSON.stringify({...valid,contributions})),null);
});
