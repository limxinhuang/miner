export const TUNING_KEY='gold-digger-tuning-v1';
export const DEFAULT_TUNING={swing:1,pull:1};
export type Tuning=typeof DEFAULT_TUNING;
export function normalizeTuning(value:unknown):Tuning {
  const raw=value as Partial<Tuning>|null;
  const clean=(n:unknown)=>typeof n==='number'&&Number.isFinite(n)?Math.round(Math.max(.1,Math.min(5,n))*100)/100:1;
  return {swing:clean(raw?.swing),pull:clean(raw?.pull)};
}
function read():Tuning{try{return normalizeTuning(JSON.parse(localStorage.getItem(TUNING_KEY)??'null'));}catch{return {...DEFAULT_TUNING};}}
export const tuning:Tuning=read();

export function mountTuning(){
  const panel=document.createElement('section');panel.className='tuning';panel.setAttribute('aria-label','手感调节');
  panel.innerHTML=`<div class="tuning-head"><strong>手感调节</strong><span>测试设置 · 双人共用 · 1.00 倍为原始速度</span><button type="button" id="tuning-reset" class="quiet">恢复默认</button></div>
  <div class="tuning-fields">
    <div><label for="tuning-swing">钩子摆动速度</label><input id="tuning-swing" type="range" min="0.1" max="5" step="0.01"/><input id="tuning-swing-number" aria-label="钩子摆动速度倍率" type="number" min="0.1" max="5" step="0.01"/><span>倍</span></div>
    <div><label for="tuning-pull">拉取速度</label><input id="tuning-pull" type="range" min="0.1" max="5" step="0.01"/><input id="tuning-pull-number" aria-label="拉取速度倍率" type="number" min="0.1" max="5" step="0.01"/><span>倍</span></div>
  </div><p>拖动滑块或输入 0.10–5.00。拉取倍率对空钩和负重回收都生效，矿物重量和力量药水仍会影响速度；出钩速度不变。</p>
  <div class="tuning-share"><textarea id="tuning-values" aria-label="可复制的当前参数" readonly rows="1"></textarea><button type="button" id="tuning-copy" class="secondary">复制参数</button><span id="tuning-message" role="status"></span></div>`;
  document.querySelector('.mode-picker')!.before(panel);
  const input=(id:string)=>panel.querySelector<HTMLInputElement>('#'+id)!;
  const summary=panel.querySelector<HTMLTextAreaElement>('#tuning-values')!;
  const message=panel.querySelector<HTMLElement>('#tuning-message')!;
  function render(){
    for(const key of ['swing','pull'] as const){input('tuning-'+key).value=String(tuning[key]);input('tuning-'+key+'-number').value=tuning[key].toFixed(2);}
    summary.value=`黄金矿工手感参数：钩子摆动 ${tuning.swing.toFixed(2)} 倍；拉取 ${tuning.pull.toFixed(2)} 倍。`;
  }
  function save(){try{localStorage.setItem(TUNING_KEY,JSON.stringify(tuning));message.textContent='已生效并保存在本机';}catch{message.textContent='已生效，本机保存不可用';}}
  for(const key of ['swing','pull'] as const){
    const slider=input('tuning-'+key),number=input('tuning-'+key+'-number');
    slider.oninput=()=>{tuning[key]=slider.valueAsNumber;render();save();};
    number.oninput=()=>{
      const n=number.valueAsNumber;
      if(!Number.isFinite(n)||n<.1||n>5){message.textContent='请输入 0.10–5.00，暂时保留上次有效值';return;}
      tuning[key]=Math.round(n*100)/100;slider.value=String(tuning[key]);summary.value=`黄金矿工手感参数：钩子摆动 ${tuning.swing.toFixed(2)} 倍；拉取 ${tuning.pull.toFixed(2)} 倍。`;save();
    };
    number.onblur=render;
  }
  panel.querySelector<HTMLButtonElement>('#tuning-reset')!.onclick=()=>{Object.assign(tuning,DEFAULT_TUNING);render();save();};
  panel.querySelector<HTMLButtonElement>('#tuning-copy')!.onclick=async()=>{
    try{await navigator.clipboard.writeText(summary.value);message.textContent='参数已复制，直接粘贴发给我即可';}
    catch{summary.focus();summary.select();message.textContent='已选中参数，请按 Ctrl+C 复制';}
  };
  render();
}
