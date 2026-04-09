import { Component } from '@angular/core';
import { WeatherComponent } from './weather/weather';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [WeatherComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class AppComponent {
  title = 'weather';
}