import React from 'react';
import styles from './BarGraph.module.css'
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const BarGraph = () => {
  const classData = {
    labels: ['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'],
    present: [57, 56, 62, 54, 52, 58],
    late: [14, 12, 17, 17, 18, 23],
    absent: [29, 32, 21, 29, 30, 19]
  };

  const data = {
    labels: classData.labels,
    datasets: [
      {
        label: 'Present',
        data: classData.present,
        backgroundColor: '#4CAF50',
        borderColor: '#4CAF50',
        borderWidth: 1
      },
      {
        label: 'Late',
        data: classData.late,
        backgroundColor: '#FFC107',
        borderColor: '#FFC107',
        borderWidth: 1
      },
      {
        label: 'Absent',
        data: classData.absent,
        backgroundColor: '#F44336',
        borderColor: '#F44336',
        borderWidth: 1
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        stacked: true,
        grid: {
          display: false
        }
      },
      y: {
        stacked: true,
        beginAtZero: true,
        max: 100,
        ticks: {
          stepSize: 20,
          padding: 5,
          callback: function(value) {
            return value + '%';
          }
        }
      }
    },
    plugins: {
      legend: {
        position: 'top',
        labels: {
          boxWidth: 12,
          usePointStyle: true,
          pointStyle: 'circle'
        }
      }
    }
  };

  return (
    <div className={styles.barGraph}>
      <div className={styles.chartWrapper}>
        <Bar data={data} options={options} />
      </div>
    </div>
  );
};

export default BarGraph;