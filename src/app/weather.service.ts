import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment.development';

@Injectable({
  providedIn: 'root'
})
export class WeatherService {

  constructor(private http: HttpClient) { }

  getWeather(city: string): Observable<any> {
    const url = `${environment.weatherApiUrl}/weather?q=${city}&appid=${environment.weatherApiKey}&units=metric`;
    return this.http.get<any>(url);
  }

  getForecast(city: string): Observable<any> {
    const url = `${environment.weatherApiUrl}/forecast?q=${city}&appid=${environment.weatherApiKey}&units=metric`;
    return this.http.get<any>(url);
  }
}