import { useState } from 'react'
import './App.css'
import { LoginPage, FirstLoginPage } from './components/Auth'
import HRDashboardLayout from './components/HRDashboard'
import ManagerDashboardLayout from './components/ManagerDashboard'
import InternDashboardLayout from './components/InternDashboard'

function App() {
  const [user, setUser] = useState(null)

  if (user) {
    if (user.first_login) {
      return <FirstLoginPage user={user} onComplete={setUser} />
    }
    if (user.role === 'hr') {
      return <HRDashboardLayout user={user} onLogout={() => setUser(null)} />
    }
    if (user.role === 'manager') {
      return <ManagerDashboardLayout user={user} onLogout={() => setUser(null)} />
    }
    return <InternDashboardLayout user={user} onLogout={() => setUser(null)} />
  }
  return <LoginPage onLogin={u => setUser(u)} />
}

export default App
