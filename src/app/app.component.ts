import { Component, OnDestroy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule, DecimalPipe } from '@angular/common';
import { DOWNLOAD_URL } from './download.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnDestroy {
  title = 'progress-bar';

  running = false;
  percent = 0;
  loaded = 0;
  total: number | null = null;
  startTime: number | null = null;
  eta: string | null = null;
  error: string | null = null;

  private sub: Subscription | null = null;

  constructor() {}

  async startDownload() {
    this.reset();
    this.running = true;
    this.startTime = Date.now();

    try {
      const urls = [DOWNLOAD_URL, '/test.bin'];
      let lastErr: any = null;
      let res: Response | null = null;

      for (const u of urls) {
        try {
          res = await fetch(u, { mode: 'cors' });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          break;
        } catch (e: any) {
          lastErr = e;
          console.warn(`Fetch failed for ${u}:`, e);
        }
      }

      if (!res) {
        throw lastErr || new Error('All downloads failed');
      }
      if (!res.body) throw new Error('No response body');

      const contentLength = res.headers.get('content-length');
      this.total = contentLength ? parseInt(contentLength, 10) : null;

      const reader = res.body.getReader();
      const chunks: Uint8Array[] = [];
      let done = false;

      while (!done) {
        const { value, done: d } = await reader.read();
        if (value) {
          chunks.push(value);
          this.loaded += value.length;
          if (this.total) {
            this.percent = Math.round((this.loaded / this.total) * 100);
            this.eta = this.computeEta();
          }
        }
        done = !!d;
      }

      const totalLen = chunks.reduce((acc, c) => acc + c.length, 0);
      const merged = new Uint8Array(totalLen);
      let offset = 0;
      for (const c of chunks) {
        merged.set(c, offset);
        offset += c.length;
      }
      const blob = new Blob([merged.buffer]);
      this.saveBlob(blob, 'download.bin');
      this.percent = 100;
      this.running = false;
      this.eta = '0s';
    } catch (err: any) {
      this.error = (err && (err.message || String(err))) || 'Download failed';
      console.error('Download error:', err);
      this.running = false;
    }
  }

  cancel() {
    this.cleanupSubscription();
    this.running = false;
    this.eta = null;
  }

  private reset() {
    this.percent = 0;
    this.loaded = 0;
    this.total = null;
    this.startTime = null;
    this.eta = null;
    this.error = null;
  }

  private computeEta(): string | null {
    if (!this.startTime || !this.total || !this.loaded) return null;
    const now = Date.now();
    const elapsedMs = now - this.startTime;
    const fraction = this.loaded / this.total;
    if (fraction <= 0) return null;
    const estimatedTotalMs = elapsedMs / fraction;
    const remainingMs = Math.max(0, estimatedTotalMs - elapsedMs);
    return this.formatMs(remainingMs);
  }

  private formatMs(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    const s = Math.round(ms / 1000);
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${m}m ${rem}s`;
  }

  private saveBlob(blob: Blob | null, filename: string) {
    if (!blob) return;
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  }

  private cleanupSubscription() {
    if (this.sub) {
      this.sub.unsubscribe();
      this.sub = null;
    }
  }

  ngOnDestroy(): void {
    this.cleanupSubscription();
  }
}
