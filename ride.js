"use strict";

// ============================================================
// СПЕЦИФИКА "ПОПУТЧИКИ"
// ============================================================

function renderRideBody() {
  const type = 'ride';
  const body = document.getElementById(`mapBody_${type}`);
  if (!body) return;

  const rides = mapBaseState.nearbyUsers;

  if (!rides.length) {
    body.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🚗</div>
        <div class="empty-text">Пока нет машин рядом</div>
        <button class="btn-expand-radius" id="btnExpandRadiusRide">
          🔍 Расширить радиус
        </button>
      </div>
    `;
    const btn = document.getElementById('btnExpandRadiusRide');
    if (btn) btn.addEventListener('click', () => expandMapRadius());
    return;
  }

  let html = '';
  rides.forEach(r => {
    const initials = (r.firstName[0] || '') + (r.lastName[0] || '');
    const avatarHtml = r.avatar
      ? `<img src="${r.avatar}" alt="">`
      : initials;

    html += `
      <div class="ride-card" data-ride-id="${r.id}" style="
        background: var(--screen-bg);
        border: 1px solid var(--screen-border);
        border-radius: 16px;
        padding: 14px;
        margin-bottom: 12px;
        cursor: pointer;
        transition: 0.2s;
      ">
        <div style="display:flex; align-items:center; gap:12px; margin-bottom:12px;">
          <div class="person-avatar" style="background:#4D6CFF;">${avatarHtml}</div>
          <div class="person-info" style="flex:1; min-width:0;">
            <div class="person-name">${r.firstName} ${r.lastName}, ${r.age}</div>
            <div class="person-age" style="color:#4D6CFF; font-weight:600;">
              🚘 ${r.carBrand}, ${r.carColor}
            </div>
          </div>
        </div>

        <div style="font-size:14px; color:var(--screen-text); margin-bottom:8px; line-height:1.6;">
          <div>📍 ${r.fromCity} → ${r.toCity}</div>
        </div>

        <div style="display:flex; justify-content:space-between; font-size:13px; color:var(--screen-text-muted); margin-bottom:10px;">
          <span>👥 Свободно: ${r.freeSeats} из ${r.totalSeats}</span>
          <span>🚬 ${r.smoking ? 'Курить' : 'Без курения'}</span>
        </div>

        <div style="display:flex; justify-content:space-between; font-size:13px; color:var(--screen-text-muted); margin-bottom:12px;">
          <span>🐾 ${r.pets ? 'С животными' : 'Без животных'}</span>
          <span>📦 ${r.cargo ? 'С грузом' : 'Без груза'}</span>
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div style="font-size:18px; font-weight:700; color:#FF9F43;">${r.price} ₽</div>
          <button class="person-join-btn" style="background:#4D6CFF;" data-ride-join="${r.id}">
            💺 Купить место
          </button>
        </div>
      </div>
    `;
  });

  body.innerHTML = html;

  body.querySelectorAll('.person-join-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const rideId = btn.dataset.rideJoin;
      const ride = mapBaseState.nearbyUsers.find(r => r.id === rideId);
      if (ride) sendRideJoinRequest(ride);
    });
  });
}

// ============================================================
// ОТПРАВКА ЗАПРОСА НА ПОКУПКУ МЕСТА (5 минут)
// ============================================================
function sendRideJoinRequest(ride) {
  if (mapBaseState.requestTimer) return;

  mapBaseState.requestTarget = ride;
  mapBaseState.requestSecondsLeft = mapConfig.ride.requestTimeoutSec;
  mapBaseState.requestCancelled = false;

  const stats = document.getElementById('mapStats_ride');
  const body = document.getElementById('mapBody_ride');
  if (!stats || !body) return;

  stats.innerHTML = `<span class="stat-item">⏳ <b>Ожидаем ответа водителя</b></span>`;

  const mm = Math.floor(mapBaseState.requestSecondsLeft / 60);
  const ss = String(mapBaseState.requestSecondsLeft % 60).padStart(2, '0');

  body.innerHTML = `
    <div class="loading-state">
      <div class="loading-icon">⏳</div>
      <div class="loading-text">
        Запрос отправлен ${ride.firstName}...<br>
        <b id="rideTimer">${mm}:${ss}</b>
      </div>
      <button class="btn-expand-radius" id="btnCancelRideRequest" style="margin-top:16px;background:transparent;border:1.5px solid var(--screen-border);color:var(--screen-text);">
        ✕ Отменить
      </button>
    </div>
  `;

  const btnCancel = document.getElementById('btnCancelRideRequest');
  if (btnCancel) btnCancel.addEventListener('click', cancelRideJoinRequest);

  mapBaseState.requestTimer = setInterval(() => {
    mapBaseState.requestSecondsLeft--;
    const t = document.getElementById('rideTimer');
    if (t) {
      const min = Math.floor(mapBaseState.requestSecondsLeft / 60);
      const sec = mapBaseState.requestSecondsLeft % 60;
      t.textContent = `${min}:${String(sec).padStart(2, '0')}`;
    }
    if (mapBaseState.requestSecondsLeft <= 0) {
      clearInterval(mapBaseState.requestTimer);
      mapBaseState.requestTimer = null;
      showRideTimeout(ride);
    }
  }, 1000);

  // МОК: симуляция ответа через 5-8 секунд
  const delay = 5000 + Math.random() * 3000;
  mapBaseState.requestTimeout = setTimeout(() => {
    if (mapBaseState.requestCancelled) return;
    if (mapBaseState.requestTimer) {
      clearInterval(mapBaseState.requestTimer);
      mapBaseState.requestTimer = null;
    }
    if (Math.random() < 0.7) showRideAccepted(ride);
    else showRideDeclined(ride);
  }, delay);
}

function cancelRideJoinRequest() {
  mapBaseState.requestCancelled = true;
  if (mapBaseState.requestTimer) { clearInterval(mapBaseState.requestTimer); mapBaseState.requestTimer = null; }
  if (mapBaseState.requestTimeout) { clearTimeout(mapBaseState.requestTimeout); mapBaseState.requestTimeout = null; }
  mapBaseState.requestTarget = null;

  const stats = document.getElementById('mapStats_ride');
  if (stats) renderMapSlider('ride');
  renderRideBody();
}

function showRideTimeout(ride) {
  const body = document.getElementById('mapBody_ride');
  if (!body) return;
  body.innerHTML = `
    <div class="empty-state">
      <div class="empty-icon">😴</div>
      <div class="empty-text">${ride.firstName} не ответил</div>
      <button class="btn-expand-radius" id="btnRideBack">← Назад к списку</button>
    </div>
  `;
  document.getElementById('btnRideBack').addEventListener('click', () => {
    renderMapSlider('ride');
    renderRideBody();
  });
}

function showRideAccepted(ride) {
  const body = document.getElementById('mapBody_ride');
  const stats = document.getElementById('mapStats_ride');
  if (!body) return;
  if (stats) stats.innerHTML = `<span class="stat-item">✅ <b>Место куплено</b></span>`;
  body.innerHTML = `
    <div class="empty-state">
      <div class="empty-icon">🎉</div>
      <div class="empty-text">
        ${ride.firstName} принял!<br>
        Номер машины: <b>${ride.carPlate}</b><br>
        📍 ${ride.fromCity} → ${ride.toCity}
      </div>
      <button class="btn-expand-radius" id="btnRideBack2">← Назад к списку</button>
    </div>
  `;
  document.getElementById('btnRideBack2').addEventListener('click', () => {
    renderMapSlider('ride');
    renderRideBody();
  });
}

function showRideDeclined(ride) {
  const body = document.getElementById('mapBody_ride');
  const stats = document.getElementById('mapStats_ride');
  if (!body) return;
  if (stats) stats.innerHTML = `<span class="stat-item">❌ <b>Отклонено</b></span>`;
  body.innerHTML = `
    <div class="empty-state">
      <div class="empty-icon">😔</div>
      <div class="empty-text">${ride.firstName} не может сейчас</div>
      <button class="btn-expand-radius" id="btnRideBack3">← Назад к списку</button>
    </div>
  `;
  document.getElementById('btnRideBack3').addEventListener('click', () => {
    renderMapSlider('ride');
    renderRideBody();
  });
}

// ============================================================
// ОТКРЫТИЕ ЭКРАНА "ПОПУТЧИКИ"
// ============================================================
function openRideScreen(onClose) {
  const user = window.__currentUser;
  createMapScreen('ride', user, onClose);

  setTimeout(() => {
    // Пересоздаём мок-данные для попутчиков
    if (typeof generateMockRides === 'function') generateMockRides();
    if (mapBaseState.map) addNearbyMarkers('ride');
    renderRideBody();
  }, 500);
}