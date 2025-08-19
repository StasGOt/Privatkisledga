const STORAGE_KEYS = {
  items: 'privates.items.v1',
  earnings: 'privates.earnings.total.v1',
  history: 'privates.earnings.history.v1'
};

/** Data */
let items = loadJson(STORAGE_KEYS.items, []);
let earningsTotal = loadNumber(STORAGE_KEYS.earnings, 0);
let earningsHistory = loadJson(STORAGE_KEYS.history, []);
let filter = 'all';
let searchQuery = '';

/** DOM */
const listEl = document.getElementById('list');
const statsEl = document.getElementById('stats');
const nameInput = document.getElementById('nameInput');
const priceInput = document.getElementById('priceInput');
const noteInput = document.getElementById('noteInput');
const dueInput = document.getElementById('dueInput');
const rentedInput = document.getElementById('rentedInput');
const addForm = document.getElementById('addForm');
const chips = Array.from(document.querySelectorAll('.chip'));
const searchInput = document.getElementById('searchInput');

const earningsTotalEl = document.getElementById('earningsTotal');
const earningsForm = document.getElementById('earningsForm');
const deltaInput = document.getElementById('deltaInput');
const resetEarningsBtn = document.getElementById('resetEarnings');
const add20Btn = document.getElementById('add20');
const sub5Btn = document.getElementById('sub5');
const historyList = document.getElementById('historyList');

const exportBtn = document.getElementById('exportBtn');
const importBtn = document.getElementById('importBtn');
const importFile = document.getElementById('importFile');
const resetAllBtn = document.getElementById('resetAllBtn');

/** Helpers */
function save() {
  localStorage.setItem(STORAGE_KEYS.items, JSON.stringify(items));
}
function saveEarnings() {
  localStorage.setItem(STORAGE_KEYS.earnings, String(earningsTotal));
  localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(earningsHistory));
}
function loadJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}
function loadNumber(key, fallback) {
  const raw = localStorage.getItem(key);
  const n = raw === null ? NaN : Number(raw);
  return Number.isFinite(n) ? n : fallback;
}
function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/** Rendering */
function render() {
  // stats
  const total = items.length;
  const rented = items.filter(i => i.rented).length;
  const free = total - rented;
  statsEl.textContent = `Всего: ${total} · Сдана: ${rented} · Не сдана: ${free}`;

  // list
  const filtered = items
    .filter(i => {
      if (filter === 'rented') return i.rented;
      if (filter === 'free') return !i.rented;
      return true;
    })
    .filter(i => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        String(i.name).toLowerCase().includes(q) ||
        String(i.note || '').toLowerCase().includes(q)
      );
    });
  listEl.innerHTML = '';
  for (const item of filtered) {
    listEl.appendChild(renderItem(item));
  }

  // earnings
  earningsTotalEl.textContent = formatMoney(earningsTotal);
  renderHistory();
}

function renderItem(item) {
  const li = document.createElement('li');
  li.className = 'item';

  // Toggle switch
  const switchWrap = document.createElement('label');
  switchWrap.className = 'switch';
  const hidden = document.createElement('input');
  hidden.type = 'checkbox';
  hidden.checked = item.rented;
  hidden.addEventListener('change', () => toggleRented(item.id));
  const ui = document.createElement('span');
  ui.className = 'switch-ui';
  const text = document.createElement('span');
  text.className = 'switch-text';
  text.setAttribute('data-off', 'Не сдана');
  text.setAttribute('data-on', 'Сдана');

  const nameWrap = document.createElement('div');
  const nameSpan = document.createElement('div');
  nameSpan.className = 'name';
  nameSpan.textContent = item.name;
  const noteSpan = document.createElement('div');
  noteSpan.className = 'note';
  noteSpan.textContent = item.note || '';
  nameWrap.appendChild(nameSpan);
  nameWrap.appendChild(noteSpan);
  if (item.dueAt) {
    const dueSpan = document.createElement('div');
    dueSpan.className = 'due' + ((item.rented && Date.now() > item.dueAt) ? ' overdue' : '');
    const dueDate = new Date(item.dueAt);
    const dateStr = dueDate.toLocaleDateString();
    const timeStr = dueDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    dueSpan.textContent = `До: ${dateStr} ${timeStr}`;
    nameWrap.appendChild(dueSpan);
  }

  const price = document.createElement('div');
  price.className = 'price';
  price.textContent = item.price ? `+${formatMoney(item.price)}` : '';

  const status = document.createElement('div');
  status.className = 'status ' + (item.rented ? 'rented' : 'free');
  status.textContent = item.rented ? 'Сдана' : 'Не сдана';

  const removeBtn = document.createElement('button');
  removeBtn.className = 'remove';
  removeBtn.textContent = '×';
  removeBtn.title = 'Удалить';
  removeBtn.addEventListener('click', () => removeItem(item.id));

  switchWrap.appendChild(hidden);
  switchWrap.appendChild(ui);
  switchWrap.appendChild(text);

  li.appendChild(switchWrap);
  li.appendChild(nameWrap);
  li.appendChild(price);
  li.appendChild(status);
  li.appendChild(removeBtn);
  return li;
}

