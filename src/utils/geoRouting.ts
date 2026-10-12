import { VerifiedHospital, AmbulanceUnit, PatientEmergencyRequest, RoadSegmentStatus, RouteNavigationStep, MatchScoreBreakdown } from '../types';

export function calculateHaversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function estimateRoadDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const haversine = calculateHaversineDistanceKm(lat1, lon1, lat2, lon2);
  // Urban grid tortuosity factor in Vizianagaram
  const roadDist = haversine * 1.28;
  return Math.round(roadDist * 10) / 10;
}

export function estimateTravelMinutes(
  distKm: number,
  roadBlocks: RoadSegmentStatus[] = [],
  midLat?: number,
  midLng?: number
): number {
  // Average ambulance emergency speed with siren: ~32 km/h
  const baseMinutes = (distKm / 32) * 60;

  // Add road block detour penalty if mid-point is near blocked road
  let detourPenalty = 0;
  if (midLat && midLng) {
    for (const rb of roadBlocks) {
      if (rb.isBlocked) {
        const d = calculateHaversineDistanceKm(midLat, midLng, (rb.lat1 + rb.lat2) / 2, (rb.lng1 + rb.lng2) / 2);
        if (d < 0.6) {
          detourPenalty += 2.5; // +2.5 min detour around MG Road / Clock tower
        }
      }
    }
  }

  const finalMin = Math.max(1.5, baseMinutes + detourPenalty);
  return Math.round(finalMin * 10) / 10;
}

