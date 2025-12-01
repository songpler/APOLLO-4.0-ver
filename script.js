/* ===========================
   통합 스크립트 (index/admin/search)
   관리자 비밀번호: apollostartat2022
   데이터 저장: localStorage (기기별)
   =========================== */

const APP_VERSION = "1.0.0";
const STORAGE_KEY = "ranking.cfull.v1";
const STORAGE_VER_KEY = "ranking.cfull.ver";
const ADMIN_PASSWORD = "apollostartat2022"; // 네가 준 비밀번호

const EVENTS = ["event1","event2","event3"];
const EVENT_LABEL = { event1: "종목 1", event2: "종목 2", event3: "종목 3" };

let state = {
  people: {} // { name: { name, event1, event2, event3 } }
};

// ---- storage versioning to force demo update when code changes ----
function ensureStorageVersion() {
  try {
    const cur = localStorage.getItem(STORAGE_VER_KEY);
    if (cur !== APP_VERSION) {
      // if you want to preserve existing data across small updates, comment out the next line
      // localStorage.removeItem(STORAGE_KEY);
      localStorage.setItem(STORAGE_VER_KEY, APP_VERSION);
    }
  } catch(e){ console.warn(e) }
}

// ---- load/save ----
function loadFromLocal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) { state.people = {}; return; }
    state.people = JSON.parse(raw) || {};
  } catch(e){
    console.warn("load fail", e);
    state.people = {};
  }
}

function saveToLocal() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.people));
  } catch(e){
    console.warn("save fail", e);
  }
}

// ---- helpers ----
function toInt(v){ const n = Number(v); return Number.isFinite(n) ? Math.round(n) : 0; }
function clone(o){ return JSON.parse(JSON.stringify(o)); }

// compute overall sum
function overallScore(p){ return EVENTS.reduce((s,e)=> s + (toInt(p[e])||0), 0); }

// sorting
function compareOverall(a,b){
  const oa = overallScore(a), ob = overallScore(b);
  if (ob !== oa) return ob - oa;
  const aMax = Math.max(...EVENTS.map(e=>toInt(a[e])||0));
  const bMax = Math.max(...EVENTS.map(e=>toInt(b[e])||0));
  if (bMax !== aMax) return bMax - aMax;
  return a.name.localeCompare(b.name,'ko');
}
function compareByEvent(ev){
  return (a,b) => {
    const da = toInt(a[ev])||0, db = toInt(b[ev])||0;
    if (db !== da) return db - da;
    return a.name.localeCompare(b.name,'ko');
  }
}

// get arrays
function allPeopleArray(){ return Object.values(state.people); }
function sortedOverall(){ return allPeopleArray().sort(compareOverall); }
function sortedByEvent(ev){ return allPeopleArray().sort(compareByEvent(ev)); }

// ---- rendering (index) ----
function renderIndex() {
  // overall table
  const overallMount = document.getElementById("overallTable");
  if (!overallMount) return;

  const arr = sortedOverall();
  if (!arr.length) { overallMount.innerHTML = "<p class='small'>등록된 참가자가 없습니다.</p>"; return; }

  let html = `<table><thead><tr><th>순위</th><th>이름</th><th>${EVENT_LABEL.event1}</th><th>${EVENT_LABEL.event2}</th><th>${EVENT_LABEL.event3}</th><th>합계</th></tr></thead><tbody>`;
  let prev = null, rank = 0, idx = 0;
  for (const p of arr) {
    idx++;
    const s = overallScore(p);
    if (prev === null || s !== prev) rank = idx;
    prev = s;
    html += `<tr><td>${rank}</td><td>${escapeHtml(p.name)}</td><td>${toInt(p.event1)}</td><td>${toInt(p.event2)}</td><td>${toInt(p.event3)}</td><td><strong>${s}</strong></td></tr>`;
  }
  html += `</tbody></table>`;
  overallMount.innerHTML = html;

  // per-event top and all
  renderEvent("event1","event1Top","event1All");
  renderEvent("event2","event2Top","event2All");
  renderEvent("event3","event3Top","event3All");
}

function renderEvent(ev, topId, allId) {
  const topMount = document.getElementById(topId);
  const allMount = document.getElementById(allId);
  if (!topMount || !allMount) return;

  const arr = sortedByEvent(ev);
  topMount.innerHTML = "";
  allMount.innerHTML = "";

  const top = arr.slice(0,3);
  if (!top.length) topMount.innerHTML = "<div class='small'>데이터 없음</div>";
  for (let i=0;i<top.length;i++){
    const p = top[i];
    const div = document.createElement("div");
    div.className = "top-item";
    div.innerHTML = `<div>${i+1}위 · ${escapeHtml(p.name)}</div><div>${toInt(p[ev])}점</div>`;
    topMount.appendChild(div);
  }

  // full table
  if (arr.length){
    let html = `<table><thead><tr><th>순위</th><th>이름</th><th>점수</th></tr></thead><tbody>`;
    let prev=null, rank=0, idx=0;
    for (const p of arr){
      idx++; const s = toInt(p[ev]);
      if (prev === null || s !== prev) rank = idx;
      prev = s;
      html += `<tr><td>${rank}</td><td>${escapeHtml(p.name)}</td><td>${s}</td></tr>`;
    }
    html += `</tbody></table>`;
    allMount.innerHTML = html;
  } else {
    allMount.innerHTML = "<div class='small'>데이터 없음</div>";
  }
}

