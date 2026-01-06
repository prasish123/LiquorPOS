import { Injectable, Logger } from '@nestjs/common';

export interface Counter {
  name: string;
  value: number;
  labels?: Record<string, string>;
}

export interface Gauge {
  name: string;
  value: number;
  labels?: Record<string, string>;
}

export interface Histogram {
  name: string;
  values: number[];
  labels?: Record<string, string>;
}

@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);

  private counters: Map<string, Counter> = new Map();
  private gauges: Map<string, Gauge> = new Map();
  private histograms: Map<string, Histogram> = new Map();

  /**
   * Increment a counter
   */
  incrementCounter(name: string, value = 1, labels?: Record<string, string>): void {
    const key = this.getKey(name, labels);
    const existing = this.counters.get(key);

    if (existing) {
      existing.value += value;
    } else {
      this.counters.set(key, { name, value, labels });
    }
  }

  /**
   * Set a gauge value
   */
  setGauge(name: string, value: number, labels?: Record<string, string>): void {
    const key = this.getKey(name, labels);
    this.gauges.set(key, { name, value, labels });
  }

  /**
   * Increment a gauge
   */
  incrementGauge(name: string, value = 1, labels?: Record<string, string>): void {
    const key = this.getKey(name, labels);
    const existing = this.gauges.get(key);

    if (existing) {
      existing.value += value;
    } else {
      this.gauges.set(key, { name, value, labels });
    }
  }

  /**
   * Decrement a gauge
   */
  decrementGauge(name: string, value = 1, labels?: Record<string, string>): void {
    const key = this.getKey(name, labels);
    const existing = this.gauges.get(key);

    if (existing) {
      existing.value -= value;
    } else {
      this.gauges.set(key, { name, value: -value, labels });
    }
  }

  /**
   * Record a histogram value
   */
  recordHistogram(name: string, value: number, labels?: Record<string, string>): void {
    const key = this.getKey(name, labels);
    const existing = this.histograms.get(key);

    if (existing) {
      existing.values.push(value);

      // Keep only last 1000 values
      if (existing.values.length > 1000) {
        existing.values.shift();
      }
    } else {
      this.histograms.set(key, { name, values: [value], labels });
    }
  }

  /**
   * Get a counter value
   */
  getCounter(name: string, labels?: Record<string, string>): number {
    const key = this.getKey(name, labels);
    return this.counters.get(key)?.value || 0;
  }

  /**
   * Get a gauge value
   */
  getGauge(name: string, labels?: Record<string, string>): number {
    const key = this.getKey(name, labels);
    return this.gauges.get(key)?.value || 0;
  }

  /**
   * Get histogram statistics
   */
  getHistogramStats(
    name: string,
    labels?: Record<string, string>,
  ): {
    count: number;
    sum: number;
    avg: number;
    min: number;
    max: number;
    p50: number;
    p95: number;
    p99: number;
  } | null {
    const key = this.getKey(name, labels);
    const histogram = this.histograms.get(key);

    if (!histogram || histogram.values.length === 0) {
      return null;
    }

    const sorted = [...histogram.values].sort((a, b) => a - b);
    const sum = sorted.reduce((acc, v) => acc + v, 0);

    return {
      count: sorted.length,
      sum,
      avg: sum / sorted.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      p50: this.percentile(sorted, 0.5),
      p95: this.percentile(sorted, 0.95),
      p99: this.percentile(sorted, 0.99),
    };
  }

  /**
   * Get all counters
   */
  getAllCounters(): Counter[] {
    return Array.from(this.counters.values());
  }

  /**
   * Get all gauges
   */
  getAllGauges(): Gauge[] {
    return Array.from(this.gauges.values());
  }

  /**
   * Get all histograms
   */
  getAllHistograms(): {
    name: string;
    labels?: Record<string, string>;
    stats: any;
  }[] {
    return Array.from(this.histograms.values()).map((h) => ({
      name: h.name,
      labels: h.labels,
      stats: this.getHistogramStats(h.name, h.labels),
    }));
  }

  /**
   * Get all metrics in Prometheus format
   */
  getPrometheusMetrics(): string {
    const lines: string[] = [];

    // Counters
    for (const counter of this.counters.values()) {
      const labels = this.formatLabels(counter.labels);
      lines.push(`${counter.name}${labels} ${counter.value}`);
    }

    // Gauges
    for (const gauge of this.gauges.values()) {
      const labels = this.formatLabels(gauge.labels);
      lines.push(`${gauge.name}${labels} ${gauge.value}`);
    }

    // Histograms
    for (const histogram of this.histograms.values()) {
      const stats = this.getHistogramStats(histogram.name, histogram.labels);
      if (stats) {
        const labels = this.formatLabels(histogram.labels);
        lines.push(`${histogram.name}_count${labels} ${stats.count}`);
        lines.push(`${histogram.name}_sum${labels} ${stats.sum}`);
        lines.push(`${histogram.name}_avg${labels} ${stats.avg}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.counters.clear();
    this.gauges.clear();
    this.histograms.clear();
  }

  /**
   * Generate a unique key for a metric with labels
   */
  private getKey(name: string, labels?: Record<string, string>): string {
    if (!labels || Object.keys(labels).length === 0) {
      return name;
    }

    const labelStr = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join(',');

    return `${name}{${labelStr}}`;
  }

  /**
   * Format labels for Prometheus
   */
  private formatLabels(labels?: Record<string, string>): string {
    if (!labels || Object.keys(labels).length === 0) {
      return '';
    }

    const labelStr = Object.entries(labels)
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');

    return `{${labelStr}}`;
  }

  /**
   * Calculate percentile
   */
  private percentile(sortedArray: number[], percentile: number): number {
    if (sortedArray.length === 0) return 0;

    const index = Math.ceil(sortedArray.length * percentile) - 1;
    return sortedArray[Math.max(0, index)];
  }
}
