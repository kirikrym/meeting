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
  requestCancelled: false,
  currentIndex: 0
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
  mapBaseState.currentIndex = 0;

  const oldScreen = document.querySelector(`.${cfg.screenClass}`);
  if (oldScreen) oldScreen.remove();

  const el = document.createElement('div');
  el.className = cfg.screenClass;
  el.id = 'mapScreen_' + type;
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
      </div>
      <div class="${cfg.sliderBodyClass}" id="mapBody_${type}"></div>
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

      if (type === 'ride') {
        generateMockRides();
      } else {
        generateMockNearbyUsers(type);
      }

      addRadiusCircle(type);
      addNearbyMarkers(type);
      renderMapSlider(type);

      mapBaseState.watchId = navigator.geolocation.watchPosition(
        (p) => {
          mapBaseState.userLat = p.coords.latitude;
          mapBaseState.userLng = p.coords.longitude;
          if (mapBaseState.userMarker) {
            mapBaseState.userMarker.setLatLng([mapBaseState.userLat, mapBaseState.userLng]);
          }
        },
        () => {},
        { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 }
      );
    },
    (err) => {
      alert('⚠️ Не удалось получить геолокацию: ' + err.message);
    },
    { enableHighAccuracy: true, timeout: 15000 }
  );
}

function initMapBase(type, lat, lng) {
  if (mapBaseState.map) {
    mapBaseState.map.remove();
    mapBaseState.map = null;
  }

  const cfg = mapConfig[type];
  const mapId = cfg.mapId;

  mapBaseState.map = L.map(mapId, {
    zoomControl: false,
    attributionControl: false,
  }).setView([lat, lng], 14);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
  }).addTo(mapBaseState.map);

  mapBaseState.userMarker = L.circleMarker([lat, lng], {
    radius: 9,
    fillColor: '#4D6CFF',
    color: '#fff',
    weight: 3,
    fillOpacity: 1,
  }).addTo(mapBaseState.map);
}

