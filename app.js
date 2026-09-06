
const $=id=>document.getElementById(id), cv=$("field"),ctx=cv.getContext("2d",{alpha:false});
let W=0,H=0,DPR=1,pts=[],events=0,flow=0,lastEvents=0,lastT=performance.now(),liqValue=0,liqBuy=0,liqSell=0;
let syms=new Set(),deferredInstall=null,lastBrain=0,qualified=0;
const venueState={binance:false,futures:false,coinbase:false,kraken:false,okx:false};
const px={BTC:null,ETH:null,SOL:null}, firstPx={BTC:null,ETH:null,SOL:null}, prevPx={BTC:null,ETH:null,SOL:null};
const venuePx={BTC:{},ETH:{},SOL:{}}, ret={BTC:[],ETH:[],SOL:[]};
let journal=[];
const DEFAULT={cash:10000,equity:10000,peak:10000,dayStart:10000,startBTC:null,pos:null,trades:[],grossWin:0,grossLoss:0,fees:0,equityCurve:[]};
let book=loadBook();
function loadBook(){try{return Object.assign({},DEFAULT,JSON.parse(localStorage.getItem("chaosPaperV2")||"{}"))}catch(e){return {...DEFAULT,trades:[],equityCurve:[]}}}
function saveBook(){localStorage.setItem("chaosPaperV2",JSON.stringify(book))}
function resetBook(){localStorage.removeItem("chaosPaperV2");book={...DEFAULT,trades:[],equityCurve:[]};journal=[];j("RESET","Paper ledger reset","warn");renderBook()}
$("reset").onclick=resetBook;

function resize(){DPR=Math.max(1,Math.min(2,devicePixelRatio||1));W=innerWidth;H=innerHeight;cv.width=W*DPR;cv.height=H*DPR;cv.style.width=W+"px";cv.style.height=H+"px";ctx.setTransform(DPR,0,0,DPR,0,0)}addEventListener("resize",resize);resize();
function h(s){let x=2166136261;for(let c of s)x=Math.imul(x^c.charCodeAt(0),16777619);return x>>>0}
function usd(n){if(!Number.isFinite(n))return"—";const sign=n<0?"-":"";n=Math.abs(n);if(n>=1e12)return sign+"$"+(n/1e12).toFixed(2)+"T";if(n>=1e9)return sign+"$"+(n/1e9).toFixed(2)+"B";if(n>=1e6)return sign+"$"+(n/1e6).toFixed(2)+"M";return sign+"$"+n.toLocaleString(undefined,{minimumFractionDigits:n<100000?2:0,maximumFractionDigits:2})}
function price(n){return Number.isFinite(n)?"$"+n.toLocaleString(undefined,{maximumFractionDigits:n>1000?1:4}):"—"}
function pct(n,d=2){return Number.isFinite(n)?(n>=0?"+":"")+n.toFixed(d)+"%":"—"}
function venue(id,state){venueState[id]=state;const el=$("v-"+id);el.textContent=state?"LIVE":"OFF";el.className=state?"live":"error";updateMaster()}
function updateMaster(){const n=Object.values(venueState).filter(Boolean).length;$("masterDot").className=n>=3?"live":n===0?"error":"";$("masterStatus").textContent=n>=3?"MULTI-FEED LIVE":n>0?"PARTIAL LIVE":"RECONNECTING"}
function j(type,msg,kind="",val=""){journal.unshift({t:Date.now(),type,msg,kind,val});journal=journal.slice(0,60);$("journal").innerHTML=journal.map(x=>`<div class="jrow ${x.kind}"><span class="time">${new Date(x.t).toLocaleTimeString()}</span><span class="type">${x.type}</span><span class="msg">${x.msg}</span><span class="val">${x.val||""}</span></div>`).join("")}
function spawn(symbol,vol,pctv,boost=1){const a=(h(symbol)%6283)/1000,base=Math.min(W,H)*.11,spread=Math.min(W,H)*.36,rr=base+Math.random()*spread,side=pctv>=0?1:-1,q=Math.max(1,vol||1);if(Math.random()<.22)chaosParticle(side,Math.min(1.6,.45+Math.log10(q+1)/6));pts.push({x:W/2+Math.cos(a)*rr,y:H/2+Math.sin(a)*rr,vx:(Math.random()-.5)*.35,vy:(Math.random()-.5)*.35,r:Math.min(14,(1.3+Math.log10(q)*.72)*boost),life:1,side});if(pts.length>1800)pts.splice(0,350)}
function draw(){ctx.fillStyle="rgba(2,4,7,.16)";ctx.fillRect(0,0,W,H);const cx=W/2,cy=H/2;ctx.strokeStyle="rgba(90,140,160,.035)";for(let r=90;r<Math.min(W,H)*.5;r+=90){ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.stroke()}for(const p of pts){const dx=p.x-cx,dy=p.y-cy,d=Math.hypot(dx,dy)||1;p.vx+=(-dy/d)*.0025;p.vy+=(dx/d)*.0025;p.x+=p.vx;p.y+=p.vy;p.life*=.993;ctx.beginPath();ctx.arc(p.x,p.y,p.r*Math.max(.25,p.life),0,Math.PI*2);ctx.fillStyle=p.side>0?`rgba(100,255,185,${.08+.4*p.life})`:`rgba(255,105,135,${.08+.4*p.life})`;ctx.fill()}pts=pts.filter(p=>p.life>.04);$("clusters").textContent=Math.floor(pts.filter(p=>p.r>8&&p.life>.25).length/9)+" anomaly clusters";requestAnimationFrame(draw)}draw();

