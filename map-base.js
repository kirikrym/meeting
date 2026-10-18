"use strict";

const mapBaseState = {
  currentType: null,
  map: null,
  userMarker: null,
  otherMarkers: [],
  radiusCircle: null,
  sliderState: 'collapsed',
  radius: 1000,
  userLat: null,
  userLng: null,
  watchId: null,
  weather: null,
  nearbyUsers: [],
  currentUser: null,
  onClose: null,
  screenEl: null,
  requestTimer: null,
  requestTimeout: null,
  requestSecondsLeft: 60,
  requestTarget: null,
  requestCancelled: false
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
  if (!navigator.geolocation) {
    alert('❌ Браузер не поддерживает геолокацию');
    return;
  }

  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      mapBaseState.userLat = pos.coords.latitude;
      mapBaseState.userLng = pos.coords.longitude;

      initMapBase(type, mapBaseState.userLat, mapBaseState.userLng);
      mapBaseState.weather = await fetchWeather(mapBaseState.userLat, mapBaseState.userLng);

      if (type === 'ride') generateMockRides();
      else generateMockNearbyUsers(type);

      addRadiusCircle(type);
      addNearbyMarkers(type);
      renderMapSlider(type);

      mapBaseState.watchId = navigator.geolocation.watchPosition(
        (p) => {
          mapBaseState.userLat = p.coords.latitude;
          mapBaseState.userLng = p.coords.longitude;
          if (mapBaseState.userMarker) mapBaseState.userMarker.setLatLng([mapBaseState.userLat, mapBaseState.userLng]);
        },
        () => {}, { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 }
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
    const fromCity = MOCK_CITIES[Math.floor(Math.random() * MOCK_CITIES.length)];
    let toCity = MOCK_CITIES[Math.floor(Math.random() * MOCK_CITIES.length)];
    while (toCity === fromCity) toCity = MOCK_CITIES[Math.floor(Math.random() * MOCK_CITIES.length)];
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
    if (slider.classList.contains('form-active')) {
      renderMapSlider(type);
      return;
    }
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
  const extraCount = 3;
  for (let i = 0; i < extraCount; i++) {
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
      avatar: null, status: 'pending', createdAt: Date.now()
    });
  }
  req.responses = responses;
  saveMyRequest(type, req);
  
  if (type === 'walk' && typeof renderWalkBody === 'function') renderWalkBody();
  if (type === 'ride' && typeof renderRideBody === 'function') renderRideBody();
  renderMyRequestCompact(type);
  
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
      <div class="form-field"><label>Радиус</label><select id="walkFormRadius">${WALK_RADII.map(r => `<option value="${r.value}">${r.label}</option>`).join('')}</select></div>
      <div class="form-field"><label>Комментарий <span class="optional">(необязательно)</span></label><textarea id="walkFormComment" placeholder="..." maxlength="140" rows="3"></textarea></div>
      <div class="form-field"><button class="btn-primary" id="createSubmitBtn" disabled style="width:100%;">Создать</button></div>
    `;
    setupWalkFormLogic();
  } else {
    formView.innerHTML = `
      <div class="form-row">
        <div class="form-field"><label>Откуда</label><select id="rideFormFrom">${MOCK_CITIES.map(c => `<option value="${c}">${c}</option>`).join('')}</select></div>
        <div class="form-field"><label>Куда</label><select id="rideFormTo">${MOCK_CITIES.map(c => `<option value="${c}">${c}</option>`).join('')}</select></div>
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
  
  if (type === 'walk' && typeof renderWalkBody === 'function') renderWalkBody();
  if (type === 'ride' && typeof renderRideBody === 'function') renderRideBody();
  
  renderMyRequestCompact(type);
  
  setTimeout(() => generateMockResponses(type), 5000 + Math.random() * 10000);
}

