import {test} from 'node:test';
import assert from 'node:assert/strict';
import {segmentHitsCircle,pullSpeed} from '../src/mechanics.ts';
test('fast hook catches a mineral between frames',()=>{assert.equal(segmentHitsCircle({x:0,y:0},{x:100,y:0},{x:50,y:0},5),true);});
test('objects beyond the swept segment are not caught',()=>{assert.equal(segmentHitsCircle({x:0,y:0},{x:10,y:0},{x:50,y:0},5),false);assert.equal(segmentHitsCircle({x:0,y:0},{x:100,y:0},{x:50,y:10},5),false);});
test('stationary hook handles exact overlap without division by zero',()=>{assert.equal(segmentHitsCircle({x:0,y:0},{x:0,y:0},{x:0,y:0},1),true);});
test('heavy loads are slower and empty returns are fastest',()=>{assert.ok(pullSpeed(0)>pullSpeed(3));assert.ok(pullSpeed(3)>pullSpeed(9));assert.ok(pullSpeed(9)>0);});
