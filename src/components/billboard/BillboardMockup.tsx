'use client'

/**
 * BillboardMockup - Shows a static treemap mockup when no real slots exist
 * Displays fake brand names in colored blocks to give a preview of the billboard
 */
export function BillboardMockup() {
  const mockSlots = [
    { id: 1, name: 'Acme Corp', color: '#3B82F6', width: '30%', height: '40%', top: '0%', left: '0%' },
    { id: 2, name: 'TechStart', color: '#10B981', width: '40%', height: '40%', top: '0%', left: '30%' },
    { id: 3, name: 'Coffee Lab', color: '#F59E0B', width: '30%', height: '40%', top: '0%', left: '70%' },
    { id: 4, name: 'Pixel Studios', color: '#8B5CF6', width: '25%', height: '35%', top: '40%', left: '0%' },
    { id: 5, name: 'FreshBake', color: '#EF4444', width: '20%', height: '35%', top: '40%', left: '25%' },
    { id: 6, name: 'Nordic.io', color: '#06B6D4', width: '25%', height: '35%', top: '40%', left: '45%' },
    { id: 7, name: 'DataForge', color: '#EC4899', width: '30%', height: '35%', top: '40%', left: '70%' },
    { id: 8, name: 'Bloom', color: '#F97316', width: '100%', height: '25%', top: '75%', left: '0%' },
  ]

  return (
    <div className="absolute inset-0 bg-[#0A0A0A]">
      {/* Gradient overlay for depth */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(to bottom, rgba(0,0,0,0) 70%, rgba(0,0,0,0.3) 100%)'
        }}
      />

      {/* Mock slots */}
      {mockSlots.map((slot) => (
        <div
          key={slot.id}
          className="absolute flex items-center justify-center text-white font-semibold transition-opacity duration-1000"
          style={{
            width: slot.width,
            height: slot.height,
            top: slot.top,
            left: slot.left,
            backgroundColor: slot.color,
            animation: slot.id === 2 ? 'pulse-subtle 3s ease-in-out infinite' : 'none',
          }}
        >
          <span className="text-sm sm:text-base md:text-lg opacity-90">
            {slot.name}
          </span>
        </div>
      ))}

      <style jsx>{`
        @keyframes pulse-subtle {
          0%, 100% {
            opacity: 0.9;
          }
          50% {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  )
}