function updateCreateButton(type) {
  const btn = document.getElementById(`createRequestBtn_${type}`);
  if (!btn) return;
  const req = getMyRequest(type);
  btn.textContent = req ? '📋 Моя заявка' : '➕ Создать заявку';
}

// ============================================================
// МОДАЛКА МОЕЙ ЗАЯВКИ (СТИЛЬ CARD-PREVIEW) И КАПЕЛЬКА
// ============================================================

function updateHeaderCapsule() {
  const walkReq = getMyRequest('walk');
  const rideReq = getMyRequest('ride');
  const capsule = document.getElementById('headerCapsule');
  const capsuleText = document.getElementById('capsuleText');
  if (!capsule || !capsuleText) return;

  let activeReq = null;
  let type = '';
  let title = '';
  let icon = '';

  // Приоритет отдаем прогулке, если есть только попутчики - покажем их
  if (walkReq) {
    activeReq = walkReq;
    type = 'walk';
    title = 'Прогулка';
    icon = '🚶';
  } else if (rideReq) {
    activeReq = rideReq;
    type = 'ride';
    title = 'Попутчики';
    icon = '🚗';
  }

  if (activeReq) {
    capsule.classList.remove('hidden');
    
    const pending = activeReq.responses ? activeReq.responses.filter(r => r.status === 'pending').length : 0;
    const badge = pending > 0 ? `💬 ${pending}` : `⏳ Ждём`;

    // Собираем красивую капельку с иконкой, названием и бейджем
    capsuleText.innerHTML = `
      <span>${icon}</span> 
      <span>${title}</span> 
      <span class="capsule-badge">${badge}</span>
    `;
    
    capsule.onclick = () => openMyRequestModal(type);
  } else {
    capsule.classList.add('hidden');
  }
}

