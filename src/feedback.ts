import Phaser from 'phaser';

/** Short-lived, bounded effects that are removed on level transitions. */
export class Feedback {
  private objects=new Set<Phaser.GameObjects.Image>();
  constructor(private scene:Phaser.Scene){}
  burst(x:number,y:number,color:number,count=12,celebrate=false){
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    for(let i=0;i<(reduced?3:count);i++){
      const angle=(Math.PI*2*i)/count;
      const p=this.scene.add.image(x,y,'fx_sparkle','trim').setDisplaySize(celebrate?14:9,celebrate?14:9).setTint(color).setDepth(celebrate?25:15);
      this.objects.add(p);
      this.scene.tweens.add({targets:p,x:x+Math.cos(angle)*(celebrate?280:36),y:y+Math.sin(angle)*(celebrate?145:36)+(celebrate?50:0),angle:reduced?0:i*60,alpha:0,duration:reduced?250:celebrate?1300:450,ease:'Cubic.Out',onComplete:()=>{this.objects.delete(p);p.destroy();}});
    }
  }
  coins(x:number,y:number){
    for(let i=0;i<5;i++){
      const p=this.scene.add.image(x,y,'fx_coin','trim').setDisplaySize(14,14).setDepth(15);this.objects.add(p);
      this.scene.tweens.add({targets:p,x:x+(i-2)*15,y:y-45-i*4,alpha:0,duration:650+i*55,ease:'Cubic.Out',onComplete:()=>{this.objects.delete(p);p.destroy();}});
    }
  }
  explode(x:number,y:number){
    const p=this.scene.add.image(x,y,'fx_explosion','trim').setDisplaySize(28,28).setDepth(15);this.objects.add(p);
    this.scene.tweens.add({targets:p,displayWidth:100,displayHeight:100,alpha:0,duration:420,ease:'Cubic.Out',onComplete:()=>{this.objects.delete(p);p.destroy();}});
  }
  clear(){for(const p of this.objects){this.scene.tweens.killTweensOf(p);p.destroy();}this.objects.clear();}
}
