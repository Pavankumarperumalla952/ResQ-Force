import React, { useState, useEffect } from 'react';
import { AmbulanceUnit, PatientEmergencyRequest, VerifiedHospital, RouteNavigationStep } from '../types';
import { voiceAssistant } from '../utils/voiceAssistant';

interface DriverDashboardViewProps {
  currentAmbulance: AmbulanceUnit;
  activeEmergency: PatientEmergencyRequest | null;
  assignedHospital: VerifiedHospital | null;
  navigationSteps: RouteNavigationStep[];
  onAcceptEmergency: (incidentId: string) => void;
  onDeclineEmergency: (incidentId: string) => void;
  onUpdateStatus: (incidentId: string, newStatus: PatientEmergencyRequest['status']) => void;
  onToggleOnline: () => void;
}

export const DriverDashboardView: React.FC<DriverDashboardViewProps> = ({
  currentAmbulance,
  activeEmergency,
  assignedHospital,
  navigationSteps,
  onAcceptEmergency,
  onDeclineEmergency,
  onUpdateStatus,
  onToggleOnline
}) => {
  const [countdown, setCountdown] = useState<number>(25);
  const [isMuted, setIsMuted] = useState<boolean>(voiceAssistant.getMuted());
  const [currentStepIdx, setCurrentStepIdx] = useState<number>(0);

  // Auto decline timeout countdown if in 'assigned' or 'AMBULANCE ASSIGNED' pending state
  useEffect(() => {
    if (!activeEmergency || (activeEmergency.status !== 'assigned' && activeEmergency.status !== 'AMBULANCE ASSIGNED')) {
      setCountdown(25);
      return;
    }

    // Voice announcement when new emergency assigned
    voiceAssistant.speak(
      `New emergency request received. Patient location: ${activeEmergency.landmark}. Condition: ${activeEmergency.emergencyType}.`,
      true
    );

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          onDeclineEmergency(activeEmergency.id);
          voiceAssistant.speak('Emergency offer timed out. Escalating to next nearest unit in Vizianagaram.');
          return 25;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [activeEmergency?.id, activeEmergency?.status]);

  // Voice announcement on state transitions
  const handleAccept = () => {
    if (!activeEmergency) return;
    onAcceptEmergency(activeEmergency.id);
    voiceAssistant.speak(
      `Dispatch accepted. Proceed immediately to ${activeEmergency.landmark}. Navigation route is active on your screen.`,
      true
    );
  };

  const handleStepAdvance = (newStatus: PatientEmergencyRequest['status']) => {
    if (!activeEmergency) return;
    onUpdateStatus(activeEmergency.id, newStatus);

    if (newStatus === 'arrived_scene') {
      voiceAssistant.speak('You have arrived at the patient location. Prepare resuscitation equipment.', true);
    } else if (newStatus === 'in_transit_hospital') {
      const hospName = assignedHospital?.name || 'Government General Hospital';
      voiceAssistant.speak(`Patient loaded. Proceed to ${hospName}. Emergency department has been notified.`, true);
    } else if (newStatus === 'completed') {
      voiceAssistant.speak('Patient handover completed. You are now available for new dispatches in Vizianagaram.', true);
    }
  };

  const handleRepeatVoice = () => {
    if (!activeEmergency) {
      voiceAssistant.speak('Voice assistant ready. No active emergency assigned.');
      return;
    }
    const currentStep = navigationSteps[currentStepIdx] || navigationSteps[0];
    if (activeEmergency.status === 'en_route_pickup') {
      voiceAssistant.speak(`Proceed to ${activeEmergency.landmark}. ${currentStep ? currentStep.spokenText : 'Continue straight.'}`);
    } else if (activeEmergency.status === 'in_transit_hospital') {
      voiceAssistant.speak(`Proceed to ${assignedHospital?.name || 'hospital'}. Follow the highlighted arterial route.`);
    }
  };

  const handleToggleMute = () => {
    const muted = voiceAssistant.toggleMute();
    setIsMuted(muted);
  };

  const handlePlaySiren = () => {
    voiceAssistant.playChime('urgent');
  };

  const currentStep = navigationSteps[currentStepIdx] || navigationSteps[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '20px 28px', maxWidth: '1200px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
      {/* DRIVER MODE BANNER & VOICE STATUS */}
      <div
        style={{
          background: '#0F2A21',
          color: '#FFFFFF',
          borderRadius: '16px',
          padding: '16px 24px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          boxShadow: '0 8px 30px rgba(15, 42, 33, 0.35)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <span style={{ fontSize: '32px' }}>🚑</span>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 800, fontSize: '18px', color: '#34D399' }}>
                {currentAmbulance.vehicleNumber}
              </span>
              <span style={{ background: '#22C58B', color: '#04130D', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 800 }}>
                {currentAmbulance.type}
              </span>
              <span style={{ fontSize: '12px', color: '#A7D8C2' }}>Driver: {currentAmbulance.driverName}</span>
            </div>
            <div style={{ fontSize: '12.5px', color: '#A7D8C2', marginTop: '2px' }}>
              Base: {currentAmbulance.baseLocationName} · GPS Status: <span style={{ color: '#34D399', fontWeight: 700 }}>Live Active</span>
            </div>
          </div>
        </div>

        {/* Voice Assistant Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={handleRepeatVoice}
            style={{
              background: 'rgba(52, 211, 153, 0.15)',
              border: '1px solid #10B981',
              color: '#34D399',
              borderRadius: '8px',
              padding: '8px 14px',
              fontSize: '12.5px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>🗣️</span> Repeat Voice Prompt
          </button>

          <button
            type="button"
            onClick={handlePlaySiren}
            style={{
              background: '#C62E35',
              border: 0,
              color: '#FFFFFF',
              borderRadius: '8px',
              padding: '8px 14px',
              fontSize: '12.5px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            🚨 Chime
          </button>

          <button
            type="button"
            onClick={handleToggleMute}
            style={{
              background: isMuted ? '#C62E35' : 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: '#FFFFFF',
              borderRadius: '8px',
              padding: '8px 14px',
              fontSize: '12.5px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            {isMuted ? '🔇 Voice Muted' : '🔊 Voice Active'}
          </button>

          <button
            type="button"
            onClick={onToggleOnline}
            style={{
              background: currentAmbulance.status === 'offline' ? '#374151' : '#10B981',
              border: 0,
              color: '#FFFFFF',
              borderRadius: '8px',
              padding: '8px 14px',
              fontSize: '12.5px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            {currentAmbulance.status === 'offline' ? 'Offline' : 'Online · Ready'}
          </button>
        </div>
      </div>

      {/* INCOMING EMERGENCY OFFER CARD (With 25-Second Rapid Accept Timer) */}
      {activeEmergency && (activeEmergency.status === 'assigned' || activeEmergency.status === 'AMBULANCE ASSIGNED') && (
        <div
          style={{
            background: '#FFFFFF',
            border: '3px solid #EF4444',
            borderRadius: '20px',
            padding: '24px',
            boxShadow: '0 12px 40px rgba(239, 68, 68, 0.2)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '28px' }}>🚨</span>
              <div>
                <span style={{ background: '#FBE3E4', color: '#C62E35', padding: '3px 8px', borderRadius: '5px', fontSize: '11px', fontWeight: 800 }}>
                  CRITICAL DISPATCH OFFER
                </span>
                <h3 style={{ margin: '4px 0 0', fontSize: '22px', fontWeight: 800, color: '#0F2A21' }}>
                  {activeEmergency.emergencyType}
                </h3>
              </div>
            </div>

            {/* Countdown timer ring */}
            <div
              style={{
                background: '#FBE3E4',
                color: '#C62E35',
                borderRadius: '50%',
                width: '64px',
                height: '64px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '22px',
                lineHeight: 1,
                border: '2px solid #EF4444'
              }}
            >
              <span>{countdown}</span>
              <span style={{ fontSize: '9px', fontWeight: 700 }}>SEC</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', background: '#F3F8F5', padding: '16px', borderRadius: '12px' }}>
            <div>
              <div style={{ fontSize: '11.5px', color: '#5B7A6D', textTransform: 'uppercase', fontWeight: 700 }}>Patient Landmark</div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#0F2A21' }}>📍 {activeEmergency.landmark}</div>
              <div style={{ fontSize: '12px', color: '#5B7A6D' }}>Caller: {activeEmergency.patientName} ({activeEmergency.contactPhone})</div>
            </div>

            <div>
              <div style={{ fontSize: '11.5px', color: '#5B7A6D', textTransform: 'uppercase', fontWeight: 700 }}>Destination Hospital</div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#0F2A21' }}>🏥 {assignedHospital?.name || 'GGH Vizianagaram'}</div>
              <div style={{ fontSize: '12px', color: '#059669', fontWeight: 700 }}>
                {assignedHospital?.freeIcu} ICU beds reserved
              </div>
            </div>

            <div>
              <div style={{ fontSize: '11.5px', color: '#5B7A6D', textTransform: 'uppercase', fontWeight: 700 }}>Estimated ETA to Patient</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#059669' }}>
                {activeEmergency.etaMinutes || 4} mins ({activeEmergency.roadDistanceKm || 2.1} km)
              </div>
            </div>
          </div>

          {/* Big Driver Action Buttons */}
          <div style={{ display: 'flex', gap: '16px' }}>
            <button
              type="button"
              onClick={handleAccept}
              style={{
                flex: 2,
                height: '56px',
                borderRadius: '14px',
                border: 0,
                background: '#22C58B',
                color: '#04130D',
                font: 'inherit',
                fontWeight: 900,
                fontSize: '18px',
                cursor: 'pointer',
                boxShadow: '0 4px 20px rgba(34, 197, 139, 0.4)'
              }}
            >
              ✓ ACCEPT DISPATCH ({countdown}s)
            </button>
            <button
              type="button"
              onClick={() => onDeclineEmergency(activeEmergency.id)}
              style={{
                flex: 1,
                height: '56px',
                borderRadius: '14px',
                border: '2px solid #D3E5DC',
                background: 'transparent',
                color: '#5B7A6D',
                font: 'inherit',
                fontWeight: 700,
                fontSize: '15px',
                cursor: 'pointer'
              }}
            >
              Decline
            </button>
          </div>
        </div>
      )}

      {/* ACTIVE EMERGENCY NAVIGATION HUD (When driver is en route) */}
      {activeEmergency &&
        activeEmergency.status !== 'assigned' &&
        activeEmergency.status !== 'AMBULANCE ASSIGNED' &&
        activeEmergency.status !== 'searching' &&
        activeEmergency.status !== 'SOS REQUESTED' &&
        activeEmergency.status !== 'REQUEST RECEIVED' &&
        activeEmergency.status !== 'completed' &&
        activeEmergency.status !== 'cancelled' && (
        <div style={{ background: '#FFFFFF', border: '1px solid #D3E5DC', borderRadius: '20px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Turn-by-Turn Instruction Banner */}
          {currentStep && (
            <div
              style={{
                background: '#04130D',
                color: '#FFFFFF',
                borderRadius: '14px',
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: '16px'
              }}
            >
              <div style={{ fontSize: '32px' }}>
                {currentStep.modifier === 'left' ? '↰' : currentStep.modifier === 'right' ? '↱' : '↑'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '11px', color: '#A7D8C2', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>
                  LIVE TURN-BY-TURN GUIDANCE
                </div>
                <div style={{ fontSize: '18px', fontWeight: 800 }}>{currentStep.instruction}</div>
                <div style={{ fontSize: '12px', color: '#9CA3AF' }}>in {currentStep.distanceMeters} meters on {currentStep.roadName}</div>
              </div>
            </div>
          )}

          {/* Big Driver Status Progression Steps */}
          <div>
            <div style={{ fontSize: '12.5px', color: '#5B7A6D', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>
              Emergency Workflow Progression
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
              <button
                type="button"
                onClick={() => handleStepAdvance('arrived_scene')}
                disabled={
                  activeEmergency.status !== 'en_route_pickup' &&
                  activeEmergency.status !== 'driver_accepted' &&
                  activeEmergency.status !== 'AMBULANCE EN ROUTE'
                }
                style={{
                  height: '52px',
                  borderRadius: '12px',
                  border: 0,
                  background:
                    activeEmergency.status === 'en_route_pickup' ||
                    activeEmergency.status === 'driver_accepted' ||
                    activeEmergency.status === 'AMBULANCE EN ROUTE'
                      ? '#22C58B'
                      : '#F3F8F5',
                  color:
                    activeEmergency.status === 'en_route_pickup' ||
                    activeEmergency.status === 'driver_accepted' ||
                    activeEmergency.status === 'AMBULANCE EN ROUTE'
                      ? '#04130D'
                      : '#9CA3AF',
                  fontWeight: 800,
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                1. Arrived on Scene
              </button>

              <button
                type="button"
                onClick={() => handleStepAdvance('in_transit_hospital')}
                disabled={activeEmergency.status !== 'arrived_scene' && activeEmergency.status !== 'ARRIVED'}
                style={{
                  height: '52px',
                  borderRadius: '12px',
                  border: 0,
                  background: activeEmergency.status === 'arrived_scene' || activeEmergency.status === 'ARRIVED' ? '#0E9F6E' : '#F3F8F5',
                  color: activeEmergency.status === 'arrived_scene' || activeEmergency.status === 'ARRIVED' ? '#FFFFFF' : '#9CA3AF',
                  fontWeight: 800,
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                2. En Route to Hospital
              </button>

              <button
                type="button"
                onClick={() => handleStepAdvance('completed')}
                disabled={activeEmergency.status !== 'in_transit_hospital'}
                style={{
                  height: '52px',
                  borderRadius: '12px',
                  border: 0,
                  background: activeEmergency.status === 'in_transit_hospital' ? '#3B82F6' : '#F3F8F5',
                  color: activeEmergency.status === 'in_transit_hospital' ? '#FFFFFF' : '#9CA3AF',
                  fontWeight: 800,
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                3. Handover Complete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* IDLE STATE WHEN NO EMERGENCY */}
      {(!activeEmergency || activeEmergency.status === 'completed' || activeEmergency.status === 'cancelled') && (
        <div style={{ background: '#FFFFFF', border: '1px solid #D3E5DC', borderRadius: '16px', padding: '32px', textAlign: 'center' }}>
          <div style={{ fontSize: '42px', marginBottom: '8px' }}>🟢</div>
          <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#0F2A21' }}>
            Standing by for Dispatches in Vizianagaram
          </h3>
          <p style={{ color: '#5B7A6D', fontSize: '13.5px', maxWidth: '480px', margin: '8px auto 0' }}>
            Hands-free voice assistant is active. When a new emergency is assigned, an audio chime will play and voice navigation will announce the patient location.
          </p>
        </div>
      )}
    </div>
  );
};
