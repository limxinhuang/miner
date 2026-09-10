import Phaser from 'phaser';

/** Short-lived, bounded effects that are removed on level transitions. */
export class Feedback {
  private objects=new Set<Phaser.GameObjects.Shape>();
  constructor(private scene:Phaser.Scene){}
  burst(x:number,y:number,color:number,count=12,celebrate=false){
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    for(let i=0;i<(reduced?3:count);i++){
      const angle=(Math.PI*2*i)/count;
      const p=this.scene.add.rectangle(x,y,celebrate?6:4,celebrate?11:4,color).setDepth(celebrate?25:15);
      this.objects.add(p);
      this.scene.tweens.add({targets:p,x:x+Math.cos(angle)*(celebrate?280:36),y:y+Math.sin(angle)*(celebrate?145:36)+(celebrate?50:0),angle:reduced?0:i*60,alpha:0,duration:reduced?250:celebrate?1300:450,ease:'Cubic.Out',onComplete:()=>{this.objects.delete(p);p.destroy();}});
    }
  }
  clear(){for(const p of this.objects){this.scene.tweens.killTweensOf(p);p.destroy();}this.objects.clear();}
}