// OSRM driving route fetcher with robust geometric fallback
export async function fetchOsrmDrivingRoute(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number
): Promise<{ coordinates: [number, number][]; distanceKm: number; durationMinutes: number; steps: RouteNavigationStep[] }> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson&steps=true`;
    const res = await fetch(url, { signal: AbortSignal.timeout(3500) });
    if (res.ok) {
      const data = await res.json();
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const rawCoords: [number, number][] = route.geometry.coordinates.map((c: [number, number]) => [c[1], c[0]]);
        const distanceKm = Math.round((route.distance / 1000) * 10) / 10;
        const durationMinutes = Math.max(1.5, Math.round((route.duration / 60) * 0.75 * 10) / 10); // siren factor

        const steps: RouteNavigationStep[] = [];
        if (route.legs && route.legs[0]?.steps) {
          route.legs[0].steps.forEach((s: any, idx: number) => {
            if (s.maneuver && s.maneuver.instruction) {
              steps.push({
                id: `step-${idx}`,
                instruction: s.maneuver.instruction || `Proceed on ${s.name || 'road'}`,
                spokenText: s.maneuver.instruction || `Continue straight for ${Math.round(s.distance)} meters.`,
                distanceMeters: Math.round(s.distance),
                roadName: s.name || 'Vizianagaram arterial road',
                modifier: s.maneuver.modifier
              });
            }
          });
        }

        return { coordinates: rawCoords, distanceKm, durationMinutes, steps };
      }
    }
  } catch {
    // Graceful fallback to synthesized road interpolation
  }

  // Local fallback: Synthesize realistic road interpolation along Vizianagaram grid
  const distanceKm = estimateRoadDistanceKm(startLat, startLng, endLat, endLng);
  const durationMinutes = estimateTravelMinutes(distanceKm);

  // Generate intermediate points through major thoroughfares
  const coords: [number, number][] = [
    [startLat, startLng],
    [(startLat * 2 + endLat) / 3, startLng],
    [(startLat + endLat * 2) / 3, endLng],
    [endLat, endLng]
  ];

  const steps: RouteNavigationStep[] = [
    {
      id: 'step-1',
      instruction: `Head toward patient location on Main Road`,
      spokenText: `Proceed onto main road. Target location is ${distanceKm} kilometers away.`,
      distanceMeters: Math.round(distanceKm * 400),
      roadName: 'Main Road'
    },
    {
      id: 'step-2',
      instruction: `Continue straight past Vizianagaram arterial corridor`,
      spokenText: `Continue straight for ${Math.round(distanceKm * 500)} meters toward target landmark.`,
      distanceMeters: Math.round(distanceKm * 500),
      roadName: 'Ring Road'
    },
    {
      id: 'step-3',
      instruction: `Arrive at destination`,
      spokenText: `You have arrived at the destination.`,
      distanceMeters: 50,
      roadName: 'Arrival Destination',
      modifier: 'arrive'
    }
  ];

  return { coordinates: coords, distanceKm, durationMinutes, steps };
}

// Evaluate best matching hospital for patient in Vizianagaram
export function evaluateHospitalMatching(
  patient: PatientEmergencyRequest,
  hospitals: VerifiedHospital[],
  roadBlocks: RoadSegmentStatus[] = []
): MatchScoreBreakdown[] {
  const scores: MatchScoreBreakdown[] = hospitals.map(hosp => {
    const distKm = estimateRoadDistanceKm(patient.lat, patient.lng, hosp.lat, hosp.lng);
    const travelMin = estimateTravelMinutes(distKm, roadBlocks, (patient.lat + hosp.lat) / 2, (patient.lng + hosp.lng) / 2);

    // Specialty matching score
    let specialtyScore = 0;
    const type = patient.emergencyType.toLowerCase();
    const hospSpecs = hosp.specialties.map(s => s.toLowerCase());

    if (type.includes('cardiac') || type.includes('heart')) {
      specialtyScore = hospSpecs.some(s => s.includes('cardio')) ? 0 : 25;
    } else if (type.includes('stroke') || type.includes('neuro') || type.includes('paralysis')) {
      specialtyScore = hospSpecs.some(s => s.includes('stroke') || s.includes('neuro')) ? 0 : 25;
    } else if (type.includes('trauma') || type.includes('accident') || type.includes('fracture')) {
      if (hosp.traumaLevel.includes('Level I')) specialtyScore = 0;
      else if (hosp.traumaLevel.includes('Level II')) specialtyScore = 6;
      else specialtyScore = 18;
    } else if (type.includes('maternity') || type.includes('labor') || type.includes('pregnancy')) {
      specialtyScore = hospSpecs.some(s => s.includes('obstet') || s.includes('maternity')) ? 0 : 22;
    } else if (type.includes('pediatric') || type.includes('child')) {
      specialtyScore = hospSpecs.some(s => s.includes('pediatric')) ? 0 : 15;
    } else {
      specialtyScore = 2;
    }

    // Bed score & ICU penalty
    let bedScore = 0;
    if (patient.severity === 'CRITICAL') {
      if (hosp.freeIcu <= 0) {
        bedScore += 30; // severe penalty: critical patient with no ICU bed!
      } else {
        bedScore += Math.max(0, (10 - hosp.freeIcu) * 0.7);
      }
    }
    if (hosp.status === 'divert') {
      bedScore += 50; // hospital is diverting ambulances!
    } else if (hosp.loadPercent >= 90) {
      bedScore += (hosp.loadPercent - 80) * 1.8;
    } else {
      bedScore += (hosp.loadPercent / 100) * 4;
    }

    // Distance component
    const travelScore = travelMin * 1.5;

    const totalScore = Math.round((travelScore + specialtyScore + bedScore) * 10) / 10;

    return {
      hospitalId: hosp.id,
      hospitalName: hosp.name,
      distanceKm: distKm,
      travelMinutes: travelMin,
      specialtyFit: specialtyScore,
      bedScore,
      totalScore
    };
  });

  scores.sort((a, b) => a.totalScore - b.totalScore);
  return scores;
}

// Find nearest ambulances to a patient location, ranked by suitability
export function rankNearbyAmbulances(
  patient: PatientEmergencyRequest,
  ambulances: AmbulanceUnit[],
  roadBlocks: RoadSegmentStatus[] = []
): Array<{ ambulance: AmbulanceUnit; distanceKm: number; etaMinutes: number; suitabilityScore: number; reason: string }> {
  return ambulances
    .filter(a => a.status === 'available')
    .map(amb => {
      const distKm = estimateRoadDistanceKm(amb.lat, amb.lng, patient.lat, patient.lng);
      const etaMin = estimateTravelMinutes(distKm, roadBlocks, (amb.lat + patient.lat) / 2, (amb.lng + patient.lng) / 2);

      let suitabilityScore = etaMin * 1.2;
      let reason = `${amb.type} · ${etaMin} min ETA`;

      // If critical patient and unit is BLS, add capability penalty
      if (patient.severity === 'CRITICAL' && amb.type === 'BLS') {
        suitabilityScore += 18;
        reason = `BLS unit (ALS preferred for ${patient.emergencyType})`;
      } else if (patient.severity === 'CRITICAL' && amb.type === 'ALS') {
        reason = `ALS unit equipped with Ventilator & Defibrillator`;
      }

      return {
        ambulance: amb,
        distanceKm: distKm,
        etaMinutes: etaMin,
        suitabilityScore,
        reason
      };
    })
    .sort((a, b) => a.suitabilityScore - b.suitabilityScore);
}
