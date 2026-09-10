import Phaser from 'phaser';
import './style.css';
import { Player, type Ore } from './player';
import { LEVELS, SHOP } from './levels';
import { readSave, writeSave, clearSave, type Save } from './save';
import { Feedback } from './feedback';
import { BACKGROUNDS, loadAssets, registerFrames } from './assets';

type Phase = 'ready'|'playing'|'won'|'lost'|'shop'|'complete';
const $ = (id:string) => document.getElementById(id)!;
const action=$('action') as HTMLButtonElement, pause=$('pause') as HTMLButtonElement;
let sound=false, audio:AudioContext|undefined;
function tone(freq:number,duration=.1){if(!sound)return;try{audio??=new AudioContext();void audio.resume();const o=audio.createOscillator(),g=audio.createGain();o.type='sine';o.frequency.value=freq;g.gain.setValueAtTime(.06,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+duration);}catch{/* Audio is optional. */}}
let best=0;try{best=Number(localStorage.getItem('gold-digger-campaign-best'))||0;}catch{}$('best').textContent=`$${best.toLocaleString()}`;

class Mine extends Phaser.Scene {
  phase:Phase='ready'; paused=false; score=0; remaining=60; ores:Ore[]=[]; coop=false; players:Player[]=[]; updateOrder=0;
  overlay!:Phaser.GameObjects.Container; sky!:Phaser.GameObjects.Image; soil!:Phaser.GameObjects.Image;
  levelIndex=0; wallet=0; total=0; bombs=1; potion=false; strength=false;
  checkpoint={wallet:0,total:0,bombs:1,strength:false};
  areaLabel!:Phaser.GameObjects.Text; areaNumber!:Phaser.GameObjects.Text;

