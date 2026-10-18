"use strict";

function renderWalkBody() {
  const type = 'walk';
  const carousel = document.getElementById(`carouselView_${type}`);
  if (!carousel) return;

  const users = mapBaseState.nearbyUsers;
  const myReq = getMyRequest('walk');

  if (!users.length && !myReq) {
    carousel.innerHTML = `<div class="empty-state"><div class="empty-icon">🚶</div><div class="empty-text">Пока никого нет рядом</div><button class="btn-expand-radius" id="btnExpandRadiusWalk">🔍 Расширить радиус</button></div>`;
    const btn = document.getElementById('btnExpandRadiusWalk');
    if (btn) btn.addEventListener('click', () => expandMapRadius());
    return;
  }

  let html = '';
  if (myReq) {
    const pendingCount = myReq.responses.filter(r => r.status === 'pending').length;
    const acceptedCount = myReq.responses.filter(r => r.status === 'accepted').length;
    let badge = acceptedCount > 0 ? `✅` : pendingCount > 0 ? `💬 ${pendingCount}` : `⏳`;
    html += `
      <div class="person-card my-card" data-my-card="walk">
        <div class="person-avatar" style="background:#6C5CE7;">📋</div>
        <div class="person-info"><div class="person-name">Моя заявка</div><div class="person-age">${myReq.what} · ${myReq.when}</div></div>
        <span class="my-card-badge">${badge}</span>
      </div>
    `;
  }

  users.forEach(u => {
    const initials = (u.firstName[0] || '') + (u.lastName[0] || '');
    const avatarHtml = u.avatar ? `<img src="${u.avatar}" alt="">` : initials;
    html += `
      <div class="person-card" data-user-id="${u.id}">
        <div class="person-avatar">${avatarHtml}</div>
        <div class="person-info"><div class="person-name">${u.firstName} ${u.lastName}</div><div class="person-age">${u.age} лет</div></div>
        <button class="person-join-btn" data-join-id="${u.id}">🤝 Присоединиться</button>
      </div>
    `;
  });

  carousel.innerHTML = html;

  const myCard = carousel.querySelector('[data-my-card="walk"]');
  if (myCard) myCard.addEventListener('click', () => openMyRequestModal('walk'));

  carousel.querySelectorAll('.person-join-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const userId = btn.dataset.joinId;
      const user = mapBaseState.nearbyUsers.find(u => u.id === userId);
      if (user) sendWalkJoinRequest(user);
    });
  });

  setupCarouselCentering(`#carouselView_${type}`);
  updateCreateButton('walk');
}

function sendWalkJoinRequest(user) {
  // Упрощенный мок для запроса
  if (confirm(`Отправить запрос ${user.firstName}?`)) alert('Запрос отправлен!');
}

function openWalkScreen(onClose) {
  const user = window.__currentUser;
  createMapScreen('walk', user, onClose);
  setTimeout(() => { renderWalkBody(); updateCreateButton('walk'); }, 500);
}

function setupWalkFormLogic() {
  const chips = document.querySelectorAll('#walkWhenChips .chip');
  const customWrap = document.getElementById('walkWhenCustomWrap');
  const customInput = document.getElementById('walkFormWhenCustom');
  const submitBtn = document.getElementById('createSubmitBtn');
  let selectedWhen = null;

  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      chips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      if (chip.dataset.when === 'custom') {
        customWrap.style.display = 'block'; selectedWhen = 'custom';
      } else {
        customWrap.style.display = 'none'; customInput.value = ''; selectedWhen = chip.dataset.when;
      }
      validateWalkForm();
    });
  });

  document.getElementById('walkFormWhat').addEventListener('input', validateWalkForm);
  customInput.addEventListener('input', validateWalkForm);

  function validateWalkForm() {
    const what = document.getElementById('walkFormWhat').value.trim();
    let whenOk = selectedWhen === 'custom' ? !!customInput.value : !!selectedWhen;
    submitBtn.disabled = !(what && whenOk);
  }

  submitBtn.onclick = () => submitCreateRequest('walk');
}

function collectWalkForm() {
  const what = document.getElementById('walkFormWhat').value.trim();
  const radius = parseInt(document.getElementById('walkFormRadius').value, 10);
  const comment = document.getElementById('walkFormComment').value.trim();
  const activeChip = document.querySelector('#walkWhenChips .chip.active');
  if (!activeChip) return null;

  let when = '', whenCustom = false;
  if (activeChip.dataset.when === 'custom') {
    const customVal = document.getElementById('walkFormWhenCustom').value;
    if (!customVal) return null;
    when = customVal; whenCustom = true;
  } else {
    when = activeChip.dataset.when;
  }
  if (!what || !when) return null;
  return { what, when, whenCustom, radius, comment };
}