import React from 'react';
import { Doughnut } from 'react-chartjs-2';
import styles from './PieChart.module.css'
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

const PieChart = () => {
  const data = {
    labels: ['Present', 'Late', 'Absent'],
    datasets: [{
      data: [70, 10, 20],
      backgroundColor: ['#4CAF50', '#FFC107', '#F44336'],
      borderWidth: 1
    }]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '60%',
    plugins: {
      legend: {
        position: 'top',
        align: 'center',
        labels: {
          boxWidth: 12,
          padding: 10,
          font: {
            size: 15
          },
          usePointStyle: true,
          pointStyle: 'circle'
        }
      }
    }
  };

  return (
    <div className={styles.pieChart}>
      <Doughnut data={data} options={options} />
    </div>
  );
};

export default PieChart;