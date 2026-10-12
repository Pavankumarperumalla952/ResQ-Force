import React, { useState, useEffect, useRef } from 'react';
import { PatientEmergencyRequest, AmbulanceUnit, VerifiedHospital, Severity, EmergencyStatus } from '../types';
import { VIZIANAGARAM_LANDMARKS, VIZIANAGARAM_CENTER } from '../data/vizianagaramData';
import { rankNearbyAmbulances, calculateHaversineDistanceKm } from '../utils/geoRouting';

interface PatientEmergencyViewProps {
  ambulances: AmbulanceUnit[];
  hospitals: VerifiedHospital[];
  activeRequest: PatientEmergencyRequest | null;
  onRequestAmbulance: (requestData: {
    id: string;
    patientName: string;
    contactPhone: string;
    emergencyType: string;
    severity: Severity;
    landmark: string;
    address?: string;
    lat: number;
    lng: number;
    accuracyMeters?: number;
    requestSource: string;
    requestDateTime: string;
    initialStatus: EmergencyStatus;
  }) => void;
  onCancelRequest: (requestId: string) => void;
  onSelectAmbulance: (ambulance: AmbulanceUnit) => void;
  onUpdateLiveLocation?: (requestId: string, lat: number, lng: number, accuracy?: number) => void;
}

