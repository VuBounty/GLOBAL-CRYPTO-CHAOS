
const $=id=>document.getElementById(id), cv=$("field"),ctx=cv.getContext("2d",{alpha:false});
let W=0,H=0,DPR=1,pts=[],events=0,flow=0,lastEvents=0,lastT=performance.now(),liqCount=0,liqValue=0;
let syms=new Set(),tape=[],deferredInstall=null;
const venueState={binance:false,futures:false,coinbase:false,kraken:false,okx:false};
const px={BTC:null,ETH:null,SOL:null}, venuePx={BTC:{},ETH:{},SOL:{}}, ret={BTC:[],ETH:[],SOL:[]};
let liqBuy=0,liqSell=0,lastBrain=0;

const DEFAULT={cash:10000,equity:10000,peak:10000,dayStart:10000,pos:null,trades:[],grossWin:0,grossLoss:0,fees:0};
let book=loadBook();
function loadBook(){try{return Object.assign({},DEFAULT,JSON.parse(localStorage.getItem("chaosPaper")||"{}"))}catch(e){return {...DEFAULT}}}
function saveBook(){localStorage.setItem("chaosPaper",JSON.stringify(book))}
function resetBook(){localStorage.removeItem("chaosPaper");book={...DEFAULT,trades:[]};addTape("PAPER LEDGER RESET","liq");renderBook()}
$("reset").onclick=resetBook;

function resize(){DPR=Math.max(1,Math.min(2,devicePixelRatio||1));W=innerWidth;H=innerHeight;cv.width=W*DPR;cv.height=H*DPR;cv.style.width=W+"px";cv.style.height=H+"px";ctx.setTransform(DPR,0,0,DPR,0,0)}
addEventListener("resize",resize);resize();
function h(s){let x=2166136261;for(let c of s)x=Math.imul(x^c.charCodeAt(0),16777619);return x>>>0}
function usd(n){if(!Number.isFinite(n))return"—";if(Math.abs(n)>=1e12)return"$"+(n/1e12).toFixed(2)+"T";if(Math.abs(n)>=1e9)return"$"+(n/1e9).toFixed(2)+"B";if(Math.abs(n)>=1e6)return"$"+(n/1e6).toFixed(2)+"M";return (n<0?"-$":"$")+Math.abs(n).toLocaleString(undefined,{maximumFractionDigits:2})}
function price(n){return Number.isFinite(n)?"$"+n.toLocaleString(undefined,{maximumFractionDigits:n>1000?1:4}):"—"}
function venue(id,state){venueState[id]=state;const el=$("v-"+id);el.textContent=state?"LIVE":"OFF";el.className=state?"live":"error";updateMaster()}
function updateMaster(){const n=Object.values(venueState).filter(Boolean).length;$("masterDot").className=n>=3?"live":n===0?"error":"";$("masterStatus").textContent=n>=3?"MULTI-FEED LIVE":n>0?"PARTIAL LIVE":"RECONNECTING"}
function addTape(text,kind=""){tape.unshift({text,kind,t:Date.now()});tape=tape.slice(0,9);$("tape").innerHTML=tape.map(x=>`<div class="tick"><span>${new Date(x.t).toLocaleTimeString()}</span><span class="${x.kind}">${x.text}</span></div>`).join("")}
function spawn(symbol,vol,pct,boost=1){const a=(h(symbol)%6283)/1000,base=Math.min(W,H)*.11,spread=Math.min(W,H)*.35,rr=base+Math.random()*spread,side=pct>=0?1:-1,q=Math.max(1,vol||1);pts.push({x:W/2+Math.cos(a)*rr,y:H/2+Math.sin(a)*rr,vx:(Math.random()-.5)*.45,vy:(Math.random()-.5)*.45,r:Math.min(16,(1.3+Math.log10(q)*.8)*boost),life:1,side});if(pts.length>3200)pts.splice(0,500)}
function drawGrid(){const cx=W/2,cy=H/2;ctx.strokeStyle="rgba(100,145,165,.065)";for(let r=70;r<Math.min(W,H)*.47;r+=70){ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.stroke()}ctx.beginPath();ctx.moveTo(cx,0);ctx.lineTo(cx,H);ctx.moveTo(0,cy);ctx.lineTo(W,cy);ctx.stroke()}
function draw(){ctx.fillStyle="rgba(2,4,7,.19)";ctx.fillRect(0,0,W,H);drawGrid();const cx=W/2,cy=H/2;for(const p of pts){const dx=p.x-cx,dy=p.y-cy,d=Math.hypot(dx,dy)||1;p.vx+=(-dy/d)*.003+p.side*.0006;p.vy+=(dx/d)*.003;p.x+=p.vx;p.y+=p.vy;p.life*=.994;const a=.1+.7*p.life;ctx.beginPath();ctx.arc(p.x,p.y,p.r*Math.max(.3,p.life),0,Math.PI*2);ctx.fillStyle=p.side>0?`rgba(105,255,182,${a})`:`rgba(255,102,132,${a})`;ctx.fill()}pts=pts.filter(p=>p.life>.05);$("clusters").textContent=Math.floor(pts.filter(p=>p.r>8&&p.life>.25).length/8);requestAnimationFrame(draw)}draw();

