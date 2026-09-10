import sharp from 'sharp';
import fs from 'node:fs';
const files=fs.readdirSync('public/assets').filter(f=>f.endsWith('.png'));
const report=[];const layers=[];
for(let i=0;i<files.length;i++){
  const file=files[i],path='public/assets/'+file;const {data,info}=await sharp(path).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  let minX=info.width,minY=info.height,maxX=-1,maxY=-1,transparent=0;
  for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){const a=data[(y*info.width+x)*4+3];if(a===0)transparent++;if(a>32){minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);}}
  report.push({file,width:info.width,height:info.height,transparentFraction:transparent/(info.width*info.height),bounds:{x:minX,y:minY,width:maxX-minX+1,height:maxY-minY+1}});
  const thumbnail=await sharp(path).resize(240,180,{fit:'contain',background:'#394438'}).png().toBuffer();
  layers.push({input:thumbnail,left:i%5*260+10,top:Math.floor(i/5)*220});
  layers.push({input:Buffer.from(`<svg width="260" height="30"><text x="10" y="18" fill="white" font-size="12">${file}</text></svg>`),left:i%5*260,top:Math.floor(i/5)*220+183});
}
fs.mkdirSync('analysis/qa',{recursive:true});
await sharp({create:{width:1300,height:Math.ceil(files.length/5)*220,channels:4,background:'#273025'}}).composite(layers).png().toFile('analysis/qa/assets-contact.png');
fs.writeFileSync('analysis/assets-inspection.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
