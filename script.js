// Pro Weather App JS - features: AQI, Wind Gauge, Sunrise/Sunset, Voice, PWA, Loader, Rain/Snow, Forecast
const apiKey = "abfc3cb0c56e342252c534518e8126d5";

const searchBtn = document.getElementById("searchBtn");
const locBtn = document.getElementById("locBtn");
const voiceBtn = document.getElementById("voiceBtn");
const themeToggle = document.getElementById("themeToggle");
const cityInput = document.getElementById("cityInput");
const weatherInfo = document.getElementById("weatherInfo");
const forecastEl = document.getElementById("forecast");
const loader = document.getElementById("loader");
const rainContainer = document.querySelector(".rain-container");
const snowContainer = document.querySelector(".snow-container");
const aqiValueEl = document.getElementById("aqiValue");
const aqiTextEl = document.getElementById("aqiText");
const sunriseEl = document.getElementById("sunrise");
const sunsetEl = document.getElementById("sunset");
const windLabel = document.getElementById("windLabel");
const needle = document.getElementById("needle");
const installRow = document.getElementById("installRow");
const installBtn = document.getElementById("installBtn");

let deferredPrompt = null;

// PWA install prompt handling
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  installRow.hidden = false;
});
installBtn?.addEventListener('click', async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  const choice = await deferredPrompt.userChoice;
  if (choice.outcome === 'accepted') installRow.hidden = true;
  deferredPrompt = null;
});

// Theme toggle
themeToggle.addEventListener('click', () => {
  document.body.classList.toggle('light');
  document.body.classList.toggle('dark');
  themeToggle.textContent = document.body.classList.contains('light') ? '🌙' : '☀️';
});

// Voice search (Web Speech API)
if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRecognition();
  recognition.lang = 'en-US';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  voiceBtn.addEventListener('click', () => {
    recognition.start();
    voiceBtn.textContent = '🎙️...';
  });

  recognition.onresult = (event) => {
    const text = event.results[0][0].transcript;
    cityInput.value = text;
    recognition.stop();
    voiceBtn.textContent = '🎤';
    searchCity(text);
  };
  recognition.onerror = (e) => {
    console.warn('Voice error', e);
    voiceBtn.textContent = '🎤';
  };
} else {
  voiceBtn.style.display = 'none';
}

// event wiring
searchBtn.addEventListener('click', () => searchCity(cityInput.value.trim()));
cityInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') searchCity(cityInput.value.trim()) });
locBtn.addEventListener('click', () => {
  if (!navigator.geolocation) return alert('Geolocation not supported');
  navigator.geolocation.getCurrentPosition((pos) => {
    fetchByCoords(pos.coords.latitude, pos.coords.longitude);
  }, () => alert('Unable to get location'));
});

// Helpers
function showLoader(on = true) { loader.style.display = on ? 'block' : 'none'; }
function clearEffects(){ rainContainer.innerHTML=''; snowContainer.innerHTML=''; }

// Wind gauge: map speed (m/s) to angle (-90 -> +90) clamp
function setWindGauge(speed){
  const max = 30; // m/s
  const clamped = Math.min(speed, max);
  const angle = -90 + (clamped / max) * 180; // -90 to +90
  needle.setAttribute('transform', `rotate(${angle} 100 90)`);
  windLabel.textContent = `${speed.toFixed(1)} m/s`;
}

// Rain generation
function createRain(count=120){
  rainContainer.innerHTML='';
  for(let i=0;i<count;i++){
    const d = document.createElement('div');
    d.className='rain-drop';
    d.style.left = Math.random()*100 + 'vw';
    d.style.animationDuration = (0.6 + Math.random()*0.8) + 's';
    d.style.opacity = (0.4 + Math.random()*0.6);
    rainContainer.appendChild(d);
  }
}

// Snow generation
function createSnow(count=80){
  snowContainer.innerHTML='';
  for(let i=0;i<count;i++){
    const s = document.createElement('div');
    s.className='snowflake';
    s.style.left = Math.random()*100 + 'vw';
    s.style.animationDuration = (3 + Math.random()*4) + 's';
    s.style.opacity = (0.6 + Math.random()*0.4);
    s.style.width = s.style.height = (4 + Math.random()*8) + 'px';
    snowContainer.appendChild(s);
  }
}

// AQI text mapping (from API's aqi numerical 1-5)
function aqiText(aqi){
  if (aqi === 1) return ['Good','#4CAF50'];
  if (aqi === 2) return ['Fair','#CDDC39'];
  if (aqi === 3) return ['Moderate','#FFC107'];
  if (aqi === 4) return ['Poor','#FF7043'];
  if (aqi === 5) return ['Very Poor','#F44336'];
  return ['Unknown','#999'];
}

