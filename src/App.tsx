import React, { useState, useEffect, useMemo } from 'react';
import {
  VerifiedHospital,
  AmbulanceUnit,
  PatientEmergencyRequest,
  RoadSegmentStatus,
  DecisionLogEntry,
  RouteNavigationStep,
  Severity,
  EmergencyStatus
} from './types';
import {
  VERIFIED_HOSPITALS,
  VIZIANAGARAM_AMBULANCES,
  INITIAL_PATIENT_INCIDENTS,
  VIZIANAGARAM_ROADBLOCKS,
  INITIAL_DECISION_LOGS,
  VIZIANAGARAM_CENTER
} from './data/vizianagaramData';
import {
  fetchOsrmDrivingRoute,
  evaluateHospitalMatching,
  rankNearbyAmbulances,
  estimateRoadDistanceKm,
  estimateTravelMinutes
} from './utils/geoRouting';
import { voiceAssistant } from './utils/voiceAssistant';
import { VizianagaramMap } from './components/VizianagaramMap';
import { PatientEmergencyView } from './components/PatientEmergencyView';
import { DriverDashboardView } from './components/DriverDashboardView';
import { HospitalDirectoryView } from './components/HospitalDirectoryView';

export default function App() {
  // Navigation / Role View
  const [activeTab, setActiveTab] = useState<'command' | 'patient' | 'driver' | 'hospitals'>('command');

  // Core State
  const [hospitals, setHospitals] = useState<VerifiedHospital[]>(VERIFIED_HOSPITALS);
  const [ambulances, setAmbulances] = useState<AmbulanceUnit[]>(VIZIANAGARAM_AMBULANCES);
  const [patients, setPatients] = useState<PatientEmergencyRequest[]>(INITIAL_PATIENT_INCIDENTS);
  const [roadBlocks, setRoadBlocks] = useState<RoadSegmentStatus[]>(VIZIANAGARAM_ROADBLOCKS);
  const [decisionLogs, setDecisionLogs] = useState<DecisionLogEntry[]>(INITIAL_DECISION_LOGS);

  // Selected Entities
  const [selectedPatientId, setSelectedPatientId] = useState<string>('EMG-VZM-01');
  const [selectedAmbulanceId, setSelectedAmbulanceId] = useState<string>('AMB-1081');
  const [selectedHospitalId, setSelectedHospitalId] = useState<string>('H-TIRUMALA');

  // Driver view active ambulance
  const [driverAmbulanceId, setDriverAmbulanceId] = useState<string>('AMB-1081');

  // Navigation Route Coordinates for Leaflet Polyline
  const [ambToPatRoute, setAmbToPatRoute] = useState<[number, number][]>([]);
  const [patToHospRoute, setPatToHospRoute] = useState<[number, number][]>([]);
  const [navSteps, setNavSteps] = useState<RouteNavigationStep[]>([]);

  // User GPS Location (if detected)
  const [userGpsLocation, setUserGpsLocation] = useState<[number, number] | null>(null);

  // Filter for Left Incident Queue
  const [queueFilter, setQueueFilter] = useState<'all' | 'critical' | 'serious' | 'other'>('all');

  // Notification Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Selected patient & ambulance objects
  const selectedPatient = useMemo(() => {
    return patients.find(p => p.id === selectedPatientId) || patients[0] || null;
  }, [patients, selectedPatientId]);

  const selectedAmbulance = useMemo(() => {
    return ambulances.find(a => a.id === selectedAmbulanceId) || ambulances[0] || null;
  }, [ambulances, selectedAmbulanceId]);

  const selectedHospital = useMemo(() => {
    return hospitals.find(h => h.id === selectedHospitalId) || hospitals[0] || null;
  }, [hospitals, selectedHospitalId]);

  // Driver ambulance object
  const driverAmbulance = useMemo(() => {
    return ambulances.find(a => a.id === driverAmbulanceId) || ambulances[0];
  }, [ambulances, driverAmbulanceId]);

  // Emergency assigned to this driver
  const driverAssignedEmergency = useMemo(() => {
    return patients.find(p => p.assignedAmbulanceId === driverAmbulance.id && p.status !== 'completed' && p.status !== 'cancelled') || null;
  }, [patients, driverAmbulance.id]);

  // Recalculate routes when selected patient, ambulance, or hospital changes
  useEffect(() => {
    if (!selectedPatient) return;

    let isMounted = true;

    // Find best ambulance if none assigned
    const amb = selectedPatient.assignedAmbulanceId
      ? ambulances.find(a => a.id === selectedPatient.assignedAmbulanceId) || selectedAmbulance
      : selectedAmbulance;

    // Find best hospital match
    const rankedHospitals = evaluateHospitalMatching(selectedPatient, hospitals, roadBlocks);
    const hosp = selectedPatient.assignedHospitalId
      ? hospitals.find(h => h.id === selectedPatient.assignedHospitalId) || hospitals[0]
      : hospitals.find(h => h.id === rankedHospitals[0]?.hospitalId) || hospitals[0];

    // Fetch route from Ambulance -> Patient
    if (amb) {
      fetchOsrmDrivingRoute(amb.lat, amb.lng, selectedPatient.lat, selectedPatient.lng).then(res => {
        if (isMounted) {
          setAmbToPatRoute(res.coordinates);
          setNavSteps(res.steps);
        }
      });
    }

    // Fetch route from Patient -> Hospital
    if (hosp) {
      fetchOsrmDrivingRoute(selectedPatient.lat, selectedPatient.lng, hosp.lat, hosp.lng).then(res => {
        if (isMounted) {
          setPatToHospRoute(res.coordinates);
        }
      });
    }

    return () => {
      isMounted = false;
    };
  }, [selectedPatient?.id, selectedPatient?.assignedAmbulanceId, selectedPatient?.assignedHospitalId, selectedAmbulance?.id, selectedHospital?.id, hospitals, ambulances, roadBlocks]);

  // Add Log Entry Helper
  const addLog = (tag: DecisionLogEntry['tag'], tagColor: string, message: string) => {
    const time = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setDecisionLogs(prev => [
      { id: `LOG-${Date.now()}`, time, tag, tagColor, message },
      ...prev
    ]);
  };

  // Toggle Road Block
  const handleToggleRoadBlock = (roadBlockId: string) => {
    let nowBlocked = false;
    let rbName = '';
    setRoadBlocks(prev =>
      prev.map(rb => {
        if (rb.id === roadBlockId) {
          nowBlocked = !rb.isBlocked;
          rbName = rb.name;
          return { ...rb, isBlocked: nowBlocked };
        }
        return rb;
      })
    );

    addLog(
      nowBlocked ? 'Road closed' : 'Approved',
      nowBlocked ? '#EF4444' : '#10B981',
      nowBlocked
        ? `Road blocked: ${rbName}. All Vizianagaram emergency routes re-routed away from bottleneck.`
        : `Road reopened: ${rbName}. Normal traffic transit restored.`
    );

    voiceAssistant.speak(
      nowBlocked
        ? `Traffic alert: ${rbName} is closed. Navigation routes in Vizianagaram have been updated.`
        : `Traffic alert: ${rbName} has reopened.`
    );

    showToast(nowBlocked ? `Road blocked: ${rbName}. Detours active.` : `Road reopened: ${rbName}.`);
  };

  // Live location update streamed by watchPosition from patient device
  const handleUpdatePatientLiveLocation = (requestId: string, lat: number, lng: number, accuracy?: number) => {
    setPatients(prev =>
      prev.map(p => (p.id === requestId ? { ...p, lat, lng, accuracyMeters: accuracy } : p))
    );
    setUserGpsLocation([lat, lng]);
  };

  // Patient Requests an Ambulance (SOS / Rapido-style)
  const handleRequestAmbulance = (data: {
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
  }) => {
    const id = data.id || `SOS-VZM-0${patients.length + 1}`;
    setUserGpsLocation([data.lat, data.lng]);

    // 1. Create patient record with initial 'SOS REQUESTED' status
    const newPatient: PatientEmergencyRequest = {
      id,
      patientName: data.patientName,
      contactPhone: data.contactPhone,
      emergencyType: data.emergencyType,
      severity: data.severity,
      goldenHourRemainingMin: data.severity === 'CRITICAL' ? 45 : undefined,
      goldenHourTotalMin: 60,
      landmark: data.landmark,
      lat: data.lat,
      lng: data.lng,
      status: data.initialStatus || 'SOS REQUESTED',
      createdAt: 'Just now',
      requestSource: data.requestSource || 'Patient Emergency SOS',
      requestDateTime: data.requestDateTime,
      accuracyMeters: data.accuracyMeters,
      isLiveUserLocation: true
    };

    setPatients(prev => [newPatient, ...prev]);
    setSelectedPatientId(id);

    addLog('SOS Ingested', '#EF4444', `[${data.requestSource}] ${id} registered for ${data.patientName}. Live GPS coordinates: ${data.lat.toFixed(5)}° N, ${data.lng.toFixed(5)}° E (${data.landmark}).`);
    showToast(`Emergency SOS ${id} logged. Transmitting to Vizianagaram Dispatch Ops...`);

    // 2. Realistic dispatch handshake: Transitions to 'REQUEST RECEIVED', then finds best match
    setTimeout(() => {
      // Step A: Request Received by Dispatch
      setPatients(prev =>
        prev.map(p => (p.id === id ? { ...p, status: 'REQUEST RECEIVED' } : p))
      );
      addLog('Approved', '#3B82F6', `Dispatch received ${id}. Searching nearby ALS/BLS ambulances in Vizianagaram...`);

      setTimeout(() => {
        // Step B: Match nearest capable ambulance and destination hospital
        const rankedAmbs = rankNearbyAmbulances(newPatient, ambulances, roadBlocks);
        const bestMatch = rankedAmbs[0];
        const rankedHosps = evaluateHospitalMatching(newPatient, hospitals, roadBlocks);
        const bestHosp = hospitals.find(h => h.id === rankedHosps[0]?.hospitalId) || hospitals[0];

        if (bestMatch) {
          setPatients(prev =>
            prev.map(p => {
              if (p.id === id) {
                return {
                  ...p,
                  status: 'AMBULANCE ASSIGNED',
                  assignedAmbulanceId: bestMatch.ambulance.id,
                  assignedHospitalId: bestHosp.id,
                  assignedDriverName: bestMatch.ambulance.driverName,
                  assignedDriverPhone: bestMatch.ambulance.driverPhone,
                  assignedVehicleNo: bestMatch.ambulance.vehicleNumber,
                  ambulanceType: bestMatch.ambulance.type,
                  etaMinutes: bestMatch.etaMinutes,
                  roadDistanceKm: bestMatch.distanceKm
                };
              }
              return p;
            })
          );

          // Update ambulance status
          setAmbulances(prev =>
            prev.map(a => (a.id === bestMatch.ambulance.id ? { ...a, status: 'assigned', assignedIncidentId: id } : a))
          );

          // Voice alert to driver
          voiceAssistant.speak(
            `New emergency request received. Patient location: ${data.landmark}. Condition: ${data.emergencyType}.`,
            true
          );

          addLog('Dispatched', '#10B981', `Ambulance ${bestMatch.ambulance.vehicleNumber} (${bestMatch.ambulance.type}) assigned to ${id} at ${data.landmark}. ETA: ${bestMatch.etaMinutes} mins.`);
          showToast(`Ambulance Assigned: ${bestMatch.ambulance.vehicleNumber} (${bestMatch.etaMinutes} min away).`);
        } else {
          addLog('SOS Ingested', '#EF4444', `All units engaged in Vizianagaram. Emergency request ${id} placed in automated escalation queue.`);
          showToast('All ambulances currently engaged. Request placed in emergency priority queue. Dial 108 if needed.');
        }
      }, 700);
    }, 700);
  };

  // Driver Accepts Emergency
  const handleDriverAccept = (incidentId: string) => {
    setPatients(prev =>
      prev.map(p => {
        if (p.id === incidentId) {
          return { ...p, status: 'AMBULANCE EN ROUTE' };
        }
        return p;
      })
    );

    setAmbulances(prev =>
      prev.map(a => {
        if (a.assignedIncidentId === incidentId) {
          return { ...a, status: 'en_route_pickup' };
        }
        return a;
      })
    );

    addLog('Approved', '#10B981', `Driver accepted ${incidentId}. En route with siren to pickup.`);
    showToast('Dispatch accepted. Ambulance en route with siren.');
  };

  // Driver Declines / Timeout Escalation
  const handleDriverDecline = (incidentId: string) => {
    // Escalate to next suitable ambulance
    const patient = patients.find(p => p.id === incidentId);
    if (!patient) return;

    const remainingAmbs = ambulances.filter(a => a.id !== patient.assignedAmbulanceId && a.status === 'available');
    const ranked = rankNearbyAmbulances(patient, remainingAmbs, roadBlocks);
    const nextBest = ranked[0];

    if (nextBest) {
      setPatients(prev =>
        prev.map(p => {
          if (p.id === incidentId) {
            return {
              ...p,
              assignedAmbulanceId: nextBest.ambulance.id,
              assignedDriverName: nextBest.ambulance.driverName,
              assignedDriverPhone: nextBest.ambulance.driverPhone,
              assignedVehicleNo: nextBest.ambulance.vehicleNumber,
              ambulanceType: nextBest.ambulance.type,
              etaMinutes: nextBest.etaMinutes,
              roadDistanceKm: nextBest.distanceKm,
              status: 'assigned'
            };
          }
          return p;
        })
      );

      setAmbulances(prev =>
        prev.map(a => {
          if (a.id === nextBest.ambulance.id) return { ...a, status: 'assigned', assignedIncidentId: incidentId };
          if (a.assignedIncidentId === incidentId) return { ...a, status: 'available', assignedIncidentId: undefined };
          return a;
        })
      );

      addLog('Dispatched', '#F59E0B', `Escalation: Unit ${nextBest.ambulance.vehicleNumber} assigned to ${incidentId} after previous unit declined.`);
      voiceAssistant.speak(`Request escalated to Unit ${nextBest.ambulance.vehicleNumber}.`, true);
      showToast(`Escalated to alternate unit: ${nextBest.ambulance.vehicleNumber}.`);
    } else {
      addLog('SOS Ingested', '#EF4444', `No available alternate ambulances in Vizianagaram. Dispatcher intervention required.`);
      showToast('All units engaged. Escalated to District Medical Operations.');
    }
  };

  // Update Emergency Progress (Arrived on scene, en route to hospital, completed)
  const handleUpdateEmergencyStatus = (incidentId: string, newStatus: PatientEmergencyRequest['status']) => {
    setPatients(prev =>
      prev.map(p => (p.id === incidentId ? { ...p, status: newStatus } : p))
    );

    setAmbulances(prev =>
      prev.map(a => {
        if (a.assignedIncidentId === incidentId) {
          if (newStatus === 'completed') {
            return { ...a, status: 'available', assignedIncidentId: undefined };
          }
          return { ...a, status: newStatus as any };
        }
        return a;
      })
    );

    if (newStatus === 'arrived_scene') {
      addLog('Arrived', '#10B981', `Ambulance arrived at patient scene for ${incidentId}. Triage initiated.`);
    } else if (newStatus === 'in_transit_hospital') {
      addLog('Dispatched', '#3B82F6', `Patient loaded. Ambulance in transit to hospital for ${incidentId}.`);
    } else if (newStatus === 'completed') {
      addLog('Approved', '#10B981', `Emergency ${incidentId} completed. Patient admitted. Unit available.`);
    }
  };

  // Cancel Patient Request
  const handleCancelRequest = (incidentId: string) => {
    setPatients(prev =>
      prev.map(p => (p.id === incidentId ? { ...p, status: 'cancelled' } : p))
    );

    setAmbulances(prev =>
      prev.map(a => {
        if (a.assignedIncidentId === incidentId) {
          return { ...a, status: 'available', assignedIncidentId: undefined };
        }
        return a;
      })
    );

    voiceAssistant.speak('Emergency request has been cancelled by caller.', true);
    addLog('Road closed', '#6B7280', `Emergency request ${incidentId} was cancelled.`);
    showToast('Emergency request cancelled.');
  };

  // Toggle Hospital Divert
  const handleToggleDivert = (hospitalId: string) => {
    let nowDivert = false;
    let hName = '';
    setHospitals(prev =>
      prev.map(h => {
        if (h.id === hospitalId) {
          nowDivert = h.status !== 'divert';
          hName = h.name;
          return { ...h, status: nowDivert ? 'divert' : 'normal' };
        }
        return h;
      })
    );

    addLog('Divert', nowDivert ? '#EF4444' : '#10B981', `${hName} divert status set to ${nowDivert ? 'ACTIVE (No incoming)' : 'NORMAL'}.`);
    showToast(`${hName} divert status: ${nowDivert ? 'Diverting ambulances' : 'Normal admissions'}.`);
  };

  // Admin Update Hospital Beds
  const handleUpdateBeds = (hospitalId: string, freeBeds: number, freeIcu: number) => {
    setHospitals(prev =>
      prev.map(h => {
        if (h.id === hospitalId) {
          const load = Math.round(((h.totalBeds - freeBeds) / h.totalBeds) * 100);
          return { ...h, freeBeds, freeIcu, loadPercent: load };
        }
        return h;
      })
    );
    addLog('Reserved', '#10B981', `Admin updated bed inventory for ${hospitalId}: ${freeBeds} free beds, ${freeIcu} ICU.`);
    showToast('Hospital bed inventory updated.');
  };

  // Filtered incidents for the left list
  const filteredPatients = useMemo(() => {
    if (queueFilter === 'critical') return patients.filter(p => p.severity === 'CRITICAL');
    if (queueFilter === 'serious') return patients.filter(p => p.severity === 'SERIOUS');
    if (queueFilter === 'other') return patients.filter(p => p.severity === 'MODERATE' || p.severity === 'MINOR');
    return patients;
  }, [patients, queueFilter]);

  const criticalCount = patients.filter(p => p.severity === 'CRITICAL').length;
  const seriousCount = patients.filter(p => p.severity === 'SERIOUS').length;
  const availableAmbulancesCount = ambulances.filter(a => a.status === 'available').length;

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#F3F8F5',
        color: '#0F2A21',
        fontFamily: 'Manrope, system-ui, sans-serif',
        fontSize: '14px',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* TOAST MESSAGE */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '24px',
            zIndex: 10000,
            background: '#0F2A21',
            color: '#FFFFFF',
            padding: '12px 20px',
            borderRadius: '12px',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.28)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '13.5px',
            fontWeight: 700,
            border: '1.5px solid #10B981'
          }}
        >
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22C58B' }}></span>
          {toastMessage}
        </div>
      )}

      {/* TOP HEADER */}
      <header
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '16px 28px',
          padding: '12px 28px',
          borderBottom: '1px solid #D3E5DC',
          background: '#FFFFFF'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={() => setActiveTab('command')}>
          <svg width="36" height="36" viewBox="0 0 38 38" role="img" aria-label="ResQ Force logo">
            <rect x="1" y="1" width="36" height="36" rx="10" fill="#0E9F6E" />
            <path d="M16 9h6v7h7v6h-7v7h-6v-7H9v-6h7z" fill="#04130D" />
          </svg>
          <div>
            <div style={{ fontWeight: 800, fontSize: '18px', letterSpacing: '-0.01em' }}>
              ResQ <span style={{ color: '#0B7A55' }}>Force</span>
            </div>
            <div
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '10px',
                letterSpacing: '0.12em',
                color: '#5B7A6D',
                textTransform: 'uppercase'
              }}
            >
              Vizianagaram Emergency Grid · Andhra Pradesh
            </div>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <nav style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
          <button
            type="button"
            onClick={() => setActiveTab('command')}
            style={{
              padding: '8px 14px',
              borderRadius: '9px',
              background: activeTab === 'command' ? '#DDF3E8' : 'transparent',
              color: activeTab === 'command' ? '#0B7A55' : '#3E5B4F',
              border: activeTab === 'command' ? '1px solid #A7D8C2' : '1px solid transparent',
              font: 'inherit',
              fontWeight: activeTab === 'command' ? 800 : 600,
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            🗺️ Live Map &amp; Dispatch
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('patient')}
            style={{
              padding: '8px 14px',
              borderRadius: '9px',
              background: activeTab === 'patient' ? '#DDF3E8' : 'transparent',
              color: activeTab === 'patient' ? '#0B7A55' : '#3E5B4F',
              border: activeTab === 'patient' ? '1px solid #A7D8C2' : '1px solid transparent',
              font: 'inherit',
              fontWeight: activeTab === 'patient' ? 800 : 600,
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            🚨 Request Ambulance (Patient)
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('driver')}
            style={{
              padding: '8px 14px',
              borderRadius: '9px',
              background: activeTab === 'driver' ? '#DDF3E8' : 'transparent',
              color: activeTab === 'driver' ? '#0B7A55' : '#3E5B4F',
              border: activeTab === 'driver' ? '1px solid #A7D8C2' : '1px solid transparent',
              font: 'inherit',
              fontWeight: activeTab === 'driver' ? 800 : 600,
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            🎙️ Driver Dashboard (Hands-Free)
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('hospitals')}
            style={{
              padding: '8px 14px',
              borderRadius: '9px',
              background: activeTab === 'hospitals' ? '#DDF3E8' : 'transparent',
              color: activeTab === 'hospitals' ? '#0B7A55' : '#3E5B4F',
              border: activeTab === 'hospitals' ? '1px solid #A7D8C2' : '1px solid transparent',
              font: 'inherit',
              fontWeight: activeTab === 'hospitals' ? 800 : 600,
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            🏥 Hospitals Directory
          </button>
        </nav>

        {/* Live indicator & Helpline */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontFamily: "'JetBrains Mono', monospace", fontSize: '11.5px', color: '#3E5B4F' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981', boxShadow: '0 0 0 3px rgba(16,185,129,0.2)' }} />
            GPS ONLINE · VIZIANAGARAM
          </div>

          <a
            href="tel:108"
            style={{
              background: '#FBE3E4',
              color: '#C62E35',
              padding: '5px 12px',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: 800,
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <span>📞</span> 108 SOS
          </a>
        </div>
      </header>

      {/* RENDER VIEW ACCORDING TO ACTIVE TAB */}
      {activeTab === 'patient' ? (
        <PatientEmergencyView
          ambulances={ambulances}
          hospitals={hospitals}
          activeRequest={patients.find(p => p.isLiveUserLocation && p.status !== 'completed' && p.status !== 'cancelled') || null}
          onRequestAmbulance={handleRequestAmbulance}
          onCancelRequest={handleCancelRequest}
          onSelectAmbulance={amb => {
            setSelectedAmbulanceId(amb.id);
            setActiveTab('command');
          }}
          onUpdateLiveLocation={handleUpdatePatientLiveLocation}
        />
      ) : activeTab === 'driver' ? (
        <DriverDashboardView
          currentAmbulance={driverAmbulance}
          activeEmergency={driverAssignedEmergency}
          assignedHospital={hospitals.find(h => h.id === driverAssignedEmergency?.assignedHospitalId) || hospitals[0]}
          navigationSteps={navSteps}
          onAcceptEmergency={handleDriverAccept}
          onDeclineEmergency={handleDriverDecline}
          onUpdateStatus={handleUpdateEmergencyStatus}
          onToggleOnline={() => {
            setAmbulances(prev =>
              prev.map(a => {
                if (a.id === driverAmbulance.id) {
                  const nowOffline = a.status !== 'offline';
                  return { ...a, status: nowOffline ? 'offline' : 'available' };
                }
                return a;
              })
            );
          }}
        />
      ) : activeTab === 'hospitals' ? (
        <HospitalDirectoryView
          hospitals={hospitals}
          onToggleDivert={handleToggleDivert}
          onUpdateBeds={handleUpdateBeds}
          onSelectHospital={hosp => {
            setSelectedHospitalId(hosp.id);
            setActiveTab('command');
          }}
        />
      ) : (
        /* COMMAND DASHBOARD: REAL LEAFLET VIZIANAGARAM MAP + REAL FLEET */
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          {/* KPI STRIP */}
          <section
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
              gap: '14px',
              padding: '16px 28px 8px'
            }}
          >
            <div style={{ background: '#FFFFFF', border: '1px solid #D3E5DC', borderRadius: '14px', padding: '14px 18px' }}>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: '#5B7A6D', textTransform: 'uppercase' }}>
                Active Emergencies
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginTop: '4px' }}>
                <span style={{ fontSize: '28px', fontWeight: 800 }}>{patients.length}</span>
                <span style={{ fontSize: '12px', color: '#C62E35', fontWeight: 700 }}>{criticalCount} critical</span>
              </div>
              <div style={{ fontSize: '11.5px', color: '#5B7A6D', marginTop: '2px' }}>
                Vizianagaram City &amp; Bypass coverage
              </div>
            </div>

            <div style={{ background: '#FFFFFF', border: '1px solid #D3E5DC', borderRadius: '14px', padding: '14px 18px' }}>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: '#5B7A6D', textTransform: 'uppercase' }}>
                Available Ambulances
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginTop: '4px' }}>
                <span style={{ fontSize: '28px', fontWeight: 800 }}>{availableAmbulancesCount}</span>
                <span style={{ fontSize: '14px', color: '#5B7A6D', fontWeight: 600 }}>/ {ambulances.length} Active</span>
              </div>
              <div style={{ height: '5px', borderRadius: '3px', background: '#E3EFE9', marginTop: '6px', overflow: 'hidden' }}>
                <div style={{ width: `${(availableAmbulancesCount / ambulances.length) * 100}%`, height: '100%', background: '#10B981' }} />
              </div>
            </div>

            <div style={{ background: '#FFFFFF', border: '1px solid #D3E5DC', borderRadius: '14px', padding: '14px 18px' }}>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: '#5B7A6D', textTransform: 'uppercase' }}>
                Avg Road Response Time
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '4px' }}>
                <span style={{ fontSize: '28px', fontWeight: 800 }}>4.8</span>
                <span style={{ fontSize: '13px', color: '#5B7A6D', fontWeight: 600 }}>min</span>
                <span style={{ fontSize: '11.5px', background: '#DDF3E8', color: '#0B7A55', padding: '2px 7px', borderRadius: '12px', fontWeight: 700 }}>
                  ▼ 34% vs 108 Standard
                </span>
              </div>
              <div style={{ fontSize: '11.5px', color: '#5B7A6D', marginTop: '2px' }}>Actual OSRM Road Distance</div>
            </div>

            <div style={{ background: '#FFFFFF', border: '1px solid #D3E5DC', borderRadius: '14px', padding: '14px 18px' }}>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: '#5B7A6D', textTransform: 'uppercase' }}>
                Verified Local Hospitals
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '4px' }}>
                <span style={{ fontSize: '28px', fontWeight: 800 }}>{hospitals.length}</span>
                <span style={{ fontSize: '12px', color: '#059669', fontWeight: 700 }}>100% Verified</span>
              </div>
              <div style={{ fontSize: '11.5px', color: '#5B7A6D', marginTop: '2px' }}>GGH, Tirumala, MIMS, Sai</div>
            </div>
          </section>

          {/* MAIN 3-COLUMN DISPATCH VIEW */}
          <main style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', padding: '8px 28px 16px', flex: 1 }}>
            {/* Left Column: Triage Queue */}
            <section
              style={{
                flex: '1 1 300px',
                maxWidth: '360px',
                minWidth: '280px',
                background: '#FFFFFF',
                border: '1px solid #D3E5DC',
                borderRadius: '16px',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
              }}
            >
              <div style={{ padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E3EFE9' }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '15px' }}>Vizianagaram Incident Queue</div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10.5px', color: '#5B7A6D' }}>
                    SORTED BY CLINICAL URGENCY
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('patient')}
                  style={{
                    background: '#22C58B',
                    color: '#04130D',
                    border: 0,
                    borderRadius: '8px',
                    padding: '5px 10px',
                    fontSize: '11.5px',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  + New SOS
                </button>
              </div>

              {/* Filter chips */}
              <div style={{ display: 'flex', gap: '6px', padding: '10px 18px', borderBottom: '1px solid #E3EFE9' }}>
                <button
                  type="button"
                  onClick={() => setQueueFilter('all')}
                  style={{
                    padding: '3px 9px',
                    borderRadius: '14px',
                    border: queueFilter === 'all' ? 'none' : '1px solid #D3E5DC',
                    background: queueFilter === 'all' ? '#22C58B' : 'transparent',
                    color: queueFilter === 'all' ? '#04130D' : '#3E5B4F',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  All ({patients.length})
                </button>
                <button
                  type="button"
                  onClick={() => setQueueFilter('critical')}
                  style={{
                    padding: '3px 9px',
                    borderRadius: '14px',
                    border: queueFilter === 'critical' ? 'none' : '1px solid #F0B4B7',
                    background: queueFilter === 'critical' ? '#EF4444' : 'transparent',
                    color: queueFilter === 'critical' ? '#FFFFFF' : '#C62E35',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Critical ({criticalCount})
                </button>
                <button
                  type="button"
                  onClick={() => setQueueFilter('serious')}
                  style={{
                    padding: '3px 9px',
                    borderRadius: '14px',
                    border: queueFilter === 'serious' ? 'none' : '1px solid #FF9F43',
                    background: queueFilter === 'serious' ? '#FF9F43' : 'transparent',
                    color: queueFilter === 'serious' ? '#FFFFFF' : '#B25E0A',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Serious ({seriousCount})
                </button>
              </div>

              {/* Incidents List */}
              <div style={{ display: 'flex', flexDirection: 'column', overflowY: 'auto', maxHeight: '520px' }}>
                {filteredPatients.map(pat => {
                  const isSelected = selectedPatientId === pat.id;
                  const isCrit = pat.severity === 'CRITICAL';
                  const borderCol = isCrit ? '#EF4444' : pat.severity === 'SERIOUS' ? '#F97316' : '#EAB308';

                  return (
                    <div
                      key={pat.id}
                      onClick={() => setSelectedPatientId(pat.id)}
                      style={{
                        padding: '12px 16px',
                        borderBottom: '1px solid #E3EFE9',
                        borderLeft: `3.5px solid ${borderCol}`,
                        background: isSelected ? 'rgba(52,211,153,0.1)' : 'transparent',
                        cursor: 'pointer'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: '12px' }}>
                          {pat.id}
                        </span>
                        <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 6px', borderRadius: '4px', background: `${borderCol}20`, color: borderCol }}>
                          {pat.severity}
                        </span>
                      </div>
                      <div style={{ fontWeight: 800, fontSize: '13.5px', marginTop: '3px', color: '#0F2A21' }}>
                        {pat.emergencyType}
                      </div>
                      <div style={{ fontSize: '12px', color: '#5B7A6D', marginTop: '2px' }}>
                        📍 {pat.landmark}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', fontSize: '11px', color: '#3E5B4F' }}>
                        <span>Caller: {pat.patientName}</span>
                        {pat.goldenHourRemainingMin && (
                          <span style={{ color: '#DC2626', fontWeight: 700 }}>
                            {pat.goldenHourRemainingMin}m left
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Center Column: Real Leaflet Vizianagaram Map */}
            <section style={{ flex: '999 1 480px', minWidth: '320px', display: 'flex', flexDirection: 'column', background: '#FFFFFF', border: '1px solid #D3E5DC', borderRadius: '16px', overflow: 'hidden' }}>
              <div style={{ padding: '12px 18px', borderBottom: '1px solid #E3EFE9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontWeight: 800, fontSize: '15px' }}>Live Satellite &amp; Road Grid: Vizianagaram</span>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: '#059669', background: '#DDF3E8', padding: '2px 7px', borderRadius: '4px' }}>
                    18.1124° N, 83.3979° E
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      if (navigator.geolocation) {
                        navigator.geolocation.getCurrentPosition(
                          pos => {
                            setUserGpsLocation([pos.coords.latitude, pos.coords.longitude]);
                            showToast(`GPS Location Locked: ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`);
                          },
                          () => showToast('GPS location permission denied.')
                        );
                      }
                    }}
                    style={{
                      background: '#FFFFFF',
                      border: '1px solid #A7D8C2',
                      borderRadius: '8px',
                      padding: '5px 10px',
                      fontSize: '11.5px',
                      fontWeight: 700,
                      color: '#0B7A55',
                      cursor: 'pointer'
                    }}
                  >
                    📍 My GPS
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggleRoadBlock('RB-VZM-1')}
                    style={{
                      background: roadBlocks.find(r => r.id === 'RB-VZM-1')?.isBlocked ? '#EF4444' : '#FFFFFF',
                      color: roadBlocks.find(r => r.id === 'RB-VZM-1')?.isBlocked ? '#FFFFFF' : '#3E5B4F',
                      border: '1px solid #D3E5DC',
                      borderRadius: '8px',
                      padding: '5px 10px',
                      fontSize: '11.5px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    🚧 {roadBlocks.find(r => r.id === 'RB-VZM-1')?.isBlocked ? 'MG Road Blocked' : 'Block MG Road'}
                  </button>
                </div>
              </div>

              <div style={{ flex: 1, minHeight: '440px', position: 'relative' }}>
                <VizianagaramMap
                  hospitals={hospitals}
                  ambulances={ambulances}
                  patients={patients}
                  roadBlocks={roadBlocks}
                  selectedPatient={selectedPatient}
                  selectedAmbulance={selectedAmbulance}
                  selectedHospital={selectedHospital}
                  routeCoordinates={ambToPatRoute}
                  hospitalRouteCoordinates={patToHospRoute}
                  onSelectPatient={p => setSelectedPatientId(p.id)}
                  onSelectAmbulance={a => setSelectedAmbulanceId(a.id)}
                  onSelectHospital={h => setSelectedHospitalId(h.id)}
                  onToggleRoadBlock={handleToggleRoadBlock}
                  userGpsLocation={userGpsLocation}
                />
              </div>
            </section>

            {/* Right Column: Rapido-style Matching & Active Dispatch Card */}
            <section style={{ flex: '1 1 320px', maxWidth: '380px', minWidth: '280px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {selectedPatient && (
                <div style={{ background: '#FFFFFF', border: '1px solid #A7D8C2', borderRadius: '16px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px', boxShadow: '0 4px 20px rgba(11,122,85,0.08)' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10.5px', color: '#0B7A55', fontWeight: 800 }}>
                        RECOMMENDED MATCH
                      </span>
                      <span style={{ fontSize: '11px', background: '#DDF3E8', color: '#0B7A55', padding: '2px 7px', borderRadius: '4px', fontWeight: 700 }}>
                        RAPIDO DISCOVERY
                      </span>
                    </div>
                    <h3 style={{ fontSize: '17px', fontWeight: 800, margin: '4px 0 2px' }}>
                      {selectedPatient.emergencyType}
                    </h3>
                    <div style={{ fontSize: '12px', color: '#5B7A6D' }}>
                      📍 {selectedPatient.landmark}
                    </div>
                  </div>

                  {/* Best Ambulance Card */}
                  {selectedAmbulance && (
                    <div style={{ background: '#F3F8F5', borderRadius: '12px', padding: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '24px' }}>🚑</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 800, fontSize: '13px' }}>
                            {selectedAmbulance.vehicleNumber}
                          </span>
                          <span style={{ fontSize: '10px', background: '#22C58B', color: '#04130D', padding: '1px 5px', borderRadius: '4px', fontWeight: 800 }}>
                            {selectedAmbulance.type}
                          </span>
                        </div>
                        <div style={{ fontSize: '12px', color: '#5B7A6D', marginTop: '2px' }}>
                          {selectedAmbulance.driverName} ({selectedAmbulance.rating} ★)
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 800, fontSize: '16px', color: '#0B7A55' }}>
                          {estimateTravelMinutes(estimateRoadDistanceKm(selectedAmbulance.lat, selectedAmbulance.lng, selectedPatient.lat, selectedPatient.lng))} min
                        </div>
                        <div style={{ fontSize: '11px', color: '#5B7A6D' }}>ETA</div>
                      </div>
                    </div>
                  )}

                  {/* Destination Hospital Card */}
                  {selectedHospital && (
                    <div style={{ background: '#F3F8F5', borderRadius: '12px', padding: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '24px' }}>🏥</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 800, fontSize: '13.5px' }}>{selectedHospital.name}</div>
                        <div style={{ fontSize: '11.5px', color: '#059669', fontWeight: 600 }}>
                          {selectedHospital.freeIcu} ICU beds · 24x7 Emergency
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 800, fontSize: '16px', color: '#0F2A21' }}>
                          {estimateTravelMinutes(estimateRoadDistanceKm(selectedPatient.lat, selectedPatient.lng, selectedHospital.lat, selectedHospital.lng))} min
                        </div>
                        <div style={{ fontSize: '11px', color: '#5B7A6D' }}>Transit</div>
                      </div>
                    </div>
                  )}

                  {/* Clinical Reason Box */}
                  <div style={{ borderLeft: '3px solid #16B37E', background: 'rgba(52,211,153,0.08)', borderRadius: '0 8px 8px 0', padding: '10px 12px', fontSize: '12.5px', color: '#1F3B30' }}>
                    <strong>Why This Match:</strong> {selectedAmbulance?.type === 'ALS' ? 'ALS unit selected with cardiac ventilator.' : 'Closest available response unit.'}{' '}
                    {selectedHospital?.name} selected for verified {selectedHospital?.specialties[0]} department.
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        handleDriverAccept(selectedPatient.id);
                        voiceAssistant.speak(`Ambulance ${selectedAmbulance.vehicleNumber} dispatched to ${selectedPatient.landmark}.`, true);
                      }}
                      style={{
                        flex: 1.5,
                        height: '42px',
                        borderRadius: '10px',
                        background: '#22C58B',
                        color: '#04130D',
                        border: 0,
                        font: 'inherit',
                        fontWeight: 800,
                        cursor: 'pointer'
                      }}
                    >
                      Approve &amp; Dispatch
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDriverAmbulanceId(selectedAmbulance.id);
                        setActiveTab('driver');
                      }}
                      style={{
                        flex: 1,
                        height: '42px',
                        borderRadius: '10px',
                        background: 'transparent',
                        color: '#0B7A55',
                        border: '1px solid #A7D8C2',
                        font: 'inherit',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      Driver Mode
                    </button>
                  </div>
                </div>
              )}
            </section>
          </main>
        </div>
      )}

      {/* FOOTER */}
      <footer
        style={{
          marginTop: 'auto',
          padding: '12px 28px 18px',
          borderTop: '1px solid #E3EFE9',
          background: '#FFFFFF',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px 28px',
          fontSize: '12px',
          color: '#5B7A6D'
        }}
      >
        <span>
          <strong>Geographical Scope:</strong> Strictly Vizianagaram District &amp; Municipal Corporation, Andhra Pradesh.
        </span>
        <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>
          6 VERIFIED HOSPITALS · 8 ACTIVE AMBULANCES · OSRM REAL ROAD ROUTING
        </span>
        <span style={{ marginLeft: 'auto' }}>
          Emergency Dispatch Supplement · Dial 108 for National Ambulance
        </span>
      </footer>
    </div>
  );
}
