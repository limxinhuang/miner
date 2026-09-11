import Phaser from 'phaser';
import './style.css';
import {Player,type Ore} from './player';
import {freshGrowth,progress,points,bagReward,type Growth,type Settlement} from './growth';
import {routes,minerals,STAGES,SHOP,type RouteKind} from './expedition';
import {readSave,writeSave,clearSave,type Save} from './save';
import {Feedback} from './feedback';
import {BACKGROUNDS,loadAssets,registerFrames} from './assets';
import {mountGameUI} from './game-ui';
import {mountTuning} from './tuning';

const $=(id:string)=>document.getElementById(id)!;
const button=(id:string)=>$(id) as HTMLButtonElement;
mountTuning();mountGameUI();
let sound=false,audio:AudioContext|undefined;
function tone(freq:number,duration=.1){if(!sound)return;try{audio??=new AudioContext();void audio.resume();const o=audio.createOscillator(),g=audio.createGain();o.frequency.value=freq;g.gain.setValueAtTime(.06,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+duration);}catch{}}

class Mine extends Phaser.Scene {
  campView:'upgrades'|'routes'='routes';
  phase:'ready'|'route'|'playing'|'shop'|'settlement'|'lost'|'complete'='ready';paused=false;
  seed=0;stage=0;wallet=0;bombs=2;potion=false;strength=false;remaining=0;
  selected:RouteKind|null=null;votes:[RouteKind|null,RouteKind|null]=[null,null];history:RouteKind[]=[];
  players:Player[]=[];ores:Ore[]=[];growth:Growth[]=[freshGrowth(),freshGrowth()];settlement:Settlement|null=null;
  sky!:Phaser.GameObjects.Image;soil!:Phaser.GameObjects.Image;overlay?:Phaser.GameObjects.Container;feedback!:Feedback;
  saved=readSave();updateOrder=0;saveElapsed=0;lastWarning=11;bankAtEntry=0;best=0;
  get choices(){return routes(this.seed,this.stage);}
  get route(){return this.choices.find(r=>r.id===this.selected);}
  constructor(){super('mine');}
  preload(){loadAssets(this);}
  create(){
    registerFrames(this);this.feedback=new Feedback(this);
    this.sky=this.add.image(0,0,BACKGROUNDS[0],'sky').setOrigin(0).setDisplaySize(1000,122);
    this.soil=this.add.image(0,122,BACKGROUNDS[0],'soil').setOrigin(0).setDisplaySize(1000,368);
    this.players=[new Player(this,0,300,0xe9af40),new Player(this,1,700,0x7fcac2)];
    try{this.best=Number(localStorage.getItem('gold-digger-expedition-best'))||0;}catch{}
    $('best').textContent='$'+this.best.toLocaleString();
    this.makeOverlay('两个人，一场淘金远征。','选择路线，用同一个钱包购买补给并达成目标。','P1：S / W     P2：↓ / ↑     P：暂停');
    button('resume').hidden=!this.saved;button('resume').textContent=this.saved?`继续远征 · 第 ${this.saved.stage+1} 站`:'继续远征';
    button('resume').onclick=()=>this.resumeSaved();button('restart').onclick=()=>this.newRun();
    button('action').onclick=()=>this.trigger(0);button('action-p2').onclick=()=>this.trigger(1);
    button('bomb').onclick=()=>this.useBomb(0);button('bomb-p2').onclick=()=>this.useBomb(1);button('pause').onclick=()=>this.togglePause();
    button('buy-bomb').onclick=()=>this.buy('bomb');button('buy-potion').onclick=()=>this.buy('potion');button('next-level').onclick=()=>this.depart();
    button('camp-upgrades').onclick=()=>{this.campView='upgrades';this.hud();};
    button('camp-routes').onclick=()=>{this.campView='routes';this.hud();};
    button('settlement-continue').onclick=()=>this.completeSettlement();
    $('growth').onclick=event=>{const b=(event.target as HTMLElement).closest<HTMLButtonElement>('button[data-stat]');if(b)this.allocate(Number(b.dataset.player),b.dataset.stat as 'power'|'luck');};
    $('route-cards').onclick=event=>{const target=(event.target as HTMLElement).closest<HTMLButtonElement>('button[data-route]');if(target)this.vote(Number(target.dataset.player),target.dataset.route as RouteKind);};
    document.addEventListener('keydown',e=>{
      if(e.repeat||e.target instanceof HTMLInputElement||e.target instanceof HTMLSelectElement||e.target instanceof HTMLTextAreaElement)return;
      if(!['Space','KeyS','KeyW','ArrowDown','ArrowUp','KeyP'].includes(e.code))return;
      if(e.code==='Space'&&e.target instanceof HTMLButtonElement)return;
      e.preventDefault();if(e.code==='KeyP')this.togglePause();else if(e.code==='KeyW')this.useBomb(0);else if(e.code==='ArrowUp')this.useBomb(1);else if(e.code==='KeyS')this.trigger(0);else if(e.code==='ArrowDown')this.trigger(1);else if(this.phase!=='playing')this.trigger(0);
    });
    document.addEventListener('visibilitychange',()=>{if(document.hidden){if(this.phase==='playing'&&!this.paused)this.togglePause();this.persist();}});
    window.addEventListener('pagehide',()=>this.persist());window.addEventListener('beforeunload',()=>this.persist());
    $('status').textContent='准备出发；失败会结束本轮，速度调节仅用于测试。';this.hud();
  }
  makeOverlay(title:string,sub:string,hint:string){
    this.overlay?.destroy();this.overlay=this.add.container(0,0,[this.add.rectangle(500,245,1000,490,0x172017,.75),
      this.add.text(500,205,title,{fontFamily:'sans-serif',fontSize:'32px',fontStyle:'bold',color:'#f3d18c'}).setOrigin(.5),
      this.add.text(500,260,sub,{fontFamily:'sans-serif',fontSize:'16px',color:'#e1e4d4'}).setOrigin(.5),
      this.add.text(500,307,hint,{fontFamily:'sans-serif',fontSize:'13px',color:'#b3bea4'}).setOrigin(.5)]).setDepth(20);
  }
  clearMine(){this.ores.forEach(o=>o.sprite.destroy());this.ores=[];this.players.forEach(p=>p.reset());this.feedback.clear();this.tweens.resumeAll();this.overlay?.destroy();}
  newRun(){
    this.clearMine();this.seed=crypto.getRandomValues(new Uint32Array(1))[0];this.stage=0;this.wallet=0;this.bombs=2;this.potion=false;this.strength=false;this.remaining=0;this.selected=null;this.votes=[null,null];this.history=[];this.paused=false;this.phase='route';this.campView='routes';this.saved=null;this.growth=[freshGrowth(),freshGrowth()];this.settlement=null;
    button('resume').hidden=true;this.makeOverlay('远征开始，选一条路。','三条路线，不同风险；双方选中同一条后出发。','福袋拉回即开，金币和经验立即入账');this.renderRoutes();this.hud();this.persist();
  }
  vote(player:number,id:RouteKind){
    if(!['route','shop'].includes(this.phase)||![0,1].includes(player)||!this.choices.some(r=>r.id===id))return;
    this.votes[player]=id;this.renderRoutes();this.hud();this.persist();
  }
  renderRoutes(){
    const agreed=this.votes[0]!==null&&this.votes[0]===this.votes[1];
    $('route-heading').textContent=`第 ${this.stage+1} / ${STAGES} 站 · 选择下一片矿区`;
    $('route-history').textContent=this.history.length?'已走过：'+this.history.map(k=>({gold:'富金',crystal:'水晶',ruins:'遗迹',danger:'危险'})[k]).join(' → '):'起点 → 5 站远征 → 最终结算';
    $('route-cards').innerHTML=this.choices.map(r=>`<article class="route-card ${agreed&&this.votes[0]===r.id?'agreed':''}"><img class="route-art" src="/assets/ui/ui_route_${r.id}.png" alt=""/><span class="route-type">${{gold:'◆ GOLD',crystal:'◇ CRYSTAL',ruins:'▣ RELIC',danger:'▲ RISK'}[r.id]}</span><h3>${r.name}</h3><p>${r.description}</p><strong>余额目标 $${r.target.toLocaleString()}</strong><p>${r.seconds} 秒 · 还需赚 $${Math.max(0,r.target-this.wallet).toLocaleString()}</p><div>${[0,1].map(p=>`<button data-route="${r.id}" data-player="${p}" aria-pressed="${this.votes[p]===r.id}">P${p+1} ${this.votes[p]===r.id?'已选择':'选这条'}</button>`).join('')}</div></article>`).join('');
    $('route-agreement').textContent=agreed?'双方选择一致，可以出发。':'请两位玩家各选一条路线；选择一致后才能出发。';
    button('next-level').disabled=!agreed;
  }
  depart(){
    if(!['route','shop'].includes(this.phase)||!this.votes[0]||this.votes[0]!==this.votes[1])return;
    this.settlement=null;this.selected=this.votes[0];this.strength=this.potion;this.potion=false;this.clearMine();this.createMine();this.remaining=this.route!.seconds;this.bankAtEntry=this.wallet;this.phase='playing';this.paused=false;this.lastWarning=11;
    $('status').textContent=this.strength?'力量药水已生效，双方本矿区回收 +65%。':'矿物入账就增加钱包余额；离开矿区时检查余额目标。';this.hud();this.persist();button('action').focus({preventScroll:true});
  }
  createMine(){
    const r=this.route!;this.sky.setTexture(BACKGROUNDS[r.background],'sky');this.soil.setTexture(BACKGROUNDS[r.background],'soil');
    for(const [x,y,radius,kind,value,weight] of minerals(this.seed,this.stage,r.id)){
      if(kind==='bag'){
        const art=this.add.image(0,0,'ore_lucky_bag','trim').setDisplaySize(radius*2,radius*2*418/322);
        const sprite=this.add.container(x,y,[art]);this.ores.push({x,y,r:radius,kind,value,weight,sprite,active:true});continue;
      }
      const key=kind==='gold'?'ore_gold_'+(value>=500?'large':'medium'):kind==='rock'?'ore_rock':'ore_diamond';const frame=this.textures.getFrame(key,'trim');
      const art=this.add.image(0,0,key,'trim').setDisplaySize(radius*2,radius*2*frame.height/frame.width);const sprite=this.add.container(x,y,[art]);this.ores.push({x,y,r:radius,kind,value,weight,sprite,active:true});
    }
  }
  trigger(index:number){
    if(this.phase==='ready'||this.phase==='lost'||this.phase==='complete'){this.newRun();return;}
    if(this.phase==='settlement'){return;}
    if(this.phase==='route'||this.phase==='shop'){this.campView='routes';this.hud();return;}
    if(this.paused){this.togglePause();return;}
    const p=this.players[index];
    if(p.fire()){tone(320+index*90);$('status').textContent=`P${index+1} 钩子出发了。`;}
    this.persist();
  }
  award(value:number,index:number,bag=false){
    const oldLevel=progress(this.growth[index].xp).level;
    this.wallet+=value;
    this.growth[index].xp+=value;
    const x=this.players[index].origin.x;this.feedback.coins(x,112);tone(880,.15);
    const label=this.add.text(x,140,(bag?'福袋 ':'')+'+$'+value,{fontFamily:'sans-serif',fontSize:'25px',color:'#ffe69c',fontStyle:'bold'}).setOrigin(.5).setDepth(15);this.tweens.add({targets:label,y:98,alpha:0,duration:900,onComplete:()=>label.destroy()});
    const gained=progress(this.growth[index].xp).level-oldLevel;
    if(gained){const level=this.add.text(x,173,`升级 · +${gained} 点`,{fontFamily:'sans-serif',fontSize:'18px',color:'#bce5cf'}).setOrigin(.5).setDepth(15);this.tweens.add({targets:level,y:148,alpha:0,duration:1200,onComplete:()=>level.destroy()});}
    $('status').textContent=`P${index+1} ${bag?'福袋打开！':''}入账 $${value}，钱包余额 $${this.wallet}。`;
    this.persist();
  }
  useBomb(index:number){
    const p=this.players[index];if(this.phase!=='playing'||this.paused||this.bombs<=0||p.mode!=='back'||!p.caught)return;
    this.bombs--;this.feedback.explode(p.caught.sprite.x,p.caught.sprite.y);p.caught.sprite.destroy();p.caught=undefined;tone(90,.2);$('status').textContent='炸掉负重，物品不会进入钱包。';this.hud();this.persist();
  }
  buy(item:'bomb'|'potion'){
    if(this.phase!=='shop')return;const price=item==='bomb'?SHOP.bombPrice:SHOP.potionPrice;
    if(this.wallet<price||(item==='bomb'?this.bombs>=SHOP.maxBombs:this.potion))return;
    this.wallet-=price;if(item==='bomb')this.bombs++;else this.potion=true;
    this.makeOverlay('休整之后，继续深入。',`共用钱包 $${this.wallet}；购物会让下一站需要赚更多。`,'购买补给，并由两人共同选择下一条路线');
    $('shop-message').textContent=`已支付 $${price}；新余额 $${this.wallet}，请留意下一站的资金缺口。`;tone(700);this.renderRoutes();this.hud();this.persist();
  }
  togglePause(){
    if(this.phase!=='playing')return;this.paused=!this.paused;
    if(this.paused){this.tweens.pauseAll();this.makeOverlay('远征暂停。',`钱包 $${this.wallet} · 剩余 ${Math.ceil(this.remaining)} 秒`,'按 P 或继续按钮回到原来的位置');}
    else{this.tweens.resumeAll();this.overlay?.destroy();}this.hud();this.persist();
  }
  update(_time:number,delta:number){
    if(this.phase!=='playing'||this.paused)return;const dt=Math.min(delta/1000,.1);this.remaining=Math.max(0,this.remaining-delta/1000);
    if(this.remaining<=0){this.finish();return;}
    const seconds=Math.ceil(this.remaining);if(seconds<=10&&seconds<this.lastWarning){this.lastWarning=seconds;tone(220,.07);}
    const order=this.updateOrder++%2?[...this.players].reverse():this.players;
    for(const p of order)p.update(dt,this.ores,this.strength,
      o=>{this.feedback.burst(o.x,o.y,o.kind==='rock'?0xb0a68e:0xf5d17d);$('status').textContent=o.kind==='bag'?'抓到福袋，完整拉回后立即打开。':`P${p.index+1} 抓到矿物，回收后入账 ${o.value}。`;},
      o=>{if(o.kind==='bag'){const value=bagReward(this.seed,this.stage,this.ores.indexOf(o),this.growth[p.index].luck);p.score+=value;this.award(value,p.index,true);}else this.award(o.value,p.index);},this.growth[p.index].power);
    if(this.ores.every(o=>!o.active)&&this.players.every(p=>!p.caught)){this.finish();return;}
    this.hud();this.saveElapsed+=delta;if(this.saveElapsed>=250){this.saveElapsed=0;this.persist();}
  }
  finish(){
    if(this.phase!=='playing')return;
    this.settlement={before:this.wallet,target:this.route!.target,rewards:[[],[]]};this.phase='settlement';this.paused=false;this.feedback.clear();this.tweens.resumeAll();
    $('status').textContent='采矿结束，所有收入已入账。';
    this.makeOverlay('本矿区结算。',`钱包 ${this.wallet} / 目标 ${this.settlement.target}`,'查看本局收入和等级变化，再继续远征');
    this.hud();this.persist();
  }
  completeSettlement(){
    if(this.phase!=='settlement'||!this.settlement)return;
    const target=this.settlement.target,endingWallet=this.wallet,won=endingWallet>=target;
    this.feedback.clear();this.paused=false;this.tweens.resumeAll();
    if(!won){
      this.phase='lost';this.growth=[freshGrowth(),freshGrowth()];this.wallet=0;this.bombs=0;this.potion=false;this.strength=false;clearSave();
      this.makeOverlay('远征结束，下次走得更远。',`止步第 ${this.stage+1} 站 · 结算余额 $${endingWallet} / 目标 $${target}`,'本轮钱包和道具已清空；开始新的远征');$('status').textContent='余额未达目标，本轮结束。没有本关重试。';
    }else{
      this.history.push(this.selected!);
      if(this.stage===STAGES-1){
        this.phase='complete';this.best=Math.max(this.best,this.wallet);try{localStorage.setItem('gold-digger-expedition-best',String(this.best));}catch{}clearSave();
        this.makeOverlay('远征完成，满载而归！',`最终共用钱包 $${this.wallet.toLocaleString()} · 已通过全部 5 站`,'开始下一轮，探索不同路线');this.players.forEach(p=>p.celebrate());this.feedback.burst(500,210,0xefba52,36,true);
      }else{
        this.stage++;this.phase='shop';this.campView='upgrades';this.selected=null;this.votes=[null,null];this.potion=false;this.strength=false;
        $('shop-message').textContent='可以保留资金，直接选择路线出发。';
        this.makeOverlay('休整之后，继续深入。',`共用钱包 $${this.wallet}；购物会让下一站需要赚更多。`,'购买补给，并由两人共同选择下一条路线');this.renderRoutes();
      }
      $('status').textContent=this.phase==='complete'?'五站远征完成！':'余额达标，进入营地补给和选路。';
    }
    this.settlement=null;this.hud();this.persist();  }
  snapshot():Save{
    const playing=this.phase==='playing';
    return {version:2,seed:this.seed,stage:this.stage,phase:playing?'playing':this.phase==='settlement'?'settlement':this.phase==='shop'?'shop':'route',wallet:this.wallet,bombs:this.bombs,potion:this.potion,strength:this.strength,remaining:this.remaining,selected:this.selected,votes:[...this.votes],history:[...this.history],
      players:this.players.map(p=>({mode:playing?p.mode:'swing',angle:playing?p.angle:p.index===0?-.35:.35,direction:playing?p.direction:p.index===0?1:-1,length:playing?p.length:28,score:p.score,caught:playing&&p.caught?this.ores.indexOf(p.caught):null})),active:playing?this.ores.map(o=>o.active):[],growth:structuredClone(this.growth),settlement:structuredClone(this.settlement)};
  }
  persist(){
    if(['ready','lost','complete'].includes(this.phase))return;
    const ok=writeSave(this.snapshot());$('save-status').textContent=ok?'已保存当前远征 · 时间、负重、福袋与成长同步保留':'保存不可用，请保持页面打开';button('resume').hidden=true;
  }
  resumeSaved(){
    const s=this.saved;if(!s)return;this.clearMine();this.saved=null;
    this.seed=s.seed;this.stage=s.stage;this.phase=s.phase;this.campView=s.phase==='shop'?'upgrades':'routes';this.wallet=s.wallet;this.bombs=s.bombs;this.potion=s.potion;this.strength=s.strength;this.remaining=s.remaining;this.selected=s.selected;this.votes=[...s.votes];this.history=[...s.history];this.growth=structuredClone(s.growth);this.settlement=structuredClone(s.settlement);
    if(s.phase==='playing'){
      this.createMine();this.ores.forEach((o,i)=>{o.active=s.active[i];o.sprite.setVisible(o.active);});
      this.players.forEach((p,i)=>{const v=s.players[i];p.mode=v.mode;p.angle=v.angle;p.direction=v.direction;p.length=v.length;p.score=v.score;p.caught=v.caught===null?undefined:this.ores[v.caught];if(p.caught){const point=p.point();p.caught.sprite.setVisible(true).setPosition(point.x,point.y+p.caught.r*.5);}p.animate(0,this.strength);p.render();});
      this.paused=true;this.tweens.pauseAll();this.makeOverlay('已恢复远征，准备继续。',`剩余 ${Math.ceil(this.remaining)} 秒 · 钱包 $${this.wallet}`,'按 P 或继续按钮开始，场上状态不会重置');
    }else if(s.phase==='settlement'){this.paused=false;this.players.forEach((p,i)=>p.score=s.players[i].score);this.makeOverlay('已恢复矿区结算。',`钱包 ${this.wallet} / 目标 ${this.settlement!.target}`,'福袋奖励已入账，查看结果后继续');}
    else{this.paused=false;this.players.forEach((p,i)=>p.score=s.players[i].score);this.makeOverlay('欢迎回到远征。',`共用钱包 $${this.wallet} · 第 ${this.stage+1} 站`,'继续选择路线与补给');this.renderRoutes();}
    if(s.phase==='playing')for(let i=0;i<2;i++){
      const pending=this.growth[i].bags;this.growth[i].bags=[];
      for(const id of pending){const value=bagReward(this.seed,this.stage,id,this.growth[i].luck);this.players[i].score+=value;this.award(value,i,true);}
    }
    $('status').textContent=s.phase==='settlement'?'已恢复结算，福袋奖励已入账。':s.phase==='playing'?'现场已恢复，按 P 继续。':'已恢复营地，可以加点、补给和选路。';
    button('resume').hidden=true;this.hud();this.persist();
  }
  allocate(index:number,stat:'power'|'luck'){
    if(this.phase!=='shop'||![0,1].includes(index)||!['power','luck'].includes(stat)||points(this.growth[index])<=0)return;
    this.growth[index][stat]++;this.hud();this.persist();
  }
  renderGrowth(){
    const canSpend=this.phase==='shop';
    $('growth').hidden=this.phase!=='shop'||this.campView!=='upgrades';
    for(let i=0;i<2;i++){
      const g=this.growth[i],p=progress(g.xp);
      $(`growth-info-${i}`).textContent=`Lv.${p.level} · 经验 ${g.xp} · 下级 ${p.current}/${p.needed} · 可用点数 ${points(g)}`;
      $(`hud-growth-${i}`).textContent=`Lv.${p.level} · 力 ${g.power} / 运 ${g.luck} · ${points(g)} 点`;
      $(`bags-${i}`).textContent='';
      ($(`xp-${i}`) as HTMLProgressElement).value=p.current/p.needed*100;
      $(`xp-${i}`).title=`经验 ${p.current} / ${p.needed}`;
      for(const stat of ['power','luck'] as const){const b=document.querySelector<HTMLButtonElement>(`button[data-stat="${stat}"][data-player="${i}"]`)!;b.textContent=`${stat==='power'?'力量':'运气'} ${g[stat]} ＋`;b.disabled=!canSpend||points(g)<=0;}
    }
    $('settlement').hidden=this.phase!=='settlement';
    if(this.phase==='settlement'&&this.settlement){
      const r=this.settlement;
      $('settlement-results').innerHTML=this.players.map((p,i)=>`<article><h3>P${i+1} · 本局收入</h3><strong class="round-income">$${p.score.toLocaleString()}</strong><p>等级 Lv.${progress(Math.max(0,this.growth[i].xp-p.score)).level} → Lv.${progress(this.growth[i].xp).level}</p></article>`).join('');
      $('settlement-total').textContent=`最终钱包 $${this.wallet.toLocaleString()} / 目标 $${r.target.toLocaleString()} · ${this.wallet>=r.target?'通关':'未达标'}`;
      button('settlement-continue').textContent=this.wallet<r.target?'结束本轮':this.stage===STAGES-1?'完成远征':'进入营地 · 加点与补给';
    }
  }
  hud(){
    this.renderGrowth();
    const active=this.phase==='playing',camp=this.phase==='route'||this.phase==='shop';
    $('end-badge').hidden=!['lost','complete'].includes(this.phase);
    ($('end-badge') as HTMLImageElement).src=`/assets/ui/ui_badge_${this.phase==='lost'?'failure':'success'}.png`;
    if(this.settlement)($('result-badge') as HTMLImageElement).src=`/assets/ui/ui_badge_${this.wallet>=this.settlement.target?'success':'failure'}.png`;
    $('game-shell').dataset.phase=this.phase;$('game-shell').dataset.paused=String(this.paused);
    $('camp-screen').hidden=!camp;
    $('camp-upgrades').hidden=this.phase!=='shop';
    $('camp-routes').setAttribute('aria-pressed',String(this.campView==='routes'));
    $('camp-upgrades').setAttribute('aria-pressed',String(this.campView==='upgrades'));
    $('camp-bank').textContent=`共用钱包 ${this.wallet.toLocaleString()}`;
    $('routes').hidden=!camp||this.campView!=='routes';$('shop').hidden=this.phase!=='shop'||this.campView!=='upgrades';
    this.overlay?.setVisible(!camp&&this.phase!=='settlement');
    $('score').textContent='$'+this.wallet.toLocaleString();$('wallet').textContent='$'+this.wallet.toLocaleString();
    $('target').textContent=this.route?'$'+this.route.target.toLocaleString():camp?'选路后确定':'—';$('time').innerHTML=(active?Math.ceil(this.remaining):'—')+'<span>s</span>';
    $('journey').textContent=`第 ${this.stage+1} / ${STAGES} 站 · ${this.route?.name??(camp?'营地选路':'合作远征')}`;$('level-name').textContent=this.route?.name??'合作远征';
    $('power').textContent=this.strength&&active?'力量 +65%':this.potion?'药水已备好':'常规力量';
    $('p1-score').textContent='$'+this.players[0].score.toLocaleString();$('p2-score').textContent='$'+this.players[1].score.toLocaleString();$('best').textContent='$'+this.best.toLocaleString();
    const pct=this.route?Math.min(100,this.wallet/this.route.target*100):0;($('progress') as HTMLProgressElement).value=pct;$('progress-label').textContent=this.route?`钱包目标 ${Math.floor(pct)}%`:'同一个钱包：达标与消费';
    button('action').textContent=active?this.paused?'继续远征 · P':'P1 出钩 · S':this.phase==='settlement'?'查看结算':camp?'查看路线':'开始新远征';
    button('action-p2').disabled=!active||this.paused;button('action-p2').textContent='P2 出钩 · ↓';
    for(let i=0;i<2;i++){const b=button(i?'bomb-p2':'bomb');b.textContent=`P${i+1} 炸药 · ${i?'↑':'W'}（共 ${this.bombs}）`;b.disabled=!active||this.paused||!this.players[i].caught||!this.bombs;}
    button('pause').disabled=!active;button('pause').textContent=this.paused?'继续 · P':'暂停 · P';
    document.body.classList.toggle('time-warning',active&&this.remaining<=10&&!this.paused);document.body.classList.toggle('paused',this.paused);
    $('shop-wallet').textContent='$'+this.wallet.toLocaleString();$('shop-owned').textContent=`共用炸药 × ${this.bombs}${this.potion?' · 下一站力量药水已备好':''}`;
    $('shop-next').textContent='下方路线实时显示资金缺口；购买后不会撤销上一站通关。';
    button('buy-bomb').disabled=this.phase!=='shop'||this.wallet<150||this.bombs>=3;button('buy-potion').disabled=this.phase!=='shop'||this.wallet<300||this.potion;
    button('buy-bomb').textContent=this.bombs>=3?'背包已满':'购买 · $150';button('buy-potion').textContent=this.potion?'已备好':'购买 · $300';
    if(this.phase==='lost'||this.phase==='complete'){$('save-status').textContent='本轮已结束，不保留续玩存档';button('resume').hidden=true;}
  }
}
$('sound').onclick=()=>{sound=!sound;$('sound').textContent=`声音：${sound?'开':'关'}`;$('sound').setAttribute('aria-pressed',String(sound));if(sound)tone(660);};
const game=new Phaser.Game({type:Phaser.AUTO,parent:'game',width:1000,height:490,backgroundColor:'#775437',antialias:true,scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},scene:Mine});
if(import.meta.env.DEV)Object.assign(window,{__miner:game});
