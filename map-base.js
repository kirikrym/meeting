"use strict";

const mapBaseState = {
  currentType: null, map: null, userMarker: null, otherMarkers: [], radiusCircle: null,
  sliderState: 'collapsed', radius: 1000, userLat: null, userLng: null, watchId: null,
  weather: null, nearbyUsers: [], currentUser: null, onClose: null, screenEl: null,
  requestTimer: null, requestTimeout: null, requestSecondsLeft: 60, requestTarget: null, requestCancelled: false
};

function createMapScreen(type, user, onClose) {
  const cfg = mapConfig[type];
  if (!cfg) return;

  mapBaseState.currentType = type;
  mapBaseState.currentUser = user;
  mapBaseState.onClose = onClose || null;
  mapBaseState.nearbyUsers = [];
  mapBaseState.sliderState = 'collapsed';
  mapBaseState.radius = 1000;

  const oldScreen = document.querySelector(`.${cfg.screenClass}`);
  if (oldScreen) oldScreen.remove();

  const el = document.createElement('div');
  el.className = cfg.screenClass;
  el.innerHTML = `
  <div class="${cfg.headerClass}">
    <button class="${cfg.backClass}" id="mapBack_${type}">← Назад</button>
    <span class="${cfg.logoClass}">📍 ${cfg.name}</span>
    <div class="${cfg.avatarClass}" id="mapAvatar_${type}"></div>
  </div>
  <div class="${cfg.screenClass.replace('-screen', '-map-wrapper')}" id="mapWrapper_${type}">
    <div id="${cfg.mapId}"></div>
  </div>
  <div class="${cfg.sliderClass}" id="mapSlider_${type}">
    <div class="${cfg.sliderHeaderClass}" id="mapSliderHeader_${type}">
      <div class="${cfg.sliderHandleClass}"></div>
      <div class="${cfg.sliderStatsClass}" id="mapStats_${type}"></div>
      <button class="create-request-btn" id="createRequestBtn_${type}">➕ Создать заявку</button>
    </div>
    <div class="${cfg.sliderBodyClass}" id="mapBody_${type}">
      <div class="carousel-view" id="carouselView_${type}"></div>
      <div class="form-view" id="formView_${type}"></div>
    </div>
  </div>
`;

  document.body.appendChild(el);
  mapBaseState.screenEl = el;
  requestAnimationFrame(() => el.classList.add('active'));

  const av = document.getElementById(`mapAvatar_${type}`);
  if (av) {
    if (user && user.avatar) av.innerHTML = `<img src="${user.avatar}" alt="">`;
    else if (user && user.name) av.textContent = user.name.charAt(0).toUpperCase();
    else av.textContent = '?';
  }

  document.getElementById(`mapBack_${type}`).addEventListener('click', closeMapScreen);
  if (av) av.addEventListener('click', () => alert('👤 Профиль — в разработке'));
  document.getElementById(`createRequestBtn_${type}`).addEventListener('click', () => openCreateRequestSheet(type));

  setupMapSliderGestures(type);
  startMapGeolocation(type);
  return el;
}

function startMapGeolocation(type) {
  if (!navigator.geolocation) return alert('❌ Браузер не поддерживает геолокацию');
  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      mapBaseState.userLat = pos.coords.latitude;
      mapBaseState.userLng = pos.coords.longitude;

      initMapBase(type, mapBaseState.userLat, mapBaseState.userLng);
      mapBaseState.weather = await fetchWeather(mapBaseState.userLat, mapBaseState.userLng);

      if (type === 'ride') generateMockRides(); else generateMockNearbyUsers(type);

      addRadiusCircle(type);
      addNearbyMarkers(type);
      renderMapSlider(type);

      mapBaseState.watchId = navigator.geolocation.watchPosition(
        (p) => {
          mapBaseState.userLat = p.coords.latitude;
          mapBaseState.userLng = p.coords.longitude;
          if (mapBaseState.userMarker) mapBaseState.userMarker.setLatLng([mapBaseState.userLat, mapBaseState.userLng]);
        }, () => {}, { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 }
      );
    },
    (err) => alert('⚠️ Не удалось получить геолокацию: ' + err.message),
    { enableHighAccuracy: true, timeout: 15000 }
  );
}

function initMapBase(type, lat, lng) {
  if (mapBaseState.map) { mapBaseState.map.remove(); mapBaseState.map = null; }
  const cfg = mapConfig[type];
  mapBaseState.map = L.map(cfg.mapId, { zoomControl: false, attributionControl: false }).setView([lat, lng], 14);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(mapBaseState.map);
  mapBaseState.userMarker = L.circleMarker([lat, lng], { radius: 9, fillColor: '#4D6CFF', color: '#fff', weight: 3, fillOpacity: 1 }).addTo(mapBaseState.map);
}