function openMyRequestModal(type) {
  const req = getMyRequest(type);
  if (!req) return;

  const overlay = document.getElementById('overlay');
  const overlayContent = document.getElementById('overlayContent');
  
  let info = '';
  if (type === 'walk') {
      info = `<div style="text-align:left; font-size:14px; color:var(--screen-text); margin-bottom:16px; background:var(--screen-bg); padding:12px; border-radius:14px;">
        <div>📍 ${req.what || '—'}</div>
        <div>⏰ ${req.when || '—'}</div>
      </div>`;
  } else {
      info = `<div style="text-align:left; font-size:14px; color:var(--screen-text); margin-bottom:16px; background:var(--screen-bg); padding:12px; border-radius:14px;">
        <div>📍 ${req.fromCity} → ${req.toCity}</div>
        <div>⏰ ${req.when || '—'}</div>
        <div>💺 Мест: ${req.freeSeats} из ${req.totalSeats} · 💰 ${req.price === 0 ? 'Бесплатно' : req.price + ' ₽'}</div>
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
      <div id="responsesList_${type}" style="max-height: 220px; overflow-y:auto; margin-bottom:20px; padding-right:4px;"></div>
      
      <button class="btn-primary" id="deleteRequestBtn_${type}" style="background:var(--danger); width:100%;">🗑️ Удалить заявку</button>
    </div>
  `;

  overlay.classList.add('active');
  
  renderResponsesList(type);

  document.getElementById('reqCloseBtn').addEventListener('click', closeOverlayGlobal);
  
  // Чтобы избежать бага с {once:true} при клике по контенту, вешаем обычный обработчик
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
      if (type === 'walk' && typeof renderWalkBody === 'function') renderWalkBody();
      if (type === 'ride' && typeof renderRideBody === 'function') renderRideBody();
      renderMyRequestCompact(type);
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

  let html = '';
  req.responses.forEach(r => {
    const statusText = r.status === 'accepted' ? '✅ Принят' : r.status === 'declined' ? '❌ Отклонён' : '';
    
    html += `
      <div class="response-item" style="display:flex; align-items:center; gap:10px; padding:12px 0; border-bottom:1px solid var(--screen-border);">
        <div class="person-avatar" style="width:40px; height:40px; font-size:14px; background:#6C5CE7; border-radius:50%; display:flex; align-items:center; justify-content:center; color:white; flex-shrink:0;">${r.avatar ? `<img src="${r.avatar}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">` : (r.firstName[0]||'')+(r.lastName[0]||'')}</div>
        <div style="flex:1; min-width:0;">
          <div style="font-size:14px; font-weight:600; color:var(--screen-text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${r.firstName} ${r.lastName}</div>
          <div style="font-size:12px; color:var(--screen-text-muted);">${r.age} лет</div>
        </div>
        <div style="display:flex; gap:6px; align-items:center;">
          ${r.status === 'pending' ? `
            <button class="resp-btn accept" data-resp-accept="${r.id}" style="background:var(--success); color:#fff; border:none; border-radius:10px; width:36px; height:36px; font-size:16px; cursor:pointer; display:flex; align-items:center; justify-content:center;">✓</button>
            <button class="resp-btn decline" data-resp-decline="${r.id}" style="background:var(--danger); color:#fff; border:none; border-radius:10px; width:36px; height:36px; font-size:16px; cursor:pointer; display:flex; align-items:center; justify-content:center;">✕</button>
          ` : `<span style="font-size:12px; font-weight:600; color:${r.status === 'accepted' ? 'var(--success)' : 'var(--danger)'};">${statusText}</span>`}
        </div>
      </div>
    `;
  });
  list.innerHTML = html;
  
  list.querySelectorAll('[data-resp-accept]').forEach(btn => btn.addEventListener('click', () => acceptResponse(type, btn.dataset.respAccept)));
  list.querySelectorAll('[data-resp-decline]').forEach(btn => btn.addEventListener('click', () => declineResponse(type, btn.dataset.respDecline)));
}

function acceptResponse(type, id) {
  const req = getMyRequest(type); if (!req) return;
  const resp = req.responses.find(r => r.id === id); if (!resp) return;
  resp.status = 'accepted'; saveMyRequest(type, req);
  renderResponsesList(type); renderMyRequestCompact(type);
}

function declineResponse(type, id) {
  const req = getMyRequest(type); if (!req) return;
  const resp = req.responses.find(r => r.id === id); if (!resp) return;
  resp.status = 'declined'; saveMyRequest(type, req);
  renderResponsesList(type); renderMyRequestCompact(type);
}

function renderMyRequestCompact(type) {
  const container = document.getElementById('myRequestsContainer');
  if (!container) return;
  const old = document.getElementById(`myReqCompact_${type}`);
  if (old) old.remove();
  const req = getMyRequest(type);
  if (!req) {
    updateHeaderCapsule();
    return;
  }

  const pendingCount = req.responses ? req.responses.filter(r => r.status === 'pending').length : 0;
  const acceptedCount = req.responses ? req.responses.filter(r => r.status === 'accepted').length : 0;
  let summary = type === 'walk' ? `${req.what || 'Прогулка'} · ${req.when || ''}` : `${req.fromCity} → ${req.toCity} · ${req.price === 0 ? 'Бесплатно' : req.price + ' ₽'}`;
  let badge = acceptedCount > 0 ? `✅ Договорились` : pendingCount > 0 ? `💬 ${pendingCount}` : `⏳ Ждём`;

  const card = document.createElement('div');
  card.className = 'my-request-compact';
  card.id = `myReqCompact_${type}`;
  card.innerHTML = `<div class="my-req-icon">${type === 'walk' ? '🚶' : '🚗'}</div><div class="my-req-text"><div class="my-req-title">${type === 'walk' ? 'Прогуляться' : 'Попутчики'}</div><div class="my-req-summary">${summary}</div></div><div class="my-req-badge">${badge}</div>`;
  card.addEventListener('click', () => openMyRequestModal(type));
  container.appendChild(card);
  
  updateHeaderCapsule();
}