function tickPrice(asset,p,source){
 if(!p||!Number.isFinite(p))return;venuePx[asset][source]=p;
 const vals=Object.values(venuePx[asset]).slice().sort((a,b)=>a-b),med=vals[Math.floor(vals.length/2)]||p;
 if(!firstPx[asset])firstPx[asset]=med;if(!book.startBTC&&asset==="BTC"){book.startBTC=med;saveBook()}
 if(px[asset])ret[asset].push((med-px[asset])/px[asset]);if(ret[asset].length>300)ret[asset].shift();prevPx[asset]=px[asset];px[asset]=med;
 if(asset==="BTC"){$("btc").textContent=price(med);$("btcDelta").textContent=pct((med/firstPx.BTC-1)*100)}
 if(asset==="ETH"){$("eth").textContent=price(med);$("ethDelta").textContent=pct((med/firstPx.ETH-1)*100)}
 if(asset==="SOL"){$("sol").textContent=price(med);$("solDelta").textContent=pct((med/firstPx.SOL-1)*100)}
}
function stdev(a){if(a.length<2)return 0;const m=a.reduce((x,y)=>x+y,0)/a.length;return Math.sqrt(a.reduce((s,x)=>s+(x-m)**2,0)/(a.length-1))}
function mean(a){return a.length?a.reduce((x,y)=>x+y,0)/a.length:0}
function sum(a,n){return a.slice(-n).reduce((x,y)=>x+y,0)}
function divergence(asset){const a=Object.values(venuePx[asset]);if(a.length<2)return 0;return (Math.max(...a)-Math.min(...a))/mean(a)}
function calcScores(){
 const r=ret.BTC,mom=sum(r,24),fast=sum(r,6),vol=stdev(r.slice(-80)),div=divergence("BTC"),ltot=liqBuy+liqSell,limbal=ltot?(liqSell-liqBuy)/ltot:0;
 return {
   momentum:Math.tanh((mom/(vol*Math.sqrt(24)+1e-9))*.62),
   reversion:-Math.tanh((fast/(vol*Math.sqrt(6)+1e-9))*.72),
   liquidation:Math.tanh(limbal*1.55)*Math.min(1,Math.log10(1+liqValue)/7),
   divergence:Math.min(1,div*200)*(mom>=0?1:-1), vol,div,mom,limbal
 };
}
function describe(k,v){
 const side=v>0?"bullish":v<0?"bearish":"neutral", mag=Math.abs(v);
 if(k==="momentum")return `${side} persistence · strength ${mag.toFixed(2)}`;
 if(k==="reversion")return `${side} snapback pressure · strength ${mag.toFixed(2)}`;
 if(k==="liquidation")return `${side} forced-order imbalance · strength ${mag.toFixed(2)}`;
 return `${side} cross-venue dispersion · strength ${mag.toFixed(2)}`;
}
function renderStrategy(k,v){
 $("sv-"+k).textContent=(v>=0?"+":"")+v.toFixed(2);
 const bar=$("sb-"+k),card=bar.closest(".strategy-card"),w=Math.min(50,Math.abs(v)*50);
 bar.style.width=w+"%";bar.style.marginLeft=v>=0?"50%":(50-w)+"%";
 bar.style.background=v>=0?"var(--good)":"var(--bad)";
 card.className="strategy-card "+(Math.abs(v)>.42?(v>0?"hot":"cold"):"");
 $("sd-"+k).textContent=describe(k,v);
}
function brain(){
 if(!px.BTC||ret.BTC.length<36){$("brainState").textContent="WARMING UP";return}
 const s=calcScores();for(const k of ["momentum","reversion","liquidation","divergence"])renderStrategy(k,s[k]);
 const weighted=.40*s.momentum+.22*s.reversion+.26*s.liquidation+.12*s.divergence;
 const confidence=Math.min(.96,.50+Math.abs(weighted)*.52);
 const fee=.0008,slip=.00028+Math.min(.0017,s.vol*3.5),raw=Math.abs(weighted)*.0052,net=raw-fee-slip;
 const annual=s.vol*Math.sqrt(60)*100,regime=annual>1.15?"HIGH VOL":Math.abs(s.mom)>s.vol*4.2?"TREND":"RANGE";
 $("regime").textContent=regime;$("brainState").textContent="ACTIVE";$("confidence").textContent=(confidence*100).toFixed(0)+"%";
 let action="WAIT",cls="wait";
 if(net>.00040&&confidence>.63){action=weighted>0?"LONG BTC":"SHORT BTC";cls=weighted>0?"long":"short"}
 $("signal").textContent=action;$("signal").className="signal "+cls;
 $("decision").textContent=action==="WAIT"?`Rejected: modeled net edge ${pct(net*100)} is below qualification threshold.`:`Qualified ${action} · confidence ${(confidence*100).toFixed(0)}% · net edge ${pct(net*100)}`;
 $("oppSide").textContent=action==="WAIT"?"WAIT":action.replace(" BTC","");$("oppSide").className="opp-side "+(action.startsWith("LONG")?"long":action.startsWith("SHORT")?"short":"");
 $("rawEdge").textContent=pct(raw*100);$("feeEdge").textContent="-"+(fee*100).toFixed(2)+"%";$("slipEdge").textContent="-"+(slip*100).toFixed(2)+"%";$("netEdge").textContent=pct(net*100);$("oppConf").textContent=(confidence*100).toFixed(0)+"%";
 $("oppStatus").textContent=action==="WAIT"?"NO QUALIFIED EDGE":"QUALIFIED";$("oppWhy").textContent=action==="WAIT"?"Agent remains flat because expected edge does not survive modeled costs and confidence gate.":`${regime} regime · strategy ensemble agrees enough to permit paper execution.`;
 if(Date.now()-lastBrain>4500){maybeTrade(action,confidence,net);lastBrain=Date.now()}
}
function maybeTrade(action,confidence,edge){
 const p=px.BTC;if(!p)return;markToMarket(p);
 const dayRet=(book.equity-book.dayStart)/book.dayStart;
 if(dayRet<=-.02){$("signal").textContent="KILL SWITCH";$("signal").className="signal kill";$("decision").textContent="Daily loss limit reached. New trades disabled.";if(book.pos)closePos(p,"KILL");return}
 if(book.pos){
   const q=book.pos,move=(p-q.entry)/q.entry*q.side;
   if(move<=-q.stopPct)closePos(p,"STOP");
   else if(move>=q.takePct)closePos(p,"TAKE");
   else if(Date.now()-q.time>15*60*1000)closePos(p,"TIME");
   else if((action.startsWith("LONG")?1:action.startsWith("SHORT")?-1:0)===-q.side&&confidence>.71)closePos(p,"FLIP");
   return;
 }
 if(action==="WAIT"||edge<=0)return;
 qualified++;$("qualified").textContent=qualified;
 const side=action.startsWith("LONG")?1:-1,risk=book.equity*.0025,stopPct=.0035,qty=risk/(p*stopPct),notional=qty*p,fee=notional*.0004;
 book.cash-=fee;book.fees+=fee;book.pos={side,entry:p,qty,time:Date.now(),stopPct,takePct:.0065,feeOpen:fee};
 j("EXECUTE",`${side>0?"LONG":"SHORT"} BTC @ ${price(p)} · notional ${usd(notional)}`,side>0?"good":"bad",`risk ${usd(risk)}`);saveBook();renderBook()
}
function closePos(p,why){
 const q=book.pos;if(!q)return;const notional=q.qty*p,fee=notional*.0004,raw=(p-q.entry)*q.qty*q.side,pnl=raw-fee;
 book.cash+=raw-fee;book.fees+=fee;book.trades.push({side:q.side,entry:q.entry,exit:p,pnl,why,t:Date.now()});
 if(pnl>=0)book.grossWin+=pnl;else book.grossLoss+=-pnl;book.pos=null;
 j("CLOSE "+why,`${pnl>=0?"profit":"loss"} after costs`,pnl>=0?"good":"bad",(pnl>=0?"+":"")+usd(pnl));saveBook();renderBook()
}
function markToMarket(p){
 let floating=0;if(book.pos)floating=(p-book.pos.entry)*book.pos.qty*book.pos.side;
 book.equity=book.cash+floating;book.peak=Math.max(book.peak||book.equity,book.equity);
 if(!book.equityCurve)book.equityCurve=[];if(!book.equityCurve.length||Date.now()-book.equityCurve.at(-1).t>5000){book.equityCurve.push({t:Date.now(),v:book.equity});if(book.equityCurve.length>720)book.equityCurve.shift()}
 renderBook()
}
function renderBook(){
 const wins=book.trades.filter(t=>t.pnl>0).length,n=book.trades.length,totalPnl=book.equity-10000,dd=(book.equity-(book.peak||book.equity))/(book.peak||book.equity)*100;
 $("equity").textContent=usd(book.equity);$("pnl").textContent=(totalPnl>=0?"+":"")+usd(totalPnl);$("pnl").className="pnlbig "+(totalPnl>0?"pos":totalPnl<0?"neg":"");
 $("drawdown").textContent=dd.toFixed(2)+"%";$("benchDD").textContent=dd.toFixed(2)+"%";$("tradeCount").textContent=n;$("winRate").textContent=n?(wins/n*100).toFixed(1)+"%":"—";
 $("profitFactor").textContent=book.grossLoss?(book.grossWin/book.grossLoss).toFixed(2):book.grossWin?"∞":"—";$("feesPaid").textContent=usd(book.fees);
 const avg=n?book.trades.reduce((s,t)=>s+t.pnl,0)/n:null;$("expectancy").textContent=avg===null?"—":usd(avg);
 const ec=book.equityCurve||[],rs=[];for(let i=1;i<ec.length;i++)rs.push((ec[i].v-ec[i-1].v)/ec[i-1].v);
 const sh=rs.length>8&&stdev(rs)>0?mean(rs)/stdev(rs)*Math.sqrt(12):null;$("sharpe").textContent=sh===null?"—":sh.toFixed(2);
 $("agentReturn").textContent=pct((book.equity/10000-1)*100);$("holdReturn").textContent=book.startBTC&&px.BTC?pct((px.BTC/book.startBTC-1)*100):"—";
 if(book.pos){
   const q=book.pos,mark=px.BTC||q.entry,unr=(mark-q.entry)*q.qty*q.side,age=Math.floor((Date.now()-q.time)/1000);
   $("positionState").textContent=q.side>0?"LONG":"SHORT";$("position").textContent=(q.side>0?"LONG ":"SHORT ")+q.qty.toFixed(4)+" BTC";
   $("posEntry").textContent=price(q.entry);$("posMark").textContent=price(mark);$("posStop").textContent=price(q.entry*(1-q.side*q.stopPct));$("posTake").textContent=price(q.entry*(1+q.side*q.takePct));$("posUnrealized").textContent=(unr>=0?"+":"")+usd(unr);$("posAge").textContent=Math.floor(age/60)+"m "+(age%60)+"s";
 }else{$("positionState").textContent="FLAT";$("position").textContent="NO POSITION";for(const id of ["posEntry","posMark","posStop","posTake","posUnrealized","posAge"])$(id).textContent="—"}
}
renderBook();j("BOOT","CHAOS Agent v2 started · forward paper mode","warn");