function addRadiusCircle(type) {
  if (!mapBaseState.map || !mapBaseState.userLat) return;
  if (mapBaseState.radiusCircle) mapBaseState.map.removeLayer(mapBaseState.radiusCircle);
  mapBaseState.radiusCircle = L.circle([mapBaseState.userLat, mapBaseState.userLng], {
    radius: mapBaseState.radius, color: '#6C5CE7', fillColor: '#6C5CE7', fillOpacity: 0.05, weight: 2, className: 'radius-circle'
  }).addTo(mapBaseState.map);
}

function generateMockNearbyUsers(type) {
  if (!mapBaseState.userLat) return;
  const count = 3 + Math.floor(Math.random() * 4);
  mapBaseState.nearbyUsers = [];
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * 2 * Math.PI;
    const distance = 0.002 + Math.random() * 0.008;
    mapBaseState.nearbyUsers.push({
      id: 'mock_' + type + '_' + i,
      firstName: MOCK_FIRST_NAMES[i % MOCK_FIRST_NAMES.length],
      lastName: MOCK_LAST_NAMES[i % MOCK_LAST_NAMES.length],
      age: MOCK_AGES[i % MOCK_AGES.length],
      avatar: null,
      lat: mapBaseState.userLat + Math.cos(angle) * distance,
      lng: mapBaseState.userLng + Math.sin(angle) * distance,
    });
  }
}

function generateMockRides() {
  if (!mapBaseState.userLat) return;
  const count = 3 + Math.floor(Math.random() * 3);
  mapBaseState.nearbyUsers = [];
  for (let i = 0; i < count; i++) {
    const car = MOCK_CARS[i % MOCK_CARS.length];
    const fromCity = RUSSIAN_CITIES[Math.floor(Math.random() * RUSSIAN_CITIES.length)];
    let toCity = RUSSIAN_CITIES[Math.floor(Math.random() * RUSSIAN_CITIES.length)];
    while (toCity === fromCity) toCity = RUSSIAN_CITIES[Math.floor(Math.random() * RUSSIAN_CITIES.length)];
    const angle = Math.random() * 2 * Math.PI;
    const distance = 0.005 + Math.random() * 0.02;
    mapBaseState.nearbyUsers.push({
      id: 'ride_' + i + '_' + Date.now(),
      firstName: MOCK_FIRST_NAMES[i % MOCK_FIRST_NAMES.length],
      lastName: MOCK_LAST_NAMES[i % MOCK_LAST_NAMES.length],
      age: 25 + Math.floor(Math.random() * 20),
      avatar: null,
      lat: mapBaseState.userLat + Math.cos(angle) * distance,
      lng: mapBaseState.userLng + Math.sin(angle) * distance,
      carBrand: car.brand, carColor: car.color, carPlate: car.plate,
      fromCity, toCity, freeSeats: 1 + Math.floor(Math.random() * 3), totalSeats: 4,
      price: 300 + Math.floor(Math.random() * 700), smoking: Math.random() < 0.3,
      pets: Math.random() < 0.5, cargo: Math.random() < 0.4,
    });
  }
}

function addNearbyMarkers(type) {
  if (!mapBaseState.map) return;
  mapBaseState.otherMarkers.forEach(m => mapBaseState.map.removeLayer(m));
  mapBaseState.otherMarkers = [];
  const cfg = mapConfig[type];
  mapBaseState.nearbyUsers.forEach((user) => {
    let inner = user.avatar ? `<img src="${user.avatar}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">` : `<span style="font-size:12px;font-weight:700;color:#fff;">${(user.firstName[0] || '') + (user.lastName[0] || '')}</span>`;
    const icon = L.divIcon({
      className: 'person-marker',
      html: `<div style="width:40px;height:40px;border-radius:50%;background:${cfg.color};border:2px solid #fff;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,0.4);overflow:hidden;">${inner}</div>`,
      iconSize: [40, 40], iconAnchor: [20, 20],
    });
    mapBaseState.otherMarkers.push(L.marker([user.lat, user.lng], { icon }).addTo(mapBaseState.map));
  });
}

