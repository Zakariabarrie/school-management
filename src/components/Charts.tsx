import { ArcElement, BarElement, CategoryScale, Chart as ChartJS, Filler, Legend, LinearScale, LineElement, PointElement, Tooltip } from 'chart.js';
import type { ChartOptions } from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { themePaint } from '../lib/colours';
import { formatMoney } from '../lib/format';

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, LineElement, PointElement, Filler, Tooltip, Legend);
ChartJS.defaults.font.family = '"Source Sans 3", "Segoe UI", sans-serif';

export function GenderChart({ male, female }: { male: number; female: number }) {
  const paint = themePaint();
  ChartJS.defaults.color = paint.muted;
  const options: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '62%',
    plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, usePointStyle: true } } },
  };
  return (
    <div>
      <div className="chart" aria-hidden="true">
        <Doughnut data={{ labels: ['Male', 'Female'], datasets: [{ data: [male, female], backgroundColor: [paint.button, paint.highlight], borderWidth: 0 }] }} options={options} />
      </div>
      <ul className="sr-only">
        <li>Male students: {male}</li>
        <li>Female students: {female}</li>
      </ul>
    </div>
  );
}

export function AttendanceChart({ labels, values }: { labels: string[]; values: number[] }) {
  const paint = themePaint();
  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: (item) => `${Number(item.parsed.y).toFixed(1)}%` } } },
    scales: {
      y: { min: 80, max: 100, ticks: { callback: (value) => `${value}%` }, grid: { color: paint.line } },
      x: { grid: { display: false } },
    },
  };
  return (
    <div>
      <div className="chart" aria-hidden="true">
        <Line
          data={{
            labels,
            datasets: [{ data: values, borderColor: paint.button, backgroundColor: `${paint.button}22`, fill: true, tension: 0.35, pointRadius: 3 }],
          }}
          options={options}
        />
      </div>
      <ul className="sr-only">
        {labels.map((label, index) => (
          <li key={label}>{label}: {values[index]?.toFixed(1)}%</li>
        ))}
      </ul>
    </div>
  );
}

export function SubjectChart({ labels, values }: { labels: string[]; values: number[] }) {
  const paint = themePaint();
  const options: ChartOptions<'bar'> = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { min: 0, max: 100, grid: { color: paint.line } },
      y: { grid: { display: false } },
    },
  };
  return (
    <div>
      <div className="chart" aria-hidden="true">
        <Bar data={{ labels, datasets: [{ data: values, backgroundColor: paint.highlight, borderRadius: 6, barThickness: 14 }] }} options={options} />
      </div>
      <ul className="sr-only">
        {labels.map((label, index) => (
          <li key={label}>{label} average: {values[index]?.toFixed(1)}</li>
        ))}
      </ul>
    </div>
  );
}

export function FeeChart({ paid, outstanding }: { paid: number; outstanding: number }) {
  const paint = themePaint();
  const options: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '62%',
    plugins: {
      legend: { position: 'bottom', labels: { boxWidth: 10, usePointStyle: true } },
      tooltip: { callbacks: { label: (item) => `${item.label}: ${formatMoney(Number(item.parsed))}` } },
    },
  };
  return (
    <div>
      <div className="chart" aria-hidden="true">
        <Doughnut data={{ labels: ['Paid', 'Outstanding'], datasets: [{ data: [paid, outstanding], backgroundColor: [paint.highlight, paint.warning], borderWidth: 0 }] }} options={options} />
      </div>
      <ul className="sr-only">
        <li>Paid: {formatMoney(paid)}</li>
        <li>Outstanding: {formatMoney(outstanding)}</li>
      </ul>
    </div>
  );
}
