import React, { useState } from 'react';
import { Line } from 'react-chartjs-2';
import styles from './TeacherLineChart.module.css';
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
import { useTeacherClassAttendance } from '../../Hooks/useTeacherClassAttendance';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const TeacherLineChart = ({ teacherId, teacherSections, teacherClasses }) => {
  const [currentStatus, setCurrentStatus] = useState('present');
  const { weeklyStats, loading } = useTeacherClassAttendance(teacherId, teacherClasses);

  // Colors for each class
  const classColors = [
    '#4CAF50',  // Green
    '#2196F3',  // Blue
    '#FFC107',  // Yellow
    '#9C27B0',  // Purple
    '#FF5722',  // Orange
    '#00BCD4',  // Cyan
    '#795548'   // Brown
  ];

  const getChartData = () => {
    if (!weeklyStats || !weeklyStats.dates || weeklyStats.dates.length === 0) {
      return {
        labels: [],
        datasets: []
      };
    }

    const statusDataKey = currentStatus;
    const statusLabels = weeklyStats[statusDataKey]?.labels || [];
    const statusData = weeklyStats[statusDataKey]?.data || [];
    const studentTotalsData = weeklyStats.totalStudents?.data || [];
    const hasRecords = weeklyStats.hasRecords || [];
    
    // Convert counts to percentages for each class
    const percentageDatasets = statusLabels.map((className, classIndex) => {
      const rawCounts = statusData[classIndex] || [];
      const studentTotals = studentTotalsData[classIndex] || [];
      
      // Convert counts to percentages
      const percentageData = rawCounts.map((count, dayIndex) => {
        const total = studentTotals[dayIndex] || 0;
        return total > 0 ? Math.round((count / total) * 100) : 0;
      });

      return {
        label: className,
        data: percentageData,
        rawCounts: rawCounts, // Store raw counts for tooltip
        studentTotals: studentTotals, // Store total students for tooltip
        borderColor: classColors[classIndex % classColors.length],
        backgroundColor: classColors[classIndex % classColors.length] + '20',
        tension: 0.4,
        fill: false,
        borderWidth: 2,
        pointBackgroundColor: classColors[classIndex % classColors.length],
        pointRadius: 3,
        pointHoverRadius: 5
      };
    });

    return {
      labels: weeklyStats.dates,
      datasets: percentageDatasets
    };
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
          drawBorder: false,
          color: 'rgba(0, 0, 0, 0.05)'
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
            const dataset = context.dataset;
            const dataIndex = context.dataIndex;
            const hasRecords = weeklyStats.hasRecords?.[dataIndex];
            
            // If no records for this date, show "No attendance data for this day"
            if (hasRecords === false) {
              // Only show once (for the first dataset)
              if (context.datasetIndex === 0) {
                return 'No attendance data for this day';
              }
              return null; // Hide other labels for no-data days
            }
            
            const label = dataset.label || '';
            const percentage = context.raw || 0;
            const rawCount = dataset.rawCounts?.[dataIndex] || 0;
            const totalStudents = dataset.studentTotals?.[dataIndex] || 0;
            
            const statusText = currentStatus === 'present' ? 'Present' : 
                              (currentStatus === 'late' ? 'Late' : 'Absent');
            
            // Format: "7-A: 60% (12/20 students)"
            const studentText = rawCount === 1 ? 'student' : 'students';
            return `${label} ${statusText}: ${percentage}% (${rawCount}/${totalStudents} ${studentText})`;
          },
          // Also need to handle the title to show date
          title: function(tooltipItems) {
            if (tooltipItems.length > 0) {
              const dataIndex = tooltipItems[0].dataIndex;
              const hasRecords = weeklyStats.hasRecords?.[dataIndex];
              
              if (hasRecords === false) {
                return `${weeklyStats.dates[dataIndex]} - No Data`;
              }
              return weeklyStats.dates[dataIndex];
            }
            return '';
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

  const handleStatusChange = (status) => {
    setCurrentStatus(status);
  };

  // Check if there's data to display
  const hasData = weeklyStats && 
                  weeklyStats[currentStatus] && 
                  weeklyStats[currentStatus].data && 
                  weeklyStats[currentStatus].data.length > 0;

  return (
    <div className={styles.teacherLineChartContainer}>
      {/* Status Toggle Buttons */}
      <div className={styles.chartToggle}>
        <button 
          className={currentStatus === 'present' ? styles.active : ''}
          onClick={() => handleStatusChange('present')}
        >
          Present
        </button>
        <button 
          className={currentStatus === 'late' ? styles.active : ''}
          onClick={() => handleStatusChange('late')}
        >
          Late
        </button>
        <button 
          className={currentStatus === 'absent' ? styles.active : ''}
          onClick={() => handleStatusChange('absent')}
        >
          Absent
        </button>
      </div>
      
      <div className={styles.chartWrapper}>
        {loading ? (
          <div className={styles.loading}>Loading trend data...</div>
        ) : !hasData ? (
          <div className={styles.noData}>
            No attendance data available for the selected status
          </div>
        ) : (
          <Line data={getChartData()} options={options} />
        )}
      </div>
    </div>
  );
};

export default TeacherLineChart;