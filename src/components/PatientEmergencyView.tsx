import React, { useState } from 'react';
import { PatientEmergencyRequest, AmbulanceUnit, VerifiedHospital, Severity } from '../types';
import { VIZIANAGARAM_LANDMARKS } from '../data/vizianagaramData';
import { rankNearbyAmbulances } from '../utils/geoRouting';

interface PatientEmergencyViewProps {
  ambulances: AmbulanceUnit[];
  hospitals: VerifiedHospital[];
  activeRequest: PatientEmergencyRequest | null;
  onRequestAmbulance: (requestData: {
    patientName: string;
    contactPhone: string;
    emergencyType: string;
    severity: Severity;
    landmark: string;
    lat: number;
    lng: number;
  }) => void;
  onCancelRequest: (requestId: string) => void;
  onSelectAmbulance: (ambulance: AmbulanceUnit) => void;
}

export const PatientEmergencyView: React.FC<PatientEmergencyViewProps> = ({
  ambulances,
  hospitals,
  activeRequest,
  onRequestAmbulance,
  onCancelRequest,
  onSelectAmbulance
}) => {
  const [patientName, setPatientName] = useState('Anand Kumar');
  const [contactPhone, setContactPhone] = useState('+91 98480 55667');
  const [selectedLandmarkIdx, setSelectedLandmarkIdx] = useState(2); // RTC complex
  const [emergencyType, setEmergencyType] = useState('Acute Cardiac Arrest');
  const [severity, setSeverity] = useState<Severity>('CRITICAL');
  const [isLocating, setIsLocating] = useState(false);
  const [locationFeedback, setLocationFeedback] = useState<string | null>(null);

  const selectedLandmark = VIZIANAGARAM_LANDMARKS[selectedLandmarkIdx];

  // Geolocation detector
  const handleDetectGps = () => {
    if (!navigator.geolocation) {
      setLocationFeedback('GPS not supported on this browser. Selected nearest landmark.');
      return;
    }
    setIsLocating(true);
    setLocationFeedback('Acquiring high-accuracy GPS coordinates in Vizianagaram...');
    navigator.geolocation.getCurrentPosition(
      pos => {
        setIsLocating(false);
        setLocationFeedback(`GPS Locked: ${pos.coords.latitude.toFixed(4)}° N, ${pos.coords.longitude.toFixed(4)}° E`);
      },
      err => {
        setIsLocating(false);
        setLocationFeedback('GPS permission denied or timeout. Defaulted to Vizianagaram RTC Complex.');
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Nearby ambulances ranked by road suitability
  const mockTempPatient: PatientEmergencyRequest = {
    id: 'TEMP',
    patientName,
    contactPhone,
    emergencyType,
    severity,
    landmark: selectedLandmark.name,
    lat: selectedLandmark.lat,
    lng: selectedLandmark.lng,
    status: 'searching',
    createdAt: 'now'
  };

  const nearbyAmbulances = rankNearbyAmbulances(mockTempPatient, ambulances);

  const handleRequestSubmit = () => {
    onRequestAmbulance({
      patientName,
      contactPhone,
      emergencyType,
      severity,
      landmark: selectedLandmark.name,
      lat: selectedLandmark.lat,
      lng: selectedLandmark.lng
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '20px 28px' }}>
      {/* View Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '14px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ background: '#22C58B', color: '#04130D', padding: '3px 9px', borderRadius: '6px', fontSize: '11px', fontWeight: 800 }}>
              RAPIDO EMERGENCY DISCOVERY
            </span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: '#0B7A55', fontWeight: 700 }}>
              VIZIANAGARAM RAPID NETWORK
            </span>
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: 800, margin: '6px 0 2px', color: '#0F2A21' }}>
            Patient Emergency &amp; Ambulance Discovery
          </h2>
          <p style={{ margin: 0, color: '#5B7A6D', fontSize: '13.5px' }}>
            Find the closest hospital-grade life support ambulance in Vizianagaram in under 10 seconds
          </p>
        </div>

        {/* 108 Emergency Helpline Banner */}
        <div style={{ background: '#FBE3E4', border: '1px solid #F0B4B7', borderRadius: '12px', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#C62E35', textTransform: 'uppercase' }}>National Emergency</div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#C62E35' }}>Dial 108 / 112</div>
          </div>
          <a
            href="tel:108"
            style={{
              background: '#C62E35',
              color: '#FFFFFF',
              padding: '7px 14px',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: 800,
              fontSize: '12.5px'
            }}
          >
            Direct Call
          </a>
        </div>
      </div>

      {/* ACTIVE EMERGENCY TRACKING BANNER (If a request is active) */}
      {activeRequest && (
        <div
          style={{
            background: '#FFFFFF',
            border: '2px solid #10B981',
            borderRadius: '16px',
            padding: '20px',
            boxShadow: '0 8px 30px rgba(16, 185, 129, 0.15)',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px'
          }}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '24px' }}>🚨</span>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 800, fontSize: '14px', color: '#0F2A21' }}>
                    {activeRequest.id}
                  </span>
                  <span style={{ background: '#DDF3E8', color: '#0B7A55', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase' }}>
                    {activeRequest.status.replace('_', ' ')}
                  </span>
                </div>
                <div style={{ fontWeight: 700, fontSize: '16px', marginTop: '2px' }}>
                  {activeRequest.emergencyType} · {activeRequest.patientName}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onCancelRequest(activeRequest.id)}
              style={{
                background: 'transparent',
                border: '1px solid #F0B4B7',
                color: '#C62E35',
                borderRadius: '8px',
                padding: '8px 16px',
                font: 'inherit',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Cancel Request
            </button>
          </div>

          {/* Assigned Driver Details (Rapido-style) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px', background: '#F3F8F5', padding: '16px', borderRadius: '12px' }}>
            <div>
              <div style={{ fontSize: '11.5px', color: '#5B7A6D', textTransform: 'uppercase', fontWeight: 600 }}>Assigned Vehicle</div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '16px', fontWeight: 800, color: '#0F2A21', marginTop: '2px' }}>
                {activeRequest.assignedVehicleNo || 'AP 35 TX 1081'}
              </div>
              <div style={{ fontSize: '12px', color: '#0B7A55', fontWeight: 600 }}>
                {activeRequest.ambulanceType || 'ALS'} Advanced Life Support
              </div>
            </div>

            <div>
              <div style={{ fontSize: '11.5px', color: '#5B7A6D', textTransform: 'uppercase', fontWeight: 600 }}>Driver / Paramedic</div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#0F2A21', marginTop: '2px' }}>
                {activeRequest.assignedDriverName || 'Ramesh Naidu'} (4.9 ★)
              </div>
              <div style={{ fontSize: '12.5px', marginTop: '2px' }}>
                <a href={`tel:${activeRequest.assignedDriverPhone || '+919440123401'}`} style={{ color: '#0B7A55', fontWeight: 700 }}>
                  📞 Call Driver ({activeRequest.assignedDriverPhone || '+91 94401 23401'})
                </a>
              </div>
            </div>

            <div>
              <div style={{ fontSize: '11.5px', color: '#5B7A6D', textTransform: 'uppercase', fontWeight: 600 }}>Estimated Arrival (ETA)</div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '20px', fontWeight: 800, color: '#059669', marginTop: '2px' }}>
                {activeRequest.etaMinutes || 4} mins ({activeRequest.roadDistanceKm || 2.1} km)
              </div>
              <div style={{ fontSize: '11.5px', color: '#5B7A6D' }}>Live GPS Tracking Active</div>
            </div>
          </div>
        </div>
      )}

      {/* MAIN TWO-COLUMN: REQUEST FORM + NEARBY RAPIDO-STYLE DISCOVERY */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
        {/* Left Form: Request Ambulance */}
        <div style={{ background: '#FFFFFF', border: '1px solid #D3E5DC', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontSize: '17px', fontWeight: 800, margin: 0, color: '#0F2A21' }}>
            1. Patient Location &amp; Emergency Details
          </h3>

          {/* Location picker */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: 700, color: '#0F2A21' }}>
                Pickup Location in Vizianagaram:
              </label>
              <button
                type="button"
                onClick={handleDetectGps}
                disabled={isLocating}
                style={{
                  background: 'transparent',
                  border: '1px solid #A7D8C2',
                  borderRadius: '6px',
                  padding: '3px 9px',
                  color: '#0B7A55',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                {isLocating ? 'Acquiring GPS...' : '📍 Use My GPS'}
              </button>
            </div>

            <select
              value={selectedLandmarkIdx}
              onChange={e => setSelectedLandmarkIdx(Number(e.target.value))}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '9px',
                border: '1px solid #D3E5DC',
                background: '#FFFFFF',
                font: 'inherit',
                fontSize: '13.5px',
                color: '#0F2A21'
              }}
            >
              {VIZIANAGARAM_LANDMARKS.map((lm, idx) => (
                <option key={lm.name} value={idx}>
                  {lm.name} — {lm.desc}
                </option>
              ))}
            </select>
            {locationFeedback && (
              <div style={{ fontSize: '11.5px', color: '#0B7A55', marginTop: '4px', fontWeight: 600 }}>
                {locationFeedback}
              </div>
            )}
          </div>

          {/* Emergency presentation */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
              Emergency Condition &amp; Symptoms:
            </label>
            <select
              value={emergencyType}
              onChange={e => {
                const val = e.target.value;
                setEmergencyType(val);
                if (val.includes('Cardiac') || val.includes('Stroke') || val.includes('Trauma')) {
                  setSeverity('CRITICAL');
                } else if (val.includes('Maternity') || val.includes('Asthma')) {
                  setSeverity('SERIOUS');
                } else {
                  setSeverity('MODERATE');
                }
              }}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '9px',
                border: '1px solid #D3E5DC',
                background: '#FFFFFF',
                font: 'inherit',
                fontSize: '13.5px'
              }}
            >
              <option value="Acute Cardiac Arrest">🚨 Acute Cardiac Arrest (Chest pain, unconsciousness)</option>
              <option value="Acute Ischemic Stroke">🧠 Acute Stroke (Facial droop, limb weakness, speech loss)</option>
              <option value="Severe Vehicular Trauma">💥 Severe Road Traffic Accident / Crush Trauma</option>
              <option value="Active Labor / Maternity">🤰 Active Labor / High-Risk Maternity Emergency</option>
              <option value="Pediatric Respiratory Failure">🫁 Severe Asthma / Pediatric Respiratory Distress</option>
              <option value="Burn Injury / Electrocution">🔥 Major Burn / High-Voltage Electrocution</option>
              <option value="Fracture / General Medical">🩹 Bone Fracture / Acute Abdominal Emergency</option>
            </select>
          </div>

          {/* Patient name & Phone */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, marginBottom: '4px' }}>
                Patient / Caller Name:
              </label>
              <input
                type="text"
                value={patientName}
                onChange={e => setPatientName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid #D3E5DC',
                  font: 'inherit',
                  fontSize: '13.5px',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, marginBottom: '4px' }}>
                Contact Mobile No:
              </label>
              <input
                type="tel"
                value={contactPhone}
                onChange={e => setContactPhone(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid #D3E5DC',
                  font: 'inherit',
                  fontSize: '13.5px',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          {/* Golden Hour / Triage Badge */}
          <div style={{ background: '#F3F8F5', borderLeft: '3px solid #16B37E', padding: '10px 14px', borderRadius: '0 8px 8px 0', fontSize: '12.5px' }}>
            <span style={{ fontWeight: 700, color: '#0F2A21' }}>Clinical Triage Match: </span>
            <span>
              {severity === 'CRITICAL' ? 'Advanced Life Support (ALS) with ventilator required.' : 'Basic Life Support (BLS) sufficient.'}
            </span>
          </div>

          {/* Request Button */}
          <button
            type="button"
            onClick={handleRequestSubmit}
            style={{
              height: '46px',
              borderRadius: '12px',
              border: 0,
              background: '#22C58B',
              color: '#04130D',
              font: 'inherit',
              fontWeight: 800,
              fontSize: '15px',
              cursor: 'pointer',
              boxShadow: '0 4px 18px rgba(34,197,139,0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <span>🚨</span> Request Instant Ambulance Dispatch
          </button>
        </div>

        {/* Right: Rapido-style Nearby Ambulance Discovery */}
        <div style={{ background: '#FFFFFF', border: '1px solid #D3E5DC', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '17px', fontWeight: 800, margin: 0, color: '#0F2A21' }}>
                2. Nearby Ambulances in Vizianagaram
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '12.5px', color: '#5B7A6D' }}>
                Real-time proximity ranking from {selectedLandmark.name}
              </p>
            </div>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', background: '#DDF3E8', color: '#0B7A55', padding: '3px 8px', borderRadius: '6px', fontWeight: 700 }}>
              {nearbyAmbulances.length} Active
            </span>
          </div>

          {/* List of nearby ambulances */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', maxHeight: '420px' }}>
            {nearbyAmbulances.map(({ ambulance: amb, distanceKm, etaMinutes, reason }, idx) => {
              const isBest = idx === 0;

              return (
                <div
                  key={amb.id}
                  onClick={() => onSelectAmbulance(amb)}
                  style={{
                    border: isBest ? '1.5px solid #16B37E' : '1px solid #E3EFE9',
                    borderRadius: '12px',
                    padding: '12px 14px',
                    background: isBest ? 'rgba(52,211,153,0.06)' : '#FFFFFF',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}
                >
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: amb.type === 'ALS' ? '#DDF3E8' : '#EEF6F2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flex: 'none' }}>
                    🚑
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 800, fontSize: '13px' }}>
                        {amb.vehicleNumber}
                      </span>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 800,
                          padding: '1px 6px',
                          borderRadius: '4px',
                          background: amb.type === 'ALS' ? '#22C58B' : '#AFC4BA',
                          color: '#04130D'
                        }}
                      >
                        {amb.type}
                      </span>
                      {isBest && (
                        <span style={{ fontSize: '10px', fontWeight: 800, color: '#0B7A55', background: '#DDF3E8', padding: '1px 6px', borderRadius: '4px' }}>
                          TOP MATCH
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '12px', color: '#5B7A6D', marginTop: '2px' }}>
                      Driver: {amb.driverName} ({amb.rating} ★) · {amb.baseLocationName}
                    </div>
                    <div style={{ fontSize: '11px', color: '#0B7A55', marginTop: '2px', fontWeight: 600 }}>
                      {reason}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', flex: 'none' }}>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '16px', fontWeight: 800, color: '#0B7A55' }}>
                      {etaMinutes} min
                    </div>
                    <div style={{ fontSize: '11px', color: '#5B7A6D' }}>{distanceKm} km away</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
