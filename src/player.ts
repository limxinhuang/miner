import Phaser from 'phaser';
import {pullSpeed,segmentHitsCircle} from './mechanics';

export type Ore={x:number;y:number;r:number;value:number;weight:number;kind:'gold'|'rock'|'diamond';sprite:Phaser.GameObjects.Container;active:boolean};
export class Player {
  mode:'swing'|'out'|'back'='swing';angle=0;direction=1;length=28;caught?:Ore;score=0;animationTime=0;
  origin:{x:number;y:number};rope:Phaser.GameObjects.Graphics;hook:Phaser.GameObjects.Graphics;
  minerArt:Phaser.GameObjects.Graphics;crank:Phaser.GameObjects.Graphics;arms:Phaser.GameObjects.Graphics;
  private stand:Phaser.GameObjects.Graphics;private badge:Phaser.GameObjects.Text;
  constructor(private scene:Phaser.Scene,public index:number,x:number,public color:number){
    this.origin={x,y:92};
    const dx=x-500;
    this.stand=scene.add.graphics({x:dx});this.stand.fillStyle(0x3a4130).fillRoundedRect(440,100,123,14,3).fillStyle(0x6c4930).fillRect(455,82,9,25).fillRect(545,82,9,25);
    this.minerArt=scene.add.graphics({x:dx});const g=this.minerArt;
    g.fillStyle(0x33392c).fillRoundedRect(474,66,38,36,6).fillStyle(0xbb7846).fillRoundedRect(477,53,30,29,8).fillStyle(0xf0bd76).fillCircle(493,51,18);
    g.fillStyle(0xe6dbb7).fillTriangle(478,54,508,54,493,78).fillStyle(0x34352c).fillCircle(487,49,2).fillCircle(500,49,2);
    g.fillStyle(color).fillRoundedRect(474,28,37,18,8).fillRect(469,42,47,6).fillStyle(0xffe4a1).fillCircle(494,36,6);
    this.crank=scene.add.graphics({x:x+26,y:82});this.crank.lineStyle(5,0x3b392d).strokeCircle(0,0,15).lineBetween(0,-15,0,15).lineBetween(-15,0,15,0).fillStyle(0xcb9950).fillCircle(0,0,5);
    this.arms=scene.add.graphics({x:dx});this.rope=scene.add.graphics().setDepth(10);this.hook=scene.add.graphics().setDepth(11);
    this.badge=scene.add.text(x+53,57,'P'+(index+1),{fontFamily:'monospace',fontSize:'12px',color:'#263a2c',backgroundColor:'#d9dfbc',padding:{x:4,y:2}});
    this.reset();
  }
  reset(){this.mode='swing';this.angle=this.index===0?-.35:.35;this.direction=this.index===0?1:-1;this.length=28;this.caught=undefined;this.score=0;this.animationTime=0;this.crank.rotation=0;this.animate(0,false);this.render();}
  point(){return{x:this.origin.x+Math.sin(this.angle)*this.length,y:this.origin.y+Math.cos(this.angle)*this.length};}
  fire(){if(this.mode!=='swing')return false;this.mode='out';return true;}
  update(dt:number,ores:Ore[],strength:boolean,onCatch:(o:Ore)=>void,onCollect:(o:Ore)=>void){
    this.animate(dt,strength);
    if(this.mode==='swing'){
      this.angle+=this.direction*1.15*dt;if(Math.abs(this.angle)>1.27){this.angle=Phaser.Math.Clamp(this.angle,-1.27,1.27);this.direction*=-1;}
    }else if(this.mode==='out'){
      const previous=this.point();this.length+=440*dt;const current=this.point();
      const hit=ores.filter(o=>o.active&&segmentHitsCircle(previous,current,o,o.r+5)).sort((a,b)=>Phaser.Math.Distance.Between(previous.x,previous.y,a.x,a.y)-Phaser.Math.Distance.Between(previous.x,previous.y,b.x,b.y))[0];
      // Claim immediately: the other hook can never own this same mineral.
      if(hit){hit.active=false;this.caught=hit;this.mode='back';onCatch(hit);}
      else if(current.x<20||current.x>980||current.y>467)this.mode='back';
    }else{
      this.length=Math.max(28,this.length-pullSpeed(this.caught?.weight??0)*(strength?1.65:1)*dt);
      if(this.caught){const p=this.point();this.caught.sprite.setPosition(p.x,p.y+this.caught.r*.5);}
      if(this.length<=28){if(this.caught){const ore=this.caught;this.caught=undefined;this.score+=ore.value;onCollect(ore);ore.sprite.destroy();}this.mode='swing';}
    }
    this.render();
  }
  animate(dt:number,strength:boolean){
    this.animationTime+=dt;const bob=this.mode==='back'&&!!this.caught&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches?Math.sin(this.animationTime*14)*1.7:0;
    this.minerArt.y=bob;if(this.mode!=='swing')this.crank.rotation+=dt*(this.mode==='out'?7:-5)*(strength?1.65:1);
    const hand={x:526+Math.cos(this.crank.rotation)*11,y:82+Math.sin(this.crank.rotation)*11};
    this.arms.clear().lineStyle(7,0xbb7846).lineBetween(501,72+bob,hand.x,hand.y).fillStyle(0xf0bd76).fillCircle(hand.x,hand.y,4);
  }
  render(){
    const p=this.point();this.rope.clear().lineStyle(2.5,this.color).lineBetween(this.origin.x,this.origin.y,p.x,p.y);this.hook.clear().lineStyle(4,this.color);
    const point=(x:number,y:number)=>({x:p.x+x*Math.cos(this.angle)+y*Math.sin(this.angle),y:p.y-x*Math.sin(this.angle)+y*Math.cos(this.angle)});
    this.hook.strokePoints([point(-9,0),point(-11,10),point(-5,15),point(0,8),point(5,15),point(11,10),point(9,0)],false);
  }
  destroy(){for(const o of [this.stand,this.minerArt,this.crank,this.arms,this.rope,this.hook,this.badge])o.destroy();}
}
