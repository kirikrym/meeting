"use strict";

// ============================================================
// СПЕЦИФИКА "ПРОГУЛЯТЬСЯ"
// ============================================================

function renderWalkBody() {
  const type = 'walk';
  const body = document.getElementById(`mapBody_${type}`);
  if (!body) return;

  const users = mapBaseState.nearbyUsers;

  if (!users.length) {
    body.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🚶</div>
        <div class="empty-text">Пока никого нет рядом</div>
        <button class="btn-expand-radius" id="btnExpandRadiusWalk">
          🔍 Расширить радиус
        </button>
      </div>
    `;
    const btn = document.getElementById('btnExpandRadiusWalk');
    if (btn) btn.addEventListener('click', () => expandMapRadius());
    return;
  }

  let html = '';
  users.forEach(u => {
    const initials = (u.firstName[0] || '') + (u.lastName[0] || '');
    const avatarHtml = u.avatar
      ? `<img src="${u.avatar}" alt="">`
      : initials;

    html += `
      <div class="person-card" data-user-id="${u.id}">
        <div class="person-avatar">${avatarHtml}</div>
        <div class="person-info">
          <div class="person-name">${u.firstName} ${u.lastName}</div>
          <div class="person-age">${u.age} лет</div>
        </div>
        <button class="person-join-btn" data-join-id="${u.id}">🤝 Присоединиться</button>
      </div>
    `;
  });

  body.innerHTML = html;

  body.querySelectorAll('.person-join-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const userId = btn.dataset.joinId;
      const user = mapBaseState.nearbyUsers.find(u => u.id === userId);
      if (user) sendWalkJoinRequest(user);
    });
  });
}

// ============================================================
// ОТПРАВКА ЗАПРОСА "ПРИСОЕДИНИТЬСЯ"
// ============================================================
function sendWalkJoinRequest(user) {
  if (mapBaseState.requestTimer) return;

  mapBaseState.requestTarget = user;
  mapBaseState.requestSecondsLeft = mapConfig.walk.requestTimeoutSec;
  mapBaseState.requestCancelled = false;

  const stats = document.getElementById('mapStats_walk');
  const body = document.getElementById('mapBody_walk');
  if (!stats || !body) return;

  stats.innerHTML = `<span class="stat-item">⏳ <b>Ожидаем ответа</b></span>`;

  body.innerHTML = `
    <div class="loading-state">
      <div class="loading-icon">⏳</div>
      <div class="loading-text">
        Ждём ответа от ${user.firstName}...<br>
        <b id="walkTimer">${mapBaseState.requestSecondsLeft} сек</b>
      </div>
      <button class="btn-expand-radius" id="btnCancelWalkRequest" style="margin-top:16px;background:transparent;border:1.5px solid var(--screen-border);color:var(--screen-text);">
        ✕ Отменить
      </button>
    </div>
  `;

  const btnCancel = document.getElementById('btnCancelWalkRequest');
  if (btnCancel) btnCancel.addEventListener('click', cancelWalkJoinRequest);

  mapBaseState.requestTimer = setInterval(() => {
    mapBaseState.requestSecondsLeft--;
    const t = document.getElementById('walkTimer');
    if (t) t.textContent = mapBaseState.requestSecondsLeft + ' сек';
    if (mapBaseState.requestSecondsLeft <= 0) {
      clearInterval(mapBaseState.requestTimer);
      mapBaseState.requestTimer = null;
      showWalkTimeout(user);
    }
  }, 1000);

  // МОК: симуляция ответа через 3-5 секунд
  const delay = 3000 + Math.random() * 2000;
  mapBaseState.requestTimeout = setTimeout(() => {
    if (mapBaseState.requestCancelled) return;
    if (mapBaseState.requestTimer) {
      clearInterval(mapBaseState.requestTimer);
      mapBaseState.requestTimer = null;
    }
    if (Math.random() < 0.7) showWalkAccepted(user);
    else showWalkDeclined(user);
  }, delay);
}

function cancelWalkJoinRequest() {
  mapBaseState.requestCancelled = true;
  if (mapBaseState.requestTimer) { clearInterval(mapBaseState.requestTimer); mapBaseState.requestTimer = null; }
  if (mapBaseState.requestTimeout) { clearTimeout(mapBaseState.requestTimeout); mapBaseState.requestTimeout = null; }
  mapBaseState.requestTarget = null;

  const stats = document.getElementById('mapStats_walk');
  if (stats) renderMapSlider('walk');
  renderWalkBody();
}

function showWalkTimeout(user) {
  const body = document.getElementById('mapBody_walk');
  if (!body) return;
  body.innerHTML = `
    <div class="empty-state">
      <div class="empty-icon">😴</div>
      <div class="empty-text">${user.firstName} не ответил</div>
      <button class="btn-expand-radius" id="btnWalkBack">← Назад к списку</button>
    </div>
  `;
  document.getElementById('btnWalkBack').addEventListener('click', () => {
    renderMapSlider('walk');
    renderWalkBody();
  });
}

function showWalkAccepted(user) {
  const body = document.getElementById('mapBody_walk');
  const stats = document.getElementById('mapStats_walk');
  if (!body) return;
  if (stats) stats.innerHTML = `<span class="stat-item">✅ <b>Принято</b></span>`;
  body.innerHTML = `
    <div class="empty-state">
      <div class="empty-icon">🎉</div>
      <div class="empty-text">${user.firstName} принял!<br>Можно начинать прогулку</div>
      <button class="btn-expand-radius" id="btnWalkBack2">← Назад к списку</button>
    </div>
  `;
  document.getElementById('btnWalkBack2').addEventListener('click', () => {
    renderMapSlider('walk');
    renderWalkBody();
  });
}

function showWalkDeclined(user) {
  const body = document.getElementById('mapBody_walk');
  const stats = document.getElementById('mapStats_walk');
  if (!body) return;
  if (stats) stats.innerHTML = `<span class="stat-item">❌ <b>Отклонено</b></span>`;
  body.innerHTML = `
    <div class="empty-state">
      <div class="empty-icon">😔</div>
      <div class="empty-text">${user.firstName} не может сейчас</div>
      <button class="btn-expand-radius" id="btnWalkBack3">← Назад к списку</button>
    </div>
  `;
  document.getElementById('btnWalkBack3').addEventListener('click', () => {
    renderMapSlider('walk');
    renderWalkBody();
  });
}

// ============================================================
// ОТКРЫТИЕ ЭКРАНА "ПРОГУЛЯТЬСЯ"
// ============================================================
function openWalkScreen(onClose) {
  const user = window.__currentUser;
  createMapScreen('walk', user, onClose);

  setTimeout(() => {
    renderWalkBody();
  }, 500);
}