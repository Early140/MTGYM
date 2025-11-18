/* GimControl - Frontend-only prototype
   Datos persistidos en localStorage con claves:
     gc_members, gc_attendance, gc_schedule, gc_payments
*/

const store = {
  members: JSON.parse(localStorage.getItem('gc_members') || '[]'),
  attendance: JSON.parse(localStorage.getItem('gc_attendance') || '[]'),
  schedule: JSON.parse(localStorage.getItem('gc_schedule') || '[]'),
  payments: JSON.parse(localStorage.getItem('gc_payments') || '[]'),
};

function saveStore(){
  localStorage.setItem('gc_members', JSON.stringify(store.members));
  localStorage.setItem('gc_attendance', JSON.stringify(store.attendance));
  localStorage.setItem('gc_schedule', JSON.stringify(store.schedule));
  localStorage.setItem('gc_payments', JSON.stringify(store.payments));
}

/* --- Utilities --- */
const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));
function uid(prefix='ID'){ return prefix + '-' + Math.random().toString(36).slice(2,9); }
function fmtDateISO(d=new Date()){ return new Date(d).toISOString(); }
function dateOnly(d){ const dt = new Date(d); return dt.toLocaleDateString(); }
function timeOnly(d){ const dt = new Date(d); return dt.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}); }
function csvExport(headers, rows, name='export.csv'){
  const content = [headers.join(','), ...rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(','))].join('\n');
  const blob = new Blob([content], {type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}

/* --- Navigation --- */
$$('.nav-btn').forEach(b=>{
  b.addEventListener('click', ()=>{
    $$('[data-view]').forEach(x=>x.classList.remove('active'));
    $$('.nav-btn').forEach(n=>n.classList.remove('active'));
    b.classList.add('active');
    const view = b.dataset.view;
    $(`#${view}`).classList.remove('hidden');
    ['members','attendance','schedule','payments','reports'].filter(v=>v!==view).forEach(v=>$(`#${v}`).classList.add('hidden'));
    refreshAll();
  });
});

/* --- Members UI --- */
const membersTbody = $('#membersTable tbody');
function renderMembers(filter=''){
  membersTbody.innerHTML = '';
  const list = store.members.filter(m => (m.name + ' ' + m.id).toLowerCase().includes(filter.toLowerCase()));
  list.forEach(m=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${m.id}</td>
      <td>${m.name}</td>
      <td>${m.plan}</td>
      <td>${m.phone||''}</td>
      <td>${m.email||''}</td>
      <td>
        <button class="btn-edit" data-id="${m.id}">Editar</button>
        <button class="btn-del" data-id="${m.id}">Borrar</button>
        <button class="btn-check" data-id="${m.id}">Check-in</button>
      </td>`;
    membersTbody.appendChild(tr);
  });
}
$('#memberForm').addEventListener('submit', e=>{
  e.preventDefault();
  const name = $('#m_name').value.trim();
  if(!name) return;
  const member = {
    id: uid('M'),
    name,
    phone: $('#m_phone').value.trim(),
    email: $('#m_email').value.trim(),
    plan: $('#m_plan').value,
    createdAt: fmtDateISO()
  };
  store.members.push(member); saveStore();
  $('#m_name').value=''; $('#m_phone').value=''; $('#m_email').value='';
  renderMembers();
  refreshReports();
});
$('#searchMembers').addEventListener('input', e=>renderMembers(e.target.value));
membersTbody.addEventListener('click', e=>{
  const id = e.target.dataset.id;
  if(!id) return;
  if(e.target.classList.contains('btn-del')){
    if(confirm('Borrar socio? Esta acción es irreversible')) {
      store.members = store.members.filter(m=>m.id!==id);
      saveStore(); renderMembers();
    }
  } else if(e.target.classList.contains('btn-edit')){
    const m = store.members.find(x=>x.id===id);
    if(!m) return;
    const newName = prompt('Nombre', m.name);
    if(newName) { m.name = newName; saveStore(); renderMembers(); }
  } else if(e.target.classList.contains('btn-check')){
    quickCheckIn(id);
  }
});
$('#exportMembers').addEventListener('click', ()=>{
  const rows = store.members.map(m=>[m.id,m.name,m.plan,m.phone,m.email,m.createdAt]);
  csvExport(['ID','Nombre','Plan','Tel','Email','Creado'], rows, 'socios.csv');
});

/* --- Attendance UI --- */
const attTbody = $('#attendanceTable tbody');
function renderAttendance(range='today', filter=''){
  attTbody.innerHTML='';
  let list = store.attendance.slice().reverse();
  const now = new Date();
  if(range === 'today') {
    const today = now.toDateString();
    list = list.filter(a=> new Date(a.at).toDateString() === today);
  } else if(range === '7'){
    const cutoff = new Date(now.getTime() - 7*24*3600*1000);
    list = list.filter(a=> new Date(a.at) >= cutoff);
  } else if(range === '30'){
    const cutoff = new Date(now.getTime() - 30*24*3600*1000);
    list = list.filter(a=> new Date(a.at) >= cutoff);
  }
  if(filter) list = list.filter(a => (a.memberName + ' ' + a.memberId).toLowerCase().includes(filter.toLowerCase()));
  list.forEach(a=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${dateOnly(a.at)}</td><td>${a.memberId}</td><td>${a.memberName}</td><td>${timeOnly(a.at)}</td>`;
    attTbody.appendChild(tr);
  });
}
$('#quickCheck').addEventListener('click', ()=>{
  const q = $('#att_search').value.trim();
  if(!q) return alert('Ingresa nombre o ID del socio');
  const found = store.members.find(m => (m.id===q || m.name.toLowerCase().includes(q.toLowerCase())));
  if(!found) return alert('Socio no encontrado');
  quickCheckIn(found.id);
});
function quickCheckIn(memberId){
  const m = store.members.find(x=>x.id===memberId);
  if(!m) return alert('Socio no encontrado');
  const rec = {id: uid('A'), memberId: m.id, memberName: m.name, at: fmtDateISO()};
  store.attendance.push(rec); saveStore();
  renderAttendance($('#showAttendanceRange').value);
  refreshReports();
}
$('#showAttendanceRange').addEventListener('change', e=>renderAttendance(e.target.value));
$('#att_search').addEventListener('input', e=>renderAttendance($('#showAttendanceRange').value, e.target.value));

