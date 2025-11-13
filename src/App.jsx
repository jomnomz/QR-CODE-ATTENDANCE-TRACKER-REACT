import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import AdminNavBar from './Components/NavBars/AdminNavBar/AdminNavBar.jsx'
import AdminDashboard from './Pages/AdminPages/AdminDashboard/AdminDashboard.jsx'
import AdminStudents from './Pages/AdminPages/AdminStudents/AdminStudents.jsx'
import AdminGuardians from './Pages/AdminPages/AdminGuardians/AdminGuardians.jsx'
import AdminMessages from './Pages/AdminPages/AdminMessages/AdminMessages.jsx'
import AdminAttendance from './Pages/AdminPages/AdminAttendace/AdminAttendance.jsx';
import AdminReports from './Pages/AdminPages/AdminReports/AdminReports.jsx';
import AdminTeachers from './Pages/AdminPages/AdminTeachers/AdminTeachers.jsx';
import AdminSettings from './Pages/AdminPages/AdminSettings/AdminSettings.jsx';

function App() {
   return(
    <>
    <Router>
      <main>
        <div>
          <AdminNavBar></AdminNavBar>
        </div>

        <div className='mainContent'>
            <Routes>
              <Route path="/" element={<AdminDashboard />} />
              <Route path="/Dashboard" element={<AdminDashboard />} />
              <Route path="/Students" element={<AdminStudents />} />
              <Route path="/Guardians" element={<AdminGuardians />} />
              <Route path="/Messages" element={<AdminMessages />} />
              <Route path="/Attendance" element={<AdminAttendance />} />
              <Route path="/Reports" element={<AdminReports />} />
              <Route path="/Teachers" element={<AdminTeachers />} />
              <Route path="/Settings" element={<AdminSettings />} />
            </Routes>
        </div>
      </main>
    </Router>
    </>

  )
}

export default App
