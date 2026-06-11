import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import VideogamesPage from './pages/VideogamesPage'
import TournamentsPage from './pages/TournamentsPage'
import TournamentDetailPage from './pages/TournamentDetailPage'
import TournamentCreatePage from './pages/TournamentCreatePage'
import TournamentManagePage from './pages/TournamentManagePage'
import ProfilePage from './pages/ProfilePage'
import UsersPage from './pages/UsersPage'
import UserCreatePage from './pages/UserCreatePage'
import MyRegistrationsPage from './pages/MyRegistrationsPage'
import MyTournamentsPage from './pages/MyTournamentsPage'
import NotFoundPage from './pages/NotFoundPage'

function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/videogames" element={<VideogamesPage />} />
        <Route path="/tournaments" element={<TournamentsPage />} />

        <Route path="/tournaments/new" element={
          <ProtectedRoute roles={['organizer']}>
            <TournamentCreatePage />
          </ProtectedRoute>
        } />

        <Route path="/profile/:username" element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        } />

        <Route path="/tournaments/:id" element={<TournamentDetailPage />} />

        <Route path="/tournaments/:id/manage" element={
          <ProtectedRoute roles={['organizer', 'admin']}>
            <TournamentManagePage />
          </ProtectedRoute>
        } />

        <Route path="/my-registrations" element={
          <ProtectedRoute roles={['player']}>
            <MyRegistrationsPage />
          </ProtectedRoute>
        } />

        <Route path="/my-tournaments" element={
          <ProtectedRoute roles={['organizer']}>
            <MyTournamentsPage />
          </ProtectedRoute>
        } />

        <Route path="/users" element={
          <ProtectedRoute roles={['admin']}>
            <UsersPage />
          </ProtectedRoute>
        } />

        <Route path="/users/new" element={
          <ProtectedRoute roles={['admin']}>
            <UserCreatePage />
          </ProtectedRoute>
        } />

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
