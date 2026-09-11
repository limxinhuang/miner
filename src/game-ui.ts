import './game-ui.css';
import './ui-art.css';
export function mountGameUI(){
 const q=(s:string)=>document.querySelector<HTMLElement>(s)!;
 const shell=document.createElement('section');shell.id='game-shell';shell.setAttribute('aria-label','黄金矿工游戏');
 q('main').prepend(shell);
 for(const selector of ['.stats','.goal-progress','#game','.game-bar','.coop-panel','.controls'])shell.append(q(selector));
 q('.cabinet').remove();
 const screens=document.createElement('div');screens.id='game-screens';shell.append(screens);
 const camp=document.createElement('section');camp.id='camp-screen';camp.innerHTML='<nav class="camp-nav" aria-label="营地菜单"><button id="camp-upgrades" class="secondary">① 成长与补给</button><button id="camp-routes" class="secondary">② 选择路线 →</button><span id="camp-bank"></span></nav><div id="camp-content"></div>';
 screens.append(camp);q('#camp-content').append(q('#growth'),q('#shop'),q('#routes'));screens.append(q('#settlement'));
 q('.controls').prepend(q('#resume'));q('.game-bar').append(q('#sound'));
 const debug=document.createElement('details');debug.id='debug-panel';debug.innerHTML='<summary>⚙ 手感调节 · 测试工具</summary>';debug.append(q('.tuning'));q('main').append(debug);
 const save=q('#save-status');save.className='save-note';q('main').append(save);
 // Secondary data remains available to the scene without adding another visible dashboard.
 const metadata=document.createElement('div');metadata.hidden=true;q('main').append(metadata);
 for(const selector of ['.intro','.mode-picker','.campaign-strip','.save-strip','.below','footer'])metadata.append(q(selector));
 for(let i=0;i<2;i++){
  const card=q('.coop-panel').children[i] as HTMLElement;
  card.querySelector('b')!.textContent=i===0?'P1 · S 出钩 / W 炸药':'P2 · ↓ 出钩 / ↑ 炸药';
  const info=document.createElement('span');info.id=`hud-growth-${i}`;card.append(info);
  card.append(q(`#bags-${i}`));
  const xp=document.createElement('progress');xp.id=`xp-${i}`;xp.max=100;xp.value=0;xp.className='xp-meter';xp.setAttribute('aria-label',`P${i+1} 升级进度`);card.append(xp);
 }
 q('#settlement').setAttribute('role','dialog');q('#settlement').setAttribute('aria-label','矿区结算');
 q('#settlement').insertAdjacentHTML('afterbegin','<img id="result-badge" class="result-badge" src="/assets/ui/ui_badge_success.png" alt=""/>');
 shell.insertAdjacentHTML('beforeend','<img id="end-badge" src="/assets/ui/ui_badge_success.png" alt="" hidden/>');
 q('#shop .shop-heading h2').textContent='补给站';
 q('#growth .growth-heading h2').textContent='本轮成长';
}