// ---- admin UI ----
function renderAdminPanel() {
  const wrap = document.getElementById("editorList");
  if (!wrap) return;
  wrap.innerHTML = "";

  const arr = sortedOverall();
  // each row -> name + 3 inputs + delete
  arr.forEach(p=>{
    const row = document.createElement("div");
    row.className = "editor-row";
    row.innerHTML = `
      <input class="input name" data-key="name" value="${escapeHtml(p.name)}" style="width:28%" />
      <input class="input e1" data-key="event1" value="${toInt(p.event1)}" style="width:16%" />
      <input class="input e2" data-key="event2" value="${toInt(p.event2)}" style="width:16%" />
      <input class="input e3" data-key="event3" value="${toInt(p.event3)}" style="width:16%" />
      <button class="btn danger btnDel">삭제</button>
    `;
    // wire events
    const btnDel = row.querySelector(".btnDel");
    btnDel.addEventListener("click", ()=>{
      if (!confirm(`${p.name} 항목을 삭제하시겠습니까?`)) return;
      delete state.people[p.name];
      saveToLocal(); renderAdminPanel(); renderIndex();
    });

    // inputs: change name or scores
    const nameInput = row.querySelector(".name");
    const e1 = row.querySelector(".e1");
    const e2 = row.querySelector(".e2");
    const e3 = row.querySelector(".e3");

    [nameInput,e1,e2,e3].forEach(inp=>{
      inp.addEventListener("change", ()=>{
        const newName = nameInput.value.trim();
        const newE1 = toInt(e1.value);
        const newE2 = toInt(e2.value);
        const newE3 = toInt(e3.value);
        // if name changed and collides, confirm overwrite
        if (newName === "") { alert("이름을 비워둘 수 없습니다."); renderAdminPanel(); return; }
        if (newName !== p.name && state.people[newName]) {
          if (!confirm("같은 이름이 있어 덮어쓰시겠습니까?")) { renderAdminPanel(); return; }
        }
        // delete old key if name changed
        if (newName !== p.name) delete state.people[p.name];
        state.people[newName] = { name: newName, event1: newE1, event2: newE2, event3: newE3 };
        saveToLocal();
        renderAdminPanel();
        renderIndex();
      });
    });

    wrap.appendChild(row);
  });

  // if no participants, show message
  if (!arr.length) {
    const p = document.createElement("p"); p.className = "small"; p.textContent = "등록된 참가자가 없습니다. '참가자 추가'로 새 참가자를 추가하세요.";
    wrap.appendChild(p);
  }
}

// add new participant
function addNewParticipant() {
  let name = prompt("새 참가자 이름을 입력하세요:");
  if (!name) return;
  name = name.trim();
  if (!name) { alert("유효한 이름을 입력하세요."); return; }
  if (state.people[name]) {
    if (!confirm("이미 같은 이름이 있습니다. 덮어쓰시겠습니까?")) return;
  }
  state.people[name] = { name, event1:0, event2:0, event3:0 };
  saveToLocal();
  renderAdminPanel();
  renderIndex();
}

// CSV export/import
function exportCSV() {
  const rows = [["name","event1","event2","event3"]];
  for (const p of sortedOverall()) rows.push([p.name, toInt(p.event1), toInt(p.event2), toInt(p.event3)]);
  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], {type: "text/csv;charset=utf-8;"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = "ranking_export.csv"; document.body.appendChild(a); a.click(); a.remove();
}

// CSV import (simple)
function importCSVFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const txt = reader.result;
      // simple CSV parse (assumes header name,event1,event2,event3)
      const lines = txt.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      const header = lines.shift();
      if (!/name\s*,\s*event1/i.test(header)) {
        if (!confirm("CSV 헤더가 예상과 다릅니다. 계속 진행할까요?")) return;
      }
      const next = {};
      for (const line of lines) {
        const cols = parseCsvLine(line);
        const name = cols[0];
        if (!name) continue;
        next[name] = { name, event1: toInt(cols[1]), event2: toInt(cols[2]), event3: toInt(cols[3]) };
      }
      state.people = Object.assign({}, state.people, next); // merge
      saveToLocal(); renderAdminPanel(); renderIndex();
      alert("CSV 불러오기 완료");
    } catch(e){ alert("CSV 처리 실패"); console.warn(e) }
  };
  reader.readAsText(file, "utf-8");
}

