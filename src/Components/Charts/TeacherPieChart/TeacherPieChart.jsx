import React from 'react';
import { Doughnut } from 'react-chartjs-2';
import styles from './TeacherPieChart.module.css';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { useTeacherClassAttendance } from '../../Hooks/useTeacherClassAttendance';

ChartJS.register(ArcElement, Tooltip, Legend);

const TeacherPieChart = ({ teacherId, teacherSections, teacherClasses }) => {
  const { overallStats, loading } = useTeacherClassAttendance(teacherId, teacherClasses);

  const data = {
    labels: ['Present', 'Late', 'Absent'],
    datasets: [{
      data: [overallStats.present, overallStats.late, overallStats.absent],
      backgroundColor: ['#4CAF50', '#FFC107', '#F44336'],
      borderWidth: 1,
      hoverBackgroundColor: ['#66BB6A', '#FFD54F', '#EF5350']
    }]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '60%', // Changed from 70% to 60% to match Admin
    plugins: {
      legend: {
        position: 'top', // Changed from 'right' to 'top' to match Admin
        align: 'center',
        labels: {
          boxWidth: 12,
          padding: 10,
          font: {
            size: 15 // Match Admin font size
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
            if (label === 'Present') count = overallStats.presentCount;
            else if (label === 'Late') count = overallStats.lateCount;
            else if (label === 'Absent') count = overallStats.absentCount;
            
            // Format: "Present: 60% (6 students)"
            const studentText = count === 1 ? 'student' : 'students';
            return `${label}: ${value}% (${count} ${studentText})`;
          }
        }
      }
    }
  };

  return (
    <div className={styles.teacherPieChart}>
      {loading ? (
        <div className={styles.loading}>Loading attendance data...</div>
      ) : overallStats.total === 0 ? (
        <div className={styles.noData}>No students in classes</div>
      ) : (
        <Doughnut data={data} options={options} />
      )}
    </div>
  );
};

export default TeacherPieChart;