import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from '@/components/Layout'
import DashboardPage from '@/pages/DashboardPage'
import PrintersPage from '@/pages/PrintersPage'
import AddPrinterPage from '@/pages/AddPrinterPage'
import LibraryPage from '@/pages/LibraryPage'
import QueuePage from '@/pages/QueuePage'
import SettingsPage from '@/pages/SettingsPage'
import { useWebSocket } from '@/hooks/useWebSocket'

export default function App() {
  useWebSocket()
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="printers" element={<PrintersPage />} />
        <Route path="printers/add" element={<AddPrinterPage />} />
        <Route path="library" element={<LibraryPage />} />
        <Route path="queue" element={<QueuePage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  )
}
