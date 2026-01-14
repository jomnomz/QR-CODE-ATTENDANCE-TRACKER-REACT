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
import { useGradeAttendanceStats } from '../../Hooks/useGradeAttendanceStats';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const BarGraph = ({ teacherId, teacherSections }) => {
  const { gradeStats, loading } = useGradeAttendanceStats(teacherId, teacherSections);

  // Use sorted mock labels for loading state
  const mockLabels = ['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10'];
  
  const classData = loading ? {
    labels: mockLabels,
    present: [0, 0, 0, 0],
    late: [0, 0, 0, 0],
    absent: [0, 0, 0, 0],
    presentCounts: [0, 0, 0, 0],
    lateCounts: [0, 0, 0, 0],
    absentCounts: [0, 0, 0, 0],
    totalStudents: [0, 0, 0, 0]
  } : gradeStats;

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
        },
        ticks: {
          font: {
            size: 12
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
            
            // Get count for this status
            let count = 0;
            if (label === 'Present') {
              count = classData.presentCounts[dataIndex] || 0;
            } else if (label === 'Late') {
              count = classData.lateCounts[dataIndex] || 0;
            } else if (label === 'Absent') {
              count = classData.absentCounts[dataIndex] || 0;
            }
            
            // Format: "Present: 60% (6 students)"
            const studentText = count === 1 ? 'student' : 'students';
            return `${label}: ${value}% (${count} ${studentText})`;
          },
          title: function(tooltipItems) {
            const gradeLabel = tooltipItems[0].label;
            const dataIndex = tooltipItems[0].dataIndex;
            const totalStudents = classData.totalStudents?.[dataIndex] || 0;
            
            // Show grade and total students in title
            if (totalStudents > 0) {
              return `${gradeLabel} - Total: ${totalStudents} student${totalStudents !== 1 ? 's' : ''}`;
            }
            return gradeLabel;
          }
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