function renderMapSlider(type) {
  const stats = document.getElementById(`mapStats_${type}`);
  const slider = document.getElementById(`mapSlider_${type}`);
  const createBtn = document.getElementById(`createRequestBtn_${type}`);
  if (!stats || !slider) return;

  slider.classList.remove('expanded', 'form-active');
  slider.style.height = '';
  mapBaseState.sliderState = 'collapsed';

  if (createBtn) createBtn.classList.remove('hidden');

  if (mapBaseState.weather) {
    stats.innerHTML = `<span class="stat-item">${mapBaseState.weather.icon} <b>${mapBaseState.weather.temp}°C</b></span><span class="stat-sep">·</span><span class="stat-item">${mapBaseState.weather.hint}</span>`;
  } else {
    stats.innerHTML = `<span class="stat-item">⏳ Загружаем погоду...</span>`;
  }

  if (type === 'walk' && typeof renderWalkBody === 'function') renderWalkBody();
  if (type === 'ride' && typeof renderRideBody === 'function') renderRideBody();
}

function setupMapSliderGestures(type) {
  const slider = document.getElementById(`mapSlider_${type}`);
  const header = document.getElementById(`mapSliderHeader_${type}`);
  if (!slider || !header) return;

  header.onclick = (e) => {
    if (e.target.closest('.create-request-btn')) return;
    if (slider.classList.contains('form-active')) { renderMapSlider(type); return; }
    if (mapBaseState.sliderState === 'collapsed') {
      mapBaseState.sliderState = 'expanded';
      slider.classList.add('expanded');
      slider.style.height = '45vh';
    } else {
      mapBaseState.sliderState = 'collapsed';
      slider.classList.remove('expanded');
      slider.style.height = '';
    }
  };
}

function closeMapScreen() {
  const type = mapBaseState.currentType;
  if (!type) return;
  const el = mapBaseState.screenEl;
  if (!el) return;

  if (mapBaseState.watchId) { navigator.geolocation.clearWatch(mapBaseState.watchId); mapBaseState.watchId = null; }
  if (mapBaseState.requestTimer) { clearInterval(mapBaseState.requestTimer); mapBaseState.requestTimer = null; }
  if (mapBaseState.requestTimeout) { clearTimeout(mapBaseState.requestTimeout); mapBaseState.requestTimeout = null; }

  if (mapBaseState.map) {
    mapBaseState.map.remove(); mapBaseState.map = null;
    mapBaseState.userMarker = null; mapBaseState.otherMarkers = []; mapBaseState.radiusCircle = null;
  }

  mapBaseState.currentType = null; mapBaseState.nearbyUsers = []; mapBaseState.userLat = null; mapBaseState.userLng = null;
  mapBaseState.weather = null; mapBaseState.sliderState = 'collapsed'; mapBaseState.radius = 1000;

  el.classList.remove('active');
  setTimeout(() => el.remove(), 350);
  mapBaseState.screenEl = null;
  if (mapBaseState.onClose) { mapBaseState.onClose(); mapBaseState.onClose = null; }
}

function expandMapRadius() {
  const typeKey = mapBaseState.currentType;
  if (!typeKey) return;
  if (mapBaseState.radius === 1000) mapBaseState.radius = 3000;
  else if (mapBaseState.radius === 3000) mapBaseState.radius = 5000;
  else if (mapBaseState.radius === 5000) mapBaseState.radius = 10000;
  else { alert('🔍 Максимальный радиус'); return; }

  if (mapBaseState.radiusCircle) mapBaseState.radiusCircle.setRadius(mapBaseState.radius);
  for (let i = 0; i < 3; i++) {
    const angle = Math.random() * 2 * Math.PI;
    const distance = 0.005 + Math.random() * 0.02;
    mapBaseState.nearbyUsers.push({
      id: 'mock_' + typeKey + '_extra_' + Date.now() + '_' + i,
      firstName: MOCK_FIRST_NAMES[Math.floor(Math.random() * MOCK_FIRST_NAMES.length)],
      lastName: MOCK_LAST_NAMES[Math.floor(Math.random() * MOCK_LAST_NAMES.length)],
      age: MOCK_AGES[Math.floor(Math.random() * MOCK_AGES.length)],
      avatar: null, lat: mapBaseState.userLat + Math.cos(angle) * distance, lng: mapBaseState.userLng + Math.sin(angle) * distance,
    });
  }
  addNearbyMarkers(typeKey);
  if (typeKey === 'walk' && typeof renderWalkBody === 'function') renderWalkBody();
  if (typeKey === 'ride' && typeof renderRideBody === 'function') renderRideBody();
  alert(`🔍 Радиус расширен до ${mapBaseState.radius / 1000} км`);
}

// ============================================================
// ЗАЯВКИ — ЛОГИКА
// ============================================================
function getMyRequest(type) {
  const key = type === 'walk' ? LS_MY_WALK_REQUEST : LS_MY_RIDE_REQUEST;
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
}

function saveMyRequest(type, req) {
  const key = type === 'walk' ? LS_MY_WALK_REQUEST : LS_MY_RIDE_REQUEST;
  try { localStorage.setItem(key, JSON.stringify(req)); } catch (e) {}
}

