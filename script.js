const STORAGE_KEYS = {
  items: 'privates.items.v2',
  earnings: 'privates.earnings.total.v2',
  history: 'privates.earnings.history.v2',
  theme: 'privates.theme.v1',
  categories: 'privates.categories.v1'
};

/** Data */
let items = loadJson(STORAGE_KEYS.items, []);
let earningsTotal = loadNumber(STORAGE_KEYS.earnings, 0);
let earningsHistory = loadJson(STORAGE_KEYS.history, []);
let filter = 'all';
let searchQuery = '';
let categoryFilter = '';
let currentTheme = localStorage.getItem(STORAGE_KEYS.theme) || 'dark';
let earningsChart = null;

/** DOM */
const listEl = document.getElementById('list');
const statsEl = document.getElementById('stats');
const nameInput = document.getElementById('nameInput');
const categoryInput = document.getElementById('categoryInput');
const priceInput = document.getElementById('priceInput');
const dueDateInput = document.getElementById('dueDateInput');
const noteInput = document.getElementById('noteInput');
const rentedInput = document.getElementById('rentedInput');
const addForm = document.getElementById('addForm');
const chips = Array.from(document.querySelectorAll('.chip'));
const searchInput = document.getElementById('searchInput');
const categoryFilterEl = document.getElementById('categoryFilter');

const earningsTotalEl = document.getElementById('earningsTotal');
const earningsForm = document.getElementById('earningsForm');
const deltaInput = document.getElementById('deltaInput');
const resetEarningsBtn = document.getElementById('resetEarnings');
const add20Btn = document.getElementById('add20');
const sub5Btn = document.getElementById('sub5');
const historyList = document.getElementById('historyList');
const earningsChartCanvas = document.getElementById('earningsChart');

const exportBtn = document.getElementById('exportBtn');
const exportExcelBtn = document.getElementById('exportExcelBtn');
const importBtn = document.getElementById('importBtn');
const importFile = document.getElementById('importFile');
const resetAllBtn = document.getElementById('resetAllBtn');
const backupBtn = document.getElementById('backupBtn');
const backupCloudBtn = document.getElementById('backupCloudBtn');
const restoreCloudBtn = document.getElementById('restoreCloudBtn');

const themeToggle = document.getElementById('themeToggle');
const themeIcon = document.querySelector('.theme-icon');

const todayCountEl = document.getElementById('todayCount');
const monthlyEarningsEl = document.getElementById('monthlyEarnings');
const avgPriceEl = document.getElementById('avgPrice');
const overdueCountEl = document.getElementById('overdueCount');

const editModal = document.getElementById('editModal');
const editForm = document.getElementById('editForm');
const closeModal = document.getElementById('closeModal');
const cancelEdit = document.getElementById('cancelEdit');
const editNameInput = document.getElementById('editNameInput');
const editCategoryInput = document.getElementById('editCategoryInput');
const editPriceInput = document.getElementById('editPriceInput');
const editDueDateInput = document.getElementById('editDueDateInput');
const editNoteInput = document.getElementById('editNoteInput');

const notificationsList = document.getElementById('notificationsList');

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

function formatMoney(n) {
  const rounded = Math.round(n * 100) / 100;
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(rounded);
}

function formatDate(date) {
  return new Intl.DateTimeFormat('ru-RU').format(new Date(date));
}

function isOverdue(dueDate) {
  if (!dueDate) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  return due < today;
}

