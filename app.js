const app = document.getElementById('app');
const toastEl = document.getElementById('toast');
const Q = window.PCR_QUESTIONS || [];
const letters = ['א','ב','ג','ד'];
const sleep = ms => new Promise(r => setTimeout(r, ms));
const qs = new URLSearchParams(location.search);

function toast(msg){ toastEl.textContent=msg; toastEl.classList.add('show'); setTimeout(()=>toastEl.classList.remove('show'),2200); }
function esc(s=''){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
function base(){return `${location.origin}`;}
function questionAt(index){return Q[Math.max(0, Math.min(Q.length-1, index))];}
function pct(n,total){return total?Math.round(n*100/total):0;}
async function apiGet(code, extras={}){const p=new URLSearchParams({code,...extras});const r=await fetch(`/api/room?${p}`,{cache:'no-store'});if(!r.ok)throw new Error((await r.json().catch(()=>({}))).error||'network');return r.json();}
async function apiPost(body){const r=await fetch('/api/room',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||'network');return j;}
function statusPill(room){const s=room.finished?'revealed':room.resultsVisible?'revealed':room.status==='open'?'open':'closed';const label=room.finished?'השאלון הסתיים':room.resultsVisible?'תשובה נחשפה':room.status==='open'?'ההצבעה פתוחה':'ההצבעה סגורה';return `<span class="status-pill ${s}"><i class="dot"></i>${label}</span>`}
function renderOptions(q, correctVisible=false, selected=null){return `<div class="option-list">${q.options.map((o,i)=>`<div class="option ${correctVisible&&i===q.correct?'correct':''} ${selected===i&&correctVisible&&i!==q.correct?'wrong-selected':''}"><span class="option-letter">${letters[i]}</span><span>${esc(o)}</span></div>`).join('')}</div>`}
function renderResults(room,q){const counts=room.results?.counts||[0,0,0,0];const total=room.results?.total||0;return `<div class="results">${q.options.map((o,i)=>`<div class="result-row"><div class="bar-wrap"><div class="bar ${i===q.correct?'correct':''}" style="width:${pct(counts[i]||0,total)}%"></div><div class="bar-label"><span class="option-letter">${letters[i]}</span><span>${esc(o)}</span></div></div><div class="pct">${pct(counts[i]||0,total)}%</div></div>`).join('')}</div><div class="answer-badge">✓ התשובה הנכונה: <strong>${letters[q.correct]}. ${esc(q.options[q.correct])}</strong></div><div class="explanation">${esc(q.explanation)}</div>`}
function renderLeaderboard(leaders=[], projector=false){
  const medals=['🥇','🥈','🥉'];
  if(!leaders.length)return `<div class="leader-empty">עדיין אין ציונים להצגה.</div>`;
  return `<div class="leaderboard ${projector?'leaderboard-projector':''}">${leaders.slice(0,3).map((p,i)=>`
    <div class="leader-card rank-${i+1}">
      <div class="leader-rank">${medals[i]}</div>
      <div class="leader-name">${esc(p.name)}</div>
      <div class="leader-score">${p.score}<span>/100</span></div>
      <div class="leader-detail">${p.correct} תשובות נכונות מתוך 25</div>
    </div>`).join('')}</div>`;
}

function shell(content, cls=''){app.innerHTML=`<div class="${cls}"><div class="app-shell"><div class="container">${content}</div></div></div>`}
function brand(){return `<div class="brand"><span class="brand-mark">PCR</span><div><strong>PCR LIVE</strong><div class="small muted">סקר כיתתי חי</div></div></div>`}

function home(){
  shell(`<div class="topbar">${brand()}<span class="muted small">25 שאלות • מורה • תלמיד • מקרן</span></div>
  <section class="card hero"><div><span class="eyebrow">למידה פעילה בזמן אמת</span><h1>PCR<br>LIVE</h1><p>25 שאלות רבות־ברירה על PCR ו־qPCR. המורה שולט בקצב, התלמידים מצביעים מהטלפון, ולאחר כל שאלה נחשף פילוח התשובות עם סימון התשובה הנכונה.</p><div class="actions"><button class="btn primary" onclick="teacherStart()">פתיחת שיעור כמורה</button><button class="btn" onclick="studentStart()">כניסת תלמיד</button><button class="btn ghost" onclick="projectorStart()">תצוגת מקרן</button></div></div><div class="dna-art"><div class="helix"></div></div></section>
  <div class="role-grid"><div class="card role-card" onclick="teacherStart()"><div class="role-icon">🎛️</div><h3>צד מורה</h3><div class="muted">פתיחת חדר, שליטה בהצבעה, חשיפה ומעבר בין שאלות.</div></div><div class="card role-card" onclick="studentStart()"><div class="role-icon">📱</div><h3>צד תלמיד</h3><div class="muted">כניסה בקוד כיתה, בחירת תשובה וחיווי לאחר החשיפה.</div></div><div class="card role-card" onclick="projectorStart()"><div class="role-icon">📊</div><h3>מסך מקרן</h3><div class="muted">שאלה גדולה, מספר משיבים ופילוח תשובות לאחר החשיפה.</div></div></div>`);
}

window.teacherStart = function(){
  shell(`<div class="topbar">${brand()}${window.PCR_FORCE_TEACHER?'':'<button class="btn ghost" onclick="home()">חזרה</button>'}</div><section class="card panel"><h2>פתיחת סקר חדש</h2><p class="muted">כל פתיחה יוצרת קוד כיתה חדש. לאחר מכן אפשר לפתוח את מסך המקרן ולהתחיל.</p><div class="form-row"><div class="field"><label>שם הכיתה / הקבוצה</label><input id="className" placeholder="למשל: י״א ביוטכנולוגיה" maxlength="60"></div><button class="btn primary" id="createBtn">צור חדר</button></div></section>`);
  document.getElementById('createBtn').onclick=async()=>{const b=document.getElementById('createBtn');b.disabled=true;try{const room=await apiPost({action:'create',className:document.getElementById('className').value.trim()});localStorage.setItem(`pcr_teacher_${room.code}`,room.teacherToken);history.replaceState({},'',`/teacher?code=${room.code}`);teacherRoom(room.code,room.teacherToken);}catch(e){toast('לא הצלחתי לפתוח חדר');b.disabled=false;}};
}

async function teacherRoom(code, token){
  const poll=async()=>{try{return await apiGet(code,{teacherToken:token})}catch(e){return null}};
  let room=await poll(); if(!room){toast('החדר לא נמצא');return teacherStart();}
  const render=async()=>{
    const q=questionAt(room.questionIndex);
    const joinUrl=`${base()}/student.html`;
    const projUrl=`${base()}/projector.html?code=${room.code}`;
    if(room.finished){
      shell(`<div class="topbar">${brand()}<div class="room-code">${room.code}</div></div>
      <section class="card final-card"><div class="eyebrow">השאלון הסתיים</div><h1>🏆 מובילי הכיתה</h1><p class="muted">כל תשובה נכונה שווה 4 נקודות • ציון מרבי 100</p>${renderLeaderboard(room.leaderboard||[])}</section>`);
      return;
    }
    shell(`<div class="topbar">${brand()}<div class="actions"><button class="btn ghost" onclick="copyText('${joinUrl}')">העתק קישור תלמיד</button><button class="btn ghost" onclick="window.open('${projUrl}','_blank')">פתח מקרן</button></div></div>
    <div class="teacher-layout"><section class="card question-card"><div class="question-kicker"><span>שאלה ${room.questionIndex+1} מתוך ${Q.length}</span>${statusPill(room)}</div><h2 class="question-title">${esc(q.question)}</h2>${room.resultsVisible?renderResults(room,q):renderOptions(q,false)}</section>
    <aside class="side-stack"><section class="card stat-card"><div class="muted small">קוד כיתה</div><div class="room-code">${room.code}</div><div>${esc(room.className||'כיתה')}</div><div class="divider"></div><div class="muted small">תשובות שנקלטו</div><div class="stat-big">${room.results?.total||0}</div></section>
    <section class="card stat-card"><strong>שליטת מורה</strong><div class="control-grid"><button class="btn ${room.status==='open'?'danger':'primary'}" id="toggleBtn" ${room.resultsVisible?'disabled':''}>${room.status==='open'?'סגור הצבעה':'פתח הצבעה'}</button><button class="btn secondary" id="revealBtn" ${room.resultsVisible?'disabled':''}>חשוף תשובה</button><button class="btn" id="prevBtn" ${room.questionIndex===0?'disabled':''}>שאלה קודמת</button><button class="btn primary" id="nextBtn" ${room.questionIndex===Q.length-1?'disabled':''}>שאלה הבאה</button><button class="btn ghost" id="resetBtn">אפס תשובות</button><button class="btn ghost" id="closeBtn">סגור הצבעה</button>${room.questionIndex===Q.length-1?`<button class="btn primary finish-btn" id="finishBtn" ${room.resultsVisible?'':'disabled'}>סיום השאלון והצגת ציונים</button>`:''}</div></section>
    <section class="card stat-card"><strong>קישור לתלמידים</strong><div class="linkbox">${joinUrl}</div><div id="qrBox" class="qr" style="margin-top:12px"><span class="small muted">טוען QR…</span></div></section></aside></div>`);
    document.getElementById('toggleBtn').onclick=()=>act('setStatus',{status:room.status==='open'?'closed':'open'});
    document.getElementById('revealBtn').onclick=()=>act('setVisibility',{resultsVisible:true,status:'closed'});
    document.getElementById('prevBtn').onclick=()=>act('setQuestion',{questionIndex:room.questionIndex-1});
    document.getElementById('nextBtn').onclick=()=>act('setQuestion',{questionIndex:room.questionIndex+1});
    document.getElementById('resetBtn').onclick=()=>act('reset',{});
    document.getElementById('closeBtn').onclick=()=>act('setStatus',{status:'closed'});
    const finishBtn=document.getElementById('finishBtn');if(finishBtn)finishBtn.onclick=()=>act('finish',{});
    fetch(`/api/qr?url=${encodeURIComponent(joinUrl)}`).then(r=>r.text()).then(svg=>{const box=document.getElementById('qrBox');if(box)box.innerHTML=svg}).catch(()=>{});
  };
  const act=async(action,extra)=>{try{room=await apiPost({action,code,teacherToken:token,...extra});render();}catch(e){toast('הפעולה לא בוצעה');}};
  render();
  let alive=true; window.__stopPolling=()=>alive=false;
  while(alive){await sleep(1200);const fresh=await poll();if(fresh&&fresh.version!==room.version){room=fresh;render();}else if(fresh&&fresh.results?.total!==room.results?.total){room=fresh;render();}}
}

window.studentStart=function(prefill=qs.get('code')||''){
  shell(`<div class="topbar">${brand()}<span class="muted small">כניסת תלמידים</span></div><section class="card student-card"><h2>כניסת תלמיד</h2><p class="muted">הקלד את קוד הכיתה ושם פרטי.</p><div class="field"><label>קוד כיתה</label><input id="studentCode" class="code-input" inputmode="numeric" maxlength="6" value="${esc(prefill)}" placeholder="000000"></div><div class="field" style="margin-top:12px"><label>שם פרטי</label><input id="studentName" maxlength="40" placeholder="השם שלך"></div><button class="btn primary" style="width:100%;margin-top:16px" id="joinBtn">כניסה לסקר</button></section>`);
  document.getElementById('joinBtn').onclick=()=>{const code=document.getElementById('studentCode').value.trim();const name=document.getElementById('studentName').value.trim();if(code.length<4||!name)return toast('יש להזין קוד ושם');studentRoom(code,name);};
}

async function studentRoom(code,name){
  let voterId=localStorage.getItem(`pcr_voter_${code}`);if(!voterId){voterId=crypto.randomUUID?crypto.randomUUID():`${Date.now()}-${Math.random()}`;localStorage.setItem(`pcr_voter_${code}`,voterId)}
  localStorage.setItem(`pcr_name_${code}`,name);
  let room=null, lastQuestion=-1;
  const poll=async()=>apiGet(code,{voterId});
  const render=()=>{
    const q=questionAt(room.questionIndex);
    if(room.questionIndex!==lastQuestion){lastQuestion=room.questionIndex;}
    if(room.finished){
      const score=room.score||{score:0,correct:0,answered:0};
      shell(`<div class="topbar">${brand()}<span class="status-pill revealed"><i class="dot"></i>השאלון הסתיים</span></div>
      <section class="card student-card final-student"><div class="eyebrow">כל הכבוד, ${esc(name)}</div><h2>הציון שלך</h2><div class="student-score">${score.score}<span>/100</span></div><div class="score-detail">${score.correct} תשובות נכונות מתוך 25</div><p class="muted">כל תשובה נכונה שווה 4 נקודות.</p></section>`);
      return;
    }
    if(room.status!=='open'&&!room.resultsVisible){shell(`<div class="topbar">${brand()}<span class="status-pill closed"><i class="dot"></i>ממתינים למורה</span></div><section class="card student-card waiting"><div class="pulse"></div><h2>${esc(name)}, עוד רגע מתחילים</h2><p class="muted">שאלה ${room.questionIndex+1} מתוך ${Q.length} מוכנה. המורה יפתח את ההצבעה.</p></section>`);return;}
    if(room.resultsVisible){const good=room.myVote===q.correct;shell(`<div class="topbar">${brand()}<span class="status-pill revealed"><i class="dot"></i>התשובה נחשפה</span></div><section class="card student-card"><div class="muted small">שאלה ${room.questionIndex+1} מתוך ${Q.length}</div><h2 class="question-title" style="font-size:26px">${esc(q.question)}</h2>${renderOptions(q,true,room.myVote)}<div class="feedback ${good?'good':'bad'}">${room.myVote==null?'לא נשלחה תשובה בשאלה זו.':good?'✓ נכון!':'התשובה שלך אינה נכונה.'}</div><div class="explanation">${esc(q.explanation)}</div><p class="muted small">ממתינים למורה לשאלה הבאה.</p></section>`);return;}
    shell(`<div class="topbar">${brand()}<span class="status-pill open"><i class="dot"></i>ההצבעה פתוחה</span></div><section class="card student-card"><div class="muted small">שאלה ${room.questionIndex+1} מתוך ${Q.length}</div><h2 class="question-title" style="font-size:27px">${esc(q.question)}</h2><div class="student-options">${q.options.map((o,i)=>`<button class="student-option ${room.myVote===i?'selected':''}" data-answer="${i}"><span class="option-letter">${letters[i]}</span><span>${esc(o)}</span></button>`).join('')}</div><div class="small muted" style="margin-top:14px">אפשר לשנות בחירה כל עוד ההצבעה פתוחה.</div></section>`);
    document.querySelectorAll('.student-option').forEach(btn=>btn.onclick=async()=>{const ans=Number(btn.dataset.answer);document.querySelectorAll('.student-option').forEach(b=>b.disabled=true);try{await apiPost({action:'vote',code,voterId,name,answer:ans,questionIndex:room.questionIndex});room=await poll();render();toast('התשובה נקלטה');}catch(e){toast('ההצבעה כבר נסגרה');}});
  };
  try{room=await poll();render();}catch(e){toast('קוד כיתה לא נמצא');return studentStart(code)}
  let alive=true;window.__stopPolling=()=>alive=false;while(alive){await sleep(1200);try{const fresh=await poll();if(fresh.version!==room.version||fresh.myVote!==room.myVote){room=fresh;render();}}catch{}}
}

window.projectorStart=function(prefill=qs.get('code')||''){
  if(prefill)return projectorRoom(prefill);
  shell(`<div class="topbar">${brand()}${window.PCR_FORCE_PROJECTOR?'':'<button class="btn ghost" onclick="home()">חזרה</button>'}</div><section class="card student-card"><h2>תצוגת מקרן</h2><p class="muted">הקלד את קוד הכיתה.</p><input id="projectorCode" class="code-input" inputmode="numeric" maxlength="6" placeholder="000000"><button class="btn primary" style="width:100%;margin-top:16px" id="projectBtn">פתח מקרן</button></section>`);
  document.getElementById('projectBtn').onclick=()=>{const code=document.getElementById('projectorCode').value.trim();if(!code)return;history.replaceState({},'',`/projector?code=${code}`);projectorRoom(code)};
}

async function projectorRoom(code){
  let room=null;
  const poll=async()=>apiGet(code,{});
  const render=()=>{const q=questionAt(room.questionIndex);const joinUrl=`${base()}/student.html`;
    if(room.finished){
      shell(`<div class="projector-head">${brand()}<div style="text-align:left"><span class="muted small">קוד כיתה</span><div class="room-code">${room.code}</div></div></div>
      <section class="card final-card projector-final"><div class="eyebrow">השאלון הסתיים</div><h1>🏆 שלושת הציונים הגבוהים ביותר</h1><p>כל תשובה נכונה = 4 נקודות • ציון מרבי 100</p>${renderLeaderboard(room.leaderboard||[],true)}</section>`,'projector');
      return;
    }
    if(room.status!=='open'&&!room.resultsVisible){shell(`<div class="projector-head">${brand()}<div><span class="muted small">קוד הצטרפות</span><div class="room-code">${room.code}</div></div></div><section class="card projector-wait"><div><div class="eyebrow">${esc(room.className||'PCR LIVE')}</div><h1>מוכנים לשאלה ${room.questionIndex+1}?</h1><p>הצטרפו דרך הטלפון • קוד ${room.code}</p><div id="projectorQr" class="qr" style="margin:24px auto 0"></div></div></section>`,'projector');fetch(`/api/qr?url=${encodeURIComponent(joinUrl)}`).then(r=>r.text()).then(svg=>{const x=document.getElementById('projectorQr');if(x)x.innerHTML=svg});return;}
    shell(`<div class="projector-head">${brand()}<div style="text-align:left"><span class="muted small">קוד כיתה</span><div class="room-code">${room.code}</div></div></div><section class="card question-card"><div class="question-kicker"><span>שאלה ${room.questionIndex+1} מתוך ${Q.length}</span>${statusPill(room)}</div><h1 class="question-title">${esc(q.question)}</h1>${room.resultsVisible?renderResults(room,q):`${renderOptions(q,false)}<div style="margin-top:24px;text-align:center;font-size:24px;color:var(--muted)">נקלטו <strong style="color:var(--brand)">${room.results?.total||0}</strong> תשובות</div>`}</section>`,'projector');
  };
  try{room=await poll();render();}catch{toast('קוד כיתה לא נמצא');return projectorStart()}
  let alive=true;window.__stopPolling=()=>alive=false;while(alive){await sleep(1000);try{const fresh=await poll();if(fresh.version!==room.version||fresh.results?.total!==room.results?.total){room=fresh;render();}}catch{}}
}

window.copyText=async function(s){try{await navigator.clipboard.writeText(s);toast('הקישור הועתק')}catch{toast('לא ניתן להעתיק אוטומטית')}}
window.home=function(){if(window.__stopPolling)window.__stopPolling();history.replaceState({},'', '/');home();}

(function route(){
  const path=location.pathname;
  if(window.PCR_FORCE_STUDENT) return studentStart(qs.get('code')||'');
  if(window.PCR_FORCE_TEACHER){
    const code=qs.get('code');
    if(code){
      const token=localStorage.getItem(`pcr_teacher_${code}`);
      if(token) return teacherRoom(code,token);
    }
    return teacherStart();
  }
  if(window.PCR_FORCE_PROJECTOR) return projectorStart(qs.get('code')||'');
  if(path==='/teacher'){
    const code=qs.get('code');
    if(code){
      const token=localStorage.getItem(`pcr_teacher_${code}`);
      if(token) return teacherRoom(code,token);
    }
    return teacherStart();
  }
  if(path==='/student'||path==='/join') return studentStart(qs.get('code')||'');
  if(path==='/projector') return projectorStart(qs.get('code')||'');
  home();
})();