function clearMyRequest(type) {
  const key = type === 'walk' ? LS_MY_WALK_REQUEST : LS_MY_RIDE_REQUEST;
  try { localStorage.removeItem(key); } catch (e) {}
}

function generateMockResponses(type) {
  const req = getMyRequest(type);
  if (!req) return;
  const count = 1 + Math.floor(Math.random() * 3);
  const responses = [];
  for (let i = 0; i < count; i++) {
    responses.push({
      id: 'resp_' + type + '_' + Date.now() + '_' + i,
      firstName: MOCK_FIRST_NAMES[Math.floor(Math.random() * MOCK_FIRST_NAMES.length)],
      lastName: MOCK_LAST_NAMES[Math.floor(Math.random() * MOCK_LAST_NAMES.length)],
      age: MOCK_AGES[Math.floor(Math.random() * MOCK_AGES.length)],
      avatar: null, status: 'pending', createdAt: Date.now(), chat: []
    });
  }
  req.responses = responses;
  saveMyRequest(type, req);
  
  if (type === 'walk' && typeof renderWalkBody === 'function') renderWalkBody();
  if (type === 'ride' && typeof renderRideBody === 'function') renderRideBody();
  updateCardNotification();
  
  const overlay = document.getElementById('overlay');
  if (overlay && overlay.classList.contains('active')) {
    const list = document.getElementById(`responsesList_${type}`);
    if (list) renderResponsesList(type);
  }
}

function openCreateRequestSheet(type) {
  const existing = getMyRequest(type);
  if (existing) { openMyRequestModal(type); return; }

  const slider = document.getElementById(`mapSlider_${type}`);
  const formView = document.getElementById(`formView_${type}`);
  const stats = document.getElementById(`mapStats_${type}`);
  const createBtn = document.getElementById(`createRequestBtn_${type}`);
  if (!slider || !formView || !stats) return;

  slider.classList.add('form-active');
  if (createBtn) createBtn.classList.add('hidden');
  stats.innerHTML = `<span class="stat-item"><b>Создание заявки</b></span>`;

  if (type === 'walk') {
    formView.innerHTML = `
      <div class="form-field"><label>Что / куда</label><input type="text" id="walkFormWhat" placeholder="Прогуляться в парке" maxlength="60"></div>
      <div class="form-field">
        <label>Когда</label>
        <div class="chip-row" id="walkWhenChips">
          ${WALK_WHEN_OPTIONS.map(opt => `<button class="chip" data-when="${opt}">${opt}</button>`).join('')}
          <button class="chip" data-when="custom">Своё время</button>
        </div>
        <div id="walkWhenCustomWrap" style="display:none; margin-top:8px;"><input type="datetime-local" id="walkFormWhenCustom"></div>
      </div>
      
      <div class="form-field">
        <label>Групповая прогулка</label>
        <div class="chip-row" id="walkGroupChips">
          <button class="chip" data-group="true">Да</button>
          <button class="chip active" data-group="false">Нет</button>
        </div>
        <div id="walkGroupSizeWrap" style="display:none; margin-top:8px;">
          <select id="walkFormGroupSizeSelect">
            <option value="2">2 человека</option>
            <option value="3">3 человека</option>
            <option value="4">4 человека</option>
            <option value="5">5 человек</option>
          </select>
        </div>
      </div>

      <div class="form-field"><label>Радиус</label><select id="walkFormRadius">${WALK_RADII.map(r => `<option value="${r.value}">${r.label}</option>`).join('')}</select></div>
      <div class="form-field"><label>Комментарий <span class="optional">(необязательно)</span></label><textarea id="walkFormComment" placeholder="..." maxlength="140" rows="3"></textarea></div>
      <div class="form-field"><button class="btn-primary" id="createSubmitBtn" disabled style="width:100%;">Создать</button></div>
    `;
    setupWalkFormLogic();
  } else {
    formView.innerHTML = `
      <datalist id="citiesList">
        ${RUSSIAN_CITIES.map(c => `<option value="${c}">`).join('')}
      </datalist>
      <div class="form-row">
        <div class="form-field"><label>Откуда</label><input type="text" id="rideFormFrom" list="citiesList" placeholder="Например, Балашов" maxlength="40"></div>
        <div class="form-field"><label>Куда</label><input type="text" id="rideFormTo" list="citiesList" placeholder="Например, Балаково" maxlength="40"></div>
      </div>
      <div class="form-field">
        <label>Когда</label>
        <div class="chip-row" id="rideWhenChips">
          ${RIDE_WHEN_OPTIONS.map(opt => `<button class="chip" data-when="${opt}">${opt}</button>`).join('')}
          <button class="chip" data-when="custom">Своё время</button>
        </div>
        <div id="rideWhenCustomWrap" style="display:none; margin-top:8px;"><input type="datetime-local" id="rideFormWhenCustom"></div>
      </div>
      <div class="form-field"><label>Свободных мест</label><select id="rideFormSeats"><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option></select></div>
      <div class="form-field">
        <label>Цена</label>
        <div class="chip-row" id="ridePriceChips">
          <button class="chip" data-price="0">Бесплатно</button><button class="chip" data-price="500">500 ₽</button><button class="chip" data-price="1000">1000 ₽</button><button class="chip" data-price="custom">Своя</button>
        </div>
        <div id="ridePriceCustomWrap" style="display:none; margin-top:8px;"><input type="number" id="rideFormPriceCustom" min="0" placeholder="Своя цена, ₽"></div>
      </div>
      <div class="form-field"><label>Курить</label><div class="chip-row" id="rideSmokingChips"><button class="chip active" data-smoking="false">Нет</button><button class="chip" data-smoking="true">Да</button></div></div>
      <div class="form-field"><label>С животными</label><div class="chip-row" id="ridePetsChips"><button class="chip active" data-pets="false">Нет</button><button class="chip" data-pets="true">Да</button></div></div>
      <div class="form-field">
        <label>Груз</label>
        <div class="chip-row" id="rideCargoChips"><button class="chip active" data-cargo="false">Нет</button><button class="chip" data-cargo="true">Да</button></div>
        <div id="rideCargoWeightWrap" style="display:none; margin-top:8px;"><input type="number" id="rideFormCargoWeight" placeholder="Вес груза, кг" min="1" max="1000"></div>
      </div>
      <div class="form-row">
        <div class="form-field"><label>Марка</label><input type="text" id="rideFormCarBrand" placeholder="Kia Rio" maxlength="30"></div>
        <div class="form-field"><label>Цвет</label><input type="text" id="rideFormCarColor" placeholder="белая" maxlength="20"></div>
      </div>
      <div class="form-field"><label>Номер</label><input type="text" id="rideFormCarPlate" placeholder="А123БВ 777" maxlength="15"></div>
      <div class="form-field"><label>Комментарий <span class="optional">(необязательно)</span></label><textarea id="rideFormComment" placeholder="..." maxlength="140" rows="3"></textarea></div>
      <div class="form-field"><button class="btn-primary" id="createSubmitBtn" disabled style="width:100%;">Создать</button></div>
    `;
    setupRideFormLogic();
  }
}

