"use strict";

window.__currentUser = null;
window.__isLoggedIn = false;

let settingsOnClose = null;
let settingsOnEditProfile = null;

function closeOverlayGlobal() {
  const overlay = document.getElementById('overlay');
  const overlayContent = document.getElementById('overlayContent');
  if (overlay) overlay.classList.remove('active');
  if (overlayContent) overlayContent.innerHTML = '';
}

function saveUserGlobal(user) {
  window.__currentUser = user;
  window.__isLoggedIn = true;
  localStorage.setItem('meet_user', JSON.stringify(user));
  updateAuthUIGlobal();
}

function updateAuthUIGlobal() {
  const loginBtn = document.getElementById('loginBtn');
  const avatar = document.getElementById('avatar');
  if (!loginBtn || !avatar) return;

  if (window.__isLoggedIn && window.__currentUser) {
    loginBtn.classList.add('hidden');
    avatar.classList.remove('hidden');
    if (window.__currentUser.avatar) {
      avatar.innerHTML = `<img src="${window.__currentUser.avatar}" alt="">`;
    } else {
      avatar.textContent = (window.__currentUser.name || '?').charAt(0).toUpperCase();
    }
  } else {
    loginBtn.classList.remove('hidden');
    avatar.classList.add('hidden');
  }
}

function loadStateGlobal() {
  const saved = localStorage.getItem('meet_user');
  if (saved) {
    try {
      const user = JSON.parse(saved);
      if (user && user.name && user.surname) {
        window.__currentUser = user;
        window.__isLoggedIn = true;
        updateAuthUIGlobal();
      }
    } catch (e) {
      localStorage.removeItem('meet_user');
    }
  }
}

function showLoginForm(callback, editMode = false, changeAccount = false) {
  const overlay = document.getElementById('overlay');
  const overlayContent = document.getElementById('overlayContent');
  const user = editMode && window.__currentUser ? window.__currentUser : {};

  overlayContent.innerHTML = `
    <div class="login-screen">
      <button class="login-close" id="loginClose">✕</button>
      <div class="login-header">
        <div class="icon">${editMode ? '✏️' : '🔐'}</div>
        <h2>${editMode ? 'Редактирование' : 'Создайте профиль'}</h2>
        <p>${editMode ? 'Измените свои данные' : 'Заполните основные поля'}</p>
      </div>
      <div class="avatar-upload">
        <div class="avatar-circle" id="avatarCircle">
          ${user.avatar ? `<img src="${user.avatar}" alt="">` : (user.name ? user.name.charAt(0).toUpperCase() : '👤')}
        </div>
        <div class="avatar-hint">Нажмите, чтобы загрузить фото</div>
        <input type="file" id="avatarInput" accept="image/*" style="display:none;">
      </div>
      <div class="form-grid">
        <div class="form-group"><label>Имя *</label><input type="text" id="inputName" placeholder="Алексей" maxlength="30" value="${user.name || ''}"></div>
        <div class="form-group"><label>Фамилия *</label><input type="text" id="inputSurname" placeholder="Иванов" maxlength="30" value="${user.surname || ''}"></div>
        <div class="form-group"><label>Никнейм *</label><input type="text" id="inputNick" placeholder="alex_ivanov_25" maxlength="40" value="${user.nick || ''}"></div>
        <div class="form-group"><label>Дата рождения <span class="optional">(необязательно)</span></label><input type="date" id="inputBirth" value="${user.birth || ''}"></div>
        <div class="form-group full"><label>Телефон <span class="optional">(необязательно)</span></label><input type="tel" id="inputPhone" placeholder="+7 (___) ___-__-__" maxlength="18" value="${user.phone || ''}"></div>
      </div>
      <div class="form-actions">
        <button class="btn-primary" id="btnSave" disabled>${editMode ? 'Сохранить' : 'Войти'}</button>
        ${editMode ? `<button class="btn-secondary" id="btnCancel">Отмена</button>` : `<button class="btn-secondary" id="btnLater">Позже</button>`}
      </div>
    </div>
  `;

  overlay.classList.add('active');

  const inputName = document.getElementById('inputName');
  const inputSurname = document.getElementById('inputSurname');
  const inputNick = document.getElementById('inputNick');
  const inputBirth = document.getElementById('inputBirth');
  const inputPhone = document.getElementById('inputPhone');
  const btnSave = document.getElementById('btnSave');
  const avatarCircle = document.getElementById('avatarCircle');
  const avatarInput = document.getElementById('avatarInput');
  const loginClose = document.getElementById('loginClose');

  let avatarData = user.avatar || null;
  applyPhoneMask(inputPhone);

  function autoNick() {
    if (editMode) return;
    if (inputNick.dataset.manual === 'true') return;
    const name = inputName.value.trim();
    const surname = inputSurname.value.trim();
    if (name && surname) inputNick.value = generateNickname(name, surname, inputBirth.value);
  }

  inputName.addEventListener('input', () => { validate(); if (!editMode && !inputNick.value.trim()) autoNick(); });
  inputSurname.addEventListener('input', () => { validate(); if (!editMode && !inputNick.value.trim()) autoNick(); });
  inputBirth.addEventListener('change', () => { if (!editMode && !inputNick.dataset.manual) autoNick(); });
  inputNick.addEventListener('input', () => { inputNick.dataset.manual = 'true'; validate(); });

  function validate() {
    const ok = inputName.value.trim().length > 0 && inputSurname.value.trim().length > 0 && inputNick.value.trim().length > 0;
    btnSave.disabled = !ok;
  }
  validate();

  avatarCircle.addEventListener('click', () => avatarInput.click());
  avatarInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      avatarData = ev.target.result;
      avatarCircle.innerHTML = `<img src="${avatarData}" alt="">`;
    };
    reader.readAsDataURL(file);
  });

  btnSave.addEventListener('click', () => {
    const newUser = {
      name: inputName.value.trim(),
      surname: inputSurname.value.trim(),
      nick: inputNick.value.trim(),
      birth: inputBirth.value || '',
      phone: inputPhone.value.trim(),
      avatar: avatarData
    };
    if (changeAccount) localStorage.removeItem('meet_user');
    saveUserGlobal(newUser);
    closeOverlayGlobal();
    if (callback) callback();
  });

  loginClose.addEventListener('click', closeOverlayGlobal);
  const btnCancel = document.getElementById('btnCancel');
  const btnLater = document.getElementById('btnLater');
  if (btnCancel) btnCancel.addEventListener('click', closeOverlayGlobal);
  if (btnLater) btnLater.addEventListener('click', closeOverlayGlobal);
}

