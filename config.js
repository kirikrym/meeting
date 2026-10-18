"use strict";

const WEATHER_API_KEY = '294025fb0f5bc44c898270717e732546';
const WEATHER_API_URL = 'https://api.openweathermap.org/data/2.5/weather';

const appSettings = {
  sound: true,
  vibration: true,
  chatNotifications: true,
  animations: 'full',
  theme: 'dark',
  language: 'ru',
  birthDisplay: 'date'
};

const MOCK_FIRST_NAMES = ['Алексей', 'Мария', 'Дмитрий', 'Анна', 'Сергей', 'Ольга', 'Иван', 'Екатерина', 'Максим', 'Юлия'];
const MOCK_LAST_NAMES = ['Иванов', 'Петрова', 'Сидоров', 'Кузнецова', 'Смирнов', 'Попова', 'Морозов', 'Волкова', 'Козлов', 'Новикова'];
const MOCK_AGES = [22, 25, 28, 30, 32, 27, 35, 24, 29, 31];

const MOCK_CARS = [
  { brand: 'Kia Rio', color: 'белая', plate: 'А123БВ 777' },
  { brand: 'Hyundai Solaris', color: 'чёрный', plate: 'В456ГД 177' },
  { brand: 'Lada Vesta', color: 'синяя', plate: 'Е789ЖЗ 199' },
  { brand: 'Toyota Camry', color: 'серая', plate: 'И012КЛ 750' },
  { brand: 'Skoda Octavia', color: 'красная', plate: 'М345НО 799' }
];

const MOCK_CITIES = ['Москва', 'Санкт-Петербург', 'Казань', 'Сочи', 'Краснодар', 'Екатеринбург', 'Новосибирск'];

const SOUL_THEMES = [
  { id: 'complain', icon: '😔', name: 'Пожаловаться на день', online: 4 },
  { id: 'brag', icon: '🎉', name: 'Похвастаться успехом', online: 2 },
  { id: 'advice', icon: '🤔', name: 'Нужен совет', online: 6 },
  { id: 'chat', icon: '💭', name: 'Просто поболтать', online: 12 },
  { id: 'night', icon: '🌙', name: 'Не могу уснуть', online: 3 }
];

const mapConfig = {
  walk: {
    name: 'ПРОГУЛЯТЬСЯ',
    logoClass: 'walk-logo',
    headerClass: 'walk-header',
    backClass: 'walk-back',
    avatarClass: 'walk-avatar',
    screenClass: 'walk-screen',
    mapId: 'walkMap',
    sliderClass: 'walk-slider',
    sliderHeaderClass: 'slider-header',
    sliderStatsClass: 'slider-stats',
    sliderBodyClass: 'slider-body',
    sliderHandleClass: 'slider-handle',
    color: '#6C5CE7',
    requestTimeoutSec: 60
  },
  ride: {
    name: 'ПОПУТЧИКИ',
    logoClass: 'ride-logo',
    headerClass: 'ride-header',
    backClass: 'ride-back',
    avatarClass: 'ride-avatar',
    screenClass: 'ride-screen',
    mapId: 'rideMap',
    sliderClass: 'ride-slider',
    sliderHeaderClass: 'ride-slider-header',
    sliderStatsClass: 'ride-slider-stats',
    sliderBodyClass: 'ride-slider-body',
    sliderHandleClass: 'ride-slider-handle',
    color: '#4D6CFF',
    requestTimeoutSec: 300
  }
};
// ============================================================
// КОНСТАНТЫ ДЛЯ СОЗДАНИЯ ЗАЯВОК
// ============================================================

// Walk — когда
const WALK_WHEN_OPTIONS = ['Сейчас', 'Сегодня в 18:00', 'Завтра'];

// Walk — радиусы
const WALK_RADII = [
  { value: 1000, label: '1 км' },
  { value: 3000, label: '3 км' },
  { value: 5000, label: '5 км' },
  { value: 10000, label: '10 км' }
];

// Ride — когда
const RIDE_WHEN_OPTIONS = ['Сейчас', 'Сегодня в 18:00', 'Завтра'];

// Ride — быстрые цены (0 = бесплатно)
const RIDE_PRICE_OPTIONS = [0, 500, 1000];

// Ключи localStorage
const LS_MY_WALK_REQUEST = 'meet_my_walk_request';
const LS_MY_RIDE_REQUEST = 'meet_my_ride_request';