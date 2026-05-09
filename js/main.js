/* ═══════════════════════════════════════════════════════
   PENTAS BESAR 2026 — main.js
   Reguler + VIP + VVIP | Flash Sale Code | Kuota Live | Bundling
═══════════════════════════════════════════════════════ */

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxLI-LTRNYS1pyPnWf5ZdkKFLYyf0X2OqgOdTsxQP96sHNYfpypju0nzVNIpyVqCD5s/exec';
// GANTI DENGAN URL DEPLOYMENT APPS SCRIPT KAMU YANG TERBARU

// ── Konfigurasi tiket ──
const TIKET = {
  reg:  { label: 'Reguler', harga: 37000,  kapasitas: 513 },
  vip:  { label: 'VIP',     harga: 55000,  kapasitas: 284 },
  vvip: { label: 'VVIP',    harga: 72000,  kapasitas: 46  },
};

// ── Flash sale ──
const FLASH_SALE_CODE   = 'PB26EKKIR';
const FLASH_SALE_DISKON = 0.5; // 50% = setengah harga

// ── Konfigurasi Bundling ──
const BUNDLING_CONFIG = {
  // Bundling Berdua (qty=2)
  'BERDUAAJA':  { qty: 2, hargaTotal: { reg: 64000, vip: 100000, vvip: 134000 }, label: 'Bundling Berdua' },
  // Bundling Berempat (qty=4)
  'KELUARGACEMARA':  { qty: 4, hargaTotal: { reg: 138000, vip: 210000, vvip: 278000 }, label: 'Bundling Berempat' },
};

let selectedId     = null;
let jumlah         = 1;
let currentPerson  = 0;
let persons        = [];
let fotoBase64     = null;
let fotoMime       = '';
let fotoNama       = '';
let flashSaleAktif = false;
let bundlingAktif  = null; // null atau key dari BUNDLING_CONFIG

document.addEventListener('DOMContentLoaded', () => {
  setupCards();
  setupQty();
  setupUpload();
  setupFlashSale();
  loadQuota();                    // Load kuota saat halaman dibuka
  document.getElementById('proceedBtn').addEventListener('click', goToForm);
  document.getElementById('backBtn').addEventListener('click', onBackFromForm);
  document.getElementById('backToBuktiBtn').addEventListener('click', () => {
    currentPerson = jumlah - 1; goToForm();
  });
  showSection('tiket');
});

// ════════════════════════════════════════════
//  QUOTA — ambil dari spreadsheet (VERSI FIX)
// ════════════════════════════════════════════
async function loadQuota(retryCount = 0) {
  console.log('%c🔄 Memuat kuota dari spreadsheet...', 'color:#1E90FF; font-weight:bold');

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(APPS_SCRIPT_URL + '?action=quota_all', {
      signal: controller.signal,
      mode: 'cors',
      redirect: 'follow'
    });

    clearTimeout(timeout);

    if (!res.ok) throw new Error('HTTP ' + res.status);

    const data = await res.json();

    console.log('✅ Data kuota diterima:', data);

    if (data.error) throw new Error(data.error);

    const sisa = data.sisa || {};
    const soldOut = data.sold_out || {};

    // Update Reguler
    const sisaReg = sisa.reguler !== undefined ? sisa.reguler : 513;
    document.getElementById('quota-reg').textContent = `${sisaReg} / 513`;
    document.getElementById('quotaBar-reg').style.width = `${Math.round(((513 - sisaReg) / 513) * 100)}%`;

    // Update VIP
    const sisaVip = sisa.vip !== undefined ? sisa.vip : 284;
    document.getElementById('quota-vip').textContent = `${sisaVip} / 284`;
    document.getElementById('quotaBar-vip').style.width = `${Math.round(((284 - sisaVip) / 284) * 100)}%`;

    // Update VVIP
    const sisaVvip = sisa.vvip !== undefined ? sisa.vvip : 46;
    document.getElementById('quota-vvip').textContent = `${sisaVvip} / 46`;
    document.getElementById('quotaBar-vvip').style.width = `${Math.round(((46 - sisaVvip) / 46) * 100)}%`;

    // Nonaktifkan kartu jika sold out
    if (soldOut.reguler) disableCard('reg');
    if (soldOut.vip)     disableCard('vip');
    if (soldOut.vvip)    disableCard('vvip');

  } catch (err) {
    console.warn('⚠️ Gagal load quota (percobaan ' + (retryCount + 1) + '):', err.message);
    // Retry otomatis maksimal 2x (cold start Apps Script bisa lambat)
    if (retryCount < 2) {
      console.log('🔁 Retry dalam 3 detik...');
      setTimeout(() => loadQuota(retryCount + 1), 3000);
    } else {
      // Fallback: tampilkan tanda strip
      document.getElementById('quota-reg').textContent = '— / 513';
      document.getElementById('quota-vip').textContent = '— / 284';
      document.getElementById('quota-vvip').textContent = '— / 46';
    }
  }
}

