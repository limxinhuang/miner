import Phaser from 'phaser';
export const BACKGROUNDS=['bg_01_golden_valley','bg_02_stony_ridge','bg_03_crystal_veins','bg_04_deep_reserve','bg_05_last_bonanza'];
export const ASSETS=[...BACKGROUNDS,'claw_p1','claw_p2','fx_coin','fx_explosion','fx_sparkle','item_dynamite','item_strength_potion','miner_p1_idle','miner_p1_pull','miner_p1_win','miner_p2_idle','miner_p2_pull','miner_p2_win','ore_diamond','ore_gold_large','ore_gold_medium','ore_gold_small','ore_rock','winch_base','winch_wheel'];
// Frames trim transparent padding at runtime; original supplied PNGs remain untouched.
const BOUNDS:Record<string,[number,number,number,number]>={
  ore_gold_small:[60,91,392,331],ore_gold_medium:[61,81,396,356],ore_gold_large:[89,109,601,556],ore_rock:[50,91,412,331],ore_diamond:[66,108,381,324],
  winch_base:[65,115,631,236],fx_coin:[37,40,183,189],fx_explosion:[94,94,596,591],fx_sparkle:[70,70,116,116],
};
export function loadAssets(scene:Phaser.Scene){
  scene.load.on('progress',(progress:number)=>{const el=document.getElementById('status');if(el)el.textContent=`正在加载高清素材……${Math.round(progress*100)}%`;});
  scene.load.on('loaderror',()=>{const el=document.getElementById('status');if(el)el.textContent='部分素材加载失败，请刷新页面重试。';});
  scene.load.image('ore_lucky_bag','/assets/ui/ore_lucky_bag.png');
  for(const key of ASSETS)scene.load.image(key,`/assets/${key}.png`);
}
export function registerFrames(scene:Phaser.Scene){
  scene.textures.get('ore_lucky_bag').add('trim',0,95,47,322,418);
  for(const [key,rect] of Object.entries(BOUNDS))scene.textures.get(key).add('trim',0,...rect);
  for(const key of BACKGROUNDS){scene.textures.get(key).add('sky',0,0,0,2000,300);scene.textures.get(key).add('soil',0,0,300,2000,680);}
}
