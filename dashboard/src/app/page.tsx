import { MapPlaceholder } from '@/components/dashboard/MapPlaceholder'
import { PatientListPanel } from '@/components/dashboard/PatientListPanel'
import { Sidebar } from '@/components/dashboard/Sidebar'
import { TopMetricsBar } from '@/components/dashboard/TopMetricsBar'
import { VitalSignsPanel } from '@/components/dashboard/VitalSignsPanel'

export default function DashboardPage() {
  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: '#050d1a' }}>
      <Sidebar />

      <div className="flex flex-col flex-1 overflow-hidden">
        <TopMetricsBar />

        <main className="flex-1 overflow-auto p-4">
          <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-4 h-full">
            <MapPlaceholder />

            <div className="flex flex-col gap-4">
              <VitalSignsPanel />
              <PatientListPanel />
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
