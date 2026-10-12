import { VerifiedHospital, AmbulanceUnit, PatientEmergencyRequest, RoadSegmentStatus, DecisionLogEntry } from '../types';

export const VIZIANAGARAM_CENTER: [number, number] = [18.1124, 83.3979];

export const VIZIANAGARAM_BOUNDS = {
  minLat: 18.0700,
  maxLat: 18.1750,
  minLng: 83.3400,
  maxLng: 83.4650
};

export const VERIFIED_HOSPITALS: VerifiedHospital[] = [
  {
    id: 'H-GGH',
    name: 'Government General Hospital (GGH / MRH)',
    address: 'Cantonment Road, Near Station Road, Vizianagaram, AP 535003',
    lat: 18.1165,
    lng: 83.4048,
    phone: '+91 8922 276100',
    emergency24x7: true,
    specialties: ['General Trauma', 'Emergency Resuscitation', 'Pediatric ICU', 'Blood Bank', 'Burn Care'],
    facilities: ['Level I Trauma Center', '24x7 Blood Bank', 'Oxygen Generation Plant', '12 ICU Beds'],
    totalBeds: 500,
    freeBeds: 64,
    icuBeds: 24,
    freeIcu: 8,
    traumaLevel: 'Level I District Teaching Hospital',
    verified: true,
    loadPercent: 68,
    status: 'normal'
  },
  {
    id: 'H-TIRUMALA',
    name: 'Tirumala Multi Speciality Hospital',
    address: 'Opp. RTC Complex, Ring Road, Vizianagaram, AP 535002',
    lat: 18.1215,
    lng: 83.3925,
    phone: '+91 8922 225588',
    emergency24x7: true,
    specialties: ['Cardiology', 'Interventional Cath Lab', 'Stroke Care', 'Neurosurgery', 'Critical Care'],
    facilities: ['Advanced Cardiac Care', 'CT / MRI 24x7', '16 Bedded Medical ICU', 'Dialysis Unit'],
    totalBeds: 120,
    freeBeds: 28,
    icuBeds: 16,
    freeIcu: 5,
    traumaLevel: 'Level II Tertiary Cardiac & Neuro',
    verified: true,
    loadPercent: 62,
    status: 'normal'
  },
  {
    id: 'H-MIMS',
    name: "Maharajah's Institute of Medical Sciences (MIMS)",
    address: 'D.No 31-15, Near Nellimarla, Outer Bypass, Vizianagaram, AP 535217',
    lat: 18.1585,
    lng: 83.4410,
    phone: '+91 8922 244555',
    emergency24x7: true,
    specialties: ['Polytrauma', 'Super-Specialty Surgery', 'Critical Care', 'Neonatology', 'Toxicology'],
    facilities: ['750 Bed Teaching Hospital', 'Level I Tertiary Care', 'Advanced Surgical Suites', '32 ICU Beds'],
    totalBeds: 750,
    freeBeds: 180,
    icuBeds: 32,
    freeIcu: 14,
    traumaLevel: 'Level I Medical College Hospital',
    verified: true,
    loadPercent: 54,
    status: 'normal'
  },
  {
    id: 'H-SAI',
    name: 'Sai Multi Speciality Hospital',
    address: 'Mayuri Junction, Ring Road, Vizianagaram, AP 535002',
    lat: 18.1245,
    lng: 83.3960,
    phone: '+91 8922 272899',
    emergency24x7: true,
    specialties: ['Orthopedic Trauma', 'Joint Replacement', 'General Emergency', 'Anesthesiology'],
    facilities: ['24x7 Emergency Room', 'Orthopedic OT', '8 ICU Beds', 'Ambulance Bay'],
    totalBeds: 70,
    freeBeds: 14,
    icuBeds: 8,
    freeIcu: 2,
    traumaLevel: 'Level II Ortho & Trauma',
    verified: true,
    loadPercent: 74,
    status: 'normal'
  },
  {
    id: 'H-PUSHPAGIRI',
    name: 'Pushpagiri General & Trauma Hospital',
    address: 'Near Balaji Nagar Arch, Kothavalasa Road, Vizianagaram, AP 535003',
    lat: 18.1110,
    lng: 83.3915,
    phone: '+91 8922 232144',
    emergency24x7: true,
    specialties: ['General Medicine', 'Ophthalmology Trauma', 'Accident Care', 'General Surgery'],
    facilities: ['Emergency Ward', 'Pharmacy 24x7', '6 ICU Beds', 'Minor OT'],
    totalBeds: 50,
    freeBeds: 12,
    icuBeds: 6,
    freeIcu: 3,
    traumaLevel: 'Level III Community Hospital',
    verified: true,
    loadPercent: 58,
    status: 'normal'
  },
  {
    id: 'H-CARECURE',
    name: 'Care & Cure Super Speciality Hospital',
    address: 'Main Road, Near Kanyaka Parameswari Temple, Vizianagaram, AP 535001',
    lat: 18.1120,
    lng: 83.4110,
    phone: '+91 8922 228833',
    emergency24x7: true,
    specialties: ['Maternity & Obstetrics', 'Gynecology', 'Pediatrics', 'Critical Resuscitation'],
    facilities: ['Labor & Delivery Suites', 'Neonatal ICU', '4 ICU Beds', 'Emergency Ultrasound'],
    totalBeds: 45,
    freeBeds: 3,
    icuBeds: 4,
    freeIcu: 1,
    traumaLevel: 'Level III Maternity & Emergency',
    verified: true,
    loadPercent: 91,
    status: 'busy'
  }
];

