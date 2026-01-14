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
import { useWeeklyAttendanceStats } from '../../Hooks/useWeeklyAttendanceStats';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const LineChart = ({ teacherId, teacherSections }) => {
  const { weeklyStats, loading } = useWeeklyAttendanceStats(teacherId, teacherSections);

  // Generate dates for the last 5 days (for loading/fallback)
  const generateDates = () => {
    const dates = [];
    for (let i = 4; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      dates.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
    }
    return dates;
  };

  // Use real data or loading state
  const dates = loading ? generateDates() : weeklyStats.dates;
  const presentData = loading ? [0, 0, 0, 0, 0] : weeklyStats.present;
  const lateData = loading ? [0, 0, 0, 0, 0] : weeklyStats.late;
  const absentData = loading ? [0, 0, 0, 0, 0] : weeklyStats.absent;
  const presentCounts = loading ? [0, 0, 0, 0, 0] : weeklyStats.presentCounts;
  const lateCounts = loading ? [0, 0, 0, 0, 0] : weeklyStats.lateCounts;
  const absentCounts = loading ? [0, 0, 0, 0, 0] : weeklyStats.absentCounts;
  const hasRecords = loading ? [true, true, true, true, true] : weeklyStats.hasRecords;

  const data = {
    labels: dates,
    datasets: [
      {
        label: 'Present',
        data: presentData,
        borderColor: '#4CAF50',
        backgroundColor: 'transparent',
        tension: 0.4,
        borderWidth: 2,
        pointBackgroundColor: '#4CAF50'
      },
      {
        label: 'Late',
        data: lateData,
        borderColor: '#FFC107',
        backgroundColor: 'transparent',
        tension: 0.4,
        borderWidth: 2,
        pointBackgroundColor: '#FFC107'
      },
      {
        label: 'Absent',
        data: absentData,
        borderColor: '#F44336',
        backgroundColor: 'transparent',
        tension: 0.4,
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
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const dataIndex = context.dataIndex;
            const label = context.dataset.label || '';
            const value = context.raw || 0;
            
            // If no records for this date, show different message
            if (hasRecords[dataIndex] === false) {
              // Only show once (for the first dataset)
              if (context.datasetIndex === 0) {
                return 'No attendance data for this day';
              }
              return null; // Hide other labels for no-data days
            }
            
            // Get count for this specific status
            let count = 0;
            if (label === 'Present') count = presentCounts[dataIndex] || 0;
            else if (label === 'Late') count = lateCounts[dataIndex] || 0;
            else if (label === 'Absent') count = absentCounts[dataIndex] || 0;
            
            // Format: "Present: 60% (6 students)"
            const studentText = count === 1 ? 'student' : 'students';
            return `${label}: ${value}% (${count} ${studentText})`;
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
        tension: 0.4
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