function submitCreateRequest(type) {
  const req = type === 'walk' ? collectWalkForm() : collectRideForm();
  if (!req) return;
  req.type = type; req.id = type + '_my_' + Date.now(); req.createdAt = Date.now(); req.responses = [];
  saveMyRequest(type, req);
  
  renderMapSlider(type);
  updateCreateButton(type);
  updateCardNotification();
  
  setTimeout(() => generateMockResponses(type), 5000 + Math.random() * 10000);
}

function updateCreateButton(type) {
  const btn = document.getElementById(`createRequestBtn_${type}`);
  if (!btn) return;
  const req = getMyRequest(type);
  btn.textContent = req ? '📋 Моя заявка' : '➕ Создать заявку';
}

// ============================================================
// УПРАВЛЕНИЕ ЗАЯВКАМИ И ОТКЛИКАМИ
// ============================================================

function updateCardNotification() {
  const walkReq = getMyRequest('walk');
  const rideReq = getMyRequest('ride');
  
  const walkCard = document.querySelector('.card[data-card="walk"]');
  const rideCard = document.querySelector('.card[data-card="ride"]');

  if (walkCard) {
    if (walkReq) {
      const total = walkReq.groupSize || 1;
      const accepted = walkReq.responses ? walkReq.responses.filter(r => r.status === 'accepted').length : 0;
      const isFull = accepted >= total;

      walkCard.classList.add('has-request');
      walkCard.classList.toggle('is-full', isFull);
      walkCard.setAttribute('data-badge', isFull ? accepted : `${accepted}/${total}`);
    } else {
      walkCard.classList.remove('has-request', 'is-full');
      walkCard.removeAttribute('data-badge');
    }
  }

  if (rideCard) {
    if (rideReq) {
      const total = rideReq.freeSeats || 1;
      const accepted = rideReq.responses ? rideReq.responses.filter(r => r.status === 'accepted').length : 0;
      const isFull = accepted >= total;

      rideCard.classList.add('has-request');
      rideCard.classList.toggle('is-full', isFull);
      rideCard.setAttribute('data-badge', isFull ? accepted : `${accepted}/${total}`);
    } else {
      rideCard.classList.remove('has-request', 'is-full');
      rideCard.removeAttribute('data-badge');
    }
  }
}

