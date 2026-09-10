const fs = require('node:fs');
const zlib = require('node:zlib');
const crypto = require('node:crypto');
const input = process.argv[2];
const raw = fs.readFileSync(input);
const signature = raw.toString('ascii', 0, 3);
if (!['FWS', 'CWS'].includes(signature)) throw new Error(`Unsupported signature: ${signature}`);
const body = signature === 'CWS' ? zlib.inflateSync(raw.subarray(8)) : raw.subarray(8);
let bit = 0;
function bits(n, signed = false) {
  let value = 0;
  for (let i = 0; i < n; i++, bit++) value = value * 2 + ((body[bit >> 3] >> (7 - (bit & 7))) & 1);
  return signed && value >= 2 ** (n - 1) ? value - 2 ** n : value;
}
const width = bits(5);
const rect = Array.from({length: 4}, () => bits(width, true));
let pos = Math.ceil(bit / 8);
const frameRate = body.readUInt16LE(pos) / 256;
const frameCount = body.readUInt16LE(pos + 2);
pos += 4;
const names = {0:'End',1:'ShowFrame',2:'DefineShape',9:'SetBackgroundColor',10:'DefineFont',11:'DefineText',12:'DoAction',14:'DefineSound',20:'DefineBitsLossless',21:'DefineBitsJPEG2',22:'DefineShape2',26:'PlaceObject2',32:'DefineShape3',33:'DefineText2',34:'DefineButton2',35:'DefineBitsJPEG3',36:'DefineBitsLossless2',37:'DefineEditText',39:'DefineSprite',43:'FrameLabel',48:'DefineFont2',56:'ExportAssets',59:'DoInitAction',69:'FileAttributes',76:'SymbolClass',82:'DoABC'};
const counts = {}, strings = new Set(), sounds = [], actionBlocks = [];
fs.mkdirSync('analysis/extracted',{recursive:true});
function actions(data) {
  const records = [];
  const opnames = {0x04:'NextFrame',0x06:'Play',0x07:'Stop',0x0a:'Add',0x0b:'Subtract',0x0c:'Multiply',0x0d:'Divide',0x0e:'Equals',0x0f:'Less',0x10:'And',0x11:'Or',0x12:'Not',0x17:'Pop',0x1c:'GetVariable',0x1d:'SetVariable',0x20:'SetTarget2',0x21:'StringAdd',0x22:'GetProperty',0x23:'SetProperty',0x24:'CloneSprite',0x25:'RemoveSprite',0x30:'RandomNumber',0x34:'GetTime',0x3d:'CallFunction',0x47:'Add2',0x48:'Less2',0x49:'Equals2',0x4e:'GetMember',0x4f:'SetMember',0x52:'CallMethod',0x81:'GotoFrame',0x83:'GetURL',0x88:'ConstantPool',0x8b:'SetTarget',0x8c:'GotoLabel',0x96:'Push',0x99:'Jump',0x9d:'If',0x9f:'GotoFrame2'};
  for (let i = 0; i < data.length;) {
    const opcode = data[i++];
    if (!opcode) break;
    let size = 0;
    if (opcode >= 128) { if (i + 2 > data.length) break; size = data.readUInt16LE(i); i += 2; }
    const payload = data.subarray(i, i + size);
    let args;
    if (opcode === 0x96) {
      args=[]; let p=0;
      while(p<payload.length) {
        const type=payload[p++];
        if(type===0) { const end=payload.indexOf(0,p); if(end<0) break; const s=payload.toString('utf8',p,end); strings.add(s); args.push(s); p=end+1; }
        else if(type===1) { args.push(payload.readFloatLE(p)); p+=4; }
        else if(type===2) args.push(null);
        else if(type===3) args.push('undefined');
        else if(type===4 || type===8) args.push({type,index:payload[p++]});
        else if(type===5) args.push(Boolean(payload[p++]));
        else if(type===6) { const b=Buffer.concat([payload.subarray(p+4,p+8),payload.subarray(p,p+4)]); args.push(b.readDoubleLE()); p+=8; }
        else if(type===7) { args.push(payload.readInt32LE(p)); p+=4; }
        else if(type===9) { args.push({constant:payload.readUInt16LE(p)}); p+=2; }
        else break;
      }
    } else if(opcode===0x99 || opcode===0x9d) args=payload.readInt16LE(0);
    else if(opcode===0x81) args=payload.readUInt16LE(0);
    else if(opcode===0x8b || opcode===0x8c) args=payload.toString('utf8').replace(/\0/g,'');
    records.push({offset:i-(opcode>=128?3:1),op:opnames[opcode] || `0x${opcode.toString(16)}`,...(args!==undefined?{args}:{})});
    if (opcode === 0x88) {
      let p = 2;
      while (p < payload.length) { let end = payload.indexOf(0,p); if (end < 0) break; strings.add(payload.toString('utf8',p,end)); p=end+1; }
    }
    if (opcode === 0x96 && payload[0] === 0) { const end = payload.indexOf(0,1); if (end > 0) strings.add(payload.toString('utf8',1,end)); }
    i += size;
  }
  actionBlocks.push(records);
}
function tags(data, start = 0) {
  let p = start;
  while (p + 2 <= data.length) {
    const tag = data.readUInt16LE(p); p += 2;
    const type = tag >> 6; let size = tag & 63;
    if (size === 63) { if(p+4>data.length) throw new Error('Truncated tag'); size=data.readUInt32LE(p); p+=4; }
    if(p+size>data.length) throw new Error('Tag exceeds file');
    const payload = data.subarray(p,p+size); p += size;
    const name = names[type] || `Tag${type}`; counts[name] = (counts[name] || 0) + 1;
    if (type === 39) tags(payload,4);
    if (type === 12) actions(payload);
    if (type === 59) actions(payload.subarray(2));
    if (type === 26 && (payload[0] & 128)) {
      const flags=payload[0]; let q=3;
      if(flags&2) q+=2;
      function skipBits(kind) {
        let b=q*8;
        const read=n=>{let v=0;while(n--) {v=v*2+((payload[b>>3]>>(7-(b&7)))&1);b++;} return v;};
        if(kind==='matrix') {if(read(1)) {const n=read(5);read(n*2);} if(read(1)) {const n=read(5);read(n*2);} const n=read(5);read(n*2);}
        else {const add=read(1),mult=read(1),n=read(4);if(mult) read(n*4);if(add) read(n*4);}
        q=Math.ceil(b/8);
      }
      if(flags&4) skipBits('matrix');
      if(flags&8) skipBits('color');
      if(flags&16) q+=2;
      if(flags&32) {const end=payload.indexOf(0,q);if(end<0) throw new Error('Invalid name');q=end+1;}
      if(flags&64) q+=2;
      const eventBytes=raw[3]>=6?4:2;
      q+=2+eventBytes;
      while(q+eventBytes<=payload.length) {
        const events=payload.readUIntLE(q,eventBytes);q+=eventBytes;
        if(!events) break;
        const length=payload.readUInt32LE(q);q+=4;
        actions(payload.subarray(q+((events&0x20000)?1:0),q+length));q+=length;
      }
    }
    if (type === 14) {
      const sound={id:payload.readUInt16LE(0),format:payload[2] >> 4,sampleCount:payload.readUInt32LE(3)};
      sounds.push(sound);
      if(sound.format===2) fs.writeFileSync(`analysis/extracted/sound-${sound.id}.mp3`,payload.subarray(9));
    }
    if(type===21) fs.writeFileSync(`analysis/extracted/bitmap-${payload.readUInt16LE(0)}.jpg`,payload.subarray(2));
    if (type === 0) break;
  }
}
tags(body,pos);
const report = {source:input,sha256:crypto.createHash('sha256').update(raw).digest('hex'),signature,version:raw[3],compressedBytes:raw.length,declaredBytes:raw.readUInt32LE(4),actualUncompressedBytes:body.length+8,stage:{width:(rect[1]-rect[0])/20,height:(rect[3]-rect[2])/20},frameRate,frameCount,tags:counts,sounds,actionStrings:[...strings].sort()};
fs.mkdirSync('analysis',{recursive:true});
fs.writeFileSync('analysis/swf-inspection.json',JSON.stringify(report,null,2));
fs.writeFileSync('analysis/action-records.json',JSON.stringify(actionBlocks,null,2));
console.log(JSON.stringify(report,null,2));