function getDaysUntilDue(dueDate) {
  if (!dueDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  const diffTime = due - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

function getCategoryName(category) {
  const categories = {
    'jailbreak': 'Jailbreak',
    'modded': 'Модифицированные',
    'vanilla': 'Ванильные',
    'custom': 'Кастомные',
    'other': 'Другое'
  };
  return categories[category] || category;
}

function getCategoryColor(category) {
  const colors = {
    'jailbreak': '#ff6b6b',
    'modded': '#4ecdc4',
    'vanilla': '#45b7d1',
    'custom': '#96ceb4',
    'other': '#feca57'
  };
  return colors[category] || '#95a5a6';
}

/** Theme Management */
function setTheme(theme) {
  currentTheme = theme;
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(STORAGE_KEYS.theme, theme);
  
  if (theme === 'light') {
    themeIcon.textContent = '☀️';
  } else {
    themeIcon.textContent = '🌙';
  }
}

function toggleTheme() {
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  setTheme(newTheme);
}

/** Chart Management */
function initChart() {
  if (earningsChart) {
    earningsChart.destroy();
  }
  
  const ctx = earningsChartCanvas.getContext('2d');
  const last7Days = getLast7Days();
  const earningsData = last7Days.map(date => {
    const dayEarnings = earningsHistory
      .filter(record => {
        const recordDate = new Date(record.ts);
        return recordDate.toDateString() === date.toDateString();
      })
      .reduce((sum, record) => sum + record.delta, 0);
    return dayEarnings;
  });
  
  earningsChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: last7Days.map(date => date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })),
      datasets: [{
        label: 'Доход',
        data: earningsData,
        borderColor: getComputedStyle(document.documentElement).getPropertyValue('--primary'),
        backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--primary') + '20',
        tension: 0.4,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: {
            color: getComputedStyle(document.documentElement).getPropertyValue('--border')
          },
          ticks: {
            color: getComputedStyle(document.documentElement).getPropertyValue('--muted')
          }
        },
        x: {
          grid: {
            color: getComputedStyle(document.documentElement).getPropertyValue('--border')
          },
          ticks: {
            color: getComputedStyle(document.documentElement).getPropertyValue('--muted')
          }
        }
      }
    }
  });
}

function getLast7Days() {
  const dates = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    dates.push(date);
  }
  return dates;
}

/** Analytics */
function updateAnalytics() {
  const today = new Date();
  const todayStr = today.toDateString();
  
  // Приваток сегодня
  const todayCount = items.filter(item => {
    if (!item.createdAt) return false;
    const itemDate = new Date(item.createdAt);
    return itemDate.toDateString() === todayStr;
  }).length;
  
  // Доход за месяц
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  const monthlyEarnings = earningsHistory
    .filter(record => {
      const recordDate = new Date(record.ts);
      return recordDate.getMonth() === currentMonth && recordDate.getFullYear() === currentYear;
    })
    .reduce((sum, record) => sum + record.delta, 0);
  
  // Средняя цена
  const itemsWithPrice = items.filter(item => item.price > 0);
  const avgPrice = itemsWithPrice.length > 0 
    ? itemsWithPrice.reduce((sum, item) => sum + item.price, 0) / itemsWithPrice.length 
    : 0;
  
  // Просрочено
  const overdueCount = items.filter(item => isOverdue(item.dueDate)).length;
  
  todayCountEl.textContent = todayCount;
  monthlyEarningsEl.textContent = formatMoney(monthlyEarnings);
  avgPriceEl.textContent = formatMoney(avgPrice);
  overdueCountEl.textContent = overdueCount;
}

/** Notifications */
function updateNotifications() {
  notificationsList.innerHTML = '';
  
  const notifications = [];
  
  // Проверяем просроченные приватки
  items.forEach(item => {
    if (isOverdue(item.dueDate)) {
      notifications.push({
        type: 'urgent',
        icon: '⚠️',
        title: 'Просрочена приватка',
        text: `${item.name} - просрочена на ${Math.abs(getDaysUntilDue(item.dueDate))} дней`
      });
    } else if (item.dueDate) {
      const daysUntil = getDaysUntilDue(item.dueDate);
      if (daysUntil <= 3 && daysUntil > 0) {
        notifications.push({
          type: 'warning',
          icon: '⏰',
          title: 'Скоро срок',
          text: `${item.name} - срок через ${daysUntil} дней`
        });
      }
    }
  });
  
  // Проверяем доход
  if (earningsTotal < 0) {
    notifications.push({
      type: 'info',
      icon: '💰',
      title: 'Отрицательный доход',
      text: 'Текущий доход отрицательный'
    });
  }
  
  if (notifications.length === 0) {
    notifications.push({
      type: 'success',
      icon: '✅',
      title: 'Всё в порядке',
      text: 'Нет активных уведомлений'
    });
  }
  
  notifications.forEach(notification => {
    const notificationEl = document.createElement('div');
    notificationEl.className = `notification-item ${notification.type === 'urgent' ? 'notification-urgent' : ''}`;
    
    notificationEl.innerHTML = `
      <div class="notification-icon">${notification.icon}</div>
      <div class="notification-content">
        <div class="notification-title">${notification.title}</div>
        <div class="notification-text">${notification.text}</div>
      </div>
    `;
    
    notificationsList.appendChild(notificationEl);
  });
}