function openMyRequestModal(type) {
  const req = getMyRequest(type);
  if (!req) return;

  const overlay = document.getElementById('overlay');
  const overlayContent = document.getElementById('overlayContent');
  
  let info = '';
  if (type === 'walk') {
      const total = req.groupSize || 1;
      const accepted = req.responses ? req.responses.filter(r => r.status === 'accepted').length : 0;
      info = `<div style="text-align:left; font-size:14px; color:var(--screen-text); margin-bottom:16px; background:var(--screen-bg); padding:12px; border-radius:14px;">
        <div>📍 ${req.what || '—'}</div>
        <div>⏰ ${req.when || '—'}</div>
        <div>👥 Собрано: ${accepted} из ${total}</div>
      </div>`;
  } else {
      const total = req.freeSeats || 1;
      const accepted = req.responses ? req.responses.filter(r => r.status === 'accepted').length : 0;
      info = `<div style="text-align:left; font-size:14px; color:var(--screen-text); margin-bottom:16px; background:var(--screen-bg); padding:12px; border-radius:14px;">
        <div>📍 ${req.fromCity} → ${req.toCity}</div>
        <div>⏰ ${req.when || '—'}</div>
        <div>💺 Собрано: ${accepted} из ${total} мест</div>
        <div>🚘 ${req.carBrand || 'Авто'}, ${req.carColor || ''}, ${req.carPlate || ''}</div>
      </div>`;
  }

  overlayContent.innerHTML = `
    <div class="card-preview" style="text-align: left;">
      <button class="card-preview-close" id="reqCloseBtn">✕</button>
      <div class="card-preview-icon" style="text-align:center;">${type === 'walk' ? '🚶' : '🚗'}</div>
      <div class="card-preview-title" style="text-align:center;">Моя заявка</div>
      
      ${info}
      
      <div style="font-size:15px; font-weight:600; color:var(--screen-text); margin-bottom:12px; border-top:1px solid var(--screen-border); padding-top:12px;">Отклики (${req.responses ? req.responses.length : 0})</div>
      <div id="responsesList_${type}" style="max-height: 220px; overflow-y:auto; margin-bottom:20px; padding: 4px;"></div>
      
      <button class="btn-primary" id="deleteRequestBtn_${type}" style="background:var(--danger); width:100%;">🗑️ Удалить заявку</button>
    </div>
  `;

  overlay.classList.add('active');
  renderResponsesList(type);

  document.getElementById('reqCloseBtn').addEventListener('click', closeOverlayGlobal);
  
  const overlayClickHandler = (e) => {
    if (e.target === overlay) {
      closeOverlayGlobal();
      overlay.removeEventListener('click', overlayClickHandler);
    }
  };
  overlay.addEventListener('click', overlayClickHandler);

  document.getElementById(`deleteRequestBtn_${type}`).addEventListener('click', () => {
    if (confirm('Удалить заявку?')) {
      clearMyRequest(type);
      closeOverlayGlobal();
      updateCreateButton(type);
      updateCardNotification();
      if (type === 'walk' && typeof renderWalkBody === 'function') renderWalkBody();
      if (type === 'ride' && typeof renderRideBody === 'function') renderRideBody();
    }
  });
}