function disableCard(id) {
  const btn = document.getElementById('btn-' + id);
  const card = document.getElementById('card-' + id);
  if (btn) {
    btn.textContent = 'Habis Terjual';
    btn.disabled = true;
    btn.style.opacity = '0.4';
  }
  if (card) card.style.opacity = '0.65';
}

// ════════════════════════════════════════════
//  PROMO CODE (Flash Sale + Bundling)
// ════════════════════════════════════════════
function setupFlashSale() {
  const input  = document.getElementById('flashSaleInput');
  const btn    = document.getElementById('flashSaleBtn');
  const status = document.getElementById('flashSaleStatus');
  if (!input || !btn) return;

  btn.addEventListener('click', () => applyFlashSale(input, status));
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') applyFlashSale(input, status); });
}

function applyFlashSale(input, status) {
  const kode = input.value.trim().toUpperCase();

  if (kode === FLASH_SALE_CODE) {
    flashSaleAktif = true;
    bundlingAktif  = null;
    input.disabled = true;
    document.getElementById('flashSaleBtn').disabled = true;
    document.getElementById('flashSaleBtn').textContent = '✓ Aktif';
    status.textContent = '🎉 Flash sale telah aktif! Diskon 50% untuk semua kategori.';
    status.className = 'flash-status flash-status--ok';
    updateAllPriceDisplay();
    updateQtyDisplay();
    updateQtyLock();

  } else if (BUNDLING_CONFIG[kode]) {
    bundlingAktif  = kode;
    flashSaleAktif = false;
    input.disabled = true;
    document.getElementById('flashSaleBtn').disabled = true;
    document.getElementById('flashSaleBtn').textContent = '✓ Aktif';
    const cfg = BUNDLING_CONFIG[kode];
    status.textContent = `🎉 ${cfg.label} aktif! Pilih kategori tiket untuk melihat harga bundling.`;
    status.className = 'flash-status flash-status--ok';
    updateAllPriceDisplay();
    updateQtyDisplay();
    updateQtyLock();

  } else if (kode === '') {
    status.textContent = 'Masukkan kode promo';
    status.className = 'flash-status flash-status--error';
  } else {
    status.textContent = 'Kode tidak valid';
    status.className = 'flash-status flash-status--error';
    input.value = '';
  }
}

// Harga per orang yang ditampilkan di kartu
function getHarga(id) {
  const base = TIKET[id].harga;
  if (flashSaleAktif) return Math.round(base * FLASH_SALE_DISKON);
  if (bundlingAktif) {
    const cfg = BUNDLING_CONFIG[bundlingAktif];
    // tampilkan harga total bundling dibagi qty = harga "per orang efektif"
    return Math.round(cfg.hargaTotal[id] / cfg.qty);
  }
  return base;
}

// Total yang dibayar
function getTotalBayar(id) {
  if (bundlingAktif) {
    return BUNDLING_CONFIG[bundlingAktif].hargaTotal[id];
  }
  return getHarga(id) * jumlah;
}

function updateAllPriceDisplay() {
  Object.keys(TIKET).forEach(id => {
    const el    = document.getElementById('price-' + id);
    const subEl = document.getElementById('price-sub-' + id);
    if (!el) return;
    if (bundlingAktif) {
      const cfg = BUNDLING_CONFIG[bundlingAktif];
      // tampilkan harga total bundling di kartu
      el.textContent = Number(cfg.hargaTotal[id]).toLocaleString('id-ID');
      if (subEl) subEl.textContent = `/ ${cfg.qty} tiket`;
    } else {
      el.textContent = Number(getHarga(id)).toLocaleString('id-ID');
      if (subEl) subEl.textContent = '/ orang';
    }
  });
}

