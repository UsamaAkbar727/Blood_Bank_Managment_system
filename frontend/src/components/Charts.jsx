import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';

const palette = ['#e11d48', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#3b82f6', '#8b5cf6', '#ec4899'];

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
        animation: { duration: 600, easing: 'easeOutQuart' },
        plugins: {
          legend: {
            position: 'bottom',
            labels: { usePointStyle: true, padding: 16, font: { family: 'Plus Jakarta Sans', size: 12 } },
          },
        },
        scales: {
          y: { beginAtZero: true, grid: { color: 'rgba(148,163,184,0.15)' } },
          x: { grid: { display: false } },
        },
        interaction: { intersect: false, mode: 'index' },
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
            backgroundColor: palette.slice(0, values.length),
            borderWidth: 2,
            borderColor: '#ffffff',
            hoverOffset: 8,
          },
        ],
      },
      options: {
        animation: { animateRotate: true, duration: 800 },
        plugins: {
          legend: {
            position: 'bottom',
            labels: { usePointStyle: true, padding: 12, font: { family: 'Plus Jakarta Sans', size: 11 } },
          },
        },
        cutout: '62%',
      },
    });
    return () => chart.destroy();
  }, [labels, values]);

  return <canvas ref={ref} className="w-full" style={{ height }} />;
}
