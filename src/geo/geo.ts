export interface GeoLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  source: 'browser' | 'ip';
}

export class AuraGeo {
  private _cached: GeoLocation | null = null;
  private _watchId: number | null = null;

  getLocation(): GeoLocation | null { return this._cached; }

  async detect(): Promise<GeoLocation> {
    const perm = await this.checkPermission();
    return perm === 'granted' ? this._browser() : this._ip();
  }

  async checkPermission(): Promise<PermissionState> {
    try { return (await navigator.permissions.query({ name: 'geolocation' })).state; } catch { return 'prompt'; }
  }

  async requestPermission(): Promise<GeoLocation> { return this._browser(); }

  watch(fn: (loc: GeoLocation) => void): () => void {
    this._watchId = navigator.geolocation.watchPosition(
      pos => {
        const loc: GeoLocation = { latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy, source: 'browser' };
        this._cached = loc;
        fn(loc);
      },
      undefined,
      { enableHighAccuracy: true }
    );
    return () => this.unwatch();
  }

  unwatch(): void {
    if (this._watchId !== null) { navigator.geolocation.clearWatch(this._watchId); this._watchId = null; }
  }

  distance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    // Haversine formula — returns km
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  distanceFrom(lat: number, lon: number): number | null {
    if (!this._cached) return null;
    return this.distance(this._cached.latitude, this._cached.longitude, lat, lon);
  }

  private _browser(): Promise<GeoLocation> {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        pos => {
          const loc: GeoLocation = { latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy, source: 'browser' };
          this._cached = loc;
          resolve(loc);
        },
        async () => { try { resolve(await this._ip()); } catch (e) { reject(e); } },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  }

  private async _ip(): Promise<GeoLocation> {
    const res = await fetch('https://ipapi.co/json/');
    if (!res.ok) throw new Error('Failed to detect location');
    const data = await res.json();
    const loc: GeoLocation = { latitude: data.latitude, longitude: data.longitude, source: 'ip' };
    this._cached = loc;
    return loc;
  }
}