function parseCsvLine(line) {
  const out=[]; let cur="", inQ=false;
  for (let i=0;i<line.length;i++){
    const ch = line[i];
    if (ch === '"') {
      if (inQ && line[i+1] === '"') { cur += '"'; i++; }
      else inQ = !inQ;
    } else if (ch === "," && !inQ) { out.push(cur); cur=""; }
    else cur += ch;
  }
  out.push(cur); return out.map(s=>s.trim());
}

// ---- search page ----
function renderSearchResult(name) {
  const mount = document.getElementById("searchResult");
  if (!mount) return;
  mount.innerHTML = "";
  if (!name) { mount.innerHTML = "<div class='small'>이름을 입력하세요.</div>"; return; }
  const p = state.people[name];
  if (!p) { mount.innerHTML = `<div class="small">"${escapeHtml(name)}" 의 기록이 없습니다.</div>`; return; }
  const overall = overallScore(p);
  let html = `<h3>${escapeHtml(name)}</h3><table><tbody>`;
  html += `<tr><td>${EVENT_LABEL.event1}</td><td>${toInt(p.event1)}점</td></tr>`;
  html += `<tr><td>${EVENT_LABEL.event2}</td><td>${toInt(p.event2)}점</td></tr>`;
  html += `<tr><td>${EVENT_LABEL.event3}</td><td>${toInt(p.event3)}점</td></tr>`;
  html += `<tr><td>합계</td><td><strong>${overall}점</strong></td></tr>`;
  html += `</tbody></table>`;
  // ranks
  const overallRank = getRank("overall", name);
  html += `<p class="small">종합 순위: ${overallRank.rank ?? "-"} / ${overallRank.total}</p>`;
  EVENTS.forEach(ev=>{
    const r = getRank(ev, name);
    html += `<p class="small">${EVENT_LABEL[ev]} 순위: ${r.rank ?? "-"} / ${r.total}</p>`;
  });
  mount.innerHTML = html;
}

// rank computation (ties allowed)
function getRank(ev, name) {
  const arr = ev === "overall" ? sortedOverall() : sortedByEvent(ev);
  let rank = 0, prevScore = null, counted = 0;
  for (const p of arr) {
    const score = ev === "overall" ? overallScore(p) : toInt(p[ev]);
    counted++;
    if (prevScore === null || score !== prevScore) { rank = counted; prevScore = score; }
    if (p.name === name) return { rank, total: arr.length, score };
  }
  return { rank: null, total: arr.length, score: null };
}

// ---- utilities ----
function escapeHtml(s){ return (s||"").toString().replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;"); }

// ---- init wiring depending on page ----
document.addEventListener("DOMContentLoaded", ()=>{
  ensureStorageVersion();
  loadFromLocal();

  const page = document.body.getAttribute("data-page");
  if (page === "index") {
    renderIndex();
  } else if (page === "admin") {
    const loginWrap = document.getElementById("adminLoginWrap");
    const panel = document.getElementById("adminPanel");
    document.getElementById("btnLogin").addEventListener("click", ()=>{
      const pw = document.getElementById("adminPass").value;
      if (pw === ADMIN_PASSWORD) {
        loginWrap.hidden = true; panel.hidden = false; renderAdminPanel();
      } else { alert("비밀번호가 틀렸습니다."); }
    });

    document.getElementById("btnAdd").addEventListener("click", addNewParticipant);
    document.getElementById("btnSave").addEventListener("click", ()=>{ saveToLocal(); alert("저장되었습니다."); renderIndex(); });
    document.getElementById("btnReset").addEventListener("click", ()=>{
      if (!confirm("로컬 데이터를 모두 삭제하시겠습니까?")) return;
      localStorage.removeItem(STORAGE_KEY);
      state.people = {};
      saveToLocal();
      renderAdminPanel();
      renderIndex();
    });
    document.getElementById("btnExport").addEventListener("click", exportCSV);
    document.getElementById("btnImport").addEventListener("click", ()=> document.getElementById("csvFile").click());
    document.getElementById("csvFile").addEventListener("change", (e)=> {
      const f = e.target.files && e.target.files[0];
      if (f) importCSVFile(f);
      e.target.value = "";
    });

  } else if (page === "search") {
    const searchInput = document.getElementById("searchName");
    const btn = document.getElementById("btnSearch");
    btn.addEventListener("click", ()=> renderSearchResult(searchInput.value.trim()));
    searchInput.addEventListener("keydown", (e)=> { if (e.key === "Enter") renderSearchResult(searchInput.value.trim()); });
    // url ?user=
    const urlUser = new URLSearchParams(location.search).get("user");
    if (urlUser) { searchInput.value = urlUser; renderSearchResult(urlUser); }
  }

});