function showProfile() {
  const overlay = document.getElementById('overlay');
  const overlayContent = document.getElementById('overlayContent');
  const currentUser = window.__currentUser;
  if (!currentUser) return;

  let birthDisplay = null;
  if (currentUser.birth) {
    const age = calculateAge(currentUser.birth);
    if (appSettings.birthDisplay === 'age' && age !== null) {
      birthDisplay = `${age} лет`;
    } else if (appSettings.birthDisplay === 'zodiac') {
      birthDisplay = getZodiacSign(currentUser.birth);
    } else {
      birthDisplay = formatDate(currentUser.birth);
    }
  }

  overlayContent.innerHTML = `
    <div class="profile-screen">
      <button class="login-close" id="profileClose">✕</button>
      <div class="profile-header">
        <div class="profile-avatar">
          ${currentUser.avatar ? `<img src="${currentUser.avatar}" alt="">` : (currentUser.name || '?').charAt(0).toUpperCase()}
        </div>
        <div class="profile-name">${currentUser.name} ${currentUser.surname}</div>
        <div class="profile-nick">@${currentUser.nick}</div>
      </div>
      <div class="profile-info">
        <div class="info-row"><span class="label">📅 Дата рождения</span>${birthDisplay ? `<span class="value">${birthDisplay}</span>` : `<span class="link" id="addBirth">Указать</span>`}</div>
        <div class="info-row"><span class="label">📱 Телефон</span>${currentUser.phone ? `<span class="value">${currentUser.phone}</span>` : `<span class="link" id="addPhone">Указать</span>`}</div>
        <div class="info-row"><span class="label">🖼️ Аватар</span>${currentUser.avatar ? `<span class="value">Загружен</span>` : `<span class="link" id="addAvatar">Загрузить</span>`}</div>
      </div>
      <div class="form-actions">
        <button class="btn-secondary" id="btnSettings">⚙️ Настройки</button>
        <button class="btn-secondary" id="btnLogout">🚪 Выйти из профиля</button>
      </div>
    </div>
  `;

  overlay.classList.add('active');

  document.getElementById('profileClose').addEventListener('click', closeOverlayGlobal);

  document.getElementById('btnSettings').addEventListener('click', () => {
    closeOverlayGlobal();
    setTimeout(() => openSettingsScreen(null, () => {
      setTimeout(() => showLoginForm(null, true), 200);
    }), 200);
  });

  document.getElementById('btnLogout').addEventListener('click', () => {
    closeOverlayGlobal();
    setTimeout(() => openLogoutModal(), 200);
  });

  ['addBirth', 'addPhone', 'addAvatar'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', () => {
      closeOverlayGlobal();
      setTimeout(() => showLoginForm(null, true), 200);
    });
  });
}

