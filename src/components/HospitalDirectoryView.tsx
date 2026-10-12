import React, { useState } from 'react';
import { VerifiedHospital } from '../types';
import { estimateRoadDistanceKm, estimateTravelMinutes } from '../utils/geoRouting';
import { VIZIANAGARAM_CENTER } from '../data/vizianagaramData';

interface HospitalDirectoryViewProps {
  hospitals: VerifiedHospital[];
  onToggleDivert: (hospitalId: string) => void;
  onUpdateBeds: (hospitalId: string, freeBeds: number, freeIcu: number) => void;
  onSelectHospital: (hospital: VerifiedHospital) => void;
}

export const HospitalDirectoryView: React.FC<HospitalDirectoryViewProps> = ({
  hospitals,
  onToggleDivert,
  onUpdateBeds,
  onSelectHospital
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [specialtyFilter, setSpecialtyFilter] = useState('All');
  const [editingHospId, setEditingHospId] = useState<string | null>(null);
  const [editFreeBeds, setEditFreeBeds] = useState(0);
  const [editFreeIcu, setEditFreeIcu] = useState(0);

  const specialties = ['All', 'Cardiology', 'Stroke Care', 'General Trauma', 'Obstetrics & Gynecology', 'Pediatric ICU', 'Orthopedic Trauma'];

  const filteredHospitals = hospitals.filter(h => {
    const matchesSearch =
      h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.address.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSpecialty =
      specialtyFilter === 'All' ||
      h.specialties.some(s => s.toLowerCase().includes(specialtyFilter.toLowerCase()));
    return matchesSearch && matchesSpecialty;
  });

  const startEdit = (h: VerifiedHospital) => {
    setEditingHospId(h.id);
    setEditFreeBeds(h.freeBeds);
    setEditFreeIcu(h.freeIcu);
  };

  const saveEdit = (hospitalId: string) => {
    onUpdateBeds(hospitalId, editFreeBeds, editFreeIcu);
    setEditingHospId(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '20px 28px' }}>
      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '14px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ background: '#DDF3E8', color: '#0B7A55', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 800 }}>
              VERIFIED AP GOVT DIRECTORY
            </span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: '#5B7A6D' }}>
              DISTRICT MEDICAL HEALTH OFFICE (DMHO)
            </span>
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: 800, margin: '6px 0 2px', color: '#0F2A21' }}>
            Vizianagaram Hospitals &amp; Trauma Directory
          </h2>
          <p style={{ margin: 0, color: '#5B7A6D', fontSize: '13.5px' }}>
            Verified hospital facilities, 24x7 emergency contacts, GPS coordinates, and real-time ICU bed inventory
          </p>
        </div>

        {/* Search bar */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <input
            type="text"
            placeholder="Search hospitals or localities..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              padding: '9px 14px',
              borderRadius: '10px',
              border: '1px solid #D3E5DC',
              background: '#FFFFFF',
              font: 'inherit',
              fontSize: '13.5px',
              minWidth: '260px',
              outline: 'none'
            }}
          />
        </div>
      </div>

      {/* Specialty Filter Chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {specialties.map(spec => (
          <button
            key={spec}
            type="button"
            onClick={() => setSpecialtyFilter(spec)}
            style={{
              padding: '6px 14px',
              borderRadius: '20px',
              border: specialtyFilter === spec ? 'none' : '1px solid #D3E5DC',
              background: specialtyFilter === spec ? '#22C58B' : '#FFFFFF',
              color: specialtyFilter === spec ? '#04130D' : '#3E5B4F',
              font: 'inherit',
              fontWeight: specialtyFilter === spec ? 700 : 600,
              fontSize: '12.5px',
              cursor: 'pointer'
            }}
          >
            {spec}
          </button>
        ))}
      </div>

      {/* Grid of Hospital Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '16px' }}>
        {filteredHospitals.map(hosp => {
          const isFull = hosp.loadPercent >= 90;
          const isDiverting = hosp.status === 'divert';
          const distKm = estimateRoadDistanceKm(VIZIANAGARAM_CENTER[0], VIZIANAGARAM_CENTER[1], hosp.lat, hosp.lng);
          const travelMin = estimateTravelMinutes(distKm);

          return (
            <div
              key={hosp.id}
              style={{
                background: '#FFFFFF',
                border: isDiverting ? '2px solid #EF4444' : isFull ? '1px solid #F0B4B7' : '1px solid #D3E5DC',
                borderRadius: '16px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                boxShadow: '0 2px 10px rgba(0, 0, 0, 0.04)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 800, fontSize: '13px', color: '#0B7A55' }}>
                      {hosp.id}
                    </span>
                    <span
                      style={{
                        background: '#DDF3E8',
                        color: '#0B7A55',
                        fontSize: '10.5px',
                        fontWeight: 800,
                        padding: '2px 7px',
                        borderRadius: '4px'
                      }}
                    >
                      ✓ VERIFIED HOSPITAL
                    </span>
                    {hosp.emergency24x7 && (
                      <span style={{ background: '#DDF3E8', color: '#059669', fontSize: '10.5px', fontWeight: 800, padding: '2px 7px', borderRadius: '4px' }}>
                        24x7 EMERGENCY
                      </span>
                    )}
                  </div>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '6px 0 2px', color: '#0F2A21' }}>{hosp.name}</h3>
                  <div style={{ fontSize: '12px', color: '#5B7A6D' }}>📍 {hosp.address}</div>
                </div>

                <button
                  type="button"
                  onClick={() => onSelectHospital(hosp)}
                  style={{
                    background: 'transparent',
                    border: '1px solid #A7D8C2',
                    borderRadius: '8px',
                    padding: '6px 12px',
                    color: '#0B7A55',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  View on Map
                </button>
              </div>

              {/* Coordinates & Phone Row */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', fontSize: '12px', color: '#3E5B4F', background: '#F3F8F5', padding: '10px 12px', borderRadius: '8px' }}>
                <div>
                  <strong>GPS:</strong>{' '}
                  <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    {hosp.lat.toFixed(4)}° N, {hosp.lng.toFixed(4)}° E
                  </span>
                </div>
                <div>
                  <strong>Distance:</strong> {distKm} km (~{travelMin} min)
                </div>
                <div>
                  <strong>Direct Line:</strong>{' '}
                  <a href={`tel:${hosp.phone}`} style={{ color: '#0B7A55', fontWeight: 700 }}>
                    {hosp.phone}
                  </a>
                </div>
              </div>

              {/* Bed Inventory */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', marginBottom: '6px' }}>
                  <span style={{ color: '#5B7A6D' }}>Bed Occupancy Status</span>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>
                    {hosp.totalBeds - hosp.freeBeds} / {hosp.totalBeds} ({hosp.loadPercent}% load)
                  </span>
                </div>
                <div style={{ height: '8px', borderRadius: '4px', background: '#E3EFE9', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${hosp.loadPercent}%`,
                      height: '100%',
                      background: isFull ? '#EF4444' : '#10B981',
                      borderRadius: '4px'
                    }}
                  />
                </div>
              </div>

              {/* Stat Boxes */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', textAlign: 'center' }}>
                <div style={{ background: '#F8FAF9', padding: '8px', borderRadius: '8px', border: '1px solid #E3EFE9' }}>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '16px', fontWeight: 800 }}>{hosp.freeBeds}</div>
                  <div style={{ fontSize: '10.5px', color: '#5B7A6D' }}>Free General</div>
                </div>
                <div style={{ background: '#F8FAF9', padding: '8px', borderRadius: '8px', border: '1px solid #E3EFE9' }}>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '16px', fontWeight: 800, color: hosp.freeIcu === 0 ? '#EF4444' : '#059669' }}>
                    {hosp.freeIcu} / {hosp.icuBeds}
                  </div>
                  <div style={{ fontSize: '10.5px', color: '#5B7A6D' }}>ICU Beds</div>
                </div>
                <div style={{ background: '#F8FAF9', padding: '8px', borderRadius: '8px', border: '1px solid #E3EFE9' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: isDiverting ? '#EF4444' : '#059669', textTransform: 'uppercase' }}>
                    {isDiverting ? 'Divert' : hosp.status}
                  </div>
                  <div style={{ fontSize: '10.5px', color: '#5B7A6D' }}>ER Status</div>
                </div>
              </div>

              {/* Clinical Specialties */}
              <div>
                <div style={{ fontSize: '11px', color: '#5B7A6D', textTransform: 'uppercase', fontWeight: 700, marginBottom: '6px' }}>
                  Clinical Specialties
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {hosp.specialties.map(spec => (
                    <span
                      key={spec}
                      style={{
                        background: '#EEF6F2',
                        color: '#0B7A55',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontSize: '11.5px',
                        fontWeight: 600
                      }}
                    >
                      {spec}
                    </span>
                  ))}
                </div>
              </div>

              {/* Admin Quick Adjust Controls */}
              <div style={{ borderTop: '1px solid #E3EFE9', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {editingHospId === hosp.id ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                    <label style={{ fontSize: '11.5px' }}>Free:</label>
                    <input
                      type="number"
                      value={editFreeBeds}
                      onChange={e => setEditFreeBeds(Number(e.target.value))}
                      style={{ width: '50px', padding: '4px', borderRadius: '4px', border: '1px solid #D3E5DC' }}
                    />
                    <label style={{ fontSize: '11.5px' }}>ICU:</label>
                    <input
                      type="number"
                      value={editFreeIcu}
                      onChange={e => setEditFreeIcu(Number(e.target.value))}
                      style={{ width: '50px', padding: '4px', borderRadius: '4px', border: '1px solid #D3E5DC' }}
                    />
                    <button
                      type="button"
                      onClick={() => saveEdit(hosp.id)}
                      style={{ background: '#22C58B', color: '#04130D', border: 0, padding: '4px 10px', borderRadius: '6px', fontSize: '11.5px', fontWeight: 700, cursor: 'pointer' }}
                    >
                      Save
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => startEdit(hosp)}
                      style={{ background: 'transparent', border: 0, color: '#5B7A6D', fontSize: '12px', cursor: 'pointer', textDecoration: 'underline' }}
                    >
                      Admin: Edit Live Beds
                    </button>
                    <button
                      type="button"
                      onClick={() => onToggleDivert(hosp.id)}
                      style={{
                        background: isDiverting ? '#EF4444' : 'transparent',
                        color: isDiverting ? '#FFFFFF' : '#C62E35',
                        border: '1px solid #F0B4B7',
                        borderRadius: '6px',
                        padding: '4px 10px',
                        fontSize: '11.5px',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      {isDiverting ? 'Revoke Divert' : 'Declare Divert'}
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
