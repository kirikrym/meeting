"use strict";

// ============================================================
// МОДУЛЬ "РАЗГОВОРЫ ПО ДУШАМ"
// ============================================================

const soulState = {
  screen: null,
  currentUser: null,
  onClose: null,
  selectedTheme: null,
  partnerNick: null,
  searchTimer: null,
  botAnswered: false,
  isTest: false,
};

function createSoulScreen() {
  const old = document.getElementById('soulScreen');
  if (old) old.remove();

  const el = document.createElement('div');
  el.className = 'soul-screen';
  el.id = 'soulScreen';
  el.innerHTML = `
    <div class="soul-header">
      <button class="soul-back" id="soulBack">← Назад</button>
      <span class="soul-logo">💬 ПО ДУШАМ</span>
      <div class="soul-avatar" id="soulAvatar"></div>
    </div>
    <div class="soul-body" id="soulBody"></div>
  `;
  document.body.appendChild(el);
  return el;
}

function renderSoulThemes() {
  const body = document.getElementById('soulBody');
  if (!body) return;

  body.style.display = 'block';
  body.style.flexDirection = '';
  body.style.padding = '24px 20px 40px';
  body.style.overflowY = 'auto';
  body.style.overflow = '';

  const soulBackBtn = document.getElementById('soulBack');
  if (soulBackBtn) soulBackBtn.style.display = 'block';

  let themesHtml = '';
  SOUL_THEMES.forEach(theme => {
    themesHtml += `
      <div class="soul-theme" data-theme="${theme.id}">
        <div class="soul-theme-icon">${theme.icon}</div>
        <div class="soul-theme-info">
          <div class="soul-theme-name">${theme.name}</div>
          <div class="soul-theme-online">${theme.online} человек онлайн</div>
        </div>
        <div class="soul-theme-arrow">›</div>
      </div>
    `;
  });

  body.innerHTML = `
    <div class="soul-intro">
      <div class="soul-intro-icon">💙</div>
      <div class="soul-intro-title">Поговорим по душам?</div>
      <div class="soul-intro-text">Здесь ты можешь анонимно выговориться или выслушать кого-то. Никто не осудит.</div>
      <button class="soul-info-btn" id="soulInfoBtn">❓ Как это работает?</button>
    </div>
    <div class="soul-themes-title">Выбери тему</div>
    ${themesHtml}
  `;

  document.getElementById('soulInfoBtn').addEventListener('click', openSoulHowModal);

  body.querySelectorAll('.soul-theme').forEach(el => {
    el.addEventListener('click', () => {
      const themeId = el.dataset.theme;
      const theme = SOUL_THEMES.find(t => t.id === themeId);
      if (theme) startSoulSearch(theme, false);
    });
  });
}

function openSoulHowModal() {
  const modal = document.getElementById('soulHowModal');
  if (!modal) return;

  const closeBtn = document.getElementById('soulCloseHow');
  const testBtn = document.getElementById('soulTestBtn');

  closeBtn.onclick = () => modal.classList.remove('active');

  testBtn.onclick = () => {
    modal.classList.remove('active');
    startSoulSearch({ id: 'test', icon: '🧪', name: 'Тест' }, true);
  };

  modal.onclick = (e) => {
    if (e.target === modal) modal.classList.remove('active');
  };

  modal.classList.add('active');
}

function startSoulSearch(theme, isTest) {
  soulState.selectedTheme = theme;
  soulState.isTest = isTest;
  soulState.botAnswered = false;

  const body = document.getElementById('soulBody');
  if (!body) return;

  body.style.display = 'flex';
  body.style.flexDirection = 'column';
  body.style.padding = '0';
  body.style.overflow = 'hidden';

  body.innerHTML = `
    <div class="soul-search">
      <div class="soul-search-icon">🔎</div>
      <div class="soul-search-title">Ищем собеседника...</div>
      <div class="soul-search-sub">Обычно это занимает 3–5 секунд</div>
      <div class="soul-search-theme">
        <span>${theme.icon}</span>
        <span>${theme.name}</span>
      </div>
      <button class="soul-search-cancel" id="soulSearchCancel">✕ Отменить</button>
    </div>
  `;

  document.getElementById('soulSearchCancel').addEventListener('click', () => {
    if (soulState.searchTimer) { clearTimeout(soulState.searchTimer); soulState.searchTimer = null; }
    renderSoulThemes();
  });

  const delay = isTest ? 1000 : 3000;
  soulState.searchTimer = setTimeout(() => {
    if (isTest) {
      soulState.partnerNick = '🧪 Тестовый бот';
      openSoulChat();
    } else {
      showSoulNoOne();
    }
  }, delay);
}

function showSoulNoOne() {
  const body = document.getElementById('soulBody');
  if (!body) return;

  const soulBackBtn = document.getElementById('soulBack');
  if (soulBackBtn) soulBackBtn.style.display = 'block';

  body.style.display = 'flex';
  body.style.flexDirection = 'column';
  body.style.padding = '0';
  body.style.overflow = 'hidden';

  body.innerHTML = `
    <div class="soul-search">
      <div class="soul-search-icon">🌙</div>
      <div class="soul-search-title">Пока никто не онлайн</div>
      <div class="soul-search-sub">Попробуй позже или выбери другую тему</div>
      <button class="soul-search-cancel" id="soulBackToThemes">← К темам</button>
    </div>
  `;
  document.getElementById('soulBackToThemes').addEventListener('click', renderSoulThemes);
}