function tickPrice(asset,p,source){
 if(!p||!Number.isFinite(p))return; venuePx[asset][source]=p;
 const vals=Object.values(venuePx[asset]); const med=vals.sort((a,b)=>a-b)[Math.floor(vals.length/2)]||p;
 if(px[asset])ret[asset].push((med-px[asset])/px[asset]); if(ret[asset].length>240)ret[asset].shift(); px[asset]=med;
 if(asset==="BTC")$("btc").textContent=price(med);if(asset==="ETH")$("eth").textContent=price(med);
}
function stdev(a){if(a.length<2)return 0;const m=a.reduce((x,y)=>x+y,0)/a.length;return Math.sqrt(a.reduce((s,x)=>s+(x-m)**2,0)/(a.length-1))}
function sum(a,n){return a.slice(-n).reduce((x,y)=>x+y,0)}
function divergence(asset){const a=Object.values(venuePx[asset]);if(a.length<2)return 0;return (Math.max(...a)-Math.min(...a))/((Math.max(...a)+Math.min(...a))/2)}
function scores(){
 const r=ret.BTC, mom=sum(r,20), fast=sum(r,5), vol=stdev(r.slice(-60)), div=divergence("BTC");
 const ltot=liqBuy+liqSell, limbal=ltot?(liqSell-liqBuy)/ltot:0;
 const momentum=Math.tanh((mom/(vol*Math.sqrt(20)+1e-9))*0.55);
 const reversion=-Math.tanh((fast/(vol*Math.sqrt(5)+1e-9))*0.6);
 const liquidation=Math.tanh(limbal*1.4)*Math.min(1,Math.log10(1+liqValue)/7);
 const divergenceScore=Math.min(1,div*180)*(mom>=0?1:-1);
 return {momentum,reversion,liquidation,divergence:divergenceScore,vol,div,mom};
}
function brain(){
 if(!px.BTC||ret.BTC.length<30)return;
 const s=scores(), arr=[["momentum",s.momentum],["reversion",s.reversion],["liquidation",s.liquidation],["divergence",s.divergence]];
 for(const [k,v] of arr){const el=$("s-"+k);el.textContent=k.toUpperCase()+" "+(v>=0?"+":"")+v.toFixed(2);el.className=Math.abs(v)>.45?(v>0?"hot":"cold"):""}
 const weighted=.38*s.momentum+.24*s.reversion+.26*s.liquidation+.12*s.divergence;
 const confidence=Math.min(.95,.5+Math.abs(weighted)*.5);
 const fee=.0008, slip=.00035+Math.min(.0015,s.vol*3), expected=Math.abs(weighted)*.0045-fee-slip;
 const annualized=s.vol*Math.sqrt(60)*100;
 const regime=annualized>1.2?"HIGH VOL":Math.abs(s.mom)>s.vol*4?"TREND":"RANGE";
 $("regime").textContent=regime;
 let action="WAIT",reason=`No positive edge after modeled ${(fee+slip)*100|0}bp costs`;
 if(expected>0.00035&&confidence>.62){action=weighted>0?"LONG BTC":"SHORT BTC";reason=`conf ${(confidence*100).toFixed(0)}% · est net edge ${(expected*100).toFixed(2)}% · div ${(s.div*100).toFixed(2)}%`}
 $("signal").textContent=action;$("decision").textContent=reason;
 if(Date.now()-lastBrain>5000){maybeTrade(action,confidence,expected);lastBrain=Date.now()}
}
function maybeTrade(action,confidence,edge){
 const p=px.BTC;if(!p)return;markToMarket(p);
 const dd=(book.equity-book.dayStart)/book.dayStart;
 if(dd<=-.02){$("signal").textContent="KILL SWITCH";$("decision").textContent="Daily paper loss limit reached";if(book.pos)closePos(p,"KILL");return}
 if(book.pos){
   const q=book.pos, move=(p-q.entry)/q.entry*q.side;
   if(move<=-q.stopPct)closePos(p,"STOP");
   else if(move>=q.takePct)closePos(p,"TAKE");
   else if(Date.now()-q.time>15*60*1000)closePos(p,"TIME");
   else if((action.startsWith("LONG")?1:action.startsWith("SHORT")?-1:0)===-q.side && confidence>.7)closePos(p,"FLIP");
   return;
 }
 if(action==="WAIT"||edge<=0)return;
 const side=action.startsWith("LONG")?1:-1, risk=book.equity*.0025, stopPct=.0035, qty=risk/(p*stopPct), notional=qty*p;
 const fee=notional*.0004;book.cash-=fee;book.fees+=fee;book.pos={side,entry:p,qty,time:Date.now(),stopPct,takePct:.0065,feeOpen:fee};
 addTape(`PAPER ${side>0?"LONG":"SHORT"} BTC @ ${price(p)} · ${usd(notional)}`,side>0?"up":"down");saveBook();renderBook()
}
function closePos(p,why){
 const q=book.pos;if(!q)return;const notional=q.qty*p,fee=notional*.0004,raw=(p-q.entry)*q.qty*q.side,pnl=raw-fee;
 book.cash+=raw-fee;book.fees+=fee;book.trades.push({side:q.side,entry:q.entry,exit:p,pnl,why,t:Date.now()});
 if(pnl>=0)book.grossWin+=pnl;else book.grossLoss+=-pnl;book.pos=null;
 addTape(`CLOSE ${why} · ${pnl>=0?"+":""}${usd(pnl)}`,pnl>=0?"up":"down");saveBook();renderBook()
}
function markToMarket(p){let floating=0;if(book.pos)floating=(p-book.pos.entry)*book.pos.qty*book.pos.side;book.equity=book.cash+floating;book.peak=Math.max(book.peak||book.equity,book.equity);renderBook()}
function renderBook(){
 const wins=book.trades.filter(t=>t.pnl>0).length,n=book.trades.length,pnl=book.equity-10000,dd=(book.equity-(book.peak||book.equity))/(book.peak||book.equity)*100;
 $("capital").textContent=usd(10000);$("equity").textContent=usd(book.equity);$("pnl").textContent=(pnl>=0?"+":"")+usd(pnl);
 $("drawdown").textContent=dd.toFixed(2)+"%";$("tradeCount").textContent=n;$("winRate").textContent=n?(wins/n*100).toFixed(1)+"%":"—";
 $("profitFactor").textContent=book.grossLoss?(book.grossWin/book.grossLoss).toFixed(2):book.grossWin?"∞":"—";
 $("position").textContent=book.pos?(book.pos.side>0?"LONG BTC":"SHORT BTC"):"FLAT";
}
renderBook();