function renderResponsesList(type) {
  const list = document.getElementById(`responsesList_${type}`);
  if (!list) return;
  const req = getMyRequest(type);
  if (!req) return;
  
  if (!req.responses || !req.responses.length) {
    list.innerHTML = `<div style="font-size:14px; color:var(--screen-text-muted); text-align:center; padding:10px;">Пока нет откликов</div>`;
    return;
  }

  const acceptedCount = req.responses.filter(r => r.status === 'accepted').length;
  const limit = type === 'walk' ? (req.groupSize || 1) : req.freeSeats; 
  const isFull = acceptedCount >= limit;

  let html = '';
  req.responses.forEach(r => {
    const isAccepted = r.status === 'accepted';
    
    let rowStyle = `display:flex; align-items:center; gap:10px; padding:12px 8px; border-bottom:1px solid var(--screen-border); transition:0.2s;`;
    if (isAccepted) {
      rowStyle = `display:flex; align-items:center; gap:10px; padding:12px 12px; margin-bottom:8px; border-radius:14px; background:rgba(108, 92, 231, 0.1); border:1px solid var(--accent); cursor:pointer; transition:0.2s;`;
    }

    html += `
      <div class="response-item ${isAccepted ? 'chat-clickable' : ''}" 
           data-chat-id="${isAccepted ? r.id : ''}"
           style="${rowStyle}"
           ${isAccepted ? 'onmouseover="this.style.background=\'rgba(108, 92, 231, 0.2)\'" onmouseout="this.style.background=\'rgba(108, 92, 231, 0.1)\'"' : ''}>
        <div class="person-avatar" style="width:40px; height:40px; font-size:14px; background:#6C5CE7; border-radius:50%; display:flex; align-items:center; justify-content:center; color:white; flex-shrink:0;">${r.avatar ? `<img src="${r.avatar}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">` : (r.firstName[0]||'')+(r.lastName[0]||'')}</div>
        <div style="flex:1; min-width:0;">
          <div style="font-size:14px; font-weight:600; color:var(--screen-text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${r.firstName} ${r.lastName}</div>
          <div style="font-size:12px; color:var(--screen-text-muted);">${r.age} лет</div>
        </div>
        <div style="display:flex; gap:6px; align-items:center;">
          ${r.status === 'pending' ? (
            isFull ? `<span style="font-size:12px; font-weight:600; color:var(--screen-text-muted);">Мест нет</span>` : `
              <button class="resp-btn accept" data-resp-accept="${r.id}" style="background:var(--success); color:#fff; border:none; border-radius:10px; width:36px; height:36px; font-size:16px; cursor:pointer; display:flex; align-items:center; justify-content:center;">✓</button>
              <button class="resp-btn decline" data-resp-decline="${r.id}" style="background:var(--danger); color:#fff; border:none; border-radius:10px; width:36px; height:36px; font-size:16px; cursor:pointer; display:flex; align-items:center; justify-content:center;">✕</button>
            `
          ) : isAccepted ? `
            <span style="font-size:14px; font-weight:600; color:var(--accent);">💬 Открыть чат</span>
          ` : ''}
        </div>
      </div>
    `;
  });
  list.innerHTML = html;
  
  list.querySelectorAll('[data-resp-accept]').forEach(btn => btn.addEventListener('click', (e) => {
    e.stopPropagation();
    acceptResponse(type, btn.dataset.respAccept);
  }));
  list.querySelectorAll('[data-resp-decline]').forEach(btn => btn.addEventListener('click', (e) => {
    e.stopPropagation();
    declineResponse(type, btn.dataset.respDecline);
  }));
  
  list.querySelectorAll('.chat-clickable').forEach(row => {
    row.addEventListener('click', () => {
      openChatScreen(type, row.dataset.chatId);
    });
  });
}

function acceptResponse(type, id) {
  const req = getMyRequest(type); if (!req) return;
  const resp = req.responses.find(r => r.id === id); if (!resp) return;
  
  const limit = type === 'walk' ? (req.groupSize || 1) : req.freeSeats; 
  const acceptedCount = req.responses.filter(r => r.status === 'accepted').length;

  if (acceptedCount >= limit) {
    alert('Вы уже набрали нужное количество людей!');
    return;
  }

  resp.status = 'accepted'; 
  saveMyRequest(type, req);
  
  renderResponsesList(type);
  updateCardNotification();
  
  // Обновляем инфу в модалке, чтобы счетчик "Собрано: X из Y" обновился
  const infoContainer = document.querySelector('#overlayContent .card-preview > div:nth-child(4)');
  if (infoContainer) {
      const total = type === 'walk' ? (req.groupSize || 1) : req.freeSeats;
      const newAccepted = req.responses.filter(r => r.status === 'accepted').length;
      if (type === 'walk') {
          infoContainer.innerHTML = `<div>📍 ${req.what || '—'}</div><div>⏰ ${req.when || '—'}</div><div>👥 Собрано: ${newAccepted} из ${total}</div>`;
      } else {
          infoContainer.innerHTML = `<div>📍 ${req.fromCity} → ${req.toCity}</div><div>⏰ ${req.when || '—'}</div><div>💺 Собрано: ${newAccepted} из ${total} мест</div><div>🚘 ${req.carBrand || 'Авто'}, ${req.carColor || ''}, ${req.carPlate || ''}</div>`;
      }
  }
}

function declineResponse(type, id) {
  const req = getMyRequest(type); if (!req) return;
  
  req.responses = req.responses.filter(r => r.id !== id);
  saveMyRequest(type, req);
  
  const list = document.getElementById(`responsesList_${type}`);
  if (list) {
    renderResponsesList(type);
    updateCardNotification();
    
    const searchDiv = document.createElement('div');
    searchDiv.id = `searchNewResp_${type}`;
    searchDiv.style = "text-align:center; color:var(--accent); padding:12px; font-size:13px; font-weight:600;";
    searchDiv.innerHTML = `<span style="display:inline-block; animation: spin 2s linear infinite;">⏳</span> Ищем нового собеседника...`;
    list.appendChild(searchDiv);

    setTimeout(() => {
      if (!document.getElementById(`responsesList_${type}`)) return;
      
      const newResp = {
        id: 'resp_' + type + '_' + Date.now(),
        firstName: MOCK_FIRST_NAMES[Math.floor(Math.random() * MOCK_FIRST_NAMES.length)],
        lastName: MOCK_LAST_NAMES[Math.floor(Math.random() * MOCK_LAST_NAMES.length)],
        age: MOCK_AGES[Math.floor(Math.random() * MOCK_AGES.length)],
        avatar: null, status: 'pending', createdAt: Date.now(), chat: []
      };
      req.responses.push(newResp);
      saveMyRequest(type, req);
      renderResponsesList(type);
      updateCardNotification();
      if (typeof playNotificationSound === 'function') playNotificationSound();
    }, 4000);
  }
}