export const PatientEmergencyView: React.FC<PatientEmergencyViewProps> = ({
  ambulances,
  hospitals,
  activeRequest,
  onRequestAmbulance,
  onCancelRequest,
  onSelectAmbulance,
  onUpdateLiveLocation
}) => {
  // Form fields
  const [patientName, setPatientName] = useState('Anand Kumar');
  const [contactPhone, setContactPhone] = useState('+91 98480 55667');
  const [selectedLandmarkIdx, setSelectedLandmarkIdx] = useState(2); // RTC complex by default
  const [customAddress, setCustomAddress] = useState('');
  const [emergencyType, setEmergencyType] = useState('Acute Cardiac Arrest');
  const [severity, setSeverity] = useState<Severity>('CRITICAL');

  // Location Access State
  const [locationPermissionGranted, setLocationPermissionGranted] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [detectedCoords, setDetectedCoords] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [lastLocationUpdateTime, setLastLocationUpdateTime] = useState<string | null>(null);

  // Confirmation Modals State
  const [showSosConfirmModal, setShowSosConfirmModal] = useState(false);
  const [showCancelConfirmModal, setShowCancelConfirmModal] = useState(false);

  // Geolocation watch ID ref
  const watchIdRef = useRef<number | null>(null);

  const selectedLandmark = VIZIANAGARAM_LANDMARKS[selectedLandmarkIdx];

  // Effective location coordinates for the request
  const effectiveLat = detectedCoords ? detectedCoords.lat : selectedLandmark.lat;
  const effectiveLng = detectedCoords ? detectedCoords.lng : selectedLandmark.lng;
  const effectiveAddress = customAddress.trim()
    ? customAddress
    : detectedCoords
    ? `Live GPS (${detectedCoords.lat.toFixed(4)}° N, ${detectedCoords.lng.toFixed(4)}° E) near ${selectedLandmark.name}, Vizianagaram`
    : `${selectedLandmark.name}, Vizianagaram`;

  // 1. Enable / Detect Location via Browser Geolocation API
  const handleEnableLocationAccess = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser. Please select your location manually from the landmarks below.');
      return;
    }

    setIsDetectingLocation(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      pos => {
        setIsDetectingLocation(false);
        setLocationPermissionGranted(true);
        const { latitude, longitude, accuracy } = pos.coords;

        setDetectedCoords({
          lat: latitude,
          lng: longitude,
          accuracy: Math.round(accuracy)
        });

        const timeStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setLastLocationUpdateTime(timeStr);

        // Find closest Vizianagaram landmark to help the patient
        let closestIdx = 0;
        let minDist = 999;
        VIZIANAGARAM_LANDMARKS.forEach((lm, idx) => {
          const d = calculateHaversineDistanceKm(latitude, longitude, lm.lat, lm.lng);
          if (d < minDist) {
            minDist = d;
            closestIdx = idx;
          }
        });
        setSelectedLandmarkIdx(closestIdx);
      },
      err => {
        setIsDetectingLocation(false);
        let errorMsg = 'Failed to obtain device location.';
        if (err.code === err.PERMISSION_DENIED) {
          errorMsg = 'Location permission was denied. Please allow location access in your browser settings or choose your location manually below.';
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          errorMsg = 'Location information is currently unavailable. Please verify GPS is enabled or select a manual landmark.';
        } else if (err.code === err.TIMEOUT) {
          errorMsg = 'Location request timed out. Please click "Refresh Location" to retry or select a landmark.';
        }
        setLocationError(errorMsg);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // 2. Refresh Location
  const handleRefreshLocation = () => {
    handleEnableLocationAccess();
  };

  // 3. Live Location Tracking using watchPosition() when request is active
  useEffect(() => {
    const isRequestActive =
      activeRequest &&
      activeRequest.status !== 'completed' &&
      activeRequest.status !== 'cancelled';

    if (isRequestActive && navigator.geolocation) {
      // Start streaming location
      watchIdRef.current = navigator.geolocation.watchPosition(
        pos => {
          const { latitude, longitude, accuracy } = pos.coords;
          setDetectedCoords({
            lat: latitude,
            lng: longitude,
            accuracy: Math.round(accuracy)
          });
          const timeStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          setLastLocationUpdateTime(timeStr);

          if (onUpdateLiveLocation && activeRequest) {
            onUpdateLiveLocation(activeRequest.id, latitude, longitude, Math.round(accuracy));
          }
        },
        () => {
          // Keep previous coordinates if temporary glitch
        },
        { enableHighAccuracy: true, maximumAge: 4000, timeout: 10000 }
      );
    } else {
      // Clear watch when no active request
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    }

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [activeRequest?.id, activeRequest?.status]);

  // Handle Emergency SOS Click -> Open Confirmation Dialog
  const handleSosButtonClick = () => {
    setShowSosConfirmModal(true);
  };

  // Confirm Emergency Request Execution
  const handleConfirmEmergencyDispatch = () => {
    setShowSosConfirmModal(false);

    const now = new Date();
    const requestId = `SOS-VZM-${Math.floor(1000 + Math.random() * 9000)}`;
    const formattedDateTime = now.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }) + `, ${now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} IST`;

    onRequestAmbulance({
      id: requestId,
      patientName,
      contactPhone,
      emergencyType,
      severity,
      landmark: selectedLandmark.name,
      address: effectiveAddress,
      lat: effectiveLat,
      lng: effectiveLng,
      accuracyMeters: detectedCoords?.accuracy,
      requestSource: 'Patient Emergency SOS',
      requestDateTime: formattedDateTime,
      initialStatus: 'SOS REQUESTED'
    });
  };

  // Nearby ambulances ranked by road suitability
  const mockTempPatient: PatientEmergencyRequest = {
    id: 'TEMP',
    patientName,
    contactPhone,
    emergencyType,
    severity,
    landmark: selectedLandmark.name,
    lat: effectiveLat,
    lng: effectiveLng,
    status: 'SOS REQUESTED',
    createdAt: 'now'
  };

  const nearbyAmbulances = rankNearbyAmbulances(mockTempPatient, ambulances);

  // Status mapping badge helper
  const getStatusBadge = (status: PatientEmergencyRequest['status']) => {
    switch (status) {
      case 'SOS REQUESTED':
        return { label: 'SOS REQUESTED', bg: '#FEE2E2', color: '#B91C1C', desc: 'Request created. Contacting Vizianagaram emergency dispatch...' };
      case 'REQUEST RECEIVED':
        return { label: 'REQUEST RECEIVED', bg: '#FEF3C7', color: '#B45309', desc: 'Received by District Dispatch Operations. Locating nearest ALS/BLS unit.' };
      case 'AMBULANCE ASSIGNED':
      case 'assigned':
        return { label: 'AMBULANCE ASSIGNED', bg: '#DBEAFE', color: '#1D4ED8', desc: 'Ambulance assigned. Driver alerted with patient coordinates.' };
      case 'AMBULANCE EN ROUTE':
      case 'driver_accepted':
      case 'en_route_pickup':
        return { label: 'AMBULANCE EN ROUTE', bg: '#D1FAE5', color: '#047857', desc: 'Ambulance is moving toward you with sirens active.' };
      case 'ARRIVED':
      case 'arrived_scene':
        return { label: 'ARRIVED', bg: '#ECFDF5', color: '#065F46', desc: 'Ambulance has arrived at patient location in Vizianagaram.' };
      case 'in_transit_hospital':
        return { label: 'IN TRANSIT TO HOSPITAL', bg: '#EFF6FF', color: '#1E40AF', desc: 'Patient in transit to receiving hospital.' };
      default:
        return { label: String(status).toUpperCase(), bg: '#F3F4F6', color: '#374151', desc: 'Emergency request active.' };
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '20px 28px', maxWidth: '1300px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
      {/* HEADER STRIP */}
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
            Request Ambulance &amp; Emergency SOS
          </h2>
          <p style={{ margin: 0, color: '#5B7A6D', fontSize: '13.5px' }}>
            Real-time ambulance discovery and immediate dispatch across Vizianagaram Municipal Corporation
          </p>
        </div>

        {/* 108 Emergency Helpline Banner */}
        <div style={{ background: '#FBE3E4', border: '1px solid #F0B4B7', borderRadius: '12px', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#C62E35', textTransform: 'uppercase' }}>Official Ambulance Services</div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#C62E35' }}>Dial 108 / 112</div>
          </div>
          <a
            href="tel:108"
            style={{
              background: '#C62E35',
              color: '#FFFFFF',
              padding: '8px 16px',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: 800,
              fontSize: '12.5px'
            }}
          >
            Direct Call 108
          </a>
        </div>
      </div>

      {/* PROMINENT EMERGENCY SOS BUTTON (Section 2) */}
      {!activeRequest && (
        <div
          style={{
            background: 'linear-gradient(135deg, #1A0507 0%, #2A080C 100%)',
            border: '2px solid #EF4444',
            borderRadius: '20px',
            padding: '24px 28px',
            boxShadow: '0 8px 32px rgba(239, 68, 68, 0.25)',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '20px'
          }}
        >
          <div style={{ flex: 1, minWidth: '280px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#FCA5A5', fontSize: '12px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#EF4444', animation: 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite' }} />
              Immediate Medical Life Threat
            </div>
            <h3 style={{ fontSize: '22px', fontWeight: 900, color: '#FFFFFF', margin: '6px 0 4px' }}>
              Need an Ambulance Urgently?
            </h3>
            <p style={{ margin: 0, color: '#E5E7EB', fontSize: '13px', lineHeight: 1.5 }}>
              Press the Emergency SOS button to immediately transmit your live location and condition to Vizianagaram's nearest Advanced Life Support unit.
            </p>
          </div>

          <button
            type="button"
            onClick={handleSosButtonClick}
            style={{
              background: 'linear-gradient(180deg, #EF4444 0%, #DC2626 100%)',
              color: '#FFFFFF',
              border: '2px solid #F87171',
              borderRadius: '16px',
              padding: '16px 28px',
              fontSize: '16px',
              fontWeight: 900,
              cursor: 'pointer',
              boxShadow: '0 0 25px rgba(239, 68, 68, 0.5), 0 4px 12px rgba(0, 0, 0, 0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              transition: 'transform 0.15s ease'
            }}
          >
            <span style={{ fontSize: '24px' }}>🚨</span>
            <span>EMERGENCY SOS — REQUEST AMBULANCE</span>
          </button>
        </div>
      )}

      {/* ACTIVE EMERGENCY TRACKING BANNER & DISPATCH STATUS (Section 3) */}
      {activeRequest && (
        <div
          style={{
            background: '#FFFFFF',
            border: '2px solid #10B981',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 8px 32px rgba(16, 185, 129, 0.15)',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px'
          }}
        >
          {/* Header Row */}
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '28px' }}>🚨</span>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 800, fontSize: '16px', color: '#0F2A21' }}>
                    {activeRequest.id}
                  </span>
                  <span
                    style={{
                      background: getStatusBadge(activeRequest.status).bg,
                      color: getStatusBadge(activeRequest.status).color,
                      padding: '3px 10px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 800,
                      textTransform: 'uppercase'
                    }}
                  >
                    {getStatusBadge(activeRequest.status).label}
                  </span>
                </div>
                <div style={{ fontWeight: 800, fontSize: '17px', color: '#0F2A21', marginTop: '2px' }}>
                  {activeRequest.emergencyType} · {activeRequest.patientName}
                </div>
                <div style={{ fontSize: '12px', color: '#5B7A6D', marginTop: '2px' }}>
                  {getStatusBadge(activeRequest.status).desc}
                </div>
              </div>
            </div>

            {/* Cancel Request Button */}
            <button
              type="button"
              onClick={() => setShowCancelConfirmModal(true)}
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

          {/* Stepper Status Indicator */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', background: '#F8FAF9', padding: '12px 16px', borderRadius: '12px', border: '1px solid #E3EFE9' }}>
            {[
              { key: 'SOS REQUESTED', label: '1. SOS Requested' },
              { key: 'REQUEST RECEIVED', label: '2. Request Received' },
              { key: 'AMBULANCE ASSIGNED', label: '3. Ambulance Assigned' },
              { key: 'AMBULANCE EN ROUTE', label: '4. En Route' },
              { key: 'ARRIVED', label: '5. Arrived on Scene' }
            ].map((step, idx) => {
              const statusOrder = ['SOS REQUESTED', 'REQUEST RECEIVED', 'AMBULANCE ASSIGNED', 'AMBULANCE EN ROUTE', 'ARRIVED'];
              const currentIdx = statusOrder.indexOf(activeRequest.status);
              const isPastOrCurrent = currentIdx >= idx || (activeRequest.status === 'en_route_pickup' && idx <= 3) || (activeRequest.status === 'arrived_scene' && idx <= 4);

              return (
                <div key={step.key} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: isPastOrCurrent ? '#047857' : '#9CA3AF', fontWeight: isPastOrCurrent ? 700 : 500 }}>
                  <span style={{ width: '18px', height: '18px', borderRadius: '50%', background: isPastOrCurrent ? '#10B981' : '#E5E7EB', color: isPastOrCurrent ? '#FFFFFF' : '#6B7280', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 800 }}>
                    {idx + 1}
                  </span>
                  <span>{step.label}</span>
                  {idx < 4 && <span style={{ color: '#D1D5DB', margin: '0 4px' }}>→</span>}
                </div>
              );
            })}
          </div>

          {/* Live Location and Assigned Unit Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px', background: '#F3F8F5', padding: '16px', borderRadius: '12px' }}>
            {/* Live Patient Coordinates */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: '#5B7A6D', textTransform: 'uppercase', fontWeight: 700 }}>
                  Patient Live GPS (Streaming)
                </span>
                <button
                  type="button"
                  onClick={handleRefreshLocation}
                  style={{ background: 'transparent', border: 0, color: '#0B7A55', fontSize: '11px', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                >
                  🔄 Refresh GPS
                </button>
              </div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '14px', fontWeight: 800, color: '#0F2A21', marginTop: '4px' }}>
                {activeRequest.lat.toFixed(4)}° N, {activeRequest.lng.toFixed(4)}° E
              </div>
              <div style={{ fontSize: '12px', color: '#5B7A6D', marginTop: '2px' }}>
                📍 {activeRequest.landmark}
              </div>
              {lastLocationUpdateTime && (
                <div style={{ fontSize: '10.5px', color: '#10B981', fontWeight: 600, marginTop: '2px' }}>
                  ✓ Live watchPosition stream active (Updated {lastLocationUpdateTime})
                </div>
              )}
            </div>

            {/* Assigned Ambulance Unit */}
            <div>
              <div style={{ fontSize: '11px', color: '#5B7A6D', textTransform: 'uppercase', fontWeight: 700 }}>
                Assigned Ambulance Unit
              </div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '15px', fontWeight: 800, color: '#0F2A21', marginTop: '4px' }}>
                {activeRequest.assignedVehicleNo || 'AP 35 TX 1081'}
              </div>
              <div style={{ fontSize: '12px', color: '#0B7A55', fontWeight: 700 }}>
                {activeRequest.ambulanceType || 'ALS'} Advanced Life Support
              </div>
              {activeRequest.assignedDriverPhone && (
                <div style={{ fontSize: '12px', marginTop: '3px' }}>
                  Driver: <b>{activeRequest.assignedDriverName || 'Ramesh Naidu'}</b> (
                  <a href={`tel:${activeRequest.assignedDriverPhone}`} style={{ color: '#0B7A55', fontWeight: 700 }}>
                    📞 Call {activeRequest.assignedDriverPhone}
                  </a>
                  )
                </div>
              )}
            </div>

            {/* ETA Countdown */}
            <div>
              <div style={{ fontSize: '11px', color: '#5B7A6D', textTransform: 'uppercase', fontWeight: 700 }}>
                Estimated Arrival Time (ETA)
              </div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '22px', fontWeight: 800, color: '#059669', marginTop: '2px' }}>
                {activeRequest.etaMinutes || 4} mins ({activeRequest.roadDistanceKm || 2.1} km)
              </div>
              <div style={{ fontSize: '11.5px', color: '#5B7A6D' }}>
                Source: {activeRequest.requestSource || 'Patient Emergency SOS'}
              </div>
              {activeRequest.requestDateTime && (
                <div style={{ fontSize: '11px', color: '#5B7A6D' }}>
                  Logged: {activeRequest.requestDateTime}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TWO-COLUMN LAYOUT: LOCATION ACCESS & DETAILS + NEARBY RAPIDO DISCOVERY */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
        {/* Left Card: 1. Location Access & Emergency Details */}
        <div style={{ background: '#FFFFFF', border: '1px solid #D3E5DC', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <h3 style={{ fontSize: '17px', fontWeight: 800, margin: 0, color: '#0F2A21' }}>
              1. Location Access &amp; Emergency Details
            </h3>
            <p style={{ margin: '3px 0 0', fontSize: '12.5px', color: '#5B7A6D' }}>
              Enable device location or select your landmark in Vizianagaram
            </p>
          </div>

          {/* Location Access Box (Section 1) */}
          <div style={{ background: '#F8FAF9', border: '1px solid #D3E5DC', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '18px' }}>📍</span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#0F2A21' }}>
                  Device Location Status
                </span>
              </div>

              {locationPermissionGranted ? (
                <button
                  type="button"
                  onClick={handleRefreshLocation}
                  disabled={isDetectingLocation}
                  style={{
                    background: '#DDF3E8',
                    border: '1px solid #A7D8C2',
                    borderRadius: '7px',
                    padding: '4px 10px',
                    color: '#0B7A55',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {isDetectingLocation ? 'Refreshing...' : '🔄 Refresh Location'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleEnableLocationAccess}
                  disabled={isDetectingLocation}
                  style={{
                    background: '#22C58B',
                    border: 0,
                    borderRadius: '8px',
                    padding: '7px 14px',
                    color: '#04130D',
                    fontSize: '12.5px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(34, 197, 139, 0.3)'
                  }}
                >
                  {isDetectingLocation ? 'Detecting GPS...' : 'Enable Location Access'}
                </button>
              )}
            </div>

            {/* Display Detected Location Coordinates & Address */}
            {detectedCoords ? (
              <div style={{ background: '#FFFFFF', border: '1px solid #A7D8C2', borderRadius: '8px', padding: '10px 12px', fontSize: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: '#0F2A21' }}>
                    {detectedCoords.lat.toFixed(5)}° N, {detectedCoords.lng.toFixed(5)}° E
                  </span>
                  <span style={{ background: '#DDF3E8', color: '#0B7A55', padding: '2px 6px', borderRadius: '4px', fontSize: '10.5px', fontWeight: 700 }}>
                    GPS Locked (±{detectedCoords.accuracy || 10}m)
                  </span>
                </div>
                <div style={{ color: '#5B7A6D', marginTop: '4px' }}>
                  Matched Sector: <b>{selectedLandmark.name}</b>
                </div>
                {lastLocationUpdateTime && (
                  <div style={{ fontSize: '10.5px', color: '#9CA3AF', marginTop: '2px' }}>
                    Last updated at {lastLocationUpdateTime}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ fontSize: '12px', color: '#5B7A6D' }}>
                Location permission not yet requested. Click <b>"Enable Location Access"</b> above, or manually select your landmark below.
              </div>
            )}

            {/* Error Message if Denied */}
            {locationError && (
              <div style={{ background: '#FBE3E4', border: '1px solid #F0B4B7', borderRadius: '8px', padding: '10px 12px', fontSize: '12px', color: '#C62E35' }}>
                <strong>Location Notice:</strong> {locationError}
              </div>
            )}
          </div>

          {/* Landmark Selection / Address Override */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
              Pickup Landmark in Vizianagaram:
            </label>
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
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, marginBottom: '4px' }}>
              Specific Street Address / Building Details (Optional):
            </label>
            <input
              type="text"
              placeholder="e.g. Near Gate 2, Opp. State Bank of India"
              value={customAddress}
              onChange={e => setCustomAddress(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1px solid #D3E5DC',
                font: 'inherit',
                fontSize: '13px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Emergency presentation selection */}
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

          {/* Action Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
            <button
              type="button"
              onClick={handleSosButtonClick}
              style={{
                height: '48px',
                borderRadius: '12px',
                border: 0,
                background: 'linear-gradient(180deg, #EF4444 0%, #DC2626 100%)',
                color: '#FFFFFF',
                font: 'inherit',
                fontWeight: 900,
                fontSize: '15px',
                cursor: 'pointer',
                boxShadow: '0 4px 18px rgba(239, 68, 68, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                textTransform: 'uppercase'
              }}
            >
              <span>🚨</span> EMERGENCY SOS — REQUEST AMBULANCE
            </button>
          </div>
        </div>

        {/* Right Card: 2. Nearby Ambulances in Vizianagaram */}
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

      {/* EMERGENCY SOS CONFIRMATION DIALOG MODAL (Section 2) */}
      {showSosConfirmModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 42, 33, 0.7)',
            backdropFilter: 'blur(3px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '20px',
              maxWidth: '520px',
              width: '100%',
              padding: '28px',
              boxShadow: '0 24px 60px rgba(0, 0, 0, 0.3)',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '32px' }}>🚨</span>
              <div>
                <span style={{ background: '#FEE2E2', color: '#DC2626', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 800 }}>
                  CONFIRM EMERGENCY SOS
                </span>
                <h3 style={{ margin: '4px 0 0', fontSize: '20px', fontWeight: 900, color: '#0F2A21' }}>
                  Confirm Ambulance Request?
                </h3>
              </div>
            </div>

            <p style={{ margin: 0, fontSize: '13.5px', color: '#374151', lineHeight: 1.5 }}>
              This will transmit your live coordinates and patient condition to the nearest available ambulance unit in Vizianagaram and alert emergency dispatch immediately.
            </p>

            {/* Location & Patient Summary */}
            <div style={{ background: '#F8FAF9', border: '1px solid #D3E5DC', borderRadius: '12px', padding: '14px', fontSize: '12.5px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div>
                <strong>Pickup Location:</strong> {effectiveAddress}
              </div>
              <div>
                <strong>GPS Coordinates:</strong>{' '}
                <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  {effectiveLat.toFixed(5)}° N, {effectiveLng.toFixed(5)}° E
                </span>
                {!detectedCoords && (
                  <span style={{ color: '#D97706', fontWeight: 700, marginLeft: '6px' }}>
                    (Manual selection — GPS not locked)
                  </span>
                )}
              </div>
              <div>
                <strong>Emergency Condition:</strong> <span style={{ color: '#DC2626', fontWeight: 700 }}>{emergencyType}</span>
              </div>
              <div>
                <strong>Caller Contact:</strong> {patientName} ({contactPhone})
              </div>
            </div>

            {!detectedCoords && (
              <div style={{ background: '#FEF3C7', border: '1px solid #FCD34D', borderRadius: '8px', padding: '10px 12px', fontSize: '12px', color: '#92400E' }}>
                ⚠️ <b>Warning:</b> Device GPS location was not obtained. The ambulance will navigate to your selected landmark (<b>{selectedLandmark.name}</b>).
              </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '6px' }}>
              <button
                type="button"
                onClick={() => setShowSosConfirmModal(false)}
                style={{
                  flex: 1,
                  height: '46px',
                  borderRadius: '10px',
                  border: '1.5px solid #D3E5DC',
                  background: 'transparent',
                  color: '#4B5563',
                  fontWeight: 700,
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmEmergencyDispatch}
                style={{
                  flex: 1.5,
                  height: '46px',
                  borderRadius: '10px',
                  border: 0,
                  background: 'linear-gradient(180deg, #EF4444 0%, #DC2626 100%)',
                  color: '#FFFFFF',
                  fontWeight: 900,
                  fontSize: '15px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(239, 68, 68, 0.4)'
                }}
              >
                Yes, Dispatch Ambulance
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CANCEL CONFIRMATION MODAL */}
      {showCancelConfirmModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 42, 33, 0.7)',
            backdropFilter: 'blur(3px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '20px',
              maxWidth: '440px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 24px 60px rgba(0, 0, 0, 0.3)',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px'
            }}
          >
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0F2A21' }}>
              Cancel Emergency Request?
            </h3>
            <p style={{ margin: 0, fontSize: '13px', color: '#4B5563', lineHeight: 1.5 }}>
              Are you sure you want to cancel this ambulance request? If this is an active emergency, please do not cancel.
            </p>

            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button
                type="button"
                onClick={() => setShowCancelConfirmModal(false)}
                style={{
                  flex: 1,
                  height: '42px',
                  borderRadius: '10px',
                  border: '1px solid #D3E5DC',
                  background: 'transparent',
                  fontWeight: 700,
                  fontSize: '13.5px',
                  cursor: 'pointer'
                }}
              >
                No, Keep Active
              </button>
              <button
                type="button"
                onClick={() => {
                  if (activeRequest) onCancelRequest(activeRequest.id);
                  setShowCancelConfirmModal(false);
                }}
                style={{
                  flex: 1,
                  height: '42px',
                  borderRadius: '10px',
                  border: 0,
                  background: '#EF4444',
                  color: '#FFFFFF',
                  fontWeight: 800,
                  fontSize: '13.5px',
                  cursor: 'pointer'
                }}
              >
                Yes, Cancel Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
