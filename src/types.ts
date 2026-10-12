export type Severity = 'CRITICAL' | 'SERIOUS' | 'MODERATE' | 'MINOR';

export type EmergencyStatus =
  | 'SOS REQUESTED'
  | 'REQUEST RECEIVED'
  | 'AMBULANCE ASSIGNED'
  | 'AMBULANCE EN ROUTE'
  | 'ARRIVED'
  | 'searching'
  | 'assigned'
  | 'driver_accepted'
  | 'en_route_pickup'
  | 'arrived_scene'
  | 'in_transit_hospital'
  | 'completed'
  | 'cancelled';

export interface VerifiedHospital {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  phone: string;
  emergency24x7: boolean;
  specialties: string[];
  facilities: string[];
  totalBeds: number;
  freeBeds: number;
  icuBeds: number;
  freeIcu: number;
  traumaLevel: string;
  verified: boolean;
  loadPercent: number;
  status: 'normal' | 'busy' | 'full' | 'divert';
}

export interface AmbulanceUnit {
  id: string;
  vehicleNumber: string;
  driverName: string;
  driverPhone: string;
  rating: number;
  type: 'ALS' | 'BLS';
  equipment: string[];
  status: 'available' | 'assigned' | 'en_route_pickup' | 'arrived_scene' | 'in_transit_hospital' | 'offline';
  lat: number;
  lng: number;
  heading: number;
  speedKmH: number;
  baseLocationName: string;
  isLiveGps: boolean;
  lastGpsUpdate: string;
  assignedIncidentId?: string;
}

export interface PatientEmergencyRequest {
  id: string;
  patientName: string;
  contactPhone: string;
  emergencyType: string;
  severity: Severity;
  goldenHourRemainingMin?: number;
  goldenHourTotalMin?: number;
  landmark: string;
  lat: number;
  lng: number;
  status: EmergencyStatus;
  createdAt: string;
  requestSource?: string;
  requestDateTime?: string;
  accuracyMeters?: number;
  assignedAmbulanceId?: string;
  assignedHospitalId?: string;
  assignedDriverName?: string;
  assignedDriverPhone?: string;
  assignedVehicleNo?: string;
  ambulanceType?: 'ALS' | 'BLS';
  etaMinutes?: number;
  roadDistanceKm?: number;
  isLiveUserLocation?: boolean;
}

export interface RouteNavigationStep {
  id: string;
  instruction: string;
  spokenText: string;
  distanceMeters: number;
  roadName: string;
  modifier?: 'left' | 'right' | 'straight' | 'arrive';
}

export interface RoadSegmentStatus {
  id: string;
  name: string;
  lat1: number;
  lng1: number;
  lat2: number;
  lng2: number;
  isBlocked: boolean;
  reason?: string;
}

export interface DecisionLogEntry {
  id: string;
  time: string;
  tag: 'Approved' | 'Road closed' | 'Dispatched' | 'Arrived' | 'Reserved' | 'Divert' | 'SOS Ingested' | 'Voice Alert';
  tagColor: string;
  message: string;
}

export interface MatchScoreBreakdown {
  hospitalId: string;
  hospitalName: string;
  distanceKm: number;
  travelMinutes: number;
  specialtyFit: number;
  bedScore: number;
  totalScore: number;
}
