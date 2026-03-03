import { HttpClient, HttpEvent } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class DownloadService {
  constructor(private http: HttpClient) {}

  downloadFile(): Observable<HttpEvent<Blob>> {
    return this.http.get(DOWNLOAD_URL, {
      observe: 'events',
      reportProgress: true,
      responseType: 'blob',
    });
  }
}

export const DOWNLOAD_URL = '/download/100MB.bin';
