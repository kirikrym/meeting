"use strict";

const CARD_DATA = {
  walk: { icon: '🚶', title: 'Прогуляться', desc: 'Найди компанию для прогулки.', color: '#6C5CE7', active: true, btnText: '🚀 Продолжить' },
  lunch: { icon: '🍔', title: 'Обед / Кофе', desc: 'Найди, с кем пообедать.', color: '#FF9F43', active: false, btnText: '⏳ Скоро' },
  soul: { icon: '💬', title: 'Разговоры по душам', desc: 'Анонимно выговорись.', color: '#A29BFE', active: true, btnText: '🚀 Продолжить' },
  ride: { icon: '🚗', title: 'Попутчики', desc: 'Найди попутчика для поездки.', color: '#4D6CFF', active: true, btnText: '🚀 Продолжить' },
  random: { icon: '🎲', title: 'Случайная встреча', desc: 'Умный подбор.', color: '#FD79A8', active: false, btnText: '⏳ Скоро' }
};

function showCardPreview(cardType) {
  const overlay = document.getElementById('overlay');
  const overlayContent = document.getElementById('overlayContent');
  const data = CARD_DATA[cardType];
  if (!data) return;

  overlayContent.innerHTML = `
    <div class="card-preview">
      <button class="card-preview-close" id="previewClose">✕</button>
      <div class="card-preview-icon">${data.icon}</div>
      <div class="card-preview-title">${data.title}</div>
      <div class="card-preview-desc">${data.desc}</div>
      <button class="card-preview-btn" id="previewContinue" style="background:${data.color};" ${!data.active ? 'disabled' : ''}>
        ${data.btnText}
      </button>
    </div>
  `;

  overlay.classList.add('active');

  function closePreview() {
    overlay.classList.remove('active');
    overlayContent.innerHTML = '';
  }

  document.getElementById('previewClose').addEventListener('click', closePreview);
  document.getElementById('previewContinue').addEventListener('click', () => {
    if (!data.active) return;
    closePreview();
    setTimeout(() => openCard(cardType), 200);
  });

  overlay.addEventListener('click', (e) => { if (e.target === overlay) closePreview(); }, { once: true });
}

function openCard(cardType) {
  if (!window.__isLoggedIn) {
    showWarningGlobal(() => openCard(cardType));
    return;
  }
  if (cardType === 'walk' && typeof openWalkScreen === 'function') openWalkScreen();
  else if (cardType === 'soul' && typeof openSoulScreen === 'function') openSoulScreen();
  else if (cardType === 'ride' && typeof openRideScreen === 'function') openRideScreen();
}

function showWarningGlobal(callback) {
  const overlay = document.getElementById('overlay');
  const overlayContent = document.getElementById('overlayContent');

  overlayContent.innerHTML = `
    <div class="soul-how-modal" style="max-width:380px;">
      <div class="soul-how-icon">🔒</div>
      <div class="soul-how-title">Требуется профиль</div>
      <p style="color:var(--screen-text-muted); font-size:14px; margin-bottom:20px; line-height:1.5;">Чтобы пользоваться этой функцией, нужно заполнить профиль.</p>
      <div class="soul-how-actions">
        <button class="soul-how-btn test" id="warningGoGlobal">🔑 Перейти к регистрации</button>
        <button class="soul-how-btn close" id="warningCancelGlobal">Отмена</button>
      </div>
    </div>
  `;

  overlay.classList.add('active');
  document.getElementById('warningGoGlobal').addEventListener('click', () => {
    closeOverlayGlobal();
    setTimeout(() => { if (callback) callback(); else showLoginForm(); }, 200);
  });
  document.getElementById('warningCancelGlobal').addEventListener('click', closeOverlayGlobal);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeOverlayGlobal(); }, { once: true });
}

document.addEventListener('DOMContentLoaded', () => {
  loadStateGlobal();
  loadAppSettings();

  const loginBtn = document.getElementById('loginBtn');
  if (loginBtn) loginBtn.addEventListener('click', () => showLoginForm());

  const avatar = document.getElementById('avatar');
  if (avatar) avatar.addEventListener('click', () => { if (window.__isLoggedIn) showProfile(); });

  document.querySelectorAll('.card').forEach(card => {
    card.addEventListener('click', () => {
      const type = card.getAttribute('data-card');
      if (type) showCardPreview(type);
    });
  });

  // Проверяем наличие заявок при загрузке
  if (typeof updateCardNotification === 'function') updateCardNotification();

  // Модалка выхода
  const logoutChange = document.getElementById('logoutChange');
  const logoutDelete = document.getElementById('logoutDelete');
  const logoutCancel = document.getElementById('logoutCancel');

  if (logoutChange) logoutChange.addEventListener('click', () => { closeLogoutModal(); setTimeout(() => showLoginForm(null, false, true), 300); });
  if (logoutDelete) logoutDelete.addEventListener('click', () => {
    closeLogoutModal();
    setTimeout(() => {
      if (confirm('⚠️ Удалить аккаунт?\n\nВсе данные будут потеряны.')) {
        if (confirm('❓ Ты уверен? Это последнее предупреждение.')) {
          localStorage.removeItem('meet_user'); localStorage.removeItem('meet_settings'); alert('✅ Аккаунт удалён'); location.reload();
        }
      }
    }, 300);
  });
  if (logoutCancel) logoutCancel.addEventListener('click', closeLogoutModal);

  const logoutModal = document.getElementById('logoutModal');
  if (logoutModal) logoutModal.addEventListener('click', (e) => { if (e.target === logoutModal) closeLogoutModal(); });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closeOverlayGlobal(); closeLogoutModal(); }
  });
});