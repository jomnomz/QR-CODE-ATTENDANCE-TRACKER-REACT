import React from 'react';
import { Doughnut } from 'react-chartjs-2';
import styles from './PieChart.module.css'
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { useAttendanceStats } from '../../Hooks/useAttendanceStats';

ChartJS.register(ArcElement, Tooltip, Legend);

const PieChart = ({ teacherId, teacherSections }) => {
  const { stats, loading } = useAttendanceStats(teacherId, teacherSections);

  // Calculate percentages
  const total = stats.total || 0;
  const presentPercent = total > 0 ? Math.round((stats.presentCount / total) * 100) : 0;
  const latePercent = total > 0 ? Math.round((stats.lateCount / total) * 100) : 0;
  const absentPercent = total > 0 ? Math.round((stats.absentCount / total) * 100) : 0;

  // Use actual data from the hook
  const data = {
    labels: ['Present', 'Late', 'Absent'],
    datasets: [{
      data: loading ? [0, 0, 0] : [presentPercent, latePercent, absentPercent],
      backgroundColor: ['#4CAF50', '#FFC107', '#F44336'],
      borderWidth: 1,
      hoverBackgroundColor: ['#66BB6A', '#FFD54F', '#EF5350']
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
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const label = context.label || '';
            const value = context.raw || 0;
            
            // Get count for this status
            let count = 0;
            if (label === 'Present') count = stats.presentCount || 0;
            else if (label === 'Late') count = stats.lateCount || 0;
            else if (label === 'Absent') count = stats.absentCount || 0;
            
            // Format: "Present: 60% (6 students)"
            const studentText = count === 1 ? 'student' : 'students';
            return `${label}: ${value}% (${count} ${studentText})`;
          }
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