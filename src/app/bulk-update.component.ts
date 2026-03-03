import { Component, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';

@Component({
  selector: 'app-bulk-update',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bulk-wrapper">
      <h2>Bulk Update POC (100k rows)</h2>
      <p>Click start to simulate updating 100k rows on server</p>
      <button class="button-primary" (click)="start()" [disabled]="running">
        Start Bulk Update
      </button>
      <button *ngIf="running" (click)="cancel()">Cancel</button>
      <div class="error" *ngIf="error">{{ error }}</div>
    </div>

    <div class="progress-overlay" *ngIf="running">
      <div class="overlay-inner">
        <h2>Updating records…</h2>
        <div class="progress">
          <div class="progress-bar" [style.width.%]="percent"></div>
        </div>
        <div class="meta">
          <span *ngIf="total"
            >{{ percent }}% • {{ processed | number }} /
            {{ total | number }}</span
          >
          <span *ngIf="!total">{{ processed | number }} items</span>
          <span *ngIf="eta"> • ETA: {{ eta }}</span>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .bulk-wrapper {
        padding: 1rem;
      }
      .button-primary {
        padding: 0.5rem 1rem;
        margin-right: 0.5rem;
      }
      .progress-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.6);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
      }
      .overlay-inner {
        background: #fff;
        padding: 1.25rem 1.5rem;
        border-radius: 8px;
        width: min(520px, 95%);
        text-align: center;
      }
      .progress {
        background: #eee;
        height: 18px;
        border-radius: 9px;
        overflow: hidden;
        margin: 0.75rem 0;
      }
      .progress-bar {
        height: 100%;
        background: linear-gradient(90deg, #4facfe, #00f2fe);
        width: 0%;
        transition: width 0.15s linear;
      }
      .meta {
        color: #333;
        font-size: 0.9rem;
      }
      .error {
        color: #b00020;
        font-weight: 600;
      }
    `,
  ],
})
export class BulkUpdateComponent implements OnDestroy {
  running = false;
  processed = 0;
  total = 0;
  percent = 0;
  startTime = 0;
  eta = '';
  error = '';
  private controller: AbortController | null = null;
  private xhr: XMLHttpRequest | null = null;

  constructor(private cdr: ChangeDetectorRef) {}

  start() {
    this.error = '';
    this.running = true;
    this.processed = 0;
    this.total = 0;
    this.percent = 0;
    this.startTime = Date.now();
    this.controller = new AbortController();

    // Use XMLHttpRequest so the Network tab shows a persistent XHR entry while streaming
    console.log('BulkUpdate: starting XHR to /mock/bulk-update');
    this.xhr = new XMLHttpRequest();
    this.xhr.open('GET', '/mock/bulk-update');
    this.xhr.responseType = 'text';

    let lastLen = 0;

    this.xhr.onprogress = () => {
      try {
        const text = this.xhr!.responseText || '';
        const chunk = text.slice(lastLen);
        console.log(
          'BulkUpdate:onprogress chunkLen=',
          chunk.length,
          'textLen=',
          text.length,
          'lastLen=',
          lastLen,
        );
        lastLen = text.length;
        const lines = chunk.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          try {
            const obj = JSON.parse(trimmed);
            console.log('BulkUpdate: parsed obj', obj);
            if (obj.total) this.total = obj.total;
            if (obj.processed !== undefined) this.processed = obj.processed;
            if (obj.done) {
              this.percent = 100;
              this.running = false;
              this.updateEta(true);
              this.xhr!.abort();
            } else {
              this.percent = this.total
                ? Math.round((this.processed / this.total) * 100)
                : 0;
              this.updateEta(false);
            }
          } catch (e) {
            console.error('parse error', e);
          }
        }
        // ensure UI updates since XHR callbacks run outside zone
        this.cdr.detectChanges();
      } catch (e) {
        console.error('onprogress error', e);
      }
    };

    this.xhr.onload = () => {
      // final parse in case anything remains
      try {
        const text = this.xhr!.responseText || '';
        console.log(
          'BulkUpdate:onload totalTextLen=',
          text.length,
          'lastLen=',
          lastLen,
        );
        const rest = text.slice(lastLen).trim();
        if (rest) {
          const lines = rest.split('\n');
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            const obj = JSON.parse(trimmed);
            console.log('BulkUpdate: onload parsed obj', obj);
            if (obj.total) this.total = obj.total;
            if (obj.processed !== undefined) this.processed = obj.processed;
          }
        }
      } catch (e) {
        console.error('onload parse error', e);
      }
      this.percent = this.total
        ? Math.round((this.processed / this.total) * 100)
        : this.percent;
      this.running = false;
      this.updateEta(true);
      this.cdr.detectChanges();
    };

    this.xhr.onerror = () => {
      this.error = 'Network error';
      this.running = false;
      this.cdr.detectChanges();
    };

    this.xhr.send();
  }

  cancel() {
    if (this.controller) {
      this.controller.abort();
      this.controller = null;
    }
    if (this.xhr) {
      try {
        this.xhr.abort();
      } catch (e) {
        // ignore
      }
      this.xhr = null;
    }
    this.running = false;
    this.cdr.detectChanges();
  }

  updateEta(finished: boolean) {
    if (!this.startTime || !this.total) {
      this.eta = '';
      return;
    }
    const elapsed = (Date.now() - this.startTime) / 1000;
    if (finished) {
      this.eta = '0s';
      return;
    }
    const rate = this.processed / Math.max(1, elapsed);
    const remaining = Math.max(0, this.total - this.processed);
    const secs = rate > 0 ? Math.round(remaining / rate) : 0;
    this.eta = this.formatSecs(secs);
  }

  formatSecs(s: number) {
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${m}m ${rem}s`;
  }

  ngOnDestroy() {
    this.cancel();
  }
}
