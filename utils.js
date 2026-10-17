"use strict";

function playNotificationSound() {
  if (!appSettings.sound) return;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const now = ctx.currentTime;
    [880, 1320].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, now + i * 0.12);
      gain.gain.linearRampToValueAtTime(0.15, now + i * 0.12 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.12);
      osc.stop(now + i * 0.12 + 0.4);
    });
  } catch (e) {}
}

function vibrate() {
  if (!appSettings.vibration) return;
  if (navigator.vibrate) {
    try { navigator.vibrate(200); } catch (e) {}
  }
}

function getTime() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));
}

function calcDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (deg) => deg * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function formatDistance(m) {
  if (m < 1000) return Math.round(m) + ' м';
  return (m / 1000).toFixed(1) + ' км';
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
}

function calculateAge(birthDate) {
  if (!birthDate) return null;
  const today = new Date();
  const birth = new Date(birthDate);
  if (isNaN(birth.getTime())) return null;
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age >= 0 && age < 120 ? age : null;
}

function applyPhoneMask(input) {
  input.addEventListener('input', (e) => {
    let digits = e.target.value.replace(/\D/g, '');
    if (digits.startsWith('7') || digits.startsWith('8')) digits = digits.substring(1);
    digits = digits.substring(0, 10);
    let formatted = '+7';
    if (digits.length > 0) formatted += ' (' + digits.substring(0, 3);
    if (digits.length >= 4) formatted += ') ' + digits.substring(3, 6);
    if (digits.length >= 7) formatted += '-' + digits.substring(6, 8);
    if (digits.length >= 9) formatted += '-' + digits.substring(8, 10);
    e.target.value = formatted;
  });
}

async function fetchWeather(lat, lng) {
  try {
    const url = `${WEATHER_API_URL}?lat=${lat}&lon=${lng}&appid=${WEATHER_API_KEY}&units=metric&lang=ru`;
    const resp = await fetch(url);
    const data = await resp.json();

    if (!data || !data.main) return null;

    const temp = Math.round(data.main.temp);
    const windSpeed = data.wind ? data.wind.speed : 0;
    const weatherMain = data.weather[0].main;
    const weatherDesc = data.weather[0].description;

    let icon = '☀️';
    let hint = '';

    if (weatherMain === 'Clear') {
      icon = '☀️';
      hint = 'Отличная погода для прогулки!';
    } else if (weatherMain === 'Clouds') {
      icon = '☁️';
      hint = 'Облачно, но гулять можно';
    } else if (weatherMain === 'Rain' || weatherMain === 'Drizzle') {
      icon = '🌧️';
      hint = 'Возьми с собой зонтик';
    } else if (weatherMain === 'Thunderstorm') {
      icon = '⛈️';
      hint = 'Лучше остаться дома';
    } else if (weatherMain === 'Snow') {
      icon = '❄️';
      hint = 'Оденься теплее';
    } else if (weatherMain === 'Mist' || weatherMain === 'Fog') {
      icon = '🌫️';
      hint = 'Плохая видимость';
    }

    if (windSpeed > 8 && !hint.includes('дом')) {
      hint = '💨 Сильный ветер — оденься теплее';
    }

    return {
      temp: temp,
      icon: icon,
      description: weatherDesc,
      hint: hint
    };
  } catch (e) {
    console.warn('Ошибка погоды:', e);
    return null;
  }
}

function generateNickname(name, surname, birthDate) {
  const translit = {
    'а':'a','б':'b','в':'v','г':'g','д':'d','е':'e','ё':'e','ж':'zh','з':'z','и':'i','й':'y',
    'к':'k','л':'l','м':'m','н':'n','о':'o','п':'p','р':'r','с':'s','т':'t','у':'u','ф':'f',
    'х':'h','ц':'ts','ч':'ch','ш':'sh','щ':'sch','ъ':'','ы':'y','ь':'','э':'e','ю':'yu','я':'ya'
  };
  function toLatin(str) {
    return str.toLowerCase().split('').map(ch => translit[ch] || ch).join('').replace(/[^a-z0-9]/g, '');
  }
  const n = toLatin(name) || 'user';
  const s = toLatin(surname) || '';
  if (birthDate) {
    const age = calculateAge(birthDate);
    if (age !== null) return `${n}_${s}_${age}`;
  }
  const random = Math.floor(1000 + Math.random() * 9000);
  return s ? `${n}_${s}_${random}` : `${n}_${random}`;
}

function loadAppSettings() {
  try {
    const saved = localStorage.getItem('meet_settings');
    if (saved) Object.assign(appSettings, JSON.parse(saved));
  } catch (e) {}
  applyAppSettings();
}

function saveAppSettings() {
  try {
    localStorage.setItem('meet_settings', JSON.stringify(appSettings));
  } catch (e) {}
  applyAppSettings();
}

function applyAppSettings() {
  if (appSettings.theme === 'light') document.body.classList.add('light-theme');
  else document.body.classList.remove('light-theme');

  if (appSettings.animations === 'off') document.body.classList.add('no-animations');
  else document.body.classList.remove('no-animations');
}