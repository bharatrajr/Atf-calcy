const STORE_KEYS = { rate: 'atf_iocl_rate', exchange: 'atf_exchange_rate' };

function loadRemembered(){
  ['rate','exchange'].forEach(key=>{
    const saved = localStorage.getItem(STORE_KEYS[key]);
    const input = document.getElementById(key);
    if(saved !== null && input.value === ''){
      input.value = saved;
      document.getElementById(key+'Remembered').classList.add('show');
    }
  });
}

function rememberField(key){
  const input = document.getElementById(key);
  const badge = document.getElementById(key+'Remembered');
  if(input.value !== ''){
    localStorage.setItem(STORE_KEYS[key], input.value);
    badge.classList.remove('show');
  }
}

document.querySelectorAll('[data-clear]').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    const key = btn.getAttribute('data-clear');
    localStorage.removeItem(STORE_KEYS[key]);
    document.getElementById(key).value = '';
    document.getElementById(key+'Remembered').classList.remove('show');
    calc();
  });
});

function calc(){
  const closing=parseFloat(document.getElementById('closing').value)||0;
  const opening=parseFloat(document.getElementById('opening').value)||0;
  const density=parseFloat(document.getElementById('density').value)||0.78;
  const rate=parseFloat(document.getElementById('rate').value)||0;
  const ex=parseFloat(document.getElementById('exchange').value)||0;
  const bcdp=(parseFloat(document.getElementById('bcd').value)||0)/100;
  const cvdp=(parseFloat(document.getElementById('cvd').value)||0)/100;
  const swsp=(parseFloat(document.getElementById('sws').value)||0)/100;
  const ins=document.getElementById('insurance').checked;
  const roundOn=document.getElementById('roundToggle').checked;

  const remnant=density?(closing-opening)/density:0;
  const usdL=rate/1000;
  const assessUSD=remnant*usdL;
  const insAdj=ins?assessUSD*0.01125:0;
  const totalUSD=assessUSD+insAdj;
  const totalINR=totalUSD*ex;
  const bcd=bcdp*totalINR;
  const cvd=cvdp*(totalINR+bcd);
  const sws=swsp*(bcd+cvd);
  const totalDuty=bcd+cvd+sws;

  const f=v=>roundOn?v.toFixed(2):v.toLocaleString('en-IN',{maximumFractionDigits:2});

  document.getElementById('remnant').textContent=f(remnant);
  document.getElementById('usdL').textContent=f(usdL);
  document.getElementById('assessUSD').textContent=f(assessUSD);
  document.getElementById('insAdj').textContent=f(insAdj);
  document.getElementById('totalUSD').textContent=f(totalUSD);
  document.getElementById('totalINR').textContent='₹'+f(totalINR);
  document.getElementById('bcdVal').textContent='₹'+f(bcd);
  document.getElementById('cvdVal').textContent='₹'+f(cvd);
  document.getElementById('swsVal').textContent='₹'+f(sws);
  document.getElementById('totalDuty').textContent='₹'+f(totalDuty);
  document.getElementById('insStatus').textContent=ins?"Yes":"No";

  const now=new Date();
  document.getElementById('printFooter').textContent="Printed on: "+now.toLocaleDateString()+" "+now.toLocaleTimeString();

  return totalDuty;
}

document.querySelectorAll('#atf-calculator input').forEach(el=>el.addEventListener('input',calc));

document.getElementById('rate').addEventListener('change',()=>rememberField('rate'));
document.getElementById('exchange').addEventListener('change',()=>rememberField('exchange'));

document.getElementById('darkMode').addEventListener('change',e=>{
  document.getElementById('atf-calculator').classList.toggle('dark',e.target.checked);
  document.getElementById('atf-calculator').classList.toggle('light',!e.target.checked);
});

document.getElementById('downloadExcel').addEventListener('click',()=>{
  const rows=[
    ["Description","Value"],
    ["Remnant Fuel (Lts)",document.getElementById('remnant').textContent],
    ["Rate of Fuel (USD/L)",document.getElementById('usdL').textContent],
    ["Assessable Value (USD)",document.getElementById('assessUSD').textContent],
    ["Insurance Adjustment (USD)",document.getElementById('insAdj').textContent],
    ["Total Assessable Value (USD)",document.getElementById('totalUSD').textContent],
    ["Total Assessable Value (INR)",document.getElementById('totalINR').textContent],
    ["BCD (INR)",document.getElementById('bcdVal').textContent],
    ["CVD (INR)",document.getElementById('cvdVal').textContent],
    ["SWS (INR)",document.getElementById('swsVal').textContent],
    ["Total Customs Duty (INR)",document.getElementById('totalDuty').textContent],
    ["Insurance Applied",document.getElementById('insStatus').textContent]
  ];
  let csv="data:text/csv;charset=utf-8,"+rows.map(r=>r.join(",")).join("\n");
  const link=document.createElement("a");
  link.href=encodeURI(csv);
  link.download="ATF_Duty_Calculator.csv";
  document.body.appendChild(link);link.click();document.body.removeChild(link);
});

// ---------- Running balance (auto-deduct on Reset, or via the small button) ----------
const RB_BASE_KEY = 'atf_rb_base';
const RB_HIST_KEY = 'atf_rb_history';

