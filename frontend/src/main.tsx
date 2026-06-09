import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom'
import Layout from '@/layouts/Layout'
import PublicDashboard from '@/pages/PublicDashboard'
import AdminConsole from '@/pages/AdminConsole'
import AdminLogs from '@/pages/AdminLogs'
import '@/index.css'

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <PublicDashboard /> },
      { path: 'admin', element: <AdminConsole /> },
      { path: 'admin/logs', element: <AdminLogs /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
)
