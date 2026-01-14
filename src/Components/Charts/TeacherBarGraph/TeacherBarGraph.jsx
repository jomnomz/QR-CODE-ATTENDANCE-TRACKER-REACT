import React from 'react';
import styles from './TeacherBarGraph.module.css';
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
import { useTeacherClassAttendance } from '../../Hooks/useTeacherClassAttendance';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const TeacherBarGraph = ({ teacherId, teacherSections, teacherClasses }) => {
  const { classStats, loading } = useTeacherClassAttendance(teacherId, teacherClasses);

  // Calculate percentages for each class
  const calculatePercentages = () => {
    return classStats.map(stat => {
      const total = stat.total || 0;
      const presentPercent = total > 0 ? Math.round((stat.present / total) * 100) : 0;
      const latePercent = total > 0 ? Math.round((stat.late / total) * 100) : 0;
      const absentPercent = total > 0 ? Math.round((stat.absent / total) * 100) : 0;
      
      return {
        className: stat.className,
        present: presentPercent,
        late: latePercent,
        absent: absentPercent,
        presentCount: stat.present,
        lateCount: stat.late,
        absentCount: stat.absent,
        total: stat.total
      };
    });
  };

  const percentageData = calculatePercentages();
  
  // Extract data from real stats
  const classLabels = percentageData.map(stat => stat.className);
  const presentData = percentageData.map(stat => stat.present);
  const lateData = percentageData.map(stat => stat.late);
  const absentData = percentageData.map(stat => stat.absent);

  const data = {
    labels: classLabels,
    datasets: [
      {
        label: 'Present',
        data: presentData,
        backgroundColor: '#4CAF50',
        borderColor: '#4CAF50',
        borderWidth: 1
      },
      {
        label: 'Late',
        data: lateData,
        backgroundColor: '#FFC107',
        borderColor: '#FFC107',
        borderWidth: 1
      },
      {
        label: 'Absent',
        data: absentData,
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
        },
        ticks: {
          font: {
            size: 12
          },
          callback: function(value, index, values) {
            // Truncate long class names
            const label = this.getLabelForValue(value);
            if (label.length > 15) {
              return label.substring(0, 15) + '...';
            }
            return label;
          }
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
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const label = context.dataset.label || '';
            const value = context.raw || 0;
            const dataIndex = context.dataIndex;
            const classStat = percentageData[dataIndex];
            
            // Get count for this status
            let count = 0;
            if (label === 'Present') {
              count = classStat?.presentCount || 0;
            } else if (label === 'Late') {
              count = classStat?.lateCount || 0;
            } else if (label === 'Absent') {
              count = classStat?.absentCount || 0;
            }
            
            // Format: "Present: 60% (6 students)"
            const studentText = count === 1 ? 'student' : 'students';
            return `${label}: ${value}% (${count} ${studentText})`;
          },
          title: function(tooltipItems) {
            const classLabel = tooltipItems[0].label;
            const dataIndex = tooltipItems[0].dataIndex;
            const classStat = percentageData[dataIndex];
            
            if (classStat && classStat.total > 0) {
              return `${classLabel} - Total: ${classStat.total} student${classStat.total !== 1 ? 's' : ''}`;
            }
            return classLabel;
          }
        }
      }
    }
  };

  return (
    <div className={styles.teacherBarGraph}>
      <div className={styles.chartWrapper}>
        {loading ? (
          <div className={styles.loading}>Loading class data...</div>
        ) : classStats.length === 0 ? (
          <div className={styles.noData}>No classes assigned</div>
        ) : (
          <Bar data={data} options={options} />
        )}
      </div>
    </div>
  );
};

export default TeacherBarGraph;