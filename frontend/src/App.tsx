import { useEffect } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import './App.css'
import { useAuthStore } from './store/authstore'
import AuthPage from './pages/AuthPage'
import Dashboard from './pages/Dashboard'
import ProtectedRoute from './Components/ProctectedRoute'
import ProjectPage from './pages/ProjectPage'
import JoinPage from './pages/JoinPage'
import MeetingPage from './pages/MeetingPage'

function App() {
  
  const fetchMe=useAuthStore((s)=>s.fetchMe);
  useEffect(()=>{
    fetchMe()
  },[fetchMe])
  return (
    <BrowserRouter>
      <Routes>
        <Route path='/login' element={<AuthPage mode="login"/>} />

        <Route path='/signup' element={<AuthPage mode="signup" />} />
        <Route element={<ProtectedRoute/>} >
          <Route path='/' element={<Dashboard/>} />
          <Route path='/projects/:projectId' element={<ProjectPage/>} />
          <Route path='/join/:code' element={<JoinPage/>} />
          <Route path='/projects/:projectId/meetings/:meetingId' element={<MeetingPage/>}/>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App;