// Format unix timestamp to local time string
function formatTime(unix){
  try {
    return new Date(unix * 1000).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
  } catch(e) { return '--:--'; }
}

// Main search logic
async function searchCity(city){
  if (!city) return;
  showLoader(true);
  clearEffects();
  forecastEl.innerHTML = '';
  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&units=metric&appid=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('City not found');
    const data = await res.json();
    await handleWeatherData(data);
  } catch (err) {
    showLoader(false);
    weatherInfo.innerHTML = `<p style="color:yellow">${err.message}</p>`;
    document.body.style.background = 'linear-gradient(to right,#232526,#414345)';
  }
}

// Fetch by coordinates
async function fetchByCoords(lat, lon){
  showLoader(true);
  clearEffects();
  forecastEl.innerHTML = '';
  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Location weather not found');
    const data = await res.json();
    await handleWeatherData(data);
  } catch (err) {
    showLoader(false);
    weatherInfo.innerHTML = `<p style="color:yellow">${err.message}</p>`;
  }
}

// Handle weather object (common)
async function handleWeatherData(data){
  showLoader(false);
  // Basic card
  const name = `${data.name}, ${data.sys.country}`;
  weatherInfo.innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;justify-content:center">
      <img src="https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png" alt="icon">
      <div>
        <h2 style="margin:0">${name}</h2>
        <div style="font-size:18px;margin-top:6px"><strong>${Math.round(data.main.temp)}°C</strong> • ${data.weather[0].description}</div>
      </div>
    </div>
  `;

  // Sunrise/sunset
  sunriseEl.textContent = formatTime(data.sys.sunrise);
  sunsetEl.textContent = formatTime(data.sys.sunset);

  // Wind gauge
  const windSpeed = data.wind?.speed ?? 0;
  setWindGauge(windSpeed);

  // Dynamic background & rain/snow
  const cond = data.weather[0].main.toLowerCase();
  document.body.classList.remove('light'); // keep dark background by default
  if (cond.includes('rain')){
    document.body.style.background = 'linear-gradient(90deg,#373B44,#4286f4)';
    createRain(130);
  } else if (cond.includes('snow')){
    document.body.style.background = 'linear-gradient(90deg,#83a4d4,#b6fbff)';
    createSnow(90);
  } else if (cond.includes('cloud')){
    document.body.style.background = 'linear-gradient(90deg,#757F9A,#D7DDE8)';
  } else if (cond.includes('clear')){
    document.body.style.background = 'linear-gradient(90deg,#f7971e,#ffd200)';
  } else {
    document.body.style.background = 'linear-gradient(90deg,#1d2671,#c33764)';
  }

  // Fetch AQI (needs lat/lon)
  const {lat, lon} = data.coord;
  try {
    const aqiRes = await fetch(`https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${apiKey}`);
    const aqiData = await aqiRes.json();
    const aqiVal = aqiData.list?.[0]?.main?.aqi ?? null; // 1-5
    if (aqiVal !== null){
      const [text, color] = aqiText(aqiVal);
      aqiValueEl.textContent = aqiVal;
      aqiTextEl.textContent = text;
      aqiValueEl.style.color = color;
    } else {
      aqiValueEl.textContent = '--';
      aqiTextEl.textContent = 'AQI N/A';
    }
  } catch(e){
    aqiValueEl.textContent = '--';
    aqiTextEl.textContent = 'AQI N/A';
  }

  // 5-day forecast (OpenWeatherMap 3-hourly => pick daily by selecting every 8th item)
  try {
    const fRes = await fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`);
    const fData = await fRes.json();
    forecastEl.innerHTML = '';
    // choose next 5 distinct days (approx every 8 entries = 24h)
    for (let i = 0; i < 5; i++){
      const item = fData.list[i*8];
      if (!item) continue;
      const day = new Date(item.dt * 1000).toLocaleDateString([], {weekday:'short'});
      forecastEl.innerHTML += `
        <div>
          <div style="font-size:12px">${day}</div>
          <img src="https://openweathermap.org/img/wn/${item.weather[0].icon}.png" alt="">
          <div style="font-weight:600">${Math.round(item.main.temp)}°C</div>
        </div>
      `;
    }
  } catch(e){
    forecastEl.innerHTML = '<div style="grid-column:1/-1">Forecast unavailable</div>';
  }
}

// Register service worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      await navigator.serviceWorker.register('sw.js');
      console.log('SW registered');
    } catch (e) {
      console.warn('SW failed', e);
    }
  });
}
