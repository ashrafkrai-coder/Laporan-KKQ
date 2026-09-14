const $ = (id) => document.getElementById(id);
let report = null;
let editMode = false;

const fields = ['targetSheet','unit','sesi','meeting','day','date','place','time','studentAttendance','teacherAttendance','teacherOne','teacherTwo','title'];

function setStatus(text, kind='') {
  const el = $('statusPill');
  el.textContent = text;
  el.className = `status ${kind}`.trim();
}

function setBusy(isBusy, text='Memproses...') {
  ['generateBtn','regenerateBtn','saveBtn'].forEach(id => { const el=$(id); if(el) el.disabled=isBusy; });
  setStatus(isBusy ? text : 'Sedia', isBusy ? 'busy' : '');
}

async function api(action, payload={}) {
  const res = await fetch('/api/kkq', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({action, ...payload})
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.ok === false) throw new Error(data.error || `Ralat pelayan (${res.status})`);
  return data;
}

function formData() {
  return Object.fromEntries(fields.map(id => [id, $(id).value.trim()]));
}

function fillDefaults(d={}) {
  ['unit','sesi','meeting','day','date','place','time','studentAttendance','teacherAttendance','teacherOne','teacherTwo'].forEach(k => {
    if (d[k] != null) $(k).value = d[k];
  });
}

async function bootstrap() {
  try {
    setBusy(true, 'Menyambung...');
    const data = await api('bootstrap');
    const sheets = Array.isArray(data.sheets)
      ? data.sheets.filter(name => typeof name === 'string' && name.trim())
      : [];
    if (!sheets.length) {
      throw new Error('Apps Script tidak memulangkan senarai tab. Semak tindakan bootstrap dan akses Web App.');
    }
    const select = $('targetSheet');
    select.innerHTML = '';
    sheets.forEach(name => {
      const o = document.createElement('option'); o.value=name; o.textContent=name; select.appendChild(o);
    });
    if (data.defaultSheet && sheets.includes(data.defaultSheet)) select.value = data.defaultSheet;
    if (data.defaults) fillDefaults(data.defaults);
    setStatus('Bersambung', 'ok');
  } catch (err) {
    console.error(err);
    setStatus('Gagal sambung', 'error');
    alert(err.message);
  } finally {
    ['generateBtn','regenerateBtn','saveBtn'].forEach(id => { const el=$(id); if(el) el.disabled=false; });
  }
}

async function loadDefaults() {
  const targetSheet = $('targetSheet').value;
  if (!targetSheet) {
    setStatus('Tiada tab dipilih', 'error');
    alert('Tiada tab laporan tersedia. Semak sambungan Apps Script dan konfigurasi Vercel.');
    return;
  }
  try {
    setBusy(true, 'Muat data tab...');
    const data = await api('sheetDefaults', {targetSheet});
    fillDefaults(data.defaults || {});
    setStatus('Data dimuat', 'ok');
  } catch (e) { setStatus('Ralat', 'error'); alert(e.message); }
  finally { setBusy(false); }
}

function validateForm() {
  const f = formData();
  if (!f.targetSheet) throw new Error('Pilih tab laporan.');
  if (!f.date) throw new Error('Masukkan tarikh perjumpaan.');
  if (!f.title) throw new Error('Masukkan tajuk aktiviti.');
  return f;
}

async function generate() {
  try {
    const form = validateForm();
    setBusy(true, 'AI sedang menjana...');
    const data = await api('generate', {form});
    report = data.report;
    editMode = false;
    renderPreview();
    $('previewCard').classList.remove('hidden');
    $('resultCard').classList.add('hidden');
    $('previewCard').scrollIntoView({behavior:'smooth', block:'start'});
    setStatus('Laporan siap', 'ok');
  } catch (e) { setStatus('Ralat jana', 'error'); alert(e.message); }
  finally { setBusy(false); }
}

function esc(v='') { return String(v).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m])); }