function engineTick(){$("pressure").textContent=flow>.11?"BUY BIAS":flow<-.11?"SELL BIAS":"BALANCED";const a=Math.abs(flow);$("pulse").textContent=a>.24?"ELEVATED":a>.13?"ACTIVE":"NORMAL";$("symbols").textContent=syms.size.toLocaleString();$("events").textContent=events.toLocaleString()+" EVENTS";$("liqValue").textContent=usd(liqValue);brain()}
async function fetchGlobal(){try{const r=await fetch("https://api.coingecko.com/api/v3/global",{cache:"no-store"});if(!r.ok)throw 0;const d=(await r.json()).data;$("marketCap").textContent=usd(d.total_market_cap?.usd);$("volume24h").textContent=usd(d.total_volume?.usd);$("btcDom").textContent=(d.market_cap_percentage?.btc??0).toFixed(1)+"%";$("ethDom").textContent=(d.market_cap_percentage?.eth??0).toFixed(1)+"%";$("aggregateStamp").textContent="GLOBAL AGGREGATE: COINGECKO · "+new Date().toLocaleTimeString()}catch(e){$("aggregateStamp").textContent="GLOBAL AGGREGATE: TEMPORARILY UNAVAILABLE"}}fetchGlobal();setInterval(fetchGlobal,60000);