export const VIZIANAGARAM_LANDMARKS = [
  { name: 'Vizianagaram Clock Tower (Ghanta Sthambam)', lat: 18.1147, lng: 83.4072, desc: 'Central Commercial Hub, MG Road' },
  { name: 'Vizianagaram Fort (Gaja Pathi Kota)', lat: 18.1128, lng: 83.4140, desc: 'Historic Heritage Sector' },
  { name: 'Vizianagaram RTC Bus Complex', lat: 18.1179, lng: 83.3942, desc: 'Major Public Transit Terminal' },
  { name: 'Vizianagaram Railway Junction', lat: 18.1065, lng: 83.4005, desc: 'East Coast Railway Junction' },
  { name: 'Mayuri Junction & Bypass', lat: 18.1220, lng: 83.3970, desc: 'Major Arterial Intersection' },
  { name: 'Balaji Nagar Center', lat: 18.1090, lng: 83.3880, desc: 'Southwest Residential Sector' },
  { name: 'Cantonment / Phool Bagh', lat: 18.1250, lng: 83.4060, desc: 'Northern Administrative District' },
  { name: 'Pradeep Nagar Ring Road', lat: 18.1310, lng: 83.3910, desc: 'Outer North Ring Road' },
  { name: 'Dharmapuri Road / JNTU-GV', lat: 18.1360, lng: 83.4020, desc: 'University & Technology Corridor' }
];