// Kunci/buka qty berdasarkan bundling
function updateQtyLock() {
  const minus = document.getElementById('qtyMinus');
  const plus  = document.getElementById('qtyPlus');
  if (bundlingAktif) {
    jumlah = BUNDLING_CONFIG[bundlingAktif].qty;
    if (minus) minus.disabled = true;
    if (plus)  plus.disabled  = true;
    if (minus) minus.style.opacity = '0.3';
    if (plus)  plus.style.opacity  = '0.3';
  } else {
    if (minus) minus.disabled = false;
    if (plus)  plus.disabled  = false;
    if (minus) minus.style.opacity = '';
    if (plus)  plus.style.opacity  = '';
  }
}

// ════════════════════════════════════════════
//  SECTIONS
// ════════════════════════════════════════════
function showSection(name) {
  document.getElementById('step-tiket').style.display  = name === 'tiket' ? 'block' : 'none';
  document.getElementById('step-form').classList.toggle('show',  name === 'form');
  document.getElementById('step-bukti').classList.toggle('show', name === 'bukti');
  document.getElementById('step-sukses').classList.toggle('show', name === 'sukses');
  if (name !== 'tiket') window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ════════════════════════════════════════════
//  STEP 1: PILIH TIKET
// ════════════════════════════════════════════
function setupCards() {
  document.querySelectorAll('.ticket-card:not(.card-unavailable)').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.ticket-card:not(.card-unavailable)').forEach(c => {
        c.classList.remove('selected');
        c.querySelector('.select-btn').textContent = 'Pilih Tiket';
      });
      card.classList.add('selected');
      card.querySelector('.select-btn').textContent = 'Dipilih ✓';
      selectedId = card.dataset.id;

      // Jika bundling aktif, set jumlah sesuai bundling
      if (bundlingAktif) {
        jumlah = BUNDLING_CONFIG[bundlingAktif].qty;
      }

      document.getElementById('qtySection').classList.add('show');
      updateQtyDisplay();
      updateQtyLock();
      document.getElementById('qtySection').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  });
}

function setupQty() {
  document.getElementById('qtyMinus').addEventListener('click', () => {
    if (jumlah > 1) { jumlah--; updateQtyDisplay(); }
  });
  document.getElementById('qtyPlus').addEventListener('click', () => {
    if (jumlah < 10) { jumlah++; updateQtyDisplay(); }
  });
}

function updateQtyDisplay() {
  if (!selectedId) return;
  const total = getTotalBayar(selectedId);
  document.getElementById('qtyNum').textContent   = jumlah;
  document.getElementById('qtyTotal').textContent = 'Total: ' + formatRupiah(total);
}

// ════════════════════════════════════════════
//  STEP 2: FORM DATA
// ════════════════════════════════════════════
function goToForm() {
  if (!selectedId) return;
  renderFormForPerson(currentPerson);
  showSection('form');
}

function renderFormForPerson(idx) {
  const tiket  = TIKET[selectedId];
  const harga  = bundlingAktif
    ? Math.round(BUNDLING_CONFIG[bundlingAktif].hargaTotal[selectedId] / jumlah)
    : getHarga(selectedId);
  const total  = getTotalBayar(selectedId);
  const isLast = idx === jumlah - 1;

  let kategoriLabel = tiket.label;
  if (flashSaleAktif)  kategoriLabel += ' 🎉 Flash Sale';
  if (bundlingAktif)   kategoriLabel += ` 🎁 ${BUNDLING_CONFIG[bundlingAktif].label}`;

  document.getElementById('formEyebrow').textContent     = `Langkah 2 dari 3 — Pemesan ${idx + 1} dari ${jumlah}`;
  document.getElementById('formTitle').textContent       = jumlah === 1 ? 'Data Pemesan' : `Data Pemesan ke-${idx + 1}`;
  document.getElementById('summaryKategori').textContent = kategoriLabel;
  document.getElementById('summaryUrutan').textContent   = `${idx + 1} dari ${jumlah}`;
  document.getElementById('summaryTotal').textContent    = formatRupiah(total);
  document.getElementById('nextPersonText').textContent  = isLast ? 'Lanjut ke Pembayaran →' : `Simpan & Lanjut ke Orang ke-${idx + 2} →`;

  const saved = persons[idx];
  document.getElementById('inputEmail').value  = saved ? saved.email  : '';
  document.getElementById('inputNama').value   = saved ? saved.nama   : '';
  document.getElementById('inputHP').value     = saved ? saved.hp     : '';
  document.getElementById('inputAsal').value   = saved ? saved.asal   : '';
  document.getElementById('inputSumber').value = saved ? saved.sumber : '';

  renderDots(idx);
}