  feedback!:Feedback; animationTime=0; goalReached=false; lastWarning=11; saved:Save|null=readSave();
  get level(){const level=LEVELS[this.levelIndex];return this.coop?{...level,target:Math.round(level.target*1.3)}:level;}
  get bestKey(){return this.coop?'gold-digger-coop-best':'gold-digger-campaign-best';}
  // Keep the single-player debug interface used by existing regression checks.
  get mode(){return this.players[0].mode;} set mode(v:Player['mode']){this.players[0].mode=v;}
  get angle(){return this.players[0].angle;} set angle(v:number){this.players[0].angle=v;}
  get direction(){return this.players[0].direction;} set direction(v:number){this.players[0].direction=v;}
  get length(){return this.players[0].length;} set length(v:number){this.players[0].length=v;}
  get caught(){return this.players[0].caught;} set caught(v:Ore|undefined){this.players[0].caught=v;}
  get rope(){return this.players[0].rope;} get hook(){return this.players[0].hook;}
  get minerArt(){return this.players[0].minerArt;} get crank(){return this.players[0].crank;}
  configurePlayers(){this.players.forEach(p=>p.destroy());this.players=[new Player(this,0,this.coop?300:500,0xe9af40)];if(this.coop)this.players.push(new Player(this,1,700,0x7fcac2));}
  chooseMode(coop:boolean){
    if(this.coop===coop)return;
    if(this.phase!=='ready'&&this.phase!=='complete')this.persist();
    this.coop=coop;this.configurePlayers();this.levelIndex=0;this.wallet=0;this.total=0;this.potion=false;this.strength=false;this.bombs=coop?2:1;
    this.checkpoint={wallet:0,total:0,bombs:this.bombs,strength:false};this.startLevel(false);this.phase='ready';pause.disabled=true;
    try{best=Number(localStorage.getItem(this.bestKey))||0;}catch{best=0;}$('best').textContent='$'+best.toLocaleString();
    this.saved=readSave(coop);this.showResume();
    this.makeOverlay(coop?'一起开采，双倍默契。':'今天，会有好收获。',coop?'P1：S 出钩 / W 炸药     P2：↓ 出钩 / ↑ 炸药':'空格 / ↓ 出钩，B / ↑ 使用炸药',coop?'共用收益目标、资金和炸药；力量药水对双方生效':'点击开始你的淘金旅程');
    action.innerHTML=coop?'开始双人合作 <span>↗</span>':'开始开采 <span>SPACE ↗</span>';this.hud();
  }
  showResume(){
    $('resume').hidden=!this.saved;
    $('save-status').textContent=this.saved?'已找到'+(this.coop?'双人':'单人')+'进度，点击继续上次':'单人与双人分别保存进度和纪录';
    if(this.saved)$('resume').textContent='继续'+(this.coop?'双人':'单人')+' · 第 '+(this.saved.levelIndex+1)+' 关'+(this.saved.kind==='shop'?'商店':'（从关卡开头）');
  }
  constructor(){super('mine');}
  preload(){loadAssets(this);}
  create(){
    registerFrames(this);
    action.disabled=false;$('status').textContent='素材加载完成，准备开始开采。';
    this.drawWorld();this.configurePlayers();this.feedback=new Feedback(this);this.createOres();this.makeOverlay('今天，会有好收获。','60 秒内收集 $1,000，完成第一次开采。','点击开始开采');this.renderHook();
    $('resume').hidden=!this.saved;
    if(this.saved){$('resume').textContent='继续上次 · 第 '+(this.saved.levelIndex+1)+' 关'+(this.saved.kind==='shop'?'商店':'');$('save-status').textContent=this.saved.kind==='shop'?'已找到上次的商店进度':'已找到存档，将从本关开头继续';}
    $('resume').onclick=()=>this.resumeSaved();
    this.input.on('pointerdown',()=>{if(!this.coop||this.phase!=='playing')this.trigger();});
    $('mode-solo').onclick=()=>this.chooseMode(false);$('mode-coop').onclick=()=>this.chooseMode(true);
    $('action-p2').onclick=()=>this.trigger(1);$('bomb-p2').onclick=()=>this.useBomb(1);
    document.addEventListener('keydown',(event:KeyboardEvent)=>{
      if(event.repeat||event.target instanceof HTMLInputElement||event.target instanceof HTMLSelectElement||event.target instanceof HTMLTextAreaElement)return;
      if(!['Space','ArrowDown','ArrowUp','KeyB','KeyP','KeyS','KeyW'].includes(event.code))return;
      if(event.code==='Space'&&event.target instanceof HTMLButtonElement)return;
      event.preventDefault();
      if(event.code==='KeyP'){this.togglePause();return;}
      if(this.coop){
        if(event.code==='KeyS')this.trigger(0);else if(event.code==='ArrowDown')this.trigger(1);
        else if(event.code==='KeyW')this.useBomb(0);else if(event.code==='ArrowUp')this.useBomb(1);
        else if(event.code==='Space'&&this.phase!=='playing')this.trigger();
      }else{if(event.code==='ArrowUp'||event.code==='KeyB')this.useBomb();else if(event.code==='Space'||event.code==='ArrowDown')this.trigger();}
    });
    action.onclick=()=>this.trigger();$('restart').onclick=()=>this.start();pause.onclick=()=>this.togglePause();
    $('bomb').onclick=()=>this.useBomb();$('buy-bomb').onclick=()=>this.buy('bomb');$('buy-potion').onclick=()=>this.buy('potion');$('next-level').onclick=()=>this.nextLevel();this.hud();
    document.addEventListener('visibilitychange',()=>{if(document.hidden&&this.phase==='playing'&&!this.paused)this.togglePause();});
  }
  drawWorld(){
    this.sky=this.add.image(0,0,BACKGROUNDS[0],'sky').setOrigin(0).setDisplaySize(1000,122);
    this.soil=this.add.image(0,122,BACKGROUNDS[0],'soil').setOrigin(0).setDisplaySize(1000,368);
    this.areaLabel=this.add.text(25,20,'GOLDEN VALLEY',{fontFamily:'sans-serif',fontSize:'11px',color:'#34462b',letterSpacing:3,backgroundColor:'#eadca5',padding:{x:6,y:4}});
    this.areaNumber=this.add.text(972,20,'01',{fontFamily:'monospace',fontSize:'20px',color:'#34462b',backgroundColor:'#eadca5',padding:{x:6,y:2}}).setOrigin(1,0);
  }
  createOres(){
    this.ores.forEach(o=>o.sprite.destroy());this.ores=[];
    for(const [x,y,r,kind,value,weight] of this.level.ores){
      const key=kind==='gold'?'ore_gold_'+(value>=500?'large':value>=250?'medium':'small'):kind==='rock'?'ore_rock':'ore_diamond';
      const frame=this.textures.getFrame(key,'trim');
      const art=this.add.image(0,0,key,'trim').setDisplaySize(r*2,r*2*frame.height/frame.width);
      const sprite=this.add.container(x,y,[art]);this.ores.push({x,y,r,value,weight,kind,sprite,active:true});
    }
  }
  makeOverlay(title:string,subtitle:string,hint:string){this.overlay?.destroy();const bg=this.add.rectangle(500,245,1000,490,0x172017,.72);const titleText=this.add.text(500,207,title,{fontFamily:'"Noto Sans SC",sans-serif',fontSize:'34px',fontStyle:'bold',color:'#f3d18c'}).setOrigin(.5);const sub=this.add.text(500,257,subtitle,{fontFamily:'sans-serif',fontSize:'16px',color:'#e1e4d4'}).setOrigin(.5);const foot=this.add.text(500,307,hint,{fontFamily:'sans-serif',fontSize:'13px',color:'#b3bea4'}).setOrigin(.5);this.overlay=this.add.container(0,0,[bg,titleText,sub,foot]).setDepth(20);}
  start(){
    this.levelIndex=0;this.wallet=0;this.total=0;this.bombs=this.coop?2:1;this.potion=false;this.strength=false;
    this.checkpoint={wallet:0,total:0,bombs:this.bombs,strength:false};this.startLevel();
  }
  startLevel(save=true){
    this.players.forEach(p=>p.reset());
    this.sky.setTexture(BACKGROUNDS[this.levelIndex],'sky');this.soil.setTexture(BACKGROUNDS[this.levelIndex],'soil');
    this.feedback.clear();this.tweens.resumeAll();this.goalReached=false;this.lastWarning=11;this.animationTime=0;
    this.phase='playing';this.paused=false;this.mode='swing';this.angle=0;this.direction=1;this.length=28;
    this.score=0;this.remaining=this.level.seconds;this.caught=undefined;this.createOres();
    this.rope.setDepth(10);this.hook.setDepth(11);this.overlay?.destroy();
    $('shop').hidden=true;pause.disabled=false;pause.innerHTML='暂停 <kbd>P</kbd>';document.body.classList.remove('paused');
    action.innerHTML='放下钩子 <span>SPACE ↓</span>';
    $('status').textContent=this.strength?'力量药水生效！本关回收速度提升 65%。':'观察钩子的方向，瞄准金块再出手。';
    this.areaLabel.setText(this.level.subtitle);this.areaNumber.setText(String(this.levelIndex+1).padStart(2,'0'));
    this.hud();this.renderHook();this.animateMiner(0);if(save)this.persist();
  }
  persist(){
    if(this.phase==='complete'){clearSave(this.coop);$('save-status').textContent='旅程完成 · 最高纪录已保留';return;}
    const shop=this.phase==='shop'||this.phase==='won';
    const save:Save={version:1,kind:shop?'shop':'level',levelIndex:this.levelIndex,checkpoint:shop?{wallet:this.wallet,total:this.total,bombs:this.bombs,strength:false}:{...this.checkpoint},potion:shop?this.potion:false,score:shop?this.score:0};
    if(this.coop)save.contributions=shop?[this.players[0].score,this.players[1].score]:[0,0];
    const ok=writeSave(save,this.coop);$('resume').hidden=true;
    $('save-status').textContent=ok?(shop?'商店进度已保存':'进度已保存 · 刷新可从本关开头继续'):'浏览器未能保存进度，本次仍可正常游玩';
  }
  resumeSaved(){
    const saved=this.saved;if(!saved)return;
    this.saved=null;this.levelIndex=saved.levelIndex;Object.assign(this,saved.checkpoint);this.checkpoint={...saved.checkpoint};this.potion=saved.potion;
    this.startLevel();
    if(saved.kind==='shop'){this.score=saved.score;this.players.forEach((p,i)=>p.score=saved.contributions?.[i]??(i===0?saved.score:0));this.remaining=0;this.phase='won';pause.disabled=true;this.openShop();}
    else {$('status').textContent='已恢复第 '+(this.levelIndex+1)+' 关，资金与道具保持入关时状态。';}
  }
  trigger(index=0){
    if(this.phase==='won'){this.openShop();return;}
    if(this.phase==='shop'){$('shop').scrollIntoView({block:'start',behavior:'smooth'});return;}
    if(this.phase==='lost'){
      Object.assign(this,this.checkpoint);this.startLevel();return;
    }
    if(this.phase!=='playing'){this.start();return;}
    if(this.paused){this.togglePause();return;}
    if(this.players[index]?.fire()){tone(320+index*80,.06);$('status').textContent=(this.coop?'P'+(index+1)+'：':'')+'钩子出发了……';}
  }
  openShop(){
    if(this.phase!=='won')return;
    this.phase='shop';$('shop').hidden=false;
    this.makeOverlay('补给时间。','用开采所得准备下一次冒险。','在下方商店选购，或直接进入下一关');
    action.innerHTML='查看补给商店 <span>↑</span>';this.shopHud();this.persist();$('shop').setAttribute('tabindex','-1');$('shop').focus();$('shop').scrollIntoView({block:'start'});
  }
  shopHud(){
    $('shop-wallet').textContent='$'+this.wallet.toLocaleString();
    $('shop-next').textContent='下一站：'+LEVELS[this.levelIndex+1].name+' · 目标 $'+Math.round(LEVELS[this.levelIndex+1].target*(this.coop?1.3:1)).toLocaleString();
    const bomb=$('buy-bomb') as HTMLButtonElement,potion=$('buy-potion') as HTMLButtonElement;
    bomb.disabled=this.wallet<SHOP.bombPrice||this.bombs>=SHOP.maxBombs;
    bomb.textContent=this.bombs>=SHOP.maxBombs?'已达上限（3）':this.wallet<SHOP.bombPrice?'余额不足':'购买 · $150';
    potion.disabled=this.potion||this.wallet<SHOP.potionPrice;
    potion.textContent=this.potion?'已备好 · 下一关生效':this.wallet<SHOP.potionPrice?'余额不足':'购买 · $300';
    $('shop-owned').textContent=(this.coop?'共用背包：炸药 × ':'背包：炸药 × ')+this.bombs+(this.potion?' · 力量药水 × 1':'');this.hud();
  }
  buy(item:'bomb'|'potion'){
    if(this.phase!=='shop')return;
    const price=item==='bomb'?SHOP.bombPrice:SHOP.potionPrice;
    if(this.wallet<price||(item==='bomb'?this.bombs>=SHOP.maxBombs:this.potion))return;
    this.wallet-=price;if(item==='bomb')this.bombs++;else this.potion=true;
    tone(700);$('shop-message').textContent=item==='bomb'?'炸药已装入背包。':'力量药水已备好，将在下一关自动生效。';this.shopHud();this.persist();
  }
  nextLevel(){
    if(this.phase!=='shop')return;
    this.levelIndex++;this.strength=this.potion;this.potion=false;
    this.checkpoint={wallet:this.wallet,total:this.total,bombs:this.bombs,strength:this.strength};
    $('shop-message').textContent='不买道具也可以直接出发。';this.startLevel();action.focus({preventScroll:true});$('game').scrollIntoView({block:'center'});
  }
  useBomb(index=0){
    const player=this.players[index];if(!player)return;
    if(this.phase!=='playing'||this.paused||player.mode!=='back'||!player.caught||this.bombs<=0)return;
    this.bombs--;const x=player.caught.sprite.x,y=player.caught.sprite.y;
    player.caught.sprite.destroy();player.caught=undefined;
    this.feedback.explode(x,y);
    this.cameras.main.shake(120,.003);tone(90,.2);$('status').textContent='炸掉负重！空钩快速收回，物品不计入收益。';this.hud();
  }
  togglePause(){if(this.phase!=='playing')return;this.paused=!this.paused;document.body.classList.toggle('paused',this.paused);pause.innerHTML=this.paused?'继续 <kbd>P</kbd>':'暂停 <kbd>P</kbd>';action.innerHTML=this.paused?'继续开采 <span>SPACE ↗</span>':'放下钩子 <span>SPACE ↓</span>';if(this.paused){this.tweens.pauseAll();this.makeOverlay('休息一下。','矿藏就在这里，等你回来。','点击矿区或按 P 继续');}else{this.tweens.resumeAll();this.overlay.destroy();}this.hud();}
  animateMiner(dt:number){this.players.forEach(p=>p.animate(dt,this.strength));}
  point(){return this.players[0].point();}
  renderHook(){this.players.forEach(p=>p.render());}
  update(_time:number,delta:number){
    if(this.phase!=='playing'||this.paused)return;
    const dt=Math.min(delta/1000,.1);this.remaining=Math.max(0,this.remaining-delta/1000);
    const seconds=Math.ceil(this.remaining);if(seconds<=10&&seconds>0&&seconds<this.lastWarning){this.lastWarning=seconds;tone(220,.06);}
    if(this.remaining<=0){this.finish();return;}
    // Alternate processing order to avoid permanently favouring one player on exact ties.
    const order=this.updateOrder++%2?[...this.players].reverse():this.players;
    for(const p of order)p.update(dt,this.ores,this.strength,
      hit=>{this.feedback.burst(hit.x,hit.y,hit.kind==='rock'?0xb3aa90:hit.kind==='diamond'?0xbdeedd:0xffd56a);tone(hit.kind==='rock'?120:600);$('status').textContent=(this.coop?'P'+(p.index+1)+'：':'')+(hit.kind==='rock'?'抓到石头了，可用炸药减轻负重。':'抓到了！价值 $'+hit.value+'，正在收回。');},
      ore=>{this.score+=ore.value;this.feedback.coins(p.origin.x,112);
        $('score').animate([{transform:'scale(1)'},{transform:'scale(1.12)',color:'#ffe9a3'},{transform:'scale(1)'}],{duration:350});
        if(!this.goalReached&&this.score>=this.level.target){this.goalReached=true;this.feedback.burst(500,160,0xefba52,24,true);}
        const label=this.add.text(p.origin.x,127,'+$'+ore.value,{fontSize:'24px',fontFamily:'sans-serif',fontStyle:'bold',color:p.index===0?'#ffdf83':'#b9f4eb'}).setOrigin(.5).setDepth(12);
        this.tweens.add({targets:label,y:90,alpha:0,duration:950,onComplete:()=>label.destroy()});tone(880+p.index*100,.16);
        $('status').textContent=this.score>=this.level.target?'目标已达成！继续开采，挑战更高分。':'收回完成，寻找下一块宝藏。';
      });
    // A mineral on either rope has not been banked yet.
    if(this.ores.every(o=>!o.active)&&this.players.every(p=>!p.caught)){this.finish();return;}
    this.hud();
  }
  hud(){
    $('mode-solo').setAttribute('aria-pressed',String(!this.coop));$('mode-coop').setAttribute('aria-pressed',String(this.coop));
    $('coop-panel').hidden=!this.coop;$('action-p2').hidden=!this.coop;$('bomb-p2').hidden=!this.coop;
    $('p1-score').textContent='$'+this.players[0].score.toLocaleString();$('p2-score').textContent='$'+(this.players[1]?.score??0).toLocaleString();
    $('play-help').innerHTML=this.coop?'P1：<kbd>S</kbd> 出钩 / <kbd>W</kbd> 炸药 &nbsp; P2：<kbd>↓</kbd> 出钩 / <kbd>↑</kbd> 炸药<br/><span>共用资金与炸药，力量药水对双方生效。P 暂停全场。</span>':'按 <kbd>空格</kbd> / <kbd>↓</kbd> 出钩，或点击矿区<br/><span>B / ↑ 使用炸药，P 暂停。</span>';
    if(this.phase==='playing')action.innerHTML=this.paused?'继续开采 <span>P</span>':this.coop?'P1 出钩 <span>S</span>':'放下钩子 <span>SPACE ↓</span>';
    $('game').setAttribute('aria-label',this.coop?'双人黄金矿工，玩家一 S 出钩 W 炸药，玩家二下方向键出钩上方向键炸药，P 暂停':'黄金矿工，空格或下方向键出钩，P 暂停');
    const p2bomb=$('bomb-p2') as HTMLButtonElement;p2bomb.disabled=this.phase!=='playing'||this.paused||!this.players[1]?.caught||this.bombs<=0;
    ($('action-p2') as HTMLButtonElement).disabled=this.phase!=='playing'||this.paused;
    const progress=Math.min(100,Math.floor(this.score/this.level.target*100));
    ($('progress') as HTMLProgressElement).value=progress;$('progress-label').textContent=progress>=100?'本关目标已达成':progress+'%';
    document.body.classList.toggle('time-warning',this.phase==='playing'&&this.remaining<=10&&!this.paused);
    $('score').textContent='$'+this.score.toLocaleString();$('target').textContent='$'+this.level.target.toLocaleString();
    $('time').innerHTML=Math.ceil(this.remaining)+'<span>s</span>';
    $('level-name').textContent=String(this.levelIndex+1).padStart(2,'0')+' / '+this.level.name;
    $('journey').textContent='第 '+(this.levelIndex+1)+' / 5 关 · '+this.level.name;
    $('wallet').textContent='$'+this.wallet.toLocaleString();$('total').textContent='$'+this.total.toLocaleString();
    $('power').textContent=this.strength&&this.phase==='playing'?'力量加成 +65%':'常规力量';
    const bomb=$('bomb') as HTMLButtonElement;bomb.textContent=(this.coop?'P1 炸药 · W':'炸药 · B / ↑')+'（共 '+this.bombs+'）';
    bomb.disabled=this.phase!=='playing'||this.paused||!this.caught||this.bombs<=0;
  }
  finish(){
    if(this.phase!=='playing')return;
    const won=this.score>=this.level.target;
    this.phase=won?(this.levelIndex===LEVELS.length-1?'complete':'won'):'lost';pause.disabled=true;
    if(won){this.wallet+=this.score;this.total+=this.score;
      if(this.total>best){best=this.total;try{localStorage.setItem(this.bestKey,String(best));}catch{}$('best').textContent='$'+best.toLocaleString();}
    }
    this.hud();
    const title=this.phase==='complete'?'五关完成，满载而归！':won?'这一站，收获满满。':'差一点，再试一次。';
    const subtitle=this.phase==='complete'?'总开采 $'+this.total.toLocaleString()+' · 剩余资金 $'+this.wallet.toLocaleString():'本关收获 $'+this.score.toLocaleString()+' / 目标 $'+this.level.target.toLocaleString();
    this.makeOverlay(title,subtitle,this.phase==='complete'?'点击开启新的淘金旅程':won?'点击进入补给商店，准备下一关':'点击重试本关，恢复入关时的资金与道具');
    action.innerHTML=this.phase==='complete'?'再来一轮 <span>↗</span>':won?'前往商店 <span>↗</span>':'重试本关 <span>↗</span>';
    $('status').textContent=this.phase==='complete'?'全部矿区开采完成！':won?'本关收益已存入资金，可以购买下一关的补给。':'本关收益未入账；重试时恢复入关状态。';tone(won?1000:180,.3);
    if(won){this.players.forEach(p=>p.celebrate());this.feedback.burst(500,210,0xefba52,38,true);this.feedback.burst(500,210,0xbce2cb,24,true);}this.persist();
  }
}
$('sound').onclick=()=>{sound=!sound;$('sound').textContent=`声音：${sound?'开':'关'}`;$('sound').setAttribute('aria-pressed',String(sound));if(sound)tone(660);};
const game=new Phaser.Game({type:Phaser.AUTO,parent:'game',width:1000,height:490,backgroundColor:'#775437',antialias:true,scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},scene:Mine});
if(import.meta.env.DEV)Object.assign(window,{__miner:game});