function getZodiacSign(birthDate) {
  if (!birthDate) return '';
  const d = new Date(birthDate);
  if (isNaN(d.getTime())) return '';
  const day = d.getDate();
  const month = d.getMonth() + 1;

  const signs = [
    { name: 'Козерог', icon: '♑', until: [1, 19] },
    { name: 'Водолей', icon: '♒', until: [2, 18] },
    { name: 'Рыбы', icon: '♓', until: [3, 20] },
    { name: 'Овен', icon: '♈', until: [4, 19] },
    { name: 'Телец', icon: '♉', until: [5, 20] },
    { name: 'Близнецы', icon: '♊', until: [6, 20] },
    { name: 'Рак', icon: '♋', until: [7, 22] },
    { name: 'Лев', icon: '♌', until: [8, 22] },
    { name: 'Дева', icon: '♍', until: [9, 22] },
    { name: 'Весы', icon: '♎', until: [10, 22] },
    { name: 'Скорпион', icon: '♏', until: [11, 21] },
    { name: 'Стрелец', icon: '♐', until: [12, 21] }
  ];

  for (const s of signs) {
    if (month < s.until[0] || (month === s.until[0] && day <= s.until[1])) {
      return `${s.icon} ${s.name}`;
    }
  }
  return '♑ Козерог';
}

function openSettingsScreen(onClose, onEditProfile) {
  settingsOnClose = onClose || null;
  settingsOnEditProfile = onEditProfile || null;
  const el = document.createElement('div');
  el.className = 'settings-screen';
  el.id = 'settingsScreen';
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('active'));
  renderSettings();
  document.addEventListener('keydown', settingsEscHandler);
}