function renderDots(activeIdx) {
  const container = document.getElementById('personDots');
  if (jumlah <= 1) { container.innerHTML = ''; return; }
  container.innerHTML = '';
  for (let i = 0; i < jumlah; i++) {
    const dot = document.createElement('div');
    dot.className = 'dot' + (i === activeIdx ? ' active' : (persons[i] ? ' done' : ''));
    container.appendChild(dot);
  }
}

function savePersonData() {
  const email  = document.getElementById('inputEmail').value.trim();
  const nama   = document.getElementById('inputNama').value.trim();
  const hp     = document.getElementById('inputHP').value.trim();
  const asal   = document.getElementById('inputAsal').value.trim();
  const sumber = document.getElementById('inputSumber').value.trim();

  if (!email || !nama || !hp || !asal || !sumber) { alert('Harap isi semua data terlebih dahulu.'); return; }
  if (!isValidEmail(email)) { alert('Format email tidak valid.'); return; }

  persons[currentPerson] = { email, nama, hp, asal, sumber };

  if (currentPerson < jumlah - 1) {
    currentPerson++;
    renderFormForPerson(currentPerson);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } else {
    renderBuktiSummary();
    showSection('bukti');
  }
}

function onBackFromForm() {
  if (currentPerson > 0) {
    currentPerson--;
    renderFormForPerson(currentPerson);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } else {
    currentPerson = 0;
    showSection('tiket');
  }
}

function renderBuktiSummary() {
  const tiket = TIKET[selectedId];
  const total = getTotalBayar(selectedId);
  const box   = document.getElementById('buktiSummary');

  let rows = persons.map(p =>
    `<div class="bukti-person-row">
      <span class="bukti-person-name">${p.nama}</span>
      <span class="bukti-person-tiket">${tiket.label} · ${p.asal}</span>
    </div>`
  ).join('');

  box.innerHTML = `${rows}
    <div class="summary-row summary-total-row" style="margin-top:.5rem;">
      <span class="summary-key">Total Bayar</span>
      <span class="summary-val summary-total">${formatRupiah(total)}</span>
    </div>`;
}

// ════════════════════════════════════════════
//  UPLOAD FOTO
// ════════════════════════════════════════════
function setupUpload() {
  const area        = document.getElementById('uploadArea');
  const input       = document.getElementById('inputBukti');
  const placeholder = document.getElementById('uploadPlaceholder');
  const preview     = document.getElementById('uploadPreview');
  const previewImg  = document.getElementById('previewImg');
  const previewName = document.getElementById('previewName');
  const removeBtn   = document.getElementById('removePhoto');

  area.addEventListener('click', (e) => { if (removeBtn.contains(e.target)) return; input.click(); });
  area.addEventListener('dragover', (e) => { e.preventDefault(); area.classList.add('dragover'); });
  area.addEventListener('dragleave', () => area.classList.remove('dragover'));
  area.addEventListener('drop', (e) => {
    e.preventDefault(); area.classList.remove('dragover');
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  });
  input.addEventListener('change', () => { if (input.files[0]) handleFile(input.files[0]); });
  removeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    fotoBase64 = null; fotoMime = ''; fotoNama = '';
    input.value = '';
    preview.style.display     = 'none';
    placeholder.style.display = 'flex';
  });

  function handleFile(file) {
    if (!file.type.startsWith('image/')) { alert('File harus berupa gambar.'); return; }
    if (file.size > 5 * 1024 * 1024)    { alert('Ukuran file maksimal 5 MB.'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result  = ev.target.result;
      fotoBase64    = result.split(',')[1];
      fotoMime      = file.type;
      fotoNama      = file.name;
      previewImg.src          = result;
      previewName.textContent = file.name;
      placeholder.style.display = 'none';
      preview.style.display     = 'block';
    };
    reader.readAsDataURL(file);
  }
}

