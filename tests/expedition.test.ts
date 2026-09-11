import {test} from 'node:test';
import assert from 'node:assert/strict';
import {routes,minerals} from '../src/expedition.ts';
test('seeded route choices and mineral layouts are reproducible',()=>{assert.deepEqual(routes(123,2),routes(123,2));assert.deepEqual(minerals(123,2,'ruins'),minerals(123,2,'ruins'));assert.notDeepEqual(minerals(124,2,'ruins'),minerals(123,2,'ruins'));});
test('every station offers distinct branches including a bag-rich ruins route',()=>{for(let stage=0;stage<5;stage++){const r=routes(123,stage);assert.equal(new Set(r.map(x=>x.id)).size,3);assert.ok(r.some(x=>x.id==='ruins'));for(const route of r){const ore=minerals(123,stage,route.id);assert.equal(ore.filter(o=>o[3]==='bag').length,route.id==='ruins'?4:2);assert.ok(ore.every(o=>o[0]-o[2]>20&&o[0]+o[2]<980&&o[1]+o[2]<490));}}});
