import { Routes, Route } from 'react-router-dom'
import './App.css'
import Header from './components/Header'
import Message from './components/Message'
import Loading from './components/Loading'
import Landing from './pages/Landing'
import Teacher from './pages/Teacher'
import TeacherDashboard from './pages/TeacherDashboard'
import Student from './pages/Student'
import StudentEnroll from './pages/StudentEnroll'

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#050816] via-[#07102a] to-[#0a1533] text-slate-100 font-['Space_Grotesk',system-ui]">
      <Header />
      <Message />
      <Loading />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/teacher" element={<Teacher />} />
        <Route path="/teacher/dashboard" element={<TeacherDashboard />} />
        <Route path="/student" element={<Student />} />
        <Route path="/student/dashboard" element={<StudentEnroll />} />
      </Routes>
    </div>
  )
}

export default App