// ════════════════════════════════════════════
//  SUBMIT
// ════════════════════════════════════════════
async function submitAll() {
  if (!fotoBase64) { alert('Harap upload foto bukti pembayaran terlebih dahulu.'); return; }

  const btn     = document.getElementById('submitAllBtn');
  const btnText = document.getElementById('submitText');
  const spinner = document.getElementById('submitSpinner');
  btn.disabled          = true;
  btnText.textContent   = 'Mengirim...';
  spinner.style.display = 'inline-block';

  const tiket      = TIKET[selectedId];
  const harga      = bundlingAktif
    ? Math.round(BUNDLING_CONFIG[bundlingAktif].hargaTotal[selectedId] / jumlah)
    : getHarga(selectedId);
  const total      = getTotalBayar(selectedId);
  const nomorOrder = generateOrderNumber();
  const waktu      = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', dateStyle: 'long', timeStyle: 'short' });

  // Tentukan label bundling untuk dikirim ke spreadsheet
  let bundlingLabel = null;
  if (bundlingAktif) bundlingLabel = BUNDLING_CONFIG[bundlingAktif].label;

  const payload = {
    nomorOrder,
    waktu,
    kategori:     tiket.label,
    jumlah,
    hargaSatuan:  harga,
    totalBayar:   formatRupiah(total),
    flashSale:    flashSaleAktif,
    bundling:     bundlingLabel,
    persons,
    foto:         fotoBase64,
    fotoMime:     fotoMime,
    fotoNama:     fotoNama,
  };

  try {
    const res    = await fetch(APPS_SCRIPT_URL, { method: 'POST', body: JSON.stringify(payload) });
    const result = await res.json();
    if (result.status === 'ok') {
      document.getElementById('successOrder').textContent = 'No. Order: ' + nomorOrder;
      showSection('sukses');
    } else if (result.status === 'sold_out') {
      alert(result.message || 'Maaf, tiket sudah habis terjual.');
      btn.disabled          = false;
      btnText.textContent   = 'Kirim Pemesanan';
      spinner.style.display = 'none';
      loadQuota(); // refresh tampilan kartu
    } else {
      throw new Error(result.message || 'Terjadi kesalahan.');
    }
  } catch (err) {
    alert('Gagal mengirim: ' + err.message + '\nCoba lagi atau hubungi panitia.');
    btn.disabled          = false;
    btnText.textContent   = 'Kirim Pemesanan';
    spinner.style.display = 'none';
  }
}

// ════════════════════════════════════════════
//  RESET
// ════════════════════════════════════════════
function resetAll() {
  selectedId = null; jumlah = 1; currentPerson = 0; persons = [];
  fotoBase64 = null; fotoMime = ''; fotoNama = '';
  flashSaleAktif = false;
  bundlingAktif  = null;

  document.querySelectorAll('.ticket-card:not(.card-unavailable)').forEach(c => {
    c.classList.remove('selected');
    c.querySelector('.select-btn').textContent = 'Pilih Tiket';
  });
  document.getElementById('qtySection').classList.remove('show');
  document.getElementById('qtyNum').textContent = '1';

  const flashInput = document.getElementById('flashSaleInput');
  const flashBtn   = document.getElementById('flashSaleBtn');
  const flashStatus = document.getElementById('flashSaleStatus');
  if (flashInput) { flashInput.value = ''; flashInput.disabled = false; }
  if (flashBtn)   { flashBtn.disabled = false; flashBtn.textContent = 'Terapkan'; }
  if (flashStatus) { flashStatus.textContent = ''; flashStatus.className = 'flash-status'; }

  updateAllPriceDisplay();

  try { document.getElementById('bookingForm').reset(); } catch(e) {}
  document.getElementById('uploadPreview').style.display     = 'none';
  document.getElementById('uploadPlaceholder').style.display = 'flex';

  updateAllPriceDisplay();
  updateQtyLock();

  const btn = document.getElementById('submitAllBtn');
  if (btn) btn.disabled = false;
  document.getElementById('submitText').textContent      = 'Kirim Pemesanan';
  document.getElementById('submitSpinner').style.display = 'none';

  showSection('tiket');
  loadQuota();
}

// ════════════════════════════════════════════
//  HELPERS
// ════════════════════════════════════════════
function formatRupiah(n) { return 'Rp ' + Number(n).toLocaleString('id-ID'); }
function isValidEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }
function generateOrderNumber() {
  const d = new Date();
  return 'PS-' + d.getFullYear() + String(d.getMonth()+1).padStart(2,'0') + String(d.getDate()).padStart(2,'0') + '-' + Math.floor(1000 + Math.random()*9000);
}

function copyText(elId, btn) {
  const text = document.getElementById(elId).textContent.trim();
  navigator.clipboard.writeText(text).then(() => {
    const orig = btn.innerHTML;
    btn.innerHTML = '✓ Tersalin';
    btn.style.color = '#4CAF50';
    setTimeout(() => { btn.innerHTML = orig; btn.style.color = ''; }, 2000);
  });
}