export const VIZIANAGARAM_AMBULANCES: AmbulanceUnit[] = [
  {
    id: 'AMB-1081',
    vehicleNumber: 'AP 35 TX 1081',
    driverName: 'Ramesh Naidu',
    driverPhone: '+91 94401 23401',
    rating: 4.9,
    type: 'ALS',
    equipment: ['Ventilator', 'Biphasic Defibrillator', 'Cardiac Monitor', 'Oxygen Cylinder', 'Infusion Pump'],
    status: 'available',
    lat: 18.1185,
    lng: 83.3940,
    heading: 90,
    speedKmH: 0,
    baseLocationName: 'RTC Complex Bay 1',
    isLiveGps: true,
    lastGpsUpdate: 'Just now'
  },
  {
    id: 'AMB-1082',
    vehicleNumber: 'AP 35 TX 1082',
    driverName: 'Suresh Varma',
    driverPhone: '+91 94401 23402',
    rating: 4.8,
    type: 'ALS',
    equipment: ['Ventilator', 'Defibrillator', 'Suction Machine', 'Stretcher & Spinal Board', 'Oxygen'],
    status: 'available',
    lat: 18.1160,
    lng: 83.4055,
    heading: 180,
    speedKmH: 0,
    baseLocationName: 'GGH Cantonment Bay',
    isLiveGps: true,
    lastGpsUpdate: 'Just now'
  },
  {
    id: 'AMB-1083',
    vehicleNumber: 'AP 35 TX 1083',
    driverName: 'K. Appala Swamy',
    driverPhone: '+91 94401 23403',
    rating: 4.7,
    type: 'BLS',
    equipment: ['Oxygen Delivery System', 'Foldable Stretcher', 'Basic Trauma Splints', 'First Aid Kit'],
    status: 'available',
    lat: 18.1132,
    lng: 83.4135,
    heading: 45,
    speedKmH: 0,
    baseLocationName: 'Vizianagaram Fort Post',
    isLiveGps: true,
    lastGpsUpdate: 'Just now'
  },
  {
    id: 'AMB-1084',
    vehicleNumber: 'AP 35 TX 1084',
    driverName: 'Venkat Rao',
    driverPhone: '+91 94401 23404',
    rating: 4.9,
    type: 'ALS',
    equipment: ['Stroke Telemedicine Unit', 'Defibrillator', 'Ventilator', 'Cardiac Drugs Box'],
    status: 'available',
    lat: 18.1235,
    lng: 83.3970,
    heading: 270,
    speedKmH: 0,
    baseLocationName: 'Mayuri Junction Post',
    isLiveGps: true,
    lastGpsUpdate: 'Just now'
  },
  {
    id: 'AMB-1085',
    vehicleNumber: 'AP 35 TX 1085',
    driverName: 'B. Satyanarayana',
    driverPhone: '+91 94401 23405',
    rating: 4.8,
    type: 'BLS',
    equipment: ['Oxygen', 'Cervical Collars', 'Stretcher', 'AED Automatic Defibrillator'],
    status: 'available',
    lat: 18.1070,
    lng: 83.4010,
    heading: 0,
    speedKmH: 0,
    baseLocationName: 'Railway Station Stand',
    isLiveGps: true,
    lastGpsUpdate: 'Just now'
  },
  {
    id: 'AMB-1086',
    vehicleNumber: 'AP 35 TX 1086',
    driverName: 'M. Jagannadham',
    driverPhone: '+91 94401 23406',
    rating: 4.9,
    type: 'ALS',
    equipment: ['Neonatal Transport Incubator', 'Pediatric Resuscitation Kit', 'Ventilator', 'Oxygen'],
    status: 'available',
    lat: 18.1095,
    lng: 83.3890,
    heading: 120,
    speedKmH: 0,
    baseLocationName: 'Balaji Nagar Station',
    isLiveGps: true,
    lastGpsUpdate: 'Just now'
  },
  {
    id: 'AMB-1087',
    vehicleNumber: 'AP 35 TX 1087',
    driverName: 'P. Prasad',
    driverPhone: '+91 94401 23407',
    rating: 4.6,
    type: 'BLS',
    equipment: ['Oxygen Kit', 'Emergency Trauma Bag', 'Scoop Stretcher'],
    status: 'available',
    lat: 18.1305,
    lng: 83.3920,
    heading: 90,
    speedKmH: 0,
    baseLocationName: 'Pradeep Nagar Ring Road',
    isLiveGps: true,
    lastGpsUpdate: 'Just now'
  },
  {
    id: 'AMB-1088',
    vehicleNumber: 'AP 35 TX 1088',
    driverName: 'Ch. Madhusudhan',
    driverPhone: '+91 94401 23408',
    rating: 4.9,
    type: 'ALS',
    equipment: ['Tertiary ICU Ventilator', 'Multipara Monitor', 'Defibrillator', 'Infusion Pump', 'Oxygen'],
    status: 'available',
    lat: 18.1450,
    lng: 83.4250,
    heading: 45,
    speedKmH: 0,
    baseLocationName: 'MIMS Nellimarla Corridor',
    isLiveGps: true,
    lastGpsUpdate: 'Just now'
  }
];