function engineTick(){
 $("pressure").textContent=flow>.11?"BUY BIAS":flow<-.11?"SELL BIAS":"BALANCED";const a=Math.abs(flow);$("pulse").textContent=a>.24?"ELEVATED":a>.13?"ACTIVE":"NORMAL";
 $("symbols").textContent=syms.size.toLocaleString()+" symbols";$("events").textContent=events.toLocaleString()+" EVENTS";$("liqValue").textContent=usd(liqValue)+" liquidations";brain()
}
async function fetchGlobal(){try{const r=await fetch("https://api.coingecko.com/api/v3/global",{cache:"no-store"});if(!r.ok)throw 0;const d=(await r.json()).data;$("marketCap").textContent=usd(d.total_market_cap?.usd);$("volume24h").textContent=usd(d.total_volume?.usd);$("btcDom").textContent=(d.market_cap_percentage?.btc??0).toFixed(1)+"%";$("ethDom").textContent=(d.market_cap_percentage?.eth??0).toFixed(1)+"%";$("aggregateStamp").textContent="COINGECKO GLOBAL · "+new Date().toLocaleTimeString()}catch(e){$("aggregateStamp").textContent="GLOBAL AGGREGATE TEMPORARILY UNAVAILABLE"}}fetchGlobal();setInterval(fetchGlobal,60000);