/** Rendering */
function render() {
  // stats
  const total = items.length;
  const rented = items.filter(i => i.rented).length;
  const free = total - rented;
  const overdue = items.filter(i => isOverdue(i.dueDate)).length;
  
  let statsText = `Всего: ${total} · Сдана: ${rented} · Не сдана: ${free}`;
  if (overdue > 0) {
    statsText += ` · Просрочено: ${overdue}`;
  }
  statsEl.textContent = statsText;

  // list
  const filtered = items
    .filter(i => {
      if (filter === 'rented') return i.rented;
      if (filter === 'free') return !i.rented;
      if (filter === 'overdue') return isOverdue(i.dueDate);
      return true;
    })
    .filter(i => {
      if (categoryFilter && i.category !== categoryFilter) return false;
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        String(i.name).toLowerCase().includes(q) ||
        String(i.note || '').toLowerCase().includes(q) ||
        String(i.price || '').includes(q) ||
        getCategoryName(i.category).toLowerCase().includes(q)
      );
    });
    
  listEl.innerHTML = '';
  for (const item of filtered) {
    listEl.appendChild(renderItem(item));
  }

  // earnings
  earningsTotalEl.textContent = formatMoney(earningsTotal);
  renderHistory();
  
  // analytics
  updateAnalytics();
  
  // notifications
  updateNotifications();
  
  // chart
  if (earningsChartCanvas) {
    initChart();
  }
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
  
  const categorySpan = document.createElement('div');
  categorySpan.className = 'category';
  if (item.category) {
    categorySpan.textContent = getCategoryName(item.category);
    categorySpan.style.color = getCategoryColor(item.category);
    categorySpan.style.fontSize = '11px';
    categorySpan.style.fontWeight = '500';
  }
  
  const noteSpan = document.createElement('div');
  noteSpan.className = 'note';
  noteSpan.textContent = item.note || '';
  
  nameWrap.appendChild(nameSpan);
  if (item.category) nameWrap.appendChild(categorySpan);
  nameWrap.appendChild(noteSpan);

  const price = document.createElement('div');
  price.className = 'price';
  price.textContent = item.price ? `+${formatMoney(item.price)}` : '';

  const status = document.createElement('div');
  status.className = 'status';
  if (isOverdue(item.dueDate)) {
    status.classList.add('overdue');
    status.textContent = 'Просрочено';
  } else if (item.rented) {
    status.classList.add('rented');
    status.textContent = 'Сдана';
  } else {
    status.classList.add('free');
    status.textContent = 'Не сдана';
  }

  const actions = document.createElement('div');
  actions.className = 'item-actions';
  
  const editBtn = document.createElement('button');
  editBtn.className = 'edit';
  editBtn.textContent = '✏️';
  editBtn.title = 'Редактировать';
  editBtn.addEventListener('click', () => openEditModal(item));
  
  const removeBtn = document.createElement('button');
  removeBtn.className = 'remove';
  removeBtn.textContent = '×';
  removeBtn.title = 'Удалить';
  removeBtn.addEventListener('click', () => removeItem(item.id));

  actions.appendChild(editBtn);
  actions.appendChild(removeBtn);

  switchWrap.appendChild(hidden);
  switchWrap.appendChild(ui);
  switchWrap.appendChild(text);

  li.appendChild(switchWrap);
  li.appendChild(nameWrap);
  li.appendChild(price);
  li.appendChild(status);
  li.appendChild(actions);
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