function renderSettings() {
  const el = document.getElementById('settingsScreen');
  if (!el) return;
  const s = appSettings;
  const scrollPos = document.querySelector('.settings-body')?.scrollTop || 0;

  el.innerHTML = `
    <div class="settings-header">
      <button class="settings-back" id="settingsBack">← Назад</button>
      <span class="settings-title">⚙️ НАСТРОЙКИ</span>
      <div class="settings-spacer"></div>
    </div>
    <div class="settings-body">
      <div class="settings-section">
        <div class="settings-section-title">Профиль</div>
        <div class="settings-item" id="itemEditProfile">
          <div class="settings-item-left">
            <span class="settings-item-icon">✏️</span>
            <div>
              <div class="settings-item-label">Редактировать профиль</div>
              <div class="settings-item-sub">Изменить имя, фамилию, аватар</div>
            </div>
          </div>
          <span class="settings-item-arrow">›</span>
        </div>
        <div class="settings-item" id="itemFriends">
          <div class="settings-item-left">
            <span class="settings-item-icon">👥</span>
            <div>
              <div class="settings-item-label">Мои друзья</div>
              <div class="settings-item-sub">Список друзей</div>
            </div>
          </div>
          <span class="settings-item-arrow">›</span>
        </div>
        <div class="settings-item" id="itemBirthDisplay">
          <div class="settings-item-left">
            <span class="settings-item-icon">📅</span>
            <div>
              <div class="settings-item-label">Отображение даты</div>
              <div class="settings-item-sub">Дата / возраст / знак зодиака</div>
            </div>
          </div>
          <span class="settings-item-label" id="birthDisplayValue">${s.birthDisplay === 'date' ? 'Дата' : s.birthDisplay === 'age' ? 'Возраст' : 'Знак зодиака'}</span>
        </div>
      </div>
      <div class="settings-section">
        <div class="settings-section-title">Уведомления</div>
        <div class="settings-item" id="itemSound">
          <div class="settings-item-left">
            <span class="settings-item-icon">🔔</span>
            <div><div class="settings-item-label">Звук</div><div class="settings-item-sub">Звук при уведомлениях</div></div>
          </div>
          <label class="switch"><input type="checkbox" id="setSound" ${s.sound ? 'checked' : ''}><span class="switch-slider"></span></label>
        </div>
        <div class="settings-item" id="itemVibration">
          <div class="settings-item-left">
            <span class="settings-item-icon">📳</span>
            <div><div class="settings-item-label">Вибрация</div><div class="settings-item-sub">Вибрация при уведомлениях</div></div>
          </div>
          <label class="switch"><input type="checkbox" id="setVibration" ${s.vibration ? 'checked' : ''}><span class="switch-slider"></span></label>
        </div>
        <div class="settings-item" id="itemChatNotif">
          <div class="settings-item-left">
            <span class="settings-item-icon">💬</span>
            <div><div class="settings-item-label">Уведомления в чате</div><div class="settings-item-sub">Звук при новых сообщениях</div></div>
          </div>
          <label class="switch"><input type="checkbox" id="setChatNotif" ${s.chatNotifications ? 'checked' : ''}><span class="switch-slider"></span></label>
        </div>
      </div>
      <div class="settings-section">
        <div class="settings-section-title">Внешний вид</div>
        <div class="settings-item" id="itemTheme">
          <div class="settings-item-left">
            <span class="settings-item-icon">${s.theme === 'dark' ? '🌙' : '☀️'}</span>
            <div><div class="settings-item-label">Тема</div><div class="settings-item-sub">${s.theme === 'dark' ? 'Тёмная' : 'Светлая'}</div></div>
          </div>
          <span class="settings-item-arrow">${s.theme === 'dark' ? '🌙' : '☀️'}</span>
        </div>
        <div class="settings-item" id="itemAnimations">
          <div class="settings-item-left">
            <span class="settings-item-icon">✨</span>
            <div><div class="settings-item-label">Анимации</div><div class="settings-item-sub">Полные / частичные / выкл</div></div>
          </div>
          <span class="settings-item-label" id="animationsValue">${s.animations === 'full' ? 'Полные' : s.animations === 'partial' ? 'Частичные' : 'Выкл'}</span>
        </div>
        <div class="settings-item" id="itemLanguage">
          <div class="settings-item-left">
            <span class="settings-item-icon">🌐</span>
            <div><div class="settings-item-label">Язык</div><div class="settings-item-sub">Язык интерфейса</div></div>
          </div>
          <span class="settings-item-label" id="setLanguageValue">${s.language === 'ru' ? 'Русский' : 'English'}</span>
        </div>
      </div>
      <div class="settings-section">
        <div class="settings-section-title">О приложении</div>
        <div class="settings-item" style="cursor:default;">
          <div class="settings-item-left">
            <span class="settings-item-icon">📄</span>
            <div><div class="settings-item-label">Версия</div></div>
          </div>
          <span style="color:var(--screen-text-muted); font-size:14px;">1.0.0</span>
        </div>
        <div class="settings-item" id="itemPrivacy">
          <div class="settings-item-left">
            <span class="settings-item-icon">📜</span>
            <div><div class="settings-item-label">Политика конфиденциальности</div></div>
          </div>
          <span class="settings-item-arrow">›</span>
        </div>
        <div class="settings-item" id="itemFeedback">
          <div class="settings-item-left">
            <span class="settings-item-icon">✉️</span>
            <div><div class="settings-item-label">Обратная связь</div></div>
          </div>
          <span class="settings-item-arrow">›</span>
        </div>
      </div>
    </div>
  `;

  requestAnimationFrame(() => {
    const body = document.querySelector('.settings-body');
    if (body) body.scrollTop = scrollPos;
  });

  document.getElementById('settingsBack').addEventListener('click', closeSettingsScreen);

  document.getElementById('itemEditProfile').addEventListener('click', () => {
    const editFn = settingsOnEditProfile;
    closeSettingsScreen();
    setTimeout(() => { if (editFn) editFn(); }, 300);
  });

  document.getElementById('itemFriends').addEventListener('click', () => {
    const overlay = document.getElementById('overlay');
    const overlayContent = document.getElementById('overlayContent');
    overlayContent.innerHTML = `
      <div class="card-preview">
        <button class="card-preview-close" id="friendsClose">✕</button>
        <div class="card-preview-icon">👥</div>
        <div class="card-preview-title">Мои друзья</div>
        <div class="card-preview-desc">Пока нет друзей. Добавляй их после встреч!</div>
      </div>
    `;
    overlay.classList.add('active');
    document.getElementById('friendsClose').addEventListener('click', closeOverlayGlobal);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeOverlayGlobal(); }, { once: true });
  });

  document.getElementById('itemBirthDisplay').addEventListener('click', () => {
    if (appSettings.birthDisplay === 'date') appSettings.birthDisplay = 'age';
    else if (appSettings.birthDisplay === 'age') appSettings.birthDisplay = 'zodiac';
    else appSettings.birthDisplay = 'date';
    saveAppSettings();
    renderSettings();
  });

  document.getElementById('itemSound').addEventListener('click', () => {
    appSettings.sound = !appSettings.sound;
    document.getElementById('setSound').checked = appSettings.sound;
    saveAppSettings();
    if (appSettings.sound) playNotificationSound();
  });

  document.getElementById('itemVibration').addEventListener('click', () => {
    appSettings.vibration = !appSettings.vibration;
    document.getElementById('setVibration').checked = appSettings.vibration;
    saveAppSettings();
    if (appSettings.vibration) vibrate();
  });

  document.getElementById('itemChatNotif').addEventListener('click', () => {
    appSettings.chatNotifications = !appSettings.chatNotifications;
    document.getElementById('setChatNotif').checked = appSettings.chatNotifications;
    saveAppSettings();
  });

  document.getElementById('itemTheme').addEventListener('click', () => {
    appSettings.theme = appSettings.theme === 'dark' ? 'light' : 'dark';
    saveAppSettings();
    renderSettings();
  });

  document.getElementById('itemAnimations').addEventListener('click', () => {
    if (appSettings.animations === 'full') appSettings.animations = 'partial';
    else if (appSettings.animations === 'partial') appSettings.animations = 'off';
    else appSettings.animations = 'full';
    saveAppSettings();
    renderSettings();
  });

  document.getElementById('itemLanguage').addEventListener('click', () => {
    openLangModal();
  });

  document.getElementById('itemPrivacy').addEventListener('click', () => {
    const overlay = document.getElementById('overlay');
    const overlayContent = document.getElementById('overlayContent');
    overlayContent.innerHTML = `
      <div class="card-preview">
        <button class="card-preview-close" id="privacyClose">✕</button>
        <div class="card-preview-icon">📜</div>
        <div class="card-preview-title">Политика конфиденциальности</div>
        <div class="card-preview-desc">Скоро здесь появится текст политики конфиденциальности.</div>
      </div>
    `;
    overlay.classList.add('active');
    document.getElementById('privacyClose').addEventListener('click', closeOverlayGlobal);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeOverlayGlobal(); }, { once: true });
  });

  document.getElementById('itemFeedback').addEventListener('click', () => {
    const overlay = document.getElementById('overlay');
    const overlayContent = document.getElementById('overlayContent');
    overlayContent.innerHTML = `
      <div class="card-preview">
        <button class="card-preview-close" id="feedbackClose">✕</button>
        <div class="card-preview-icon">✉️</div>
        <div class="card-preview-title">Обратная связь</div>
        <div class="card-preview-desc">Свяжись с нами удобным способом:</div>
        <div style="display:flex; flex-direction:column; gap:10px; margin-top:16px;">
          <a href="https://vk.com" target="_blank" style="padding:14px; background:#4C75A3; border-radius:14px; color:#fff; text-decoration:none; font-weight:600; font-size:15px;">💬 ВКонтакте</a>
          <a href="https://t.me" target="_blank" style="padding:14px; background:#229ED9; border-radius:14px; color:#fff; text-decoration:none; font-weight:600; font-size:15px;">✈️ Telegram</a>
          <a href="mailto:support@vstrecha.app" style="padding:14px; background:transparent; border:1.5px solid var(--screen-border); border-radius:14px; color:var(--screen-text); text-decoration:none; font-weight:600; font-size:15px;">✉️ support@vstrecha.app</a>
        </div>
      </div>
    `;
    overlay.classList.add('active');
    document.getElementById('feedbackClose').addEventListener('click', closeOverlayGlobal);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeOverlayGlobal(); }, { once: true });
  });
}