function openChatScreen(type, respId) {
  let req = getMyRequest(type);
  if (!req) return;
  let resp = req.responses.find(r => r.id === respId);
  if (!resp) return;

  if (!resp.chat) resp.chat = [];
  saveMyRequest(type, req);

  const overlay = document.getElementById('overlay');
  const overlayContent = document.getElementById('overlayContent');

  overlayContent.innerHTML = `
    <div class="card-preview" style="padding:0; overflow:hidden; height:70vh; display:flex; flex-direction:column; width: 100%; max-width: 500px;">
      <div style="padding:16px; border-bottom:1px solid var(--screen-border); display:flex; align-items:center; gap:12px;">
        <button id="chatBackBtn" style="background:none; border:none; color:var(--accent); font-size:24px; cursor:pointer;">←</button>
        <div class="person-avatar" style="width:36px; height:36px; background:var(--accent); font-size:14px;">${resp.firstName[0]}</div>
        <div>
          <div style="font-weight:600; font-size:15px; color:var(--screen-text);">${resp.firstName} ${resp.lastName}</div>
          <div style="font-size:12px; color:var(--success);">Онлайн</div>
        </div>
      </div>
      <div id="chatMessages" style="flex:1; padding:16px; overflow-y:auto; display:flex; flex-direction:column; gap:8px; background:var(--screen-bg);"></div>
      <div style="padding:12px; border-top:1px solid var(--screen-border); display:flex; gap:8px;">
        <input type="text" id="chatInput" placeholder="Сообщение..." style="flex:1; padding:10px 16px; border-radius:20px; border:1px solid var(--screen-border); background:var(--screen-bg); color:var(--screen-text); outline:none;">
        <button id="chatSendBtn" style="width:40px; height:40px; border-radius:50%; background:var(--accent); border:none; color:#fff; cursor:pointer;">➤</button>
      </div>
    </div>
  `;

  const input = document.getElementById('chatInput');
  const sendBtn = document.getElementById('chatSendBtn');
  const messagesContainer = document.getElementById('chatMessages');

  function renderChat() {
    req = getMyRequest(type);
    resp = req.responses.find(r => r.id === respId);

    let html = '';
    if (resp.chat.length === 0) {
      const initialMsg = `Привет! Откуда начнем ${type === 'walk' ? 'прогулку' : 'поездку'}? 😊`;
      resp.chat.push({ text: initialMsg, isMe: false, time: getTime() });
      saveMyRequest(type, req);
    }
    
    resp.chat.forEach(msg => {
      html += `<div class="soul-msg ${msg.isMe ? 'me' : 'them'}">${escapeHtml(msg.text)}<div class="soul-msg-time">${msg.time}</div></div>`;
    });
    messagesContainer.innerHTML = html;
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  renderChat();

  function sendMessage() {
    const text = input.value.trim();
    if (!text) return;

    req = getMyRequest(type);
    resp = req.responses.find(r => r.id === respId);

    resp.chat.push({ text, isMe: true, time: getTime() });
    saveMyRequest(type, req);
    input.value = '';
    renderChat();

    setTimeout(() => {
      req = getMyRequest(type);
      resp = req.responses.find(r => r.id === respId);

      const reply = ['Отличная идея!', 'Я как раз собирался(ась) туда.', 'Давай через 15 минут?', 'Скинь геолокацию, где встретимся.'][Math.floor(Math.random() * 4)];
      resp.chat.push({ text: reply, isMe: false, time: getTime() });
      saveMyRequest(type, req);
      renderChat();
      if (typeof playNotificationSound === 'function') playNotificationSound();
    }, 1500);
  }

  sendBtn.onclick = sendMessage;
  input.onkeydown = (e) => { if (e.key === 'Enter') sendMessage(); };

  document.getElementById('chatBackBtn').onclick = () => {
    openMyRequestModal(type);
  };
}

function renderMyRequestCompact(type) {
  updateCardNotification();
}