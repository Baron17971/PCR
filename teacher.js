const app=document.getElementById('app');
const toastEl=document.getElementById('toast');
const Q=window.PCR_QUESTIONS||[];
const letters=['א','ב','ג','ד'];
const params=new URLSearchParams(location.search);

function esc(s=''){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
function toast(msg){if(!toastEl)return;toastEl.textContent=msg;toastEl.classList.add('show');setTimeout(()=>toastEl.classList.remove('show'),2200);}
function shell(content){app.innerHTML=`<div><div class="app-shell"><div class="container">${content}</div></div></div>`;}
function brand(){return `<div class="brand"><span class="brand-mark">PCR</span><div><strong>PCR LIVE</strong><div class="small muted">סקר כיתתי חי</div></div></div>`;}
function base(){return location.origin;}
function pct(n,total){return total?Math.round(n*100/total):0;}
function qAt(i){return Q[Math.max(0,Math.min(Q.length-1,i))];}
async function apiGet(code,token){
  const p=new URLSearchParams({code,teacherToken:token});
  const r=await fetch('/api/room?'+p.toString(),{cache:'no-store'});
  if(!r.ok)throw new Error('room');
  return r.json();
}
async function apiPost(body){
  const r=await fetch('/api/room',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
  const j=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(j.error||'request');
  return j;
}
function statusPill(room){
  const cls=room.finished?'revealed':room.resultsVisible?'revealed':room.status==='open'?'open':'closed';
  const label=room.finished?'השאלון הסתיים':room.resultsVisible?'התשובה נחשפה':room.status==='open'?'ההצבעה פתוחה':'ההצבעה סגורה';
  return `<span class="status-pill ${cls}"><i class="dot"></i>${label}</span>`;
}
function renderOptions(q){
  return `<div class="option-list">${q.options.map((o,i)=>`<div class="option"><span class="option-letter">${letters[i]}</span><span>${esc(o)}</span></div>`).join('')}</div>`;
}
function renderResults(room,q){
  const counts=room.results?.counts||[0,0,0,0],total=room.results?.total||0;
  return `<div class="results">${q.options.map((o,i)=>`<div class="result-row"><div class="bar-wrap"><div class="bar ${i===q.correct?'correct':''}" style="width:${pct(counts[i]||0,total)}%"></div><div class="bar-label"><span class="option-letter">${letters[i]}</span><span>${esc(o)}</span></div></div><div class="pct">${pct(counts[i]||0,total)}%</div></div>`).join('')}</div>
  <div class="answer-badge">✓ התשובה הנכונה: <strong>${letters[q.correct]}. ${esc(q.options[q.correct])}</strong></div>
  <div class="explanation">${esc(q.explanation)}</div>`;
}
function renderLeaderboard(leaders=[]){
  const medals=['🥇','🥈','🥉'];
  if(!leaders.length)return '<div class="leader-empty">עדיין אין ציונים להצגה.</div>';
  return `<div class="leaderboard">${leaders.slice(0,3).map((p,i)=>`<div class="leader-card rank-${i+1}"><div class="leader-rank">${medals[i]}</div><div class="leader-name">${esc(p.name)}</div><div class="leader-score">${p.score}<span>/100</span></div><div class="leader-detail">${p.correct} תשובות נכונות מתוך 25</div></div>`).join('')}</div>`;
}
async function copyText(s){
  try{await navigator.clipboard.writeText(s);toast('הקישור הועתק');}
  catch(e){toast('לא ניתן להעתיק אוטומטית');}
}

function teacherStart(){
  shell(`<div class="topbar">${brand()}<span class="muted small">מסך מורה</span></div>
  <section class="card panel">
    <h2>פתיחת כיתה חדשה</h2>
    <p class="muted">פתח כיתה, קבל קוד וקישור לתלמידים, והפעל מקרן ישירות מתוך הכיתה.</p>
    <div class="form-row">
      <div class="field"><label>שם הכיתה / הקבוצה</label><input id="className" maxlength="60" placeholder="למשל: י״א ביוטכנולוגיה"></div>
      <button class="btn primary" id="createBtn">פתיחת כיתה</button>
    </div>
  </section>`);
  const btn=document.getElementById('createBtn');
  btn.onclick=async()=>{
    btn.disabled=true;btn.textContent='פותח כיתה…';
    try{
      const room=await apiPost({action:'create',className:document.getElementById('className').value.trim()});
      localStorage.setItem('pcr_teacher_'+room.code,room.teacherToken);
      location.href='/teacher?code='+encodeURIComponent(room.code)+'&token='+encodeURIComponent(room.teacherToken);
    }catch(e){
      btn.disabled=false;btn.textContent='פתיחת כיתה';toast('לא הצלחנו לפתוח כיתה');
    }
  };
}

async function teacherRoom(code,token){
  shell(`<div class="topbar">${brand()}<span class="muted small">מסך מורה</span></div>
  <section class="card panel waiting"><div class="pulse"></div><h2>פותח את הכיתה…</h2><p class="muted">טוען את מצב הסקר.</p></section>`);

  let room;
  try{room=await apiGet(code,token);}catch(e){toast('לא ניתן לפתוח את הכיתה');return teacherStart();}

  let busy=false,acting=false;
  const render=()=>{
    const q=qAt(room.questionIndex);
    const joinUrl=base()+'/join?code='+encodeURIComponent(room.code);
    const projectorUrl=base()+'/projector?code='+encodeURIComponent(room.code);

    if(room.finished){
      shell(`<div class="topbar">${brand()}<div class="room-code">${room.code}</div></div>
      <section class="card final-card"><div class="eyebrow">השאלון הסתיים</div><h1>🏆 מובילי הכיתה</h1><p class="muted">כל תשובה נכונה שווה 4 נקודות • ציון מרבי 100</p>${renderLeaderboard(room.leaderboard||[])}</section>`);
      return;
    }

    shell(`<div class="topbar">${brand()}<div class="actions"><button class="btn ghost" id="copyStudentLink">העתק קישור תלמיד</button><button class="btn ghost" id="openProjector">פתח מקרן לכיתה הזו</button></div></div>
    <div class="teacher-layout">
      <section class="card question-card">
        <div class="question-kicker"><span>שאלה ${room.questionIndex+1} מתוך ${Q.length}</span>${statusPill(room)}</div>
        <h2 class="question-title">${esc(q.question)}</h2>
        ${room.resultsVisible?renderResults(room,q):renderOptions(q)}
      </section>
      <aside class="side-stack">
        <section class="card stat-card"><div class="muted small">קוד כיתה</div><div class="room-code">${room.code}</div><div>${esc(room.className||'כיתה')}</div><div class="divider"></div><div class="muted small">תשובות שנקלטו</div><div class="stat-big">${room.results?.total||0}</div></section>
        <section class="card stat-card"><strong>שליטת מורה</strong><div class="control-grid">
          <button class="btn ${room.status==='open'?'danger':'primary'}" id="toggleBtn" ${room.resultsVisible?'disabled':''}>${room.status==='open'?'סגור הצבעה':'פתח הצבעה'}</button>
          <button class="btn secondary" id="revealBtn" ${room.resultsVisible?'disabled':''}>חשוף תשובה</button>
          <button class="btn" id="prevBtn" ${room.questionIndex===0?'disabled':''}>שאלה קודמת</button>
          <button class="btn primary" id="nextBtn" ${room.questionIndex===Q.length-1?'disabled':''}>שאלה הבאה</button>
          <button class="btn ghost" id="resetBtn">אפס תשובות</button>
          <button class="btn ghost" id="closeBtn">סגור הצבעה</button>
          ${room.questionIndex===Q.length-1?`<button class="btn primary finish-btn" id="finishBtn" ${room.resultsVisible?'':'disabled'}>סיום השאלון והצגת ציונים</button>`:''}
        </div></section>
        <section class="card stat-card"><strong>כניסת תלמידים</strong><div class="linkbox">${joinUrl}</div><div id="qrBox" class="qr" style="margin-top:12px"><span class="small muted">טוען QR…</span></div></section>
      </aside>
    </div>`);

    document.getElementById('copyStudentLink').onclick=()=>copyText(joinUrl);
    document.getElementById('openProjector').onclick=()=>window.open(projectorUrl,'_blank','noopener');
    document.getElementById('toggleBtn').onclick=()=>act('setStatus',{status:room.status==='open'?'closed':'open'});
    document.getElementById('revealBtn').onclick=()=>act('setVisibility',{resultsVisible:true});
    document.getElementById('prevBtn').onclick=()=>act('setQuestion',{questionIndex:room.questionIndex-1});
    document.getElementById('nextBtn').onclick=()=>act('setQuestion',{questionIndex:room.questionIndex+1});
    document.getElementById('resetBtn').onclick=()=>act('reset',{});
    document.getElementById('closeBtn').onclick=()=>act('setStatus',{status:'closed'});
    const finish=document.getElementById('finishBtn');if(finish)finish.onclick=()=>act('finish',{});

    fetch('/api/qr?url='+encodeURIComponent(joinUrl)).then(r=>r.text()).then(svg=>{
      const box=document.getElementById('qrBox');if(box)box.innerHTML=svg;
    }).catch(()=>{});
  };

  const act=async(action,extra)=>{
    if(acting)return;acting=true;
    try{room=await apiPost({action,code,teacherToken:token,...extra});render();}
    catch(e){toast('הפעולה לא בוצעה');}
    finally{acting=false;}
  };

  render();

  setInterval(async()=>{
    if(busy||acting)return;
    busy=true;
    try{
      const fresh=await apiGet(code,token);
      if(fresh.version!==room.version||fresh.results?.total!==room.results?.total){room=fresh;render();}
    }catch(e){}
    finally{busy=false;}
  },1800);
}

const code=params.get('code')||'';
const token=params.get('token')||localStorage.getItem('pcr_teacher_'+code)||'';
if(code&&token)teacherRoom(code,token);else teacherStart();
