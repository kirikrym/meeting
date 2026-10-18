"use strict";

const CARD_DATA = {
  walk: {
    icon: '🚶',
    title: 'Прогуляться',
    desc: 'Найди компанию для прогулки. Мы покажем, кто рядом и куда идти.',
    color: '#6C5CE7',
    active: true,
    btnText: '🚀 Продолжить'
  },
  lunch: {
    icon: '🍔',
    title: 'Обед / Кофе',
    desc: 'Найди, с кем пообедать. Покажем людей рядом и их настроение.',
    color: '#FF9F43',
    active: false,
    btnText: '⏳ Скоро'
  },
  soul: {
    icon: '💬',
    title: 'Разговоры по душам',
    desc: 'Анонимно выговорись или выслушай. Без имён, без фото.',
    color: '#A29BFE',
    active: true,
    btnText: '🚀 Продолжить'
  },
  ride: {
    icon: '🚗',
    title: 'Попутчики',
    desc: 'Найди попутчика для поездки. Покажем машины, которые едут через твой город.',
    color: '#4D6CFF',
    active: true,
    btnText: '🚀 Продолжить'
  },
  random: {
    icon: '🎲',
    title: 'Случайная встреча',
    desc: 'Умный подбор по интересам. Скоро.',
    color: '#FD79A8',
    active: false,
    btnText: '⏳ Скоро'
  }
};

// ============================================================
// ПРЕВЬЮ КАРТОЧКИ
// ============================================================
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

  const closeBtn = document.getElementById('previewClose');
  const continueBtn = document.getElementById('previewContinue');

  function closePreview() {
    overlay.classList.remove('active');
    overlayContent.innerHTML = '';
  }

  closeBtn.addEventListener('click', closePreview);

  continueBtn.addEventListener('click', () => {
    if (!data.active) return;
    closePreview();
    setTimeout(() => openCard(cardType), 200);
  });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closePreview();
  }, { once: true });
}

// ============================================================
// ОТКРЫТИЕ КАРТОЧКИ (с проверкой логина)
// ============================================================
function openCard(cardType) {
  if (!window.__isLoggedIn) {
    showWarningGlobal(() => openCard(cardType));
    return;
  }

  if (cardType === 'walk') {
    if (typeof openWalkScreen === 'function') openWalkScreen();
    else alert('🚶 Прогулка — в разработке');
    return;
  }
  if (cardType === 'soul') {
    if (typeof openSoulScreen === 'function') openSoulScreen();
    else alert('💬 Души — в разработке');
    return;
  }
  if (cardType === 'ride') {
    if (typeof openRideScreen === 'function') openRideScreen();
    else alert('🚗 Попутчики — в разработке');
    return;
  }
}

// ============================================================
// ПРЕДУПРЕЖДЕНИЕ "ТРЕБУЕТСЯ ПРОФИЛЬ"
// ============================================================
function showWarningGlobal(callback) {
  const overlay = document.getElementById('overlay');
  const overlayContent = document.getElementById('overlayContent');

  overlayContent.innerHTML = `
    <div class="soul-how-modal" style="max-width:380px;">
      <div class="soul-how-icon">🔒</div>
      <div class="soul-how-title">Требуется профиль</div>
      <p style="color:var(--screen-text-muted); font-size:14px; margin-bottom:20px; line-height:1.5;">
        Чтобы пользоваться этой функцией, нужно заполнить профиль.<br>Это займёт минуту.
      </p>
      <div class="soul-how-actions">
        <button class="soul-how-btn test" id="warningGoGlobal">🔑 Перейти к регистрации</button>
        <button class="soul-how-btn close" id="warningCancelGlobal">Отмена</button>
      </div>
    </div>
  `;

  overlay.classList.add('active');

  document.getElementById('warningGoGlobal').addEventListener('click', () => {
    closeOverlayGlobal();
    setTimeout(() => {
      if (callback) callback();
      else showLoginForm();
    }, 200);
  });

  document.getElementById('warningCancelGlobal').addEventListener('click', closeOverlayGlobal);

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeOverlayGlobal();
  }, { once: true });
}

// ============================================================
// ИНИЦИАЛИЗАЦИЯ
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  // Загрузка состояния
  loadStateGlobal();
  loadAppSettings();

  // Кнопка "Войти"
  const loginBtn = document.getElementById('loginBtn');
  if (loginBtn) {
    loginBtn.addEventListener('click', () => showLoginForm());
  }

  // Аватар → профиль
  const avatar = document.getElementById('avatar');
  if (avatar) {
    avatar.addEventListener('click', () => {
      if (window.__isLoggedIn) showProfile();
    });
  }

  // Карточки
  document.querySelectorAll('.card').forEach(card => {
    card.addEventListener('click', () => {
      const type = card.getAttribute('data-card');
      if (type) showCardPreview(type);
    });
  });

  // Блок "Моя заявка" на главной
renderMyRequestCompact('walk');
renderMyRequestCompact('ride');

  // Модалка выхода — кнопки
  const logoutChange = document.getElementById('logoutChange');
  const logoutDelete = document.getElementById('logoutDelete');
  const logoutCancel = document.getElementById('logoutCancel');

  if (logoutChange) {
    logoutChange.addEventListener('click', () => {
      closeLogoutModal();
      setTimeout(() => showLoginForm(null, false, true), 300);
    });
  }

  if (logoutDelete) {
    logoutDelete.addEventListener('click', () => {
      closeLogoutModal();
      setTimeout(() => {
        if (confirm('⚠️ Удалить аккаунт?\n\nВсе данные будут потеряны.')) {
          if (confirm('❓ Ты уверен? Это последнее предупреждение.')) {
            localStorage.removeItem('meet_user');
            localStorage.removeItem('meet_settings');
            alert('✅ Аккаунт удалён');
            location.reload();
          }
        }
      }, 300);
    });
  }

  if (logoutCancel) {
    logoutCancel.addEventListener('click', closeLogoutModal);
  }

  // Закрытие модалки выхода по фону
  const logoutModal = document.getElementById('logoutModal');
  if (logoutModal) {
    logoutModal.addEventListener('click', (e) => {
      if (e.target === logoutModal) closeLogoutModal();
    });
  }

  // Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeOverlayGlobal();
      closeLogoutModal();
    }
  });
});