function startBinanceSpot(){const ws=new WebSocket("wss://stream.binance.com:9443/ws/!miniTicker@arr");ws.onopen=()=>{venue("binance",true);j("FEED","Binance Spot connected","good")};ws.onmessage=e=>{let a;try{a=JSON.parse(e.data)}catch(_){return}if(!Array.isArray(a))return;for(const q of a.slice(0,220)){const p=+q.c,o=+q.o,v=+q.q;if(!p||!o)continue;const pc=(p-o)/o*100;flow=.988*flow+.012*(pc>=0?1:-1);syms.add("B:"+q.s);spawn(q.s,v,pc);events++;if(q.s==="BTCUSDT")tickPrice("BTC",p,"binance");if(q.s==="ETHUSDT")tickPrice("ETH",p,"binance");if(q.s==="SOLUSDT")tickPrice("SOL",p,"binance")}engineTick()};ws.onerror=()=>venue("binance",false);ws.onclose=()=>{venue("binance",false);setTimeout(startBinanceSpot,2500)}}
function startFutures(){const ws=new WebSocket("wss://fstream.binance.com/ws/!forceOrder@arr");ws.onopen=()=>{venue("futures",true);j("FEED","Binance Futures liquidations connected","good")};ws.onmessage=e=>{let x;try{x=JSON.parse(e.data)}catch(_){return}const o=x.o||x;if(!o||!o.s)return;const p=+o.ap||+o.p||0,qty=+o.q||0,val=p*qty;liqValue+=val;events++;heroWave(o.S==="SELL"?-1:1,Math.min(2.2,.7+Math.log10(val+1)/7));for(let z=0;z<Math.min(18,2+Math.floor(Math.log10(val+1)*2));z++)chaosParticle(o.S==="SELL"?-1:1,1.2);if(o.S==="SELL")liqSell+=val;else liqBuy+=val;liqBuy*=.998;liqSell*=.998;spawn("LQ:"+o.s,val,o.S==="SELL"?-1:1,1.5);if(val>100000)j("LIQUIDATION",`${o.s} ${o.S||""}`,o.S==="SELL"?"bad":"good",usd(val));engineTick()};ws.onerror=()=>venue("futures",false);ws.onclose=()=>{venue("futures",false);setTimeout(startFutures,3000)}}
function startCoinbase(){const ws=new WebSocket("wss://ws-feed.exchange.coinbase.com");ws.onopen=()=>{venue("coinbase",true);ws.send(JSON.stringify({type:"subscribe",product_ids:["BTC-USD","ETH-USD","SOL-USD"],channels:["ticker"]}));j("FEED","Coinbase ticker connected","good")};ws.onmessage=e=>{let x;try{x=JSON.parse(e.data)}catch(_){return}if(x.type!=="ticker")return;const p=+x.price,v=(+x.last_size||0)*p,side=x.side==="buy"?1:-1,a=x.product_id.split("-")[0];flow=.995*flow+.005*side;tickPrice(a,p,"coinbase");syms.add("C:"+x.product_id);spawn("C:"+x.product_id,v,side,.7);events++};ws.onerror=()=>venue("coinbase",false);ws.onclose=()=>{venue("coinbase",false);setTimeout(startCoinbase,3500)}}
function startKraken(){const ws=new WebSocket("wss://ws.kraken.com/v2");ws.onopen=()=>{venue("kraken",true);ws.send(JSON.stringify({method:"subscribe",params:{channel:"ticker",symbol:["BTC/USD","ETH/USD","SOL/USD"]}}));j("FEED","Kraken ticker connected","good")};ws.onmessage=e=>{let x;try{x=JSON.parse(e.data)}catch(_){return}if(x.channel!=="ticker"||!Array.isArray(x.data))return;for(const q of x.data){const p=+q.last||0,a=q.symbol.split("/")[0];tickPrice(a,p,"kraken");syms.add("K:"+q.symbol);spawn("K:"+q.symbol,(+q.volume||1)*p,Math.random()-.5,.55);events++}};ws.onerror=()=>venue("kraken",false);ws.onclose=()=>{venue("kraken",false);setTimeout(startKraken,4000)}}
function startOkx(){const ws=new WebSocket("wss://ws.okx.com:8443/ws/v5/public");ws.onopen=()=>{venue("okx",true);ws.send(JSON.stringify({op:"subscribe",args:[{channel:"tickers",instId:"BTC-USDT"},{channel:"tickers",instId:"ETH-USDT"},{channel:"tickers",instId:"SOL-USDT"}]}));j("FEED","OKX ticker connected","good")};ws.onmessage=e=>{let x;try{x=JSON.parse(e.data)}catch(_){return}if(!x.arg||x.arg.channel!=="tickers"||!Array.isArray(x.data))return;for(const q of x.data){const p=+q.last||0,o=+q.open24h||p,a=q.instId.split("-")[0],pc=o?(p-o)/o*100:0;tickPrice(a,p,"okx");syms.add("O:"+q.instId);spawn("O:"+q.instId,+q.volCcy24h||1,pc,.55);events++}};ws.onerror=()=>venue("okx",false);ws.onclose=()=>{venue("okx",false);setTimeout(startOkx,4500)}}


// ===== CHAOS SIGNATURE VISUAL FIELD =====
const heroCv=$("chaosHero"),hctx=heroCv.getContext("2d",{alpha:false});
let HW=0,HH=0,HDPR=1,hparts=[],waves=[],heroLastSpawn=0;
function resizeHero(){
  const r=heroCv.getBoundingClientRect();HDPR=Math.max(1,Math.min(2,devicePixelRatio||1));HW=r.width;HH=r.height;
  heroCv.width=HW*HDPR;heroCv.height=HH*HDPR;hctx.setTransform(HDPR,0,0,HDPR,0,0);
}
addEventListener("resize",resizeHero);resizeHero();

function chaosParticle(side=1,force=1){
  const cx=HW/2,cy=HH/2;
  const a=Math.random()*Math.PI*2,rad=55+Math.random()*Math.min(HW,HH)*.43;
  const tangent=a+(side>0?1:-1)*Math.PI/2;
  hparts.push({
    x:cx+Math.cos(a)*rad,y:cy+Math.sin(a)*rad,
    vx:Math.cos(tangent)*(0.15+Math.random()*.8)*force+(Math.random()-.5)*.25,
    vy:Math.sin(tangent)*(0.15+Math.random()*.8)*force+(Math.random()-.5)*.25,
    r:.6+Math.random()*3.3*force,life:.35+Math.random()*.65,side,tail:4+Math.floor(Math.random()*12)
  });
  if(hparts.length>900)hparts.splice(0,120);
}
function heroWave(side=1,power=1){waves.push({r:40,a:.45,side,power});if(waves.length>12)waves.shift()}
function drawHero(){
  hctx.fillStyle="rgba(2,4,7,.22)";hctx.fillRect(0,0,HW,HH);
  const cx=HW/2,cy=HH/2,maxR=Math.min(HW,HH)*.46;
  // radar rings
  hctx.lineWidth=1;
  for(let r=52;r<maxR;r+=52){hctx.beginPath();hctx.arc(cx,cy,r,0,Math.PI*2);hctx.strokeStyle="rgba(95,165,190,.075)";hctx.stroke()}
  for(let k=0;k<16;k++){let a=k/16*Math.PI*2;hctx.beginPath();hctx.moveTo(cx+Math.cos(a)*48,cy+Math.sin(a)*48);hctx.lineTo(cx+Math.cos(a)*maxR,cy+Math.sin(a)*maxR);hctx.strokeStyle="rgba(90,155,180,.035)";hctx.stroke()}
  // dynamic waves
  for(const w of waves){hctx.beginPath();hctx.arc(cx,cy,w.r,0,Math.PI*2);hctx.strokeStyle=w.side>0?`rgba(105,255,185,${w.a})`:`rgba(255,105,140,${w.a})`;hctx.lineWidth=1.3*w.power;hctx.stroke();w.r+=1.5+2*w.power;w.a*=.974}
  waves=waves.filter(w=>w.a>.025&&w.r<maxR*1.25);
  // particles with velocity tails
  for(const p of hparts){
    const dx=p.x-cx,dy=p.y-cy,d=Math.hypot(dx,dy)||1;
    const spin=(p.side>0?.006:-.006);
    p.vx+=(-dy/d)*spin+(Math.random()-.5)*.004;p.vy+=(dx/d)*spin+(Math.random()-.5)*.004;
    p.x+=p.vx;p.y+=p.vy;p.life*=.994;
    hctx.beginPath();hctx.moveTo(p.x-p.vx*p.tail,p.y-p.vy*p.tail);hctx.lineTo(p.x,p.y);
    hctx.strokeStyle=p.side>0?`rgba(105,255,185,${.10+.55*p.life})`:`rgba(255,105,140,${.10+.55*p.life})`;hctx.lineWidth=Math.max(.5,p.r*.48);hctx.stroke();
    hctx.beginPath();hctx.arc(p.x,p.y,p.r,0,Math.PI*2);hctx.fillStyle=p.side>0?`rgba(110,255,188,${.18+.75*p.life})`:`rgba(255,110,145,${.18+.75*p.life})`;hctx.fill();
  }
  hparts=hparts.filter(p=>p.life>.035&&p.x>-60&&p.x<HW+60&&p.y>-60&&p.y<HH+60);
  while(hparts.length<180)chaosParticle(Math.random()>.43?1:-1,.5+Math.random()*.8);
  requestAnimationFrame(drawHero);
}
drawHero();

function updateHero(){
  const n=Object.values(venueState).filter(Boolean).length;
  $("heroEvents").textContent=events.toLocaleString()+" EVENTS";
  $("heroSymbols").textContent=syms.size.toLocaleString()+" SYMBOLS";
  $("heroVenues").textContent=n+"/5 VENUES";
  $("heroFlow").textContent=$("pressure").textContent;
  $("heroRegime").textContent=$("regime").textContent;
  $("heroLiq").textContent=usd(liqValue);
  $("heroAnomaly").textContent=Math.floor(hparts.filter(p=>p.r>2.6&&p.life>.25).length/7);
  $("heroSignal").textContent=$("signal").textContent;
  $("heroConfidence").textContent=$("brainState").textContent==="ACTIVE"?$("confidence").textContent+" CONFIDENCE":"WARMING UP";
  $("heroSignal").style.color=$("signal").classList.contains("long")?"var(--good)":$("signal").classList.contains("short")||$("signal").classList.contains("kill")?"var(--bad)":"var(--warn)";
}
setInterval(updateHero,500);

startBinanceSpot();startFutures();startCoinbase();startKraken();startOkx();
setInterval(()=>{const now=performance.now(),dt=(now-lastT)/1000,r=dt?(events-lastEvents)/dt:0;$("rate").textContent=r.toFixed(0)+" events/s";lastEvents=events;lastT=now;$("utc").textContent=new Date().toISOString().replace("T"," ").slice(0,19)+" UTC";if(px.BTC)markToMarket(px.BTC)},1000);
if("serviceWorker"in navigator)addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));
addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredInstall=e;$("install").classList.remove("hidden")});
$("install").onclick=async()=>{if(!deferredInstall)return;deferredInstall.prompt();await deferredInstall.userChoice;deferredInstall=null;$("install").classList.add("hidden")};
