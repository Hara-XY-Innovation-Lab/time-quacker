import { speak } from './speech.js';

const WEATHER_API_KEY = '743cda0db886183f205f62623cac8604';

export async function showWeather(statusEl, timeEl) {
  try {
    const locRes = await fetch('https://ipapi.co/json/');
    const loc = await locRes.json();
    const weatherRes = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${loc.latitude}&lon=${loc.longitude}&units=metric&appid=${WEATHER_API_KEY}`);
    const data = await weatherRes.json();

    const info = `📍 ${loc.city}: ${Math.round(data.main.temp)}°C, ${data.weather[0].description}`;
    const timeStr = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

    statusEl.textContent = info;
    timeEl.textContent = `${info}\n🕑 ${timeStr}`;
    timeEl.classList.remove('hidden');

    speak(`In ${loc.city}, it's ${Math.round(data.main.temp)} degrees and ${data.weather[0].description}. The time is ${timeStr}.`);
    setTimeout(() => timeEl.classList.add('hidden'), 7000);
  } catch (err) {
    statusEl.textContent = 'Failed to fetch weather.';
  }
}