function addRadiusCircle(type) {
  if (!mapBaseState.map || !mapBaseState.userLat) return;

  if (mapBaseState.radiusCircle) {
    mapBaseState.map.removeLayer(mapBaseState.radiusCircle);
  }

  mapBaseState.radiusCircle = L.circle(
    [mapBaseState.userLat, mapBaseState.userLng],
    {
      radius: mapBaseState.radius,
      color: '#6C5CE7',
      fillColor: '#6C5CE7',
      fillOpacity: 0.05,
      weight: 2,
      className: 'radius-circle',
    }
  ).addTo(mapBaseState.map);
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

function addNearbyMarkers(type) {
  if (!mapBaseState.map) return;

  mapBaseState.otherMarkers.forEach(m => mapBaseState.map.removeLayer(m));
  mapBaseState.otherMarkers = [];

  const cfg = mapConfig[type];

  mapBaseState.nearbyUsers.forEach((user) => {
    let inner = '';
    if (user.avatar) {
      inner = `<img src="${user.avatar}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
    } else {
      const initials = (user.firstName[0] || '') + (user.lastName[0] || '');
      inner = `<span style="font-size:12px;font-weight:700;color:#fff;">${initials}</span>`;
    }

    const icon = L.divIcon({
      className: 'person-marker',
      html: `<div style="
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: ${cfg.color};
        border: 2px solid #fff;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 12px rgba(0,0,0,0.4);
        overflow: hidden;
      ">${inner}</div>`,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });

    const marker = L.marker([user.lat, user.lng], { icon }).addTo(mapBaseState.map);
    mapBaseState.otherMarkers.push(marker);
  });
}

function renderMapSlider(type) {
  const stats = document.getElementById(`mapStats_${type}`);
  const body = document.getElementById(`mapBody_${type}`);
  const slider = document.getElementById(`mapSlider_${type}`);
  if (!stats || !body || !slider) return;

  slider.classList.remove('expanded');

  const weather = mapBaseState.weather;
  if (weather) {
    stats.innerHTML = `
      <span class="stat-item">${weather.icon} <b>${weather.temp}°C</b></span>
      <span class="stat-sep">·</span>
      <span class="stat-item">${weather.hint}</span>
    `;
  } else {
    stats.innerHTML = `<span class="stat-item">⏳ Загружаем погоду...</span>`;
  }

  body.innerHTML = '';

  if (type === 'walk' && typeof renderWalkBody === 'function') renderWalkBody();
  if (type === 'ride' && typeof renderRideBody === 'function') renderRideBody();
}

function setupMapSliderGestures(type) {
  const slider = document.getElementById(`mapSlider_${type}`);
  const header = document.getElementById(`mapSliderHeader_${type}`);
  if (!slider || !header) return;

  function setState(s) {
    mapBaseState.sliderState = s;
    slider.classList.remove('expanded');
    if (s === 'expanded') slider.classList.add('expanded');
    slider.style.height = s === 'expanded' ? '45vh' : '85px';
  }

  setState('collapsed');

  header.addEventListener('click', () => {
    if (mapBaseState.sliderState === 'collapsed') setState('expanded');
    else setState('collapsed');
  });
}

function closeMapScreen() {
  const type = mapBaseState.currentType;
  if (!type) return;

  const el = mapBaseState.screenEl;
  if (!el) return;

  if (mapBaseState.watchId) {
    navigator.geolocation.clearWatch(mapBaseState.watchId);
    mapBaseState.watchId = null;
  }

  if (mapBaseState.requestTimer) { clearInterval(mapBaseState.requestTimer); mapBaseState.requestTimer = null; }
  if (mapBaseState.requestTimeout) { clearTimeout(mapBaseState.requestTimeout); mapBaseState.requestTimeout = null; }

  if (mapBaseState.map) {
    mapBaseState.map.remove();
    mapBaseState.map = null;
    mapBaseState.userMarker = null;
    mapBaseState.otherMarkers = [];
    mapBaseState.radiusCircle = null;
  }

  mapBaseState.currentType = null;
  mapBaseState.nearbyUsers = [];
  mapBaseState.userLat = null;
  mapBaseState.userLng = null;
  mapBaseState.weather = null;
  mapBaseState.sliderState = 'collapsed';
  mapBaseState.radius = 1000;
  mapBaseState.currentIndex = 0;

  el.classList.remove('active');
  setTimeout(() => el.remove(), 350);
  mapBaseState.screenEl = null;

  if (mapBaseState.onClose) {
    mapBaseState.onClose();
    mapBaseState.onClose = null;
  }
}

function expandMapRadius() {
  const typeKey = mapBaseState.currentType;
  if (!typeKey) return;

  if (mapBaseState.radius === 1000) mapBaseState.radius = 3000;
  else if (mapBaseState.radius === 3000) mapBaseState.radius = 5000;
  else if (mapBaseState.radius === 5000) mapBaseState.radius = 10000;
  else {
    alert('🔍 Максимальный радиус');
    return;
  }

  if (mapBaseState.radiusCircle) {
    mapBaseState.radiusCircle.setRadius(mapBaseState.radius);
  }

  const extraCount = 3;
  for (let i = 0; i < extraCount; i++) {
    const angle = Math.random() * 2 * Math.PI;
    const distance = 0.005 + Math.random() * 0.02;

    mapBaseState.nearbyUsers.push({
      id: 'mock_' + typeKey + '_extra_' + Date.now() + '_' + i,
      firstName: MOCK_FIRST_NAMES[Math.floor(Math.random() * MOCK_FIRST_NAMES.length)],
      lastName: MOCK_LAST_NAMES[Math.floor(Math.random() * MOCK_LAST_NAMES.length)],
      age: MOCK_AGES[Math.floor(Math.random() * MOCK_AGES.length)],
      avatar: null,
      lat: mapBaseState.userLat + Math.cos(angle) * distance,
      lng: mapBaseState.userLng + Math.sin(angle) * distance,
    });
  }

  addNearbyMarkers(typeKey);

  if (typeKey === 'walk' && typeof renderWalkBody === 'function') renderWalkBody();
  if (typeKey === 'ride' && typeof renderRideBody === 'function') renderRideBody();

  alert(`🔍 Радиус расширен до ${mapBaseState.radius / 1000} км`);
}

function generateMockRides() {
  if (!mapBaseState.userLat) return;

  const count = 3 + Math.floor(Math.random() * 3);
  mapBaseState.nearbyUsers = [];

  for (let i = 0; i < count; i++) {
    const car = MOCK_CARS[i % MOCK_CARS.length];
    const fromCity = MOCK_CITIES[Math.floor(Math.random() * MOCK_CITIES.length)];
    let toCity = MOCK_CITIES[Math.floor(Math.random() * MOCK_CITIES.length)];
    while (toCity === fromCity) {
      toCity = MOCK_CITIES[Math.floor(Math.random() * MOCK_CITIES.length)];
    }

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
      carBrand: car.brand,
      carColor: car.color,
      carPlate: car.plate,
      fromCity: fromCity,
      toCity: toCity,
      freeSeats: 1 + Math.floor(Math.random() * 3),
      totalSeats: 4,
      price: 300 + Math.floor(Math.random() * 700),
      smoking: Math.random() < 0.3,
      pets: Math.random() < 0.5,
      cargo: Math.random() < 0.4,
    });
  }
}