function renderPreview() {
  if (!report) return;
  $('preview').innerHTML = `
    <div class="triplet">
      <div class="preview-block"><h3>Nilai</h3><p>${esc(report.nilai)}</p></div>
      <div class="preview-block"><h3>Subnilai</h3><p>${esc(report.subNilai)}</p></div>
      <div class="preview-block"><h3>Matlamat</h3><p>${esc(report.matlamat)}</p></div>
    </div>
    <div class="preview-block"><h3>Objektif</h3><ol>${report.objektif.map(x=>`<li>${esc(x)}</li>`).join('')}</ol></div>
    <div class="preview-block"><h3>KBAT</h3><p><b>Masalah:</b> ${esc(report.kbat.masalah)}</p><p><b>Cadangan/Alternatif:</b> ${esc(report.kbat.alternatif)}</p><p><b>Cadangan Penyelesaian:</b> ${esc(report.kbat.penyelesaian)}</p><p><b>Laporan dan Persembahan:</b> ${esc(report.kbat.laporan)}</p></div>
    <div class="preview-block"><h3>PIKeBM</h3><p>${esc(report.pikem)}</p></div>
    <div class="preview-block"><h3>Langkah Aktiviti</h3><ol>${report.aktiviti.map(x=>`<li>${esc(x)}</li>`).join('')}</ol></div>
    <div class="preview-block"><h3>Refleksi</h3><p>${esc(report.refleksi)}</p></div>`;
  renderEditor();
}

function renderEditor() {
  $('editor').innerHTML = `
    <div class="editor-grid">
      ${['nilai','subNilai','matlamat','pikem','refleksi'].map(k => `<label>${k}<textarea data-path="${k}">${esc(report[k])}</textarea></label>`).join('')}
      ${report.objektif.map((v,i)=>`<label>Objektif ${i+1}<textarea data-path="objektif.${i}">${esc(v)}</textarea></label>`).join('')}
      ${['masalah','alternatif','penyelesaian','laporan'].map(k=>`<label>KBAT ${k}<textarea data-path="kbat.${k}">${esc(report.kbat[k])}</textarea></label>`).join('')}
      ${report.aktiviti.map((v,i)=>`<label>Aktiviti ${i+1}<textarea data-path="aktiviti.${i}">${esc(v)}</textarea></label>`).join('')}
    </div>`;
  $('editor').querySelectorAll('[data-path]').forEach(el => el.addEventListener('input', e => {
    const [a,b] = e.target.dataset.path.split('.');
    if (b === undefined) report[a]=e.target.value;
    else if (Array.isArray(report[a])) report[a][Number(b)] = e.target.value;
    else report[a][b] = e.target.value;
  }));
}

function toggleEdit() {
  editMode = !editMode;
  if (!editMode) renderPreview();
  $('preview').classList.toggle('hidden', editMode);
  $('editor').classList.toggle('hidden', !editMode);
  $('editToggleBtn').textContent = editMode ? 'Selesai edit' : 'Edit kandungan';
}

async function save() {
  try {
    if (!report) throw new Error('Jana laporan terlebih dahulu.');
    const form = validateForm();
    setBusy(true, 'Menyimpan...');
    const data = await api('save', {form, report});
    $('resultMessage').textContent = data.message || `Laporan disimpan ke ${form.targetSheet}.`;
    const driveLink = $('resultDriveLink');
    if (data.driveFileUrl) {
      $('resultDriveAnchor').href = data.driveFileUrl;
      driveLink.classList.remove('hidden');
    } else {
      driveLink.classList.add('hidden');
    }
    $('resultCard').classList.remove('hidden');
    $('resultCard').scrollIntoView({behavior:'smooth', block:'center'});
    setStatus('Disimpan', 'ok');
  } catch (e) { setStatus('Ralat simpan', 'error'); alert(e.message); }
  finally { setBusy(false); }
}

$('generateBtn').addEventListener('click', generate);
$('regenerateBtn').addEventListener('click', generate);
$('saveBtn').addEventListener('click', save);
$('editToggleBtn').addEventListener('click', toggleEdit);
$('targetSheet').addEventListener('change', loadDefaults);

if ('serviceWorker' in navigator) addEventListener('load', () => navigator.serviceWorker.register('/sw.js'));
bootstrap();
