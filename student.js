const app=document.getElementById('app');
const toastEl=document.getElementById('toast');
const Q=window.PCR_QUESTIONS||[];
const letters=['א','ב','ג','ד'];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const qs=new URLSearchParams(location.search);

function toast(msg){toastEl.textContent=msg;toastEl.classList.add('show');setTimeout(()=>toastEl.classList.remove('show'),2200);}
function esc(s=''){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
function questionAt(i){return Q[Math.max(0,Math.min(Q.length-1,i))];}
async function apiGet(code,extras={}){const p=new URLSearchParams({code,...extras});const r=await fetch('/api/room?'+p.toString(),{cache:'no-store'});if(!r.ok)throw new Error((await r.json().catch(()=>({}))).error||'network');return r.json();}
async function apiPost(body){const r=await fetch('/api/room',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||'network');return j;}
function shell(content){app.innerHTML='<div><div class="app-shell"><div class="container">'+content+'</div></div></div>';}
function brand(){return '<div class="brand"><span class="brand-mark">PCR</span><div><strong>PCR LIVE</strong><div class="small muted">סקר כיתתי חי</div></div></div>';}
function renderOptions(q,correctVisible=false,selected=null){return '<div class="option-list">'+q.options.map((o,i)=>'<div class="option '+(correctVisible&&i===q.correct?'correct ':'')+(selected===i&&correctVisible&&i!==q.correct?'wrong-selected':'')+'"><span class="option-letter">'+letters[i]+'</span><span>'+esc(o)+'</span></div>').join('')+'</div>';}

function studentStart(prefill){
  const hasCode=Boolean(prefill);
  shell('<div class="topbar">'+brand()+'<span class="muted small">כניסת תלמידים</span></div><section class="card student-card"><h2>כניסת תלמיד</h2><p class="muted">'+(hasCode?'קוד הכיתה כבר נקלט. הזן שם פרטי והיכנס לסקר.':'הקלד את קוד הכיתה ושם פרטי.')+'</p><div class="field"><label>קוד כיתה</label><input id="studentCode" class="code-input" inputmode="numeric" maxlength="6" value="'+esc(prefill||'')+'" placeholder="000000" '+(hasCode?'readonly':'')+'></div><div class="field" style="margin-top:12px"><label>שם פרטי</label><input id="studentName" maxlength="40" placeholder="השם שלך"></div><button class="btn primary" style="width:100%;margin-top:16px" id="joinBtn">כניסה לסקר</button></section>');
  document.getElementById('joinBtn').onclick=()=>{
    const code=document.getElementById('studentCode').value.trim();
    const name=document.getElementById('studentName').value.trim();
    if(code.length<4||!name)return toast('יש להזין קוד ושם');
    studentRoom(code,name);
  };
}

async function studentRoom(code,name){
  let voterId=localStorage.getItem('pcr_voter_'+code);
  if(!voterId){
    voterId=(crypto.randomUUID?crypto.randomUUID():Date.now()+'-'+Math.random());
    localStorage.setItem('pcr_voter_'+code,voterId);
  }
  localStorage.setItem('pcr_name_'+code,name);
  let room=null,lastQuestion=-1;
  const poll=()=>apiGet(code,{voterId});

  const render=()=>{
    const q=questionAt(room.questionIndex);
    if(room.questionIndex!==lastQuestion)lastQuestion=room.questionIndex;

    if(room.finished){
      const score=room.score||{score:0,correct:0,answered:0};
      shell('<div class="topbar">'+brand()+'<span class="status-pill revealed"><i class="dot"></i>השאלון הסתיים</span></div><section class="card student-card final-student"><div class="eyebrow">כל הכבוד, '+esc(name)+'</div><h2>הציון שלך</h2><div class="student-score">'+score.score+'<span>/100</span></div><div class="score-detail">'+score.correct+' תשובות נכונות מתוך 25</div><p class="muted">כל תשובה נכונה שווה 4 נקודות.</p></section>');
      return;
    }

    if(room.status!=='open'&&!room.resultsVisible){
      shell('<div class="topbar">'+brand()+'<span class="status-pill closed"><i class="dot"></i>ממתינים למורה</span></div><section class="card student-card waiting"><div class="pulse"></div><h2>'+esc(name)+', עוד רגע מתחילים</h2><p class="muted">שאלה '+(room.questionIndex+1)+' מתוך '+Q.length+' מוכנה. המורה יפתח את ההצבעה.</p></section>');
      return;
    }

    if(room.resultsVisible){
      const good=room.myVote===q.correct;
      shell('<div class="topbar">'+brand()+'<span class="status-pill revealed"><i class="dot"></i>התשובה נחשפה</span></div><section class="card student-card"><div class="muted small">שאלה '+(room.questionIndex+1)+' מתוך '+Q.length+'</div><h2 class="question-title" style="font-size:26px">'+esc(q.question)+'</h2>'+renderOptions(q,true,room.myVote)+'<div class="feedback '+(good?'good':'bad')+'">'+(room.myVote==null?'לא נשלחה תשובה בשאלה זו.':good?'✓ נכון!':'התשובה שלך אינה נכונה.')+'</div><div class="explanation">'+esc(q.explanation)+'</div><p class="muted small">ממתינים למורה לשאלה הבאה.</p></section>');
      return;
    }

    shell('<div class="topbar">'+brand()+'<span class="status-pill open"><i class="dot"></i>ההצבעה פתוחה</span></div><section class="card student-card"><div class="muted small">שאלה '+(room.questionIndex+1)+' מתוך '+Q.length+'</div><h2 class="question-title" style="font-size:27px">'+esc(q.question)+'</h2><div class="student-options">'+q.options.map((o,i)=>'<button class="student-option '+(room.myVote===i?'selected':'')+'" data-answer="'+i+'"><span class="option-letter">'+letters[i]+'</span><span>'+esc(o)+'</span></button>').join('')+'</div><div class="small muted" style="margin-top:14px">אפשר לשנות בחירה כל עוד ההצבעה פתוחה.</div></section>');

    document.querySelectorAll('.student-option').forEach(btn=>btn.onclick=async()=>{
      const ans=Number(btn.dataset.answer);
      document.querySelectorAll('.student-option').forEach(b=>b.disabled=true);
      try{
        await apiPost({action:'vote',code,voterId,name,answer:ans,questionIndex:room.questionIndex});
        room=await poll();render();toast('התשובה נקלטה');
      }catch(e){
        toast('ההצבעה כבר נסגרה');
        document.querySelectorAll('.student-option').forEach(b=>b.disabled=false);
      }
    });
  };

  try{room=await poll();render();}
  catch(e){toast('קוד כיתה לא נמצא');return studentStart(code);}

  while(true){
    await sleep(1200);
    try{
      const fresh=await poll();
      if(fresh.version!==room.version||fresh.myVote!==room.myVote){room=fresh;render();}
    }catch(e){}
  }
}

studentStart(qs.get('code')||'');