/** Modal Management */
function openEditModal(item) {
  editNameInput.value = item.name;
  editCategoryInput.value = item.category || '';
  editPriceInput.value = item.price || '';
  editDueDateInput.value = item.dueDate || '';
  editNoteInput.value = item.note || '';
  
  editForm.dataset.itemId = item.id;
  editModal.hidden = false;
}

function closeEditModal() {
  editModal.hidden = true;
  editForm.reset();
}

/** Mutations */
function addItem(name, category, price, dueDate, note, rented) {
  items.unshift({ 
    id: uid(), 
    name, 
    category: category || null,
    price: price ?? 0, 
    dueDate: dueDate || null,
    note: note ?? '', 
    rented: Boolean(rented),
    createdAt: new Date().toISOString()
  });
  save();
  render();
}

function updateItem(id, name, category, price, dueDate, note) {
  const item = items.find(i => i.id === id);
  if (!item) return;
  
  item.name = name;
  item.category = category || null;
  item.price = price ?? 0;
  item.dueDate = dueDate || null;
  item.note = note || '';
  
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
  if (!confirm('Удалить эту приватку?')) return;
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

/** Export Functions */
function exportToExcel() {
  const headers = ['Название', 'Категория', 'Цена', 'Дата сдачи', 'Заметка', 'Статус', 'Дата создания'];
  const data = items.map(item => [
    item.name,
    getCategoryName(item.category || ''),
    item.price || 0,
    item.dueDate ? formatDate(item.dueDate) : '',
    item.note || '',
    item.rented ? 'Сдана' : 'Не сдана',
    item.createdAt ? formatDate(item.createdAt) : ''
  ]);
  
  const csvContent = [headers, ...data]
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n');
  
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `privates-${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Events */
addForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const name = nameInput.value.trim();
  if (!name) return;
  
  const category = categoryInput.value || null;
  const price = priceInput.value ? Number(String(priceInput.value).replace(',', '.')) : 0;
  const dueDate = dueDateInput.value || null;
  const note = noteInput.value.trim();
  const rented = rentedInput && rentedInput.checked;
  
  addItem(name, category, Number.isFinite(price) ? price : 0, dueDate, note, rented);
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

if (categoryFilterEl) {
  categoryFilterEl.addEventListener('change', () => {
    categoryFilter = categoryFilterEl.value;
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

// export/import
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

exportExcelBtn.addEventListener('click', exportToExcel);

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

// theme
themeToggle.addEventListener('click', toggleTheme);

// modal
closeModal.addEventListener('click', closeEditModal);
cancelEdit.addEventListener('click', closeEditModal);

editForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const itemId = editForm.dataset.itemId;
  const name = editNameInput.value.trim();
  if (!name) return;
  
  const category = editCategoryInput.value || null;
  const price = editPriceInput.value ? Number(editPriceInput.value) : 0;
  const dueDate = editDueDateInput.value || null;
  const note = editNoteInput.value.trim();
  
  updateItem(itemId, name, category, price, dueDate, note);
  closeEditModal();
});

// backup cloud (simulated)
backupCloudBtn.addEventListener('click', () => {
  alert('Функция резервного копирования в облако будет добавлена в следующей версии!');
});

restoreCloudBtn.addEventListener('click', () => {
  alert('Функция восстановления из облака будет добавлена в следующей версии!');
});

// init
const persistedFilter = localStorage.getItem('privates.filter');
if (persistedFilter) {
  filter = persistedFilter;
  chips.forEach(c => c.classList.remove('active'));
  const chip = chips.find(c => c.dataset.filter === filter);
  if (chip) chip.classList.add('active');
}

setTheme(currentTheme);
render();