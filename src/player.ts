import Phaser from 'phaser';
import {pullSpeed,segmentHitsCircle} from './mechanics';
import {powerMultiplier} from './growth';
import {tuning} from './tuning';

export type Ore={x:number;y:number;r:number;value:number;weight:number;kind:'gold'|'rock'|'diamond'|'bag';sprite:Phaser.GameObjects.Container;active:boolean};
export class Player {
  mode:'swing'|'out'|'back'='swing';angle=0;direction=1;length=28;caught?:Ore;score=0;animationTime=0;
  origin:{x:number;y:number};rope:Phaser.GameObjects.Graphics;hook:Phaser.GameObjects.Image;
  minerArt:Phaser.GameObjects.Image;crank:Phaser.GameObjects.Image;
  private stand:Phaser.GameObjects.Image;private badge:Phaser.GameObjects.Text;private celebrating=false;
  constructor(private scene:Phaser.Scene,public index:number,x:number,public color:number){
    this.origin={x,y:92};
    this.stand=scene.add.image(x-33,122,'winch_base','trim').setOrigin(.5,1).setDisplaySize(145,54);
    this.minerArt=scene.add.image(x-92,0,`miner_p${index+1}_idle`).setOrigin(0).setDisplaySize(128,128);
    this.crank=scene.add.image(x+15,76,'winch_wheel').setDisplaySize(42,42);
    this.rope=scene.add.graphics().setDepth(10);this.hook=scene.add.image(x,120,`claw_p${index+1}`).setOrigin(.5,.65).setDisplaySize(36,36).setDepth(11);
    this.badge=scene.add.text(x+43,40,'P'+(index+1),{fontFamily:'monospace',fontSize:'12px',color:'#263a2c',backgroundColor:index===0?'#efce89':'#a6e4d8',padding:{x:4,y:2}});
    this.reset();
  }
  reset(){this.celebrating=false;this.mode='swing';this.angle=this.index===0?-.35:.35;this.direction=this.index===0?1:-1;this.length=28;this.caught=undefined;this.score=0;this.animationTime=0;this.crank.rotation=0;this.animate(0,false);this.render();}
  celebrate(){this.celebrating=true;this.minerArt.setTexture(`miner_p${this.index+1}_win`);this.minerArt.y=0;}
  point(){return {x:this.origin.x+Math.sin(this.angle)*this.length,y:this.origin.y+Math.cos(this.angle)*this.length};}
  fire(){if(this.mode!=='swing')return false;this.mode='out';return true;}
  update(dt:number,ores:Ore[],strength:boolean,onCatch:(o:Ore)=>void,onCollect:(o:Ore)=>void,power=0){
    this.animate(dt,strength);
    if(this.mode==='swing'){
      this.angle+=this.direction*1.15*tuning.swing*dt;if(Math.abs(this.angle)>1.27){this.angle=Phaser.Math.Clamp(this.angle,-1.27,1.27);this.direction*=-1;}
    }else if(this.mode==='out'){
      const previous=this.point();this.length+=440*dt;const current=this.point();
      const hit=ores.filter(o=>o.active&&segmentHitsCircle(previous,current,o,o.r+5)).sort((a,b)=>Phaser.Math.Distance.Between(previous.x,previous.y,a.x,a.y)-Phaser.Math.Distance.Between(previous.x,previous.y,b.x,b.y))[0];
      // Claim immediately: the other hook can never own this same mineral.
      if(hit){hit.active=false;this.caught=hit;this.mode='back';onCatch(hit);}
      else if(current.x<20||current.x>980||current.y>467)this.mode='back';
    }else{
      this.length=Math.max(28,this.length-pullSpeed(this.caught?.weight??0)*tuning.pull*(strength?1.65:1)*powerMultiplier(power,this.caught?.weight??0)*dt);
      if(this.caught){const p=this.point();this.caught.sprite.setPosition(p.x,p.y+this.caught.r*.5);}
      if(this.length<=28){if(this.caught){const ore=this.caught;this.caught=undefined;this.score+=ore.value;onCollect(ore);ore.sprite.destroy();}this.mode='swing';}
    }
    this.render();
  }
  animate(dt:number,strength:boolean){
    this.animationTime+=dt;const bob=this.mode==='back'&&!!this.caught&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches?Math.sin(this.animationTime*14)*1.7:0;
    this.minerArt.y=bob;if(this.mode!=='swing')this.crank.rotation+=dt*(this.mode==='out'?7:-5)*(strength?1.65:1);
    const pose=this.celebrating?'win':(this.mode==='back'&&this.caught)?'pull':'idle';
    this.minerArt.setTexture(`miner_p${this.index+1}_${pose}`);
  }
  render(){
    const p=this.point();this.rope.clear().lineStyle(2,this.color).lineBetween(this.origin.x+15,86,this.origin.x,this.origin.y).lineBetween(this.origin.x,this.origin.y,p.x-Math.sin(this.angle)*18,p.y-Math.cos(this.angle)*18);
    this.hook.setPosition(p.x,p.y).setRotation(-this.angle);
  }
  destroy(){for(const o of [this.stand,this.minerArt,this.crank,this.rope,this.hook,this.badge])o.destroy();}
}