function renderHistory() {
  historyList.innerHTML = '';
  for (const record of earningsHistory.slice().reverse()) {
    const li = document.createElement('li');
    const left = document.createElement('span');
    left.textContent = `${record.delta > 0 ? '+' : ''}${formatMoney(record.delta)} (${record.reason || 'без прим.'})`;
    const right = document.createElement('span');
    const date = new Date(record.ts);
    right.textContent = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
    li.appendChild(left);
    li.appendChild(right);
    historyList.appendChild(li);
  }
}

function formatMoney(n) {
  const rounded = Math.round(n * 100) / 100;
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(rounded);
}

/** Mutations */
function addItem(name, price, note, rented, dueAt) {
  items.unshift({ id: uid(), name, price: price ?? 0, note: note ?? '', rented: Boolean(rented), dueAt: dueAt ?? null });
  save();
  render();
}
function toggleRented(id) {
  const item = items.find(i => i.id === id);
  if (!item) return;
  item.rented = !item.rented;
  save();
  render();
}
function removeItem(id) {
  items = items.filter(i => i.id !== id);
  save();
  render();
}

function applyDelta(raw) {
  const parsed = parseDelta(raw);
  if (parsed === null) return;
  earningsTotal = Math.round((earningsTotal + parsed) * 100) / 100;
  earningsHistory.push({ ts: Date.now(), delta: parsed, reason: '' });
  saveEarnings();
  render();
}
function parseDelta(raw) {
  if (!raw) return null;
  const trimmed = String(raw).replace(',', '.').trim();
  const match = trimmed.match(/^([+-])?\s*(\d+(?:\.\d+)?)$/);
  if (!match) return null;
  const sign = match[1] === '-' ? -1 : 1;
  const num = Number(match[2]);
  if (!Number.isFinite(num)) return null;
  return sign * num;
}

/** Events */
addForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const name = nameInput.value.trim();
  if (!name) return;
  const price = priceInput.value ? Number(String(priceInput.value).replace(',', '.')) : 0;
  const note = noteInput.value.trim();
  const rented = rentedInput && rentedInput.checked;
  const dueAt = dueInput && dueInput.value ? new Date(dueInput.value).getTime() : null;
  addItem(name, Number.isFinite(price) ? price : 0, note, rented, dueAt);
  addForm.reset();
  nameInput.focus();
});

chips.forEach(chip => {
  chip.addEventListener('click', () => {
    chips.forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    filter = chip.dataset.filter;
    localStorage.setItem('privates.filter', filter);
    render();
  });
});

if (searchInput) {
  searchInput.addEventListener('input', () => {
    searchQuery = searchInput.value.trim();
    render();
  });
}

// earnings

earningsForm.addEventListener('submit', (e) => {
  e.preventDefault();
  applyDelta(deltaInput.value);
  earningsForm.reset();
  deltaInput.focus();
});

add20Btn.addEventListener('click', () => applyDelta('+20'));
sub5Btn.addEventListener('click', () => applyDelta('-5'));
resetEarningsBtn.addEventListener('click', () => {
  if (!confirm('Сбросить доход?')) return;
  earningsTotal = 0;
  earningsHistory = [];
  saveEarnings();
  render();
});

exportBtn.addEventListener('click', () => {
  const blob = new Blob([JSON.stringify({ items, earningsTotal, earningsHistory }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'privates-backup.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
});

importBtn.addEventListener('click', () => importFile.click());
importFile.addEventListener('change', async () => {
  const file = importFile.files && importFile.files[0];
  if (!file) return;
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    if (Array.isArray(data.items)) items = data.items;
    if (typeof data.earningsTotal === 'number') earningsTotal = data.earningsTotal;
    if (Array.isArray(data.earningsHistory)) earningsHistory = data.earningsHistory;
    save();
    saveEarnings();
    render();
  } catch (e) {
    alert('Не удалось импортировать файл');
  } finally {
    importFile.value = '';
  }
});

resetAllBtn.addEventListener('click', () => {
  if (!confirm('Удалить все данные?')) return;
  items = [];
  earningsTotal = 0;
  earningsHistory = [];
  save();
  saveEarnings();
  render();
});

// init
const persistedFilter = localStorage.getItem('privates.filter');
if (persistedFilter) {
  filter = persistedFilter;
  chips.forEach(c => c.classList.remove('active'));
  const chip = chips.find(c => c.dataset.filter === filter);
  if (chip) chip.classList.add('active');
}
render();