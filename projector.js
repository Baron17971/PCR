const app=document.getElementById('app');
const toastEl=document.getElementById('toast');
const Q=window.PCR_QUESTIONS||[];
const letters=['א','ב','ג','ד'];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const qs=new URLSearchParams(location.search);

function toast(msg){toastEl.textContent=msg;toastEl.classList.add('show');setTimeout(()=>toastEl.classList.remove('show'),2200);}
function esc(s=''){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
function base(){return location.origin;}
function qAt(i){return Q[Math.max(0,Math.min(Q.length-1,i))];}
function pct(n,total){return total?Math.round(n*100/total):0;}
async function apiGet(code){const r=await fetch('/api/room?code='+encodeURIComponent(code)+'&projector=1',{cache:'no-store'});if(!r.ok)throw new Error('room');return r.json();}
function shell(content){app.innerHTML='<div class="projector"><div class="app-shell"><div class="container">'+content+'</div></div></div>';}
function brand(){return '<div class="brand"><span class="brand-mark">PCR</span><div><strong>PCR LIVE</strong><div class="small muted">סקר כיתתי חי</div></div></div>';}
function statusPill(room){const s=room.finished?'revealed':room.resultsVisible?'revealed':room.status==='open'?'open':'closed';const label=room.finished?'השאלון הסתיים':room.resultsVisible?'התשובה נחשפה':room.status==='open'?'ההצבעה פתוחה':'ההצבעה סגורה';return '<span class="status-pill '+s+'"><i class="dot"></i>'+label+'</span>';}
function renderOptions(q){return '<div class="option-list">'+q.options.map((o,i)=>'<div class="option"><span class="option-letter">'+letters[i]+'</span><span>'+esc(o)+'</span></div>').join('')+'</div>';}
function renderResults(room,q){
 const counts=room.results?.counts||[0,0,0,0],total=room.results?.total||0;
 return '<div class="results">'+q.options.map((o,i)=>'<div class="result-row"><div class="bar-wrap"><div class="bar '+(i===q.correct?'correct':'')+'" style="width:'+pct(counts[i]||0,total)+'%"></div><div class="bar-label"><span class="option-letter">'+letters[i]+'</span><span>'+esc(o)+'</span></div></div><div class="pct">'+pct(counts[i]||0,total)+'%</div></div>').join('')+'</div><div class="answer-badge">✓ התשובה הנכונה: <strong>'+letters[q.correct]+'. '+esc(q.options[q.correct])+'</strong></div><div class="explanation">'+esc(q.explanation)+'</div>';
}
function renderLeaderboard(leaders=[]){
 const medals=['🥇','🥈','🥉'];
 if(!leaders.length)return '<div class="leader-empty">עדיין אין ציונים להצגה.</div>';
 return '<div class="leaderboard leaderboard-projector">'+leaders.slice(0,3).map((p,i)=>'<div class="leader-card rank-'+(i+1)+'"><div class="leader-rank">'+medals[i]+'</div><div class="leader-name">'+esc(p.name)+'</div><div class="leader-score">'+p.score+'<span>/100</span></div><div class="leader-detail">'+p.correct+' תשובות נכונות מתוך 25</div></div>').join('')+'</div>';
}

async function start(code){
 let room;
 try{room=await apiGet(code);}catch(e){shell('<section class="card projector-wait"><h1>לא ניתן לפתוח את תצוגת המקרן</h1><p>פתח אותה מחדש ממסך המורה.</p></section>');return;}

 const render=()=>{
   const q=qAt(room.questionIndex);
   const joinUrl=base()+'/join?code='+encodeURIComponent(room.code);

   if(room.finished){
     shell('<div class="projector-head">'+brand()+'<div style="text-align:left"><span class="muted small">קוד כיתה</span><div class="room-code">'+room.code+'</div></div></div><section class="card final-card projector-final"><div class="eyebrow">השאלון הסתיים</div><h1>🏆 שלושת הציונים הגבוהים ביותר</h1><p>כל תשובה נכונה = 4 נקודות • ציון מרבי 100</p>'+renderLeaderboard(room.leaderboard||[])+'</section>');
     return;
   }

   if(room.status!=='open'&&!room.resultsVisible){
     shell('<div class="projector-head">'+brand()+'<div><span class="muted small">קוד הצטרפות</span><div class="room-code">'+room.code+'</div></div></div><section class="card projector-wait"><div><div class="eyebrow">'+esc(room.className||'PCR LIVE')+'</div><h1>מוכנים לשאלה '+(room.questionIndex+1)+'?</h1><p>הצטרפו דרך הטלפון • קוד '+room.code+'</p><div id="projectorQr" class="qr" style="margin:24px auto 0"></div></div></section>');
     fetch('/api/qr?url='+encodeURIComponent(joinUrl)).then(r=>r.text()).then(svg=>{const x=document.getElementById('projectorQr');if(x)x.innerHTML=svg;}).catch(()=>{});
     return;
   }

   shell('<div class="projector-head">'+brand()+'<div style="text-align:left"><span class="muted small">קוד כיתה</span><div class="room-code">'+room.code+'</div></div></div><section class="card question-card"><div class="question-kicker"><span>שאלה '+(room.questionIndex+1)+' מתוך '+Q.length+'</span>'+statusPill(room)+'</div><h1 class="question-title">'+esc(q.question)+'</h1>'+(room.resultsVisible?renderResults(room,q):renderOptions(q)+'<div style="margin-top:24px;text-align:center;font-size:24px;color:var(--muted)">נקלטו <strong style="color:var(--brand)">'+(room.results?.total||0)+'</strong> תשובות</div>')+'</section>');
 };

 render();
 while(true){
   await sleep(1000);
   try{
     const fresh=await apiGet(code);
     if(fresh.version!==room.version||fresh.results?.total!==room.results?.total){room=fresh;render();}
   }catch(e){}
 }
}

const code=qs.get('code')||'';
if(!code){
  shell('<section class="card projector-wait"><h1>אין קוד כיתה</h1><p>פתח את תצוגת המקרן מתוך מסך המורה.</p></section>');
}else{
  start(code);
}
