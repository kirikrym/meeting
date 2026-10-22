"use strict";

function renderRideBody() {
  const type = 'ride';
  const carousel = document.getElementById(`carouselView_${type}`);
  if (!carousel) return;

  const rides = mapBaseState.nearbyUsers;

  if (!rides.length) {
    carousel.innerHTML = `<div class="empty-state"><div class="empty-icon">🚗</div><div class="empty-text">Пока нет машин рядом</div><button class="btn-expand-radius" id="btnExpandRadiusRide">🔍 Расширить радиус</button></div>`;
    const btn = document.getElementById('btnExpandRadiusRide');
    if (btn) btn.addEventListener('click', () => expandMapRadius());
    return;
  }

  let html = '';
  
  rides.forEach(r => {
    const initials = (r.firstName[0] || '') + (r.lastName[0] || '');
    const avatarHtml = r.avatar ? `<img src="${r.avatar}" alt="">` : initials;
    html += `
      <div class="ride-card" data-ride-id="${r.id}" style="background:var(--screen-bg);border:1px solid var(--screen-border);border-radius:16px;padding:14px;cursor:pointer;">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
          <div class="person-avatar" style="background:#4D6CFF;">${avatarHtml}</div>
          <div class="person-info" style="flex:1;min-width:0;"><div class="person-name">${r.firstName} ${r.lastName}, ${r.age}</div><div class="person-age" style="color:#4D6CFF;font-weight:600;">🚘 ${r.carBrand}, ${r.carColor}</div></div>
        </div>
        <div style="font-size:14px;color:var(--screen-text);margin-bottom:8px;line-height:1.6;"><div>📍 ${r.fromCity} → ${r.toCity}</div></div>
        <div style="display:flex;justify-content:space-between;font-size:13px;color:var(--screen-text-muted);margin-bottom:10px;"><span>👥 Свободно: ${r.freeSeats} из ${r.totalSeats}</span><span>🚬 ${r.smoking ? 'Курить' : 'Без курения'}</span></div>
        <div style="display:flex;justify-content:space-between;font-size:13px;color:var(--screen-text-muted);margin-bottom:12px;"><span>🐾 ${r.pets ? 'С животными' : 'Без животных'}</span><span>📦 ${r.cargo ? 'С грузом' : 'Без груза'}</span></div>
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div style="font-size:18px;font-weight:700;color:#FF9F43;">${r.price === 0 ? 'Бесплатно' : r.price + ' ₽'}</div>
          <button class="person-join-btn" style="background:#4D6CFF;" data-ride-join="${r.id}">💺 Купить место</button>
        </div>
      </div>
    `;
  });

  carousel.innerHTML = html;

  carousel.querySelectorAll('.person-join-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const rideId = btn.dataset.rideJoin;
      const ride = mapBaseState.nearbyUsers.find(r => r.id === rideId);
      if (ride) sendRideJoinRequest(ride);
    });
  });

  setupCarouselCentering(`#carouselView_${type}`);
  updateCreateButton('ride');
}

function sendRideJoinRequest(ride) {
  if (confirm(`Купить место у ${ride.firstName}?`)) alert('Запрос отправлен!');
}

function openRideScreen(onClose) {
  const user = window.__currentUser;
  createMapScreen('ride', user, onClose);
  setTimeout(() => {
    if (typeof generateMockRides === 'function') generateMockRides();
    if (mapBaseState.map) addNearbyMarkers('ride');
    renderRideBody(); updateCreateButton('ride');
  }, 500);
}

