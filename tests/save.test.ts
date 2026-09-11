import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseSave,type Save} from '../src/save.ts';
import {minerals} from '../src/expedition.ts';
import {freshGrowth} from '../src/growth.ts';
const valid:Save={version:2,seed:123,stage:0,phase:'playing',wallet:500,bombs:2,potion:false,strength:false,remaining:42.75,selected:'ruins',votes:['ruins','ruins'],history:[],players:[{mode:'swing',angle:.7,direction:1,length:28,score:500,caught:null},{mode:'back',angle:-.3,direction:-1,length:130,score:0,caught:11}],active:minerals(123,0,'ruins').map((_,i)=>i!==10&&i!==11),growth:[{...freshGrowth(),xp:500,power:1,bags:[10]},freshGrowth()],settlement:null};
test('preserves exact timer, bag ownership, growth and carried bag',()=>assert.deepEqual(parseSave(JSON.stringify(valid)),valid));
test('rejects old saves, overspent points, duplicate bags and bag still active',()=>{
 for(const s of [{...valid,version:1},{...valid,growth:[{...valid.growth[0],power:2},valid.growth[1]]},{...valid,growth:[valid.growth[0],{...valid.growth[1],bags:[10]}]},{...valid,active:valid.active.map(()=>true)}])assert.equal(parseSave(JSON.stringify(s)),null);
});
test('settlement reload preserves already credited rewards and rejects inconsistent wallet',()=>{
 const s={...valid,phase:'settlement',wallet:800,active:[],growth:[{...valid.growth[0],xp:800,bags:[]},freshGrowth()],players:valid.players.map(p=>({...p,mode:'swing',caught:null})),settlement:{before:500,target:1200,rewards:[[300],[]]}};
 assert.deepEqual(parseSave(JSON.stringify(s)),s);assert.equal(parseSave(JSON.stringify({...s,wallet:1100})),null);
});
