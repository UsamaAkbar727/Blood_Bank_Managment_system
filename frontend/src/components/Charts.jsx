import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';

export function LineChart({ labels = [], datasets = [], height = 220 }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) return undefined;
    const chart = new Chart(ref.current, {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 300 },
        plugins: { legend: { position: 'bottom' } },
        scales: { y: { beginAtZero: true } },
      },
    });
    return () => chart.destroy();
  }, [labels, datasets]);

  return <canvas ref={ref} className="w-full" style={{ height }} />;
}

export function DoughnutChart({ labels = [], values = [], height = 220 }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current) return undefined;
    const chart = new Chart(ref.current, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [
          {
            data: values,
            backgroundColor: ['#ef4444', '#f97316', '#f59e0b', '#22c55e', '#14b8a6', '#3b82f6', '#6366f1', '#8b5cf6'],
            borderWidth: 0,
          },
        ],
      },
      options: { plugins: { legend: { position: 'bottom' } }, cutout: '55%' },
    });
    return () => chart.destroy();
  }, [labels, values]);

  return <canvas ref={ref} className="w-full" style={{ height }} />;
}
