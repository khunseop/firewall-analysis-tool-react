import { Outlet } from 'react-router-dom'
import { Navbar } from './Navbar'

export function AppLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-ds-surface text-ds-on-surface">
      <div className="fixed top-0 inset-x-0 z-50 h-12">
        <Navbar />
      </div>
      <main className="flex-1 mt-12">
        <div className="px-4 py-4 md:px-8 md:py-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
