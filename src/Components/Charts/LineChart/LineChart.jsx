import React from 'react';
import { Line } from 'react-chartjs-2';
import styles from './LineChart.module.css'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const LineChart = () => {
  const dates = [];
  for (let i = 4; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    dates.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
  }

  const data = {
    labels: dates,
    datasets: [
      {
        label: 'Present',
        data: [45, 78, 92, 65, 88],
        borderColor: '#4CAF50',
        backgroundColor: 'transparent',
        tension: 0.4, // Increased for curvy lines
        borderWidth: 2,
        pointBackgroundColor: '#4CAF50'
      },
      {
        label: 'Late',
        data: [35, 12, 5, 25, 8],
        borderColor: '#FFC107',
        backgroundColor: 'transparent',
        tension: 0.4, // Increased for curvy lines
        borderWidth: 2,
        pointBackgroundColor: '#FFC107'
      },
      {
        label: 'Absent',
        data: [20, 10, 3, 10, 4],
        borderColor: '#F44336',
        backgroundColor: 'transparent',
        tension: 0.4, // Increased for curvy lines
        borderWidth: 2,
        pointBackgroundColor: '#F44336'
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        grid: {
          display: false,
          drawBorder: false
        },
        ticks: {
          maxRotation: 0,
          minRotation: 0,
          padding: 5,
          autoSkip: false,
          font: {
            size: 10
          }
        }
      },
      y: {
        beginAtZero: true,
        max: 100,
        ticks: {
          stepSize: 20,
          padding: 5,
          callback: function(value) {
            return value + '%';
          }
        },
        grid: {
          drawBorder: false
        }
      }
    },
    plugins: {
      legend: {
        position: 'top',
        labels: {
          boxWidth: 12,
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 15,
          font: {
            size: 12
          }
        }
      }
    },
    elements: {
      point: {
        radius: 3,
        hoverRadius: 5
      },
      line: {
        tension: 0.4 // This makes the lines curvy
      }
    }
  };

  return (
    <div className={styles.lineChartContainer}>
      <div className={styles.chartWrapper}>
        <Line data={data} options={options} />
      </div>
    </div>
  );
};

export default LineChart;