function openSoulChat() {
  const body = document.getElementById('soulBody');
  if (!body) return;
  const theme = soulState.selectedTheme;

  const soulBackBtn = document.getElementById('soulBack');
  if (soulBackBtn) soulBackBtn.style.display = 'none';

  body.style.display = 'flex';
  body.style.flexDirection = 'column';
  body.style.padding = '0';
  body.style.overflow = 'hidden';

  body.innerHTML = `
    <div class="soul-chat-header">
      <div class="soul-chat-theme">
        <span>${theme.icon}</span>
        <span>${theme.name}</span>
      </div>
      <button class="soul-chat-finish" id="soulFinish">🚪 Завершить</button>
    </div>
    <div class="soul-partner-name">Собеседник: ${soulState.partnerNick}</div>
    <div class="soul-messages" id="soulMessages">
      <div style="text-align:center; color:var(--screen-text-muted); font-size:14px; margin-top:40px;">Начни разговор первым 👋</div>
    </div>
    <div class="soul-input-area">
      <input type="text" class="soul-input" id="soulInput" placeholder="Сообщение..." maxlength="500">
      <button class="soul-send" id="soulSend">➤</button>
    </div>
  `;

  const input = document.getElementById('soulInput');
  const send = document.getElementById('soulSend');

  function trySend() {
    const text = input.value.trim();
    if (!text) return;
    sendSoulMessage(text);
    input.value = '';
    send.disabled = true;
  }

  input.addEventListener('input', () => { send.disabled = input.value.trim().length === 0; });
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') trySend(); });
  send.addEventListener('click', trySend);
  send.disabled = true;

  document.getElementById('soulFinish').addEventListener('click', finishSoulChat);
  setTimeout(() => input.focus(), 300);
}

function sendSoulMessage(text) {
  const messages = document.getElementById('soulMessages');
  if (!messages) return;

  const empty = messages.querySelector('div[style]');
  if (empty) empty.remove();

  const mine = document.createElement('div');
  mine.className = 'soul-msg me';
  mine.innerHTML = `${escapeHtml(text)}<div class="soul-msg-time">${getTime()}</div>`;
  messages.appendChild(mine);
  messages.scrollTop = messages.scrollHeight;

  if (soulState.isTest && !soulState.botAnswered) {
    soulState.botAnswered = true;
    setTimeout(() => {
      const theirs = document.createElement('div');
      theirs.className = 'soul-msg them';
      theirs.innerHTML = `🤖 Я тестовый бот. Но ты можешь представить, что я хороший слушатель.<div class="soul-msg-time">${getTime()}</div>`;
      messages.appendChild(theirs);
      messages.scrollTop = messages.scrollHeight;
      playNotificationSound();
    }, 1500);
  }
}

function finishSoulChat() {
  const body = document.getElementById('soulBody');
  if (!body) return;

  body.style.display = 'block';
  body.style.flexDirection = '';
  body.style.padding = '24px 20px 40px';
  body.style.overflowY = 'auto';
  body.style.overflow = '';

  body.innerHTML = `
    <div class="soul-final">
      <div class="soul-final-icon">💙</div>
      <div class="soul-final-title">Спасибо за разговор</div>
      <div class="soul-final-sub">Ты помог человеку</div>
      <div class="soul-final-question">Как тебе собеседник?</div>
      <div class="soul-rate-buttons">
        <button class="soul-rate-btn" data-rate="like">👍</button>
        <button class="soul-rate-btn" data-rate="love">❤️</button>
        <button class="soul-rate-btn" data-rate="thanks">🙏</button>
      </div>
      <button class="soul-final-back" id="soulFinalBack">← Вернуться к темам</button>
    </div>
  `;

  document.querySelectorAll('.soul-rate-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.classList.toggle('selected');
      playNotificationSound();
    });
  });

  document.getElementById('soulFinalBack').addEventListener('click', () => {
    const soulBackBtn = document.getElementById('soulBack');
    if (soulBackBtn) soulBackBtn.style.display = 'block';
    renderSoulThemes();
  });
}

function openSoulScreen(onClose) {
  soulState.currentUser = window.__currentUser;
  soulState.onClose = onClose || null;

  const el = createSoulScreen();
  requestAnimationFrame(() => el.classList.add('active'));

  const av = document.getElementById('soulAvatar');
  if (av) {
    const user = window.__currentUser;
    if (user && user.avatar) av.innerHTML = `<img src="${user.avatar}" alt="">`;
    else if (user && user.name) av.textContent = user.name.charAt(0).toUpperCase();
    else av.textContent = '?';
  }

  document.getElementById('soulBack').addEventListener('click', closeSoulScreen);
  if (av) av.addEventListener('click', () => alert('👤 Профиль — в разработке'));

  renderSoulThemes();
  document.addEventListener('keydown', soulEscHandler);
}

function soulEscHandler(e) {
  if (e.key === 'Escape') {
    const soulBackBtn = document.getElementById('soulBack');
    if (soulBackBtn && soulBackBtn.style.display === 'none') return;
    closeSoulScreen();
  }
}

function closeSoulScreen() {
  const el = document.getElementById('soulScreen');
  if (!el) return;

  if (soulState.searchTimer) { clearTimeout(soulState.searchTimer); soulState.searchTimer = null; }

  soulState.currentUser = null;
  soulState.selectedTheme = null;
  soulState.partnerNick = null;
  soulState.botAnswered = false;
  soulState.isTest = false;

  el.classList.remove('active');
  setTimeout(() => el.remove(), 350);
  document.removeEventListener('keydown', soulEscHandler);

  if (soulState.onClose) { soulState.onClose(); soulState.onClose = null; }
}