function settingsEscHandler(e) {
  if (e.key === 'Escape') closeSettingsScreen();
}

function closeSettingsScreen() {
  const el = document.getElementById('settingsScreen');
  if (!el) return;
  el.classList.remove('active');
  setTimeout(() => el.remove(), 350);
  document.removeEventListener('keydown', settingsEscHandler);
  if (settingsOnClose) { settingsOnClose(); settingsOnClose = null; }
}

function openLogoutModal() {
  const modal = document.getElementById('logoutModal');
  if (modal) modal.classList.add('active');
}

function closeLogoutModal() {
  const modal = document.getElementById('logoutModal');
  if (modal) modal.classList.remove('active');
}

function openLangModal() {
  const modal = document.getElementById('langModal');
  if (!modal) return;
  modal.querySelectorAll('.lang-option').forEach(opt => {
    opt.classList.toggle('active', opt.dataset.lang === appSettings.language);
    opt.onclick = () => {
      appSettings.language = opt.dataset.lang;
      saveAppSettings();
      closeLangModal();
      const sel = document.getElementById('setLanguageValue');
      if (sel) sel.textContent = opt.dataset.lang === 'ru' ? 'Русский' : 'English';
    };
  });
  document.getElementById('langModalClose').onclick = closeLangModal;
  modal.classList.add('active');
}

function closeLangModal() {
  const modal = document.getElementById('langModal');
  if (modal) modal.classList.remove('active');
}