export const INITIAL_PATIENT_INCIDENTS: PatientEmergencyRequest[] = [
  {
    id: 'EMG-VZM-01',
    patientName: 'K. Sitarama Raju',
    contactPhone: '+91 98480 11223',
    emergencyType: 'Acute Cardiac Arrest',
    severity: 'CRITICAL',
    goldenHourRemainingMin: 38,
    goldenHourTotalMin: 60,
    landmark: 'Near Vizianagaram Fort Gate, Kota Veedhi',
    lat: 18.1130,
    lng: 83.4132,
    status: 'searching',
    createdAt: '2 mins ago',
    isLiveUserLocation: false
  },
  {
    id: 'EMG-VZM-02',
    patientName: 'P. Lakshmi Devi',
    contactPhone: '+91 98480 22334',
    emergencyType: 'Acute Ischemic Stroke (Paralysis symptoms)',
    severity: 'CRITICAL',
    goldenHourRemainingMin: 27,
    goldenHourTotalMin: 60,
    landmark: 'Market Street, Near Clock Tower',
    lat: 18.1145,
    lng: 83.4070,
    status: 'searching',
    createdAt: '4 mins ago',
    isLiveUserLocation: false
  },
  {
    id: 'EMG-VZM-03',
    patientName: 'N. Mohan Rao',
    contactPhone: '+91 98480 33445',
    emergencyType: 'Highway Vehicular Trauma',
    severity: 'SERIOUS',
    goldenHourRemainingMin: 44,
    goldenHourTotalMin: 60,
    landmark: 'Mayuri Junction Bypass Flyover',
    lat: 18.1228,
    lng: 83.3965,
    status: 'searching',
    createdAt: '6 mins ago',
    isLiveUserLocation: false
  },
  {
    id: 'EMG-VZM-04',
    patientName: 'T. Bharathi',
    contactPhone: '+91 98480 44556',
    emergencyType: 'Active Labor / High-Risk Maternity',
    severity: 'MODERATE',
    goldenHourRemainingMin: 52,
    goldenHourTotalMin: 60,
    landmark: 'Balaji Nagar Colony, Street 4',
    lat: 18.1098,
    lng: 83.3885,
    status: 'searching',
    createdAt: '9 mins ago',
    isLiveUserLocation: false
  }
];

export const VIZIANAGARAM_ROADBLOCKS: RoadSegmentStatus[] = [
  {
    id: 'RB-VZM-1',
    name: 'MG Road near Clock Tower (Pipeline Excavation)',
    lat1: 18.1142,
    lng1: 83.4065,
    lat2: 18.1152,
    lng2: 83.4080,
    isBlocked: true,
    reason: 'Underground municipal water pipeline burst and emergency repair.'
  },
  {
    id: 'RB-VZM-2',
    name: 'Railway Underbridge / Flyover Approach',
    lat1: 18.1080,
    lng1: 83.3990,
    lat2: 18.1055,
    lng2: 83.4015,
    isBlocked: false,
    reason: 'Clear'
  }
];

export const INITIAL_DECISION_LOGS: DecisionLogEntry[] = [
  {
    id: 'LOG-VZM-1',
    time: '21:30:14',
    tag: 'SOS Ingested',
    tagColor: '#FF5A5F',
    message: 'New Critical SOS: EMG-VZM-01 (Cardiac Arrest) reported at Vizianagaram Fort Gate.'
  },
  {
    id: 'LOG-VZM-2',
    time: '21:28:40',
    tag: 'Road closed',
    tagColor: '#C62E35',
    message: 'MG Road near Clock Tower blocked for municipal pipe repair. Re-routing all traffic via Station road.'
  },
  {
    id: 'LOG-VZM-3',
    time: '21:26:15',
    tag: 'Reserved',
    tagColor: '#16B37E',
    message: '2 Cardiac ICU beds reserved at Tirumala Hospital for incoming emergency ambulance transfer.'
  },
  {
    id: 'LOG-VZM-4',
    time: '21:24:02',
    tag: 'Voice Alert',
    tagColor: '#0B7A55',
    message: 'Hands-free voice assistant dispatched verbal announcement to Unit AP 35 TX 1081.'
  }
];