function rbLoad(key, fallback){
  try{ const raw = localStorage.getItem(key); return raw !== null ? JSON.parse(raw) : fallback; }
  catch(e){ return fallback; }
}
function rbSave(key, val){ try{ localStorage.setItem(key, JSON.stringify(val)); }catch(e){} }

let rbBase = rbLoad(RB_BASE_KEY, null);   // balance immediately before the oldest entry in rbHistory
let rbHistory = rbLoad(RB_HIST_KEY, []);  // oldest first, max 10: {id,label,amount,timestamp,balanceAfter}

function rbCurrentBalance(){
  if(rbHistory.length) return rbHistory[rbHistory.length - 1].balanceAfter;
  return rbBase;
}

function rbMoney(n){
  if(n === null || n === undefined || isNaN(n)) return '—';
  return '₹' + n.toLocaleString('en-IN', {minimumFractionDigits:2, maximumFractionDigits:2});
}

function rbFormatTime(iso){
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', {day:'2-digit', month:'short'}) + ' · ' +
    d.toLocaleTimeString('en-IN', {hour:'2-digit', minute:'2-digit'});
}

function rbEscape(s){
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

// Recompute balanceAfter for every entry from rbBase forward — used after a mid-list delete
function rbRecompute(){
  let cum = rbBase;
  rbHistory.forEach(e => { cum = cum - e.amount; e.balanceAfter = cum; });
}

function rbRender(){
  const balEl = document.getElementById('rb-balance');
  const bal = rbCurrentBalance();
  balEl.textContent = (bal === null) ? 'Not set' : rbMoney(bal);

  const listEl = document.getElementById('rb-history-list');
  if(!rbHistory.length){
    listEl.innerHTML = '<div class="rb-empty">No deductions yet.</div>';
  } else {
    let html = '';
    for(let i = rbHistory.length - 1; i >= 0; i--){
      const e = rbHistory[i];
      html += '<div class="rb-item">' +
        '<div class="rb-item-main">' +
          '<div class="rb-item-label">' + rbEscape(e.label || 'Duty deduction') + '</div>' +
          '<div class="rb-item-time">' + rbFormatTime(e.timestamp) + '</div>' +
        '</div>' +
        '<div class="rb-item-amt">-' + rbMoney(e.amount) + '</div>' +
        '<div class="rb-item-after">bal ' + rbMoney(e.balanceAfter) + '</div>' +
        '<button class="rb-del" data-id="' + e.id + '" title="Delete and recompute">✕</button>' +
      '</div>';
    }
    listEl.innerHTML = html;
    listEl.querySelectorAll('.rb-del').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        rbHistory = rbHistory.filter(e => String(e.id) !== id);
        rbRecompute();
        rbSave(RB_HIST_KEY, rbHistory);
        rbRender();
      });
    });
  }
}

document.getElementById('rb-set-btn').addEventListener('click', () => {
  const input = document.getElementById('rb-set-input');
  const val = parseFloat(input.value);
  if(isNaN(val)){ input.focus(); return; }
  if(rbHistory.length && !confirm('Setting a new opening balance clears the current deduction history. Continue?')) return;
  rbBase = val;
  rbHistory = [];
  rbSave(RB_BASE_KEY, rbBase);
  rbSave(RB_HIST_KEY, rbHistory);
  input.value = '';
  rbRender();
});

function rbDeduct(amount, label){
  if(rbBase === null || !amount || amount <= 0) return;
  const prevBalance = rbCurrentBalance();
  const entry = {
    id: Date.now() + '-' + Math.random().toString(36).slice(2,7),
    label: label || 'Duty deduction',
    amount: amount,
    timestamp: new Date().toISOString(),
    balanceAfter: prevBalance - amount
  };
  rbHistory.push(entry);

  // Keep only the last 10 visible entries; fold the evicted one into the base
  if(rbHistory.length > 10){
    const evicted = rbHistory.shift();
    rbBase = evicted.balanceAfter;
    rbSave(RB_BASE_KEY, rbBase);
  }
  rbSave(RB_HIST_KEY, rbHistory);
  rbRender();
}

function rbParseMoney(text){
  const cleaned = String(text).replace(/[^0-9.\-]/g, '');
  const v = parseFloat(cleaned);
  return isNaN(v) ? 0 : v;
}

function rbDeductCurrentDuty(){
  const totalDutyNum = rbParseMoney(document.getElementById('totalDuty').textContent);
  if(rbBase === null || totalDutyNum <= 0) return;
  const closingVal = document.getElementById('closing').value;
  const openingVal = document.getElementById('opening').value;
  const label = (closingVal || openingVal)
    ? ('Closing ' + (closingVal || '—') + ' / Opening ' + (openingVal || '—'))
    : 'Duty deduction';
  rbDeduct(totalDutyNum, label);
}

// Small standalone button: deduct now, leave the entry fields as they are.
document.getElementById('rb-deduct-now-btn').addEventListener('click', rbDeductCurrentDuty);

// "Reset quantities" also deducts the current total customs duty from the running
// balance (if one is set) before clearing the fields for the next entry.
document.getElementById('resetForm').addEventListener('click', () => {
  rbDeductCurrentDuty();
  ['closing','opening'].forEach(id=>document.getElementById(id).value="");
  document.getElementById('insurance').checked=false;
  calc();
});

// ---------- init ----------
loadRemembered();
calc();
rbRender();

// ---------- PWA service worker ----------
if('serviceWorker' in navigator){
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(()=>{});
  });
}
