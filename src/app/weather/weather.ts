import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WeatherService } from '../weather.service';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-weather',
  imports: [CommonModule, FormsModule, InputTextModule, ButtonModule, CardModule],
  templateUrl: './weather.html',
  styleUrl: './weather.scss'
})
export class WeatherComponent implements OnDestroy {

  cityName: string = '';
  weatherData: any = null;
  searchHistory: string[] = [];
  isLoading: boolean = false;

  // Forecast data
  hourlyForecast: any[] = [];
  weeklyForecast: any[] = [];
  hourlyChartPoints: string = '';

  // City local time
  cityTime: string = '';
  cityDate: string = '';
  private clockInterval: any = null;
  private timezoneOffset: number = 0; // in seconds from UTC

  constructor(private weatherService: WeatherService) {
    this.loadHistory();
  }

  searchWeather() {
    if (!this.cityName.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Wala ka naman nilagay ya eh!',
        text: 'Ano hulaan ko yan? Lagay mo naman yung city name ya.',
        confirmButtonColor: '#7c3aed'
      });
      return;
    }
    this.isLoading = true;
    this.weatherService.getWeather(this.cityName).subscribe({
      next: (data: any) => {
        this.weatherData = data;
        this.isLoading = false;
        this.saveToHistory(this.cityName);
        // Set city timezone and start clock
        this.timezoneOffset = data.timezone; // seconds offset from UTC
        this.startCityClock();
        // Fetch forecast
        this.weatherService.getForecast(this.cityName).subscribe({
          next: (forecastData: any) => {
            this.processForecast(forecastData);
          },
          error: () => {}
        });
      },
      error: (err: any) => {
        this.isLoading = false;
        Swal.fire({
          icon: 'error',
          title: 'Nung lugar yan ya',
          text: 'Lala ah typo ka ba?',
          confirmButtonColor: '#7c3aed'
        });
      }
    });
  }

  startCityClock() {
    if (this.clockInterval) {
      clearInterval(this.clockInterval);
    }
    this.updateCityTime();
    this.clockInterval = setInterval(() => this.updateCityTime(), 1000);
  }

  updateCityTime() {
    const nowUTC = Date.now();
    const cityMs = nowUTC + this.timezoneOffset * 1000;
    const cityDate = new Date(cityMs);

    const hours = cityDate.getUTCHours();
    const minutes = cityDate.getUTCMinutes().toString().padStart(2, '0');
    const seconds = cityDate.getUTCSeconds().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const h12 = hours % 12 === 0 ? 12 : hours % 12;

    this.cityTime = `${h12}:${minutes}:${seconds} ${ampm}`;

    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    this.cityDate = `${days[cityDate.getUTCDay()]}, ${months[cityDate.getUTCMonth()]} ${cityDate.getUTCDate()}, ${cityDate.getUTCFullYear()}`;
  }

  processForecast(data: any) {
    const list: any[] = data.list;

    // --- HOURLY: next 9 entries (3-hour intervals) ---
    const hourly = list.slice(0, 9);
    this.hourlyForecast = hourly.map((item: any) => {
      const dt = new Date(item.dt * 1000);
      const hours = dt.getHours();
      const ampm = hours >= 12 ? 'p.m' : 'a.m';
      const h12 = hours % 12 === 0 ? 12 : hours % 12;
      return {
        time: `${h12} ${ampm}`,
        temp: Math.round(item.main.temp),
        icon: item.weather[0].icon,
        pop: Math.round((item.pop || 0) * 100)
      };
    });

    // Build SVG chart line from hourly temps
    this.buildChartPoints();

    // --- WEEKLY: one per day (pick midday entry) ---
    const dayMap = new Map<string, any>();
    list.forEach((item: any) => {
      const dt = new Date(item.dt * 1000);
      const dayKey = dt.toDateString();
      const hour = dt.getHours();
      if (!dayMap.has(dayKey) || Math.abs(hour - 12) < Math.abs(new Date(dayMap.get(dayKey).dt * 1000).getHours() - 12)) {
        dayMap.set(dayKey, item);
      }
    });

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    this.weeklyForecast = Array.from(dayMap.values()).slice(0, 7).map((item: any, idx: number) => {
      const dt = new Date(item.dt * 1000);
      return {
        day: idx === 0 ? 'Today' : dayNames[dt.getDay()],
        temp: Math.round(item.main.temp),
        icon: item.weather[0].icon,
        pop: Math.round((item.pop || 0) * 100)
      };
    });
  }

  buildChartPoints() {
    if (this.hourlyForecast.length === 0) return;
    const temps = this.hourlyForecast.map(h => h.temp);
    const minT = Math.min(...temps);
    const maxT = Math.max(...temps);
    const range = maxT - minT || 1;
    const w = 600;
    const h = 80;
    const pad = 15;
    const points = temps.map((t, i) => {
      const x = (i / (temps.length - 1)) * (w - pad * 2) + pad;
      const y = h - pad - ((t - minT) / range) * (h - pad * 2);
      return `${x},${y}`;
    });
    this.hourlyChartPoints = points.join(' ');
  }

  saveToHistory(city: string) {
    if (!this.searchHistory.includes(city)) {
      this.searchHistory.unshift(city);
      if (this.searchHistory.length > 5) {
        this.searchHistory.pop();
      }
      localStorage.setItem('searchHistory', JSON.stringify(this.searchHistory));
    }
  }

  loadHistory() {
    const history = localStorage.getItem('searchHistory');
    if (history) {
      this.searchHistory = JSON.parse(history);
    }
  }

  searchFromHistory(city: string) {
    this.cityName = city;
    this.searchWeather();
  }

  clearHistory() {
    Swal.fire({
      icon: 'question',
      title: 'Delete na ya?',
      text: 'Sige na, click mo na!',
      showCancelButton: true,
      confirmButtonColor: '#7c3aed',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, clear it!'
    }).then((result) => {
      if (result.isConfirmed) {
        this.searchHistory = [];
        localStorage.removeItem('searchHistory');
      }
    });
  }

  ngOnDestroy() {
    if (this.clockInterval) {
      clearInterval(this.clockInterval);
    }
  }
}