function setupRideFormLogic() {
  const whenChips = document.querySelectorAll('#rideWhenChips .chip');
  const whenCustomWrap = document.getElementById('rideWhenCustomWrap');
  const whenCustomInput = document.getElementById('rideFormWhenCustom');
  const priceChips = document.querySelectorAll('#ridePriceChips .chip');
  const priceCustomWrap = document.getElementById('ridePriceCustomWrap');
  const priceCustomInput = document.getElementById('rideFormPriceCustom');
  const submitBtn = document.getElementById('createSubmitBtn');
  let selectedWhen = null, selectedPrice = null, selectedCargo = false;

  // --- МАСКА ДЛЯ АВТОМОБИЛЬНОГО НОМЕРА ---
  const plateInput = document.getElementById('rideFormCarPlate');
  if (plateInput) {
    plateInput.addEventListener('input', (e) => {
      // Оставляем только буквы и цифры, переводим в верхний регистр
      let v = e.target.value.toUpperCase().replace(/[^А-ЯA-Z0-9]/g, '');
      let res = '';
      
      for (let i = 0; i < v.length; i++) {
        let char = v[i];
        // Буква (1-я)
        if (res.length === 0) { if (/[А-ЯA-Z]/.test(char)) res += char; }
        // Три цифры
        else if (res.length >= 1 && res.length <= 3) { if (/[0-9]/.test(char)) res += char; }
        // Две буквы
        else if (res.length >= 4 && res.length <= 5) { if (/[А-ЯA-Z]/.test(char)) res += char; }
        // Пробел и первая цифра региона
        else if (res.length === 6) { if (/[0-9]/.test(char)) res += ' ' + char; }
        // Остальные цифры региона (до 3-х)
        else if (res.length >= 7 && res.length <= 9) { if (/[0-9]/.test(char)) res += char; }
      }
      e.target.value = res;
    });
  }
  // ---------------------------------------

  whenChips.forEach(chip => {
    chip.addEventListener('click', () => {
      whenChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      if (chip.dataset.when === 'custom') { whenCustomWrap.style.display = 'block'; selectedWhen = 'custom'; }
      else { whenCustomWrap.style.display = 'none'; whenCustomInput.value = ''; selectedWhen = chip.dataset.when; }
      validateRideForm();
    });
  });

  priceChips.forEach(chip => {
    chip.addEventListener('click', () => {
      priceChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      if (chip.dataset.price === 'custom') { priceCustomWrap.style.display = 'block'; selectedPrice = 'custom'; }
      else { priceCustomWrap.style.display = 'none'; priceCustomInput.value = ''; selectedPrice = parseInt(chip.dataset.price, 10); }
      validateRideForm();
    });
  });

  const smokingChips = document.querySelectorAll('#rideSmokingChips .chip');
  smokingChips.forEach(chip => {
    chip.addEventListener('click', () => {
      smokingChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      validateRideForm();
    });
  });

  const petsChips = document.querySelectorAll('#ridePetsChips .chip');
  petsChips.forEach(chip => {
    chip.addEventListener('click', () => {
      petsChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      validateRideForm();
    });
  });

  const cargoChips = document.querySelectorAll('#rideCargoChips .chip');
  const cargoWeightWrap = document.getElementById('rideCargoWeightWrap');
  cargoChips.forEach(chip => {
    chip.addEventListener('click', () => {
      cargoChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      selectedCargo = chip.dataset.cargo === 'true';
      cargoWeightWrap.style.display = selectedCargo ? 'block' : 'none';
      if (!selectedCargo) document.getElementById('rideFormCargoWeight').value = '';
    });
  });

  ['rideFormFrom', 'rideFormTo', 'rideFormSeats', 'rideFormCarBrand', 'rideFormCarColor', 'rideFormCarPlate', 'rideFormWhenCustom', 'rideFormPriceCustom'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', validateRideForm);
    if (el && el.tagName === 'SELECT') el.addEventListener('change', validateRideForm);
  });

  function validateRideForm() {
    const from = document.getElementById('rideFormFrom').value.trim();
    const to = document.getElementById('rideFormTo').value.trim();
    const brand = document.getElementById('rideFormCarBrand').value.trim();
    const color = document.getElementById('rideFormCarColor').value.trim();
    const plate = document.getElementById('rideFormCarPlate').value.trim();
    let whenOk = selectedWhen === 'custom' ? !!whenCustomInput.value : !!selectedWhen;
    let priceOk = selectedPrice === 'custom' ? (priceCustomInput.value !== '' && parseInt(priceCustomInput.value, 10) >= 0) : selectedPrice !== null;
    // Добавил проверку, что номер введен полностью (минимум 8 символов, например "А123БВ 77")
    submitBtn.disabled = !(from.length > 1 && to.length > 1 && from !== to && whenOk && priceOk && brand && color && plate.length >= 8);
  }
  submitBtn.onclick = () => submitCreateRequest('ride');
}

function collectRideForm() {
  const fromCity = document.getElementById('rideFormFrom').value.trim();
  const toCity = document.getElementById('rideFormTo').value.trim();
  const freeSeats = parseInt(document.getElementById('rideFormSeats').value, 10);
  const carBrand = document.getElementById('rideFormCarBrand').value.trim();
  const carColor = document.getElementById('rideFormCarColor').value.trim();
  const carPlate = document.getElementById('rideFormCarPlate').value.trim();
  const comment = document.getElementById('rideFormComment').value.trim();
  const activeWhen = document.querySelector('#rideWhenChips .chip.active');
  const activePrice = document.querySelector('#ridePriceChips .chip.active');
  if (!activeWhen || !activePrice) return null;

  let when = '', whenCustom = false;
  if (activeWhen.dataset.when === 'custom') {
    const v = document.getElementById('rideFormWhenCustom').value;
    if (!v) return null; when = v; whenCustom = true;
  } else { when = activeWhen.dataset.when; }

  let price = 0;
  if (activePrice.dataset.price === 'custom') {
    price = parseInt(document.getElementById('rideFormPriceCustom').value, 10);
    if (isNaN(price) || price < 0) return null;
  } else { price = parseInt(activePrice.dataset.price, 10); }

  const selectedSmoking = document.querySelector('#rideSmokingChips .chip.active').dataset.smoking === 'true';
  const selectedPets = document.querySelector('#ridePetsChips .chip.active').dataset.pets === 'true';
  const selectedCargo = document.querySelector('#rideCargoChips .chip.active').dataset.cargo === 'true';
  const cargoWeight = selectedCargo ? parseInt(document.getElementById('rideFormCargoWeight').value, 10) || 0 : 0;

  if (fromCity === toCity || !fromCity || !toCity) return null;

  return { fromCity, toCity, when, whenCustom, freeSeats, totalSeats: 4, price, smoking: selectedSmoking, pets: selectedPets, cargo: selectedCargo, cargoWeight, carBrand, carColor, carPlate, comment };
}