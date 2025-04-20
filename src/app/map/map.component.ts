import { AfterViewInit, ChangeDetectorRef, Component } from '@angular/core';
import * as L from 'leaflet';

@Component({
  selector: 'app-map',
  standalone: false,
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css'],
})
export class MapComponent implements AfterViewInit {
  private trailPolyline: L.Polyline | null = null;
  private trailCoordinates: L.LatLng[] = [];
  private map!: L.Map;
  private catMarker!: L.Marker;
  private startPointPopup!: L.Marker<any>;
  private endPointPopup!: L.Marker<any>;
  private intervalId: any;

  isStarted = false;
  isPaused = false;
  isFinished = false;
  isCoordinatesDefined = false;

  speedKmH = 5;

  startLat = 38.777803;
  startLng = -9.102932;
  endLat = 38.775118;
  endLng = -9.091999;

  keepCentered = true;
  showTrail = true;

  private currentLat!: number;
  private currentLng!: number;
  private currentStep = 0;
  private latStep = 0;
  private lngStep = 0;
  private totalSteps = 0;
  private distance = 0;

  constructor(private cd: ChangeDetectorRef) {}

  ngAfterViewInit(): void {
    this.initMap();
  }

  initMap(): void {
    this.map = L.map('map').setView([this.startLat, this.startLng], 15);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(this.map);

    const startIcon = L.icon({
      iconUrl: 'https://cdn-icons-png.flaticon.com/512/252/252106.png',
      iconSize: [30, 30],
      iconAnchor: [15, 30],
    });

    const endIcon = L.icon({
      iconUrl: 'https://cdn-icons-png.flaticon.com/512/4744/4744812.png',
      iconSize: [30, 30],
      iconAnchor: [15, 30],
    });

    this.startPointPopup = L.marker([this.startLat, this.startLng], {
      icon: startIcon,
      zIndexOffset: 1,
    })
      .addTo(this.map)
      .bindPopup('📍 Starting Point');

    this.endPointPopup = L.marker([this.endLat, this.endLng], {
      icon: endIcon,
      zIndexOffset: 2,
    })
      .addTo(this.map)
      .bindPopup('🏁 End Point');

    const catIcon = L.icon({
      iconUrl: 'https://cdn-icons-png.flaticon.com/512/616/616596.png',
      iconSize: [40, 40],
      iconAnchor: [20, 40],
      className: 'cat-icon-top',
    });

    this.catMarker = L.marker([this.startLat, this.startLng], {
      icon: catIcon,
      zIndexOffset: 100,
    }).addTo(this.map);

    this.catMarker.on('mouseover', () => {
      this.catMarker
        .bindTooltip(this.getTooltipContent(), {
          direction: 'top',
          className: 'cat-tooltip',
          offset: L.point(0, -45),
          sticky: true,
        })
        .openTooltip();
    });

    this.catMarker.on('mouseout', () => {
      this.catMarker.closeTooltip();
    });
  }

  startAnimation(): void {
    if (this.intervalId) clearInterval(this.intervalId);

    this.isStarted = true;
    this.isPaused = false;
    this.isFinished = false;

    this.startPointPopup.closePopup();

    const start = L.latLng(this.startLat, this.startLng);
    const end = L.latLng(this.endLat, this.endLng);
    this.distance = start.distanceTo(end);

    const speed = (this.speedKmH * 1000) / 3600;
    const duration = this.distance / speed;
    this.totalSteps = duration / 0.1;

    this.latStep = (this.endLat - this.startLat) / this.totalSteps;
    this.lngStep = (this.endLng - this.startLng) / this.totalSteps;
    this.currentStep = 0;
    this.currentLat = this.startLat;
    this.currentLng = this.startLng;

    this.catMarker.setLatLng([this.currentLat, this.currentLng]);

    this.runAnimation();
  }

  runAnimation(): void {
    this.intervalId = setInterval(() => {
      if (this.isPaused) return;

      this.currentStep++;

      if (this.currentStep >= this.totalSteps) {
        clearInterval(this.intervalId);
        this.isFinished = true;
        this.isPaused = false;
        this.endPointPopup.closePopup();
        return;
      }

      this.currentLat += this.latStep;
      this.currentLng += this.lngStep;

      const newPosition = L.latLng(this.currentLat, this.currentLng);
      this.catMarker.setLatLng(newPosition);

      this.trailCoordinates.push(newPosition);
      if (this.trailPolyline) {
        this.trailCoordinates.push(L.latLng(this.startLat, this.startLng));
        this.trailPolyline.setLatLngs(this.trailCoordinates);
      } else {
        this.trailPolyline = L.polyline(this.trailCoordinates, {
          color: 'gray',
          weight: 5,
          opacity: this.showTrail ? 0.7 : 0,
        }).addTo(this.map);
      }

      if ((this.catMarker as any)._tooltip) {
        this.catMarker.setTooltipContent(this.getTooltipContent());
      }

      if (this.keepCentered) {
        this.map.panTo(newPosition);
      }
    }, 100);
  }

  updateSpeed(): void {
    if (!this.intervalId || this.currentStep >= this.totalSteps) return;

    const remainingDistance =
      this.distance - (this.distance * this.currentStep) / this.totalSteps;
    const speedMetersPerSeconds = (this.speedKmH * 1000) / 3600;
    const durationSeconds = remainingDistance / speedMetersPerSeconds;
    const newTotalSteps = durationSeconds / 0.1;

    this.latStep = (this.endLat - this.currentLat) / newTotalSteps;
    this.lngStep = (this.endLng - this.currentLng) / newTotalSteps;
    this.totalSteps = this.currentStep + newTotalSteps;
  }

  togglePause(): void {
    this.isPaused = !this.isPaused;
  }

  updateShowTrail(): void {
    if (this.trailPolyline) {
      this.trailPolyline.setStyle({
        opacity: this.showTrail ? 0.7 : 0,
      });
    }
  }

  updateCoordinates(): void {
    this.isCoordinatesDefined = true;
    this.startPointPopup.setLatLng([this.startLat, this.startLng]);
    this.endPointPopup.setLatLng([this.endLat, this.endLng]);
    this.resetToStart();
  }

  defineCoordinates(): void {
    this.isCoordinatesDefined = false;
  }

  resetToStart(): void {
    this.currentLat = this.startLat;
    this.currentLng = this.startLng;
    this.startPointPopup.closePopup();
    this.catMarker.setLatLng([this.startLat, this.startLng]);

    if (this.keepCentered) {
      this.map.panTo([this.startLat, this.startLng]);
    }

    this.isStarted = false;
    this.isPaused = false;
    this.isFinished = false;

    if (this.intervalId) clearInterval(this.intervalId);

    this.trailCoordinates = [];

    if (this.trailPolyline) {
      this.map.removeLayer(this.trailPolyline);
      this.trailPolyline = null;
    }
  }

  getTooltipContent(): string {
    const distanceTraveled =
      this.distance * (this.currentStep / this.totalSteps);
    const remaining = this.distance - distanceTraveled;

    if (!this.isStarted && !this.isFinished) {
      return `
        🐱 Waiting...
      `;
    }

    if (this.isFinished) {
      return `
        🐱🏁 Finished!
    `;
    }

    return `
      🐾 Speed: ${this.speedKmH} Km/h<br>
      🏁 Distance: ${this.distance.toFixed(0)} m<br>
      📏 Travelled Distance: ${distanceTraveled.toFixed(0)} m<br>
      ⏳ Remaining Distance: ${remaining.toFixed(0)} m
    `;
  }
}