function startBinanceSpot(){const ws=new WebSocket("wss://stream.binance.com:9443/ws/!miniTicker@arr");ws.onopen=()=>venue("binance",true);ws.onmessage=e=>{let a;try{a=JSON.parse(e.data)}catch(_){return}if(!Array.isArray(a))return;for(const q of a.slice(0,240)){const p=+q.c,o=+q.o,v=+q.q;if(!p||!o)continue;const pct=(p-o)/o*100;flow=.988*flow+.012*(pct>=0?1:-1);syms.add("B:"+q.s);spawn(q.s,v,pct);events++;if(q.s==="BTCUSDT")tickPrice("BTC",p,"binance");if(q.s==="ETHUSDT")tickPrice("ETH",p,"binance");if(q.s==="SOLUSDT")tickPrice("SOL",p,"binance")}engineTick()};ws.onerror=()=>venue("binance",false);ws.onclose=()=>{venue("binance",false);setTimeout(startBinanceSpot,2500)}}
function startFutures(){const ws=new WebSocket("wss://fstream.binance.com/ws/!forceOrder@arr");ws.onopen=()=>venue("futures",true);ws.onmessage=e=>{let x;try{x=JSON.parse(e.data)}catch(_){return}const o=x.o||x;if(!o||!o.s)return;const p=+o.ap||+o.p||0,qty=+o.q||0,val=p*qty;liqCount++;liqValue+=val;events++;if(o.S==="SELL")liqSell+=val;else liqBuy+=val;liqBuy*=.998;liqSell*=.998;spawn("LQ:"+o.s,val,o.S==="SELL"?-1:1,1.5);addTape(`LIQ ${o.s} ${o.S||""} ${usd(val)}`,"liq");engineTick()};ws.onerror=()=>venue("futures",false);ws.onclose=()=>{venue("futures",false);setTimeout(startFutures,3000)}}
function startCoinbase(){const ws=new WebSocket("wss://ws-feed.exchange.coinbase.com");ws.onopen=()=>{venue("coinbase",true);ws.send(JSON.stringify({type:"subscribe",product_ids:["BTC-USD","ETH-USD","SOL-USD"],channels:["ticker"]}))};ws.onmessage=e=>{let x;try{x=JSON.parse(e.data)}catch(_){return}if(x.type!=="ticker")return;const p=+x.price,v=(+x.last_size||0)*p,side=x.side==="buy"?1:-1,a=x.product_id.split("-")[0];flow=.995*flow+.005*side;tickPrice(a,p,"coinbase");syms.add("C:"+x.product_id);spawn("C:"+x.product_id,v,side,.7);events++};ws.onerror=()=>venue("coinbase",false);ws.onclose=()=>{venue("coinbase",false);setTimeout(startCoinbase,3500)}}
function startKraken(){const ws=new WebSocket("wss://ws.kraken.com/v2");ws.onopen=()=>{venue("kraken",true);ws.send(JSON.stringify({method:"subscribe",params:{channel:"ticker",symbol:["BTC/USD","ETH/USD","SOL/USD"]}}))};ws.onmessage=e=>{let x;try{x=JSON.parse(e.data)}catch(_){return}if(x.channel!=="ticker"||!Array.isArray(x.data))return;for(const q of x.data){const p=+q.last||0,a=q.symbol.split("/")[0];tickPrice(a,p,"kraken");syms.add("K:"+q.symbol);spawn("K:"+q.symbol,(+q.volume||1)*p,Math.random()-.5,.55);events++}};ws.onerror=()=>venue("kraken",false);ws.onclose=()=>{venue("kraken",false);setTimeout(startKraken,4000)}}
function startOkx(){const ws=new WebSocket("wss://ws.okx.com:8443/ws/v5/public");ws.onopen=()=>{venue("okx",true);ws.send(JSON.stringify({op:"subscribe",args:[{channel:"tickers",instId:"BTC-USDT"},{channel:"tickers",instId:"ETH-USDT"},{channel:"tickers",instId:"SOL-USDT"}]}))};ws.onmessage=e=>{let x;try{x=JSON.parse(e.data)}catch(_){return}if(!x.arg||x.arg.channel!=="tickers"||!Array.isArray(x.data))return;for(const q of x.data){const p=+q.last||0,o=+q.open24h||p,a=q.instId.split("-")[0],pct=o?(p-o)/o*100:0;tickPrice(a,p,"okx");syms.add("O:"+q.instId);spawn("O:"+q.instId,+q.volCcy24h||1,pct,.55);events++}};ws.onerror=()=>venue("okx",false);ws.onclose=()=>{venue("okx",false);setTimeout(startOkx,4500)}}
startBinanceSpot();startFutures();startCoinbase();startKraken();startOkx();
setInterval(()=>{const now=performance.now(),dt=(now-lastT)/1000,r=dt?(events-lastEvents)/dt:0;$("rate").textContent=r.toFixed(0)+"/s";lastEvents=events;lastT=now;$("utc").textContent=new Date().toISOString().replace("T"," ").slice(0,19)+" UTC";if(px.BTC)markToMarket(px.BTC)},1000);
if("serviceWorker"in navigator)addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));
addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredInstall=e;$("install").classList.remove("hidden")});
$("install").onclick=async()=>{if(!deferredInstall)return;deferredInstall.prompt();await deferredInstall.userChoice;deferredInstall=null;$("install").classList.add("hidden")};
