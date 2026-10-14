import { useEffect } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import './App.css'
import { useAuthStore } from './store/authstore'
import AuthPage from './pages/AuthPage'
import Dashboard from './pages/Dashboard'
import ProtectedRoute from './Components/ProctectedRoute'

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
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App;
