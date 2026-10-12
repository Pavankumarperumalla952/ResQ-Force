import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { VerifiedHospital, AmbulanceUnit, PatientEmergencyRequest, RoadSegmentStatus } from '../types';
import { VIZIANAGARAM_CENTER, VIZIANAGARAM_BOUNDS } from '../data/vizianagaramData';

interface VizianagaramMapProps {
  hospitals: VerifiedHospital[];
  ambulances: AmbulanceUnit[];
  patients: PatientEmergencyRequest[];
  roadBlocks: RoadSegmentStatus[];
  selectedPatient: PatientEmergencyRequest | null;
  selectedAmbulance: AmbulanceUnit | null;
  selectedHospital: VerifiedHospital | null;
  routeCoordinates: [number, number][];
  hospitalRouteCoordinates: [number, number][];
  onSelectPatient: (patient: PatientEmergencyRequest) => void;
  onSelectAmbulance: (ambulance: AmbulanceUnit) => void;
  onSelectHospital: (hospital: VerifiedHospital) => void;
  onToggleRoadBlock: (roadBlockId: string) => void;
  userGpsLocation?: [number, number] | null;
}

export const VizianagaramMap: React.FC<VizianagaramMapProps> = ({
  hospitals,
  ambulances,
  patients,
  roadBlocks,
  selectedPatient,
  selectedAmbulance,
  selectedHospital,
  routeCoordinates,
  hospitalRouteCoordinates,
  onSelectPatient,
  onSelectAmbulance,
  onSelectHospital,
  onToggleRoadBlock,
  userGpsLocation
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const routeLayerRef = useRef<L.LayerGroup | null>(null);

  // Initialize Leaflet Map once
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const bounds = L.latLngBounds(
      [VIZIANAGARAM_BOUNDS.minLat, VIZIANAGARAM_BOUNDS.minLng],
      [VIZIANAGARAM_BOUNDS.maxLat, VIZIANAGARAM_BOUNDS.maxLng]
    );

    const map = L.map(mapContainerRef.current, {
      center: VIZIANAGARAM_CENTER,
      zoom: 14,
      minZoom: 12,
      maxZoom: 18,
      maxBounds: bounds,
      maxBoundsViscosity: 0.8,
      zoomControl: false
    });

    // High performance real OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | Vizianagaram Emergency Grid',
      maxZoom: 19
    }).addTo(map);

    // Zoom control at top right
    L.control.zoom({ position: 'topright' }).addTo(map);

    mapInstanceRef.current = map;
    markersLayerRef.current = L.layerGroup().addTo(map);
    routeLayerRef.current = L.layerGroup().addTo(map);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Markers and Routes whenever data changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    const routeLayer = routeLayerRef.current;
    if (!map || !markersLayer || !routeLayer) return;

    markersLayer.clearLayers();
    routeLayer.clearLayers();

    // 1. Render Blocked Roads
    roadBlocks.forEach(rb => {
      if (rb.isBlocked) {
        const line = L.polyline([[rb.lat1, rb.lng1], [rb.lat2, rb.lng2]], {
          color: '#EF4444',
          weight: 7,
          dashArray: '8, 8',
          opacity: 0.9
        });
        line.bindTooltip(`<b>ROAD BLOCKED: ${rb.name}</b><br/>${rb.reason || 'Closed'}<br/><i>Click to toggle unblock</i>`, {
          sticky: true,
          className: 'emergency-tooltip'
        });
        line.on('click', () => onToggleRoadBlock(rb.id));
        markersLayer.addLayer(line);

        // Blocker icon
        const blockIcon = L.divIcon({
          className: 'custom-roadblock-icon',
          html: `<div style="background:#EF4444;color:#FFF;border-radius:50%;width:24px;height:24px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:bold;border:2px solid #FFF;box-shadow:0 2px 6px rgba(0,0,0,0.4);cursor:pointer;">✕</div>`,
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        });
        const blockMarker = L.marker([(rb.lat1 + rb.lat2) / 2, (rb.lng1 + rb.lng2) / 2], { icon: blockIcon });
        blockMarker.on('click', () => onToggleRoadBlock(rb.id));
        markersLayer.addLayer(blockMarker);
      }
    });

    // 2. Render Verified Hospitals
    hospitals.forEach(hosp => {
      const isSelected = selectedHospital?.id === hosp.id;
      const isFull = hosp.loadPercent >= 90;
      const markerColor = isFull ? '#EF4444' : isSelected ? '#047857' : '#0E9F6E';

      const hospIcon = L.divIcon({
        className: 'custom-hospital-icon',
        html: `
          <div style="background:#FFFFFF;border:2.5px solid ${markerColor};border-radius:12px;padding:3px 8px;display:flex;align-items:center;gap:5px;box-shadow:0 3px 10px rgba(0,0,0,0.18);white-space:nowrap;font-family:'JetBrains Mono',monospace;cursor:pointer;transform:translate(-50%, -50%);">
            <div style="background:${markerColor};color:#FFFFFF;border-radius:6px;width:18px;height:18px;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:11px;">H</div>
            <div style="font-size:11px;font-weight:700;color:#0F2A21;">${hosp.name.split(' ')[0]}</div>
            <div style="font-size:9.5px;color:${hosp.freeIcu === 0 ? '#DC2626' : '#059669'};font-weight:600;">${hosp.freeIcu} ICU</div>
          </div>
        `,
        iconSize: [120, 30],
        iconAnchor: [60, 15]
      });

      const marker = L.marker([hosp.lat, hosp.lng], { icon: hospIcon });
      marker.bindPopup(`
        <div style="font-family:'Manrope',sans-serif;min-width:210px;line-height:1.4;">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
            <span style="background:${markerColor};color:#FFF;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:bold;">${hosp.traumaLevel}</span>
            <span style="font-size:11px;color:#059669;font-weight:bold;">${hosp.emergency24x7 ? '24x7 EMERGENCY' : ''}</span>
          </div>
          <div style="font-weight:800;font-size:14px;color:#0F2A21;">${hosp.name}</div>
          <div style="font-size:11.5px;color:#5B7A6D;margin:3px 0;">${hosp.address}</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;background:#F3F8F5;padding:6px;border-radius:6px;margin:6px 0;font-family:'JetBrains Mono',monospace;font-size:11px;">
            <div>Free Beds: <b>${hosp.freeBeds}</b></div>
            <div>Free ICU: <b style="color:${hosp.freeIcu === 0 ? '#DC2626' : '#059669'}">${hosp.freeIcu}</b></div>
            <div>Occupancy: <b>${hosp.loadPercent}%</b></div>
            <div>Status: <b style="text-transform:uppercase;">${hosp.status}</b></div>
          </div>
          <div style="margin-top:6px;font-size:11px;"><b>Emergency Helpline:</b> <a href="tel:${hosp.phone}" style="color:#0E9F6E;font-weight:bold;">${hosp.phone}</a></div>
        </div>
      `);
      marker.on('click', () => onSelectHospital(hosp));
      markersLayer.addLayer(marker);
    });

    // 3. Render Ambulances (Live positions & Rapido-style Vehicle Pins)
    ambulances.forEach(amb => {
      const isSelected = selectedAmbulance?.id === amb.id;
      const isBusy = amb.status !== 'available';
      const badgeBg = isBusy ? '#F59E0B' : '#10B981';

      const ambIcon = L.divIcon({
        className: 'custom-ambulance-icon',
        html: `
          <div style="position:relative;cursor:pointer;transform:translate(-50%, -50%);">
            <div style="background:${isSelected ? '#0F2A21' : '#FFFFFF'};border:2px solid ${badgeBg};border-radius:18px;padding:3px 9px;display:flex;align-items:center;gap:6px;box-shadow:0 4px 12px rgba(0,0,0,0.22);">
              <span style="font-size:14px;">🚑</span>
              <div style="display:flex;flex-direction:column;line-height:1.1;">
                <span style="font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:800;color:${isSelected ? '#34D399' : '#0F2A21'};">${amb.vehicleNumber}</span>
                <span style="font-size:9px;color:${isSelected ? '#A7D8C2' : '#5B7A6D'};">${amb.type} · ${isBusy ? 'En Route' : 'Ready'}</span>
              </div>
            </div>
            ${!isBusy ? `<div style="position:absolute;inset:-4px;border-radius:22px;border:2px solid #10B981;opacity:0.6;animation:ping 1.8s cubic-bezier(0,0,0.2,1) infinite;"></div>` : ''}
          </div>
        `,
        iconSize: [120, 32],
        iconAnchor: [60, 16]
      });

      const marker = L.marker([amb.lat, amb.lng], { icon: ambIcon });
      marker.bindPopup(`
        <div style="font-family:'Manrope',sans-serif;min-width:200px;">
          <div style="font-weight:800;font-size:13.5px;color:#0F2A21;">Ambulance ${amb.vehicleNumber}</div>
          <div style="font-size:11.5px;color:#5B7A6D;">${amb.type} Life Support · ${amb.baseLocationName}</div>
          <div style="margin:6px 0;background:#F3F8F5;padding:6px;border-radius:6px;font-size:11px;">
            <div>Driver: <b>${amb.driverName}</b> (${amb.rating} ★)</div>
            <div>Phone: <a href="tel:${amb.driverPhone}" style="color:#0B7A55;font-weight:bold;">${amb.driverPhone}</a></div>
            <div>GPS Status: <span style="color:#059669;font-weight:bold;">Live Connected</span></div>
          </div>
          <div style="font-size:10.5px;color:#3E5B4F;"><b>Equipment:</b> ${amb.equipment.join(', ')}</div>
        </div>
      `);
      marker.on('click', () => onSelectAmbulance(amb));
      markersLayer.addLayer(marker);
    });

    // 4. Render Patient Emergencies (Pulsing triage pins)
    patients.forEach(pat => {
      const isSelected = selectedPatient?.id === pat.id;
      const isCritical = pat.severity === 'CRITICAL';
      const color = isCritical ? '#EF4444' : pat.severity === 'SERIOUS' ? '#F97316' : '#EAB308';

      const patientIcon = L.divIcon({
        className: 'custom-patient-icon',
        html: `
          <div style="position:relative;cursor:pointer;transform:translate(-50%, -50%);">
            <div style="background:${color};color:#FFF;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:13px;border:2.5px solid #FFF;box-shadow:0 3px 10px rgba(0,0,0,0.35);">
              🆘
            </div>
            <div style="position:absolute;left:32px;top:2px;background:#FFFFFF;border:1px solid #D3E5DC;border-radius:6px;padding:2px 7px;font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:700;color:#0F2A21;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.12);">
              ${pat.id} · ${pat.emergencyType.split(' ')[0]}
            </div>
            ${isCritical ? `<div style="position:absolute;inset:-6px;border-radius:50%;border:2px solid ${color};opacity:0.75;animation:ping 1.4s cubic-bezier(0,0,0.2,1) infinite;"></div>` : ''}
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      const marker = L.marker([pat.lat, pat.lng], { icon: patientIcon });
      marker.bindPopup(`
        <div style="font-family:'Manrope',sans-serif;min-width:210px;">
          <div style="display:flex;align-items:center;gap:6px;">
            <span style="background:${color};color:#FFF;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:800;">${pat.severity}</span>
            <span style="font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:700;">${pat.id}</span>
          </div>
          <div style="font-weight:800;font-size:14px;color:#0F2A21;margin:4px 0 2px;">${pat.emergencyType}</div>
          <div style="font-size:11.5px;color:#5B7A6D;">Patient: <b>${pat.patientName}</b> (${pat.contactPhone})</div>
          <div style="font-size:11.5px;color:#3E5B4F;margin:3px 0;">📍 ${pat.landmark}</div>
          ${pat.goldenHourRemainingMin ? `<div style="font-family:'JetBrains Mono',monospace;font-size:11px;color:#DC2626;font-weight:bold;margin-top:4px;">⏱ Golden Hour: ${pat.goldenHourRemainingMin} mins remaining</div>` : ''}
        </div>
      `);
      marker.on('click', () => onSelectPatient(pat));
      markersLayer.addLayer(marker);
    });

    // 5. Render User GPS location dot (if available)
    if (userGpsLocation) {
      const userDot = L.circleMarker(userGpsLocation, {
        radius: 8,
        fillColor: '#3B82F6',
        color: '#FFFFFF',
        weight: 3,
        opacity: 1,
        fillOpacity: 0.9
      });
      userDot.bindTooltip('Your Live GPS Location (Vizianagaram)', { sticky: true });
      markersLayer.addLayer(userDot);
    }

    // 6. Render Active Navigation Route Polylines
    if (routeCoordinates.length > 1) {
      // Route 1: Ambulance to Patient (Green)
      const ambToPatLine = L.polyline(routeCoordinates, {
        color: '#10B981',
        weight: 5,
        opacity: 0.85,
        lineCap: 'round',
        lineJoin: 'round'
      });
      routeLayer.addLayer(ambToPatLine);
    }

    if (hospitalRouteCoordinates.length > 1) {
      // Route 2: Patient to Hospital (Navy Teal)
      const patToHospLine = L.polyline(hospitalRouteCoordinates, {
        color: '#0F766E',
        weight: 5,
        dashArray: '8, 8',
        opacity: 0.9,
        lineCap: 'round',
        lineJoin: 'round'
      });
      routeLayer.addLayer(patToHospLine);
    }
  }, [hospitals, ambulances, patients, roadBlocks, selectedPatient, selectedAmbulance, selectedHospital, routeCoordinates, hospitalRouteCoordinates, userGpsLocation]);

  // Recenter map back to Vizianagaram center
  const handleRecenter = () => {
    mapInstanceRef.current?.flyTo(VIZIANAGARAM_CENTER, 14, { duration: 1 });
  };

  // Zoom to active emergency route
  const handleFitRoute = () => {
    if (!mapInstanceRef.current) return;
    const allCoords = [...routeCoordinates, ...hospitalRouteCoordinates];
    if (allCoords.length > 1) {
      mapInstanceRef.current.fitBounds(L.latLngBounds(allCoords), { padding: [50, 50] });
    } else if (selectedPatient) {
      mapInstanceRef.current.flyTo([selectedPatient.lat, selectedPatient.lng], 16, { duration: 1 });
    } else {
      handleRecenter();
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: '440px', borderRadius: '16px', overflow: 'hidden' }}>
      {/* Real OpenStreetMap Leaflet Container */}
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%', minHeight: '440px' }} />

      {/* Floating Map Navigation & Control Buttons */}
      <div
        style={{
          position: 'absolute',
          top: '14px',
          right: '14px',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}
      >
        <button
          type="button"
          onClick={handleRecenter}
          title="Recenter Vizianagaram"
          style={{
            background: '#FFFFFF',
            border: '1px solid #D3E5DC',
            borderRadius: '10px',
            padding: '8px 12px',
            fontSize: '12px',
            fontWeight: 700,
            color: '#0F2A21',
            boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <span>🎯</span> Center VZM
        </button>

        <button
          type="button"
          onClick={handleFitRoute}
          title="Fit Active Emergency Route"
          style={{
            background: '#FFFFFF',
            border: '1px solid #D3E5DC',
            borderRadius: '10px',
            padding: '8px 12px',
            fontSize: '12px',
            fontWeight: 700,
            color: '#0B7A55',
            boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <span>🛣️</span> Route View
        </button>
      </div>

      {/* Floating Bottom Badge */}
      <div
        style={{
          position: 'absolute',
          left: '14px',
          bottom: '14px',
          zIndex: 1000,
          background: 'rgba(255, 255, 255, 0.95)',
          border: '1px solid #A7D8C2',
          borderRadius: '12px',
          padding: '8px 14px',
          fontSize: '12px',
          boxShadow: '0 4px 14px rgba(15,42,33,0.1)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981' }}></span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', fontWeight: 700, color: '#0F2A21' }}>
            VIZIANAGARAM REAL-TIME MAP
          </span>
        </div>
        <span style={{ color: '#5B7A6D' }}>|</span>
        <span style={{ color: '#3E5B4F', fontSize: '11.5px' }}>
          Real OSM Tiles · 6 Verified Hospitals · 8 Active Ambulances
        </span>
      </div>
    </div>
  );
};