/* --- Schedule UI --- */
const weekDiv = $('#weekSchedule');
function renderSchedule(){
  const days = ['Lunes','Martes','Miércoles','Jueves','Viernes'];
  weekDiv.innerHTML = '';
  days.forEach(d=>{
    const slot = document.createElement('div');
    slot.className = 'slot';
    slot.innerHTML = `<h4>${d}</h4><div class="items"></div><button data-day="${d}" class="add-slot">+ Agregar</button>`;
    const items = slot.querySelector('.items');
    store.schedule.filter(s=>s.day===d).sort((a,b)=>a.start.localeCompare(b.start)).forEach(s=>{
      const el = document.createElement('div');
      el.className='sched-item';
      el.innerHTML = `<strong>${s.title}</strong> <small>${s.start} - ${s.end}</small><div>${s.trainer||''}</div>
        <div><button class="del-s" data-id="${s.id}">Eliminar</button></div>`;
      items.appendChild(el);
    });
    weekDiv.appendChild(slot);
  });
}
$('#scheduleForm').addEventListener('submit', e=>{
  e.preventDefault();
  const obj = {
    id: uid('S'),
    title: $('#s_title').value.trim(),
    day: $('#s_day').value,
    start: $('#s_start').value,
    end: $('#s_end').value,
    trainer: $('#s_trainer').value.trim()
  };
  store.schedule.push(obj); saveStore();
  $('#s_title').value=''; $('#s_trainer').value='';
  renderSchedule();
});
weekDiv.addEventListener('click', e=>{
  if(e.target.classList.contains('del-s')){
    const id = e.target.dataset.id;
    store.schedule = store.schedule.filter(s=>s.id!==id); saveStore(); renderSchedule();
  } else if(e.target.classList.contains('add-slot')){
    const day = e.target.dataset.day;
    $('#s_day').value = day;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
});

/* --- Payments UI --- */
const paymentsTbody = $('#paymentsTable tbody');
$('#paymentForm').addEventListener('submit', e=>{
  e.preventDefault();
  const id = $('#p_member_id').value.trim();
  const member = store.members.find(m=>m.id===id || m.name.toLowerCase().includes(id.toLowerCase()));
  if(!member) return alert('Socio no encontrado');
  const amount = parseFloat($('#p_amount').value);
  if(isNaN(amount) || amount <= 0) return alert('Monto inválido');
  const rec = {
    id: uid('P'),
    memberId: member.id,
    memberName: member.name,
    amount,
    method: $('#p_method').value,
    at: fmtDateISO()
  };
  store.payments.push(rec); saveStore();
  $('#p_member_id').value=''; $('#p_amount').value='';
  renderPayments();
  refreshReports();
});
function renderPayments(filter=''){
  paymentsTbody.innerHTML='';
  let list = store.payments.slice().reverse();
  if(filter) list = list.filter(p => (p.memberName + ' ' + p.memberId).toLowerCase().includes(filter.toLowerCase()));
  list.forEach(p=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${dateOnly(p.at)}</td><td>${p.memberId}</td><td>${p.memberName}</td><td>${p.amount.toFixed(2)}</td><td>${p.method}</td>`;
    paymentsTbody.appendChild(tr);
  });
}
$('#p_search').addEventListener('input', e=>renderPayments(e.target.value));
$('#exportPayments').addEventListener('click', ()=>{
  const rows = store.payments.map(p=>[p.id,p.at,p.memberId,p.memberName,p.amount,p.method]);
  csvExport(['ID','Fecha','ID Socio','Nombre','Monto','Método'], rows, 'pagos.csv');
});

/* --- Reports --- */
function refreshReports(){
  $('#rep_total_members').textContent = store.members.length;
  const today = new Date().toDateString();
  $('#rep_att_today').textContent = store.attendance.filter(a => new Date(a.at).toDateString() === today).length;
  const cutoff = new Date(Date.now() - 30*24*3600*1000);
  const income30 = store.payments.filter(p=> new Date(p.at) >= cutoff).reduce((s,p)=>s+p.amount,0);
  $('#rep_30_income').textContent = income30.toFixed(2);
}
$('#rep_show_history').addEventListener('click', ()=>{
  const q = $('#rep_search_member').value.trim().toLowerCase();
  const body = $('#rep_history_table tbody');
  body.innerHTML='';
  if(!q) return alert('Ingresa ID o nombre');
  const member = store.members.find(m => m.id.toLowerCase()===q || m.name.toLowerCase().includes(q));
  if(!member) return alert('Socio no encontrado');
  const payments = store.payments.filter(p=>p.memberId===member.id);
  const atts = store.attendance.filter(a=>a.memberId===member.id);
  const rows = [];
  payments.forEach(p=> rows.push(['Pago', dateOnly(p.at), `Pago (${p.method})`, p.amount.toFixed(2)]));
  atts.forEach(a=> rows.push(['Asistencia', dateOnly(a.at), timeOnly(a.at), '-']));
  rows.sort((a,b)=> new Date(b[1]) - new Date(a[1]));
  rows.forEach(r=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td><td>${r[3]}</td>`;
    body.appendChild(tr);
  });
});

/* --- Misc --- */
function refreshAll(){
  renderMembers($('#searchMembers').value);
  renderAttendance($('#showAttendanceRange').value);
  renderSchedule();
  renderPayments($('#p_search').value);
  refreshReports();
}

/* Seed data: only if empty -> small sample */
(function seed(){
  if(store.members.length===0 && store.attendance.length===0 && store.payments.length===0){
    const m1 = {id:'M-ana01',name:'Ana Pérez',phone:'351-555-123',email:'ana@example.com',plan:'mensual',createdAt:fmtDateISO()};
    const m2 = {id:'M-luc02',name:'Lucas Gómez',phone:'351-999-777',email:'lucas@example.com',plan:'anual',createdAt:fmtDateISO()};
    store.members.push(m1,m2);
    store.attendance.push({id:uid('A'),memberId:m1.id,memberName:m1.name,at:fmtDateISO()});
    store.payments.push({id:uid('P'),memberId:m2.id,memberName:m2.name,amount:1200,method:'tarjeta',at:fmtDateISO()});
    store.schedule.push({id:uid('S'),title:'CrossFit',day:'Lunes',start:'18:00',end:'19:00',trainer:'María'});
    saveStore();
  }
  refreshAll();
})();
