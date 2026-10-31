import { 
  getFirebaseDb, 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  getDocs, 
  getDoc,
  writeBatch 
} from './firebase';
import { canAdminManageCourse } from './adminAuth';
import { SOIT_COURSES, MIN_STUDENT_THRESHOLD } from '../data/courses';
import { validateUnlistedCourse, inferDepartmentFromCode } from '../utils/validation';

const STORAGE_KEY = 'soit_course_requests_v1';
const CUSTOM_COURSES_KEY = 'soit_custom_courses_v1';
const OPENED_SECTIONS_KEY = 'soit_opened_sections_v1';
const QUARTER_STATE_KEY = 'soit_quarter_state_v1';

export const DEFAULT_QUARTER_STATE = {
  currentQuarter: '2Q2627',
  isQuarterOpen: true,
  lastClosedQuarter: null,
  updatedAt: '2026-10-31T00:00:00.000Z',
  updatedBy: 'imppcabalag@gmail.com',
  archivedQuarters: []
};

export function computeNextQuarterCode(currentCode = '2Q2627') {
  const clean = String(currentCode || '2Q2627').trim().toUpperCase();
  const match = clean.match(/^([1-4])Q(\d{2})(\d{2})$/);
  if (!match) return '3Q2627';
  const qNum = parseInt(match[1], 10);
  const y1 = parseInt(match[2], 10);
  const y2 = parseInt(match[3], 10);
  if (qNum < 4) {
    return `${qNum + 1}Q${String(y1).padStart(2, '0')}${String(y2).padStart(2, '0')}`;
  }
  return `1Q${String((y1 + 1) % 100).padStart(2, '0')}${String((y2 + 1) % 100).padStart(2, '0')}`;
}

// Seed mock requests so the system immediately displays live, dynamic threshold progress
const INITIAL_SEED_REQUESTS = [
  // CSS130-1 Data Structures (16 students -> Met 15 threshold!)
  { id: 'SOIT-REQ-1001', studentNumber: '2021104521', lastName: 'Cabalag', firstName: 'Polycarpio II', email: 'pcabalag@mymail.mapua.edu.ph', program: 'CS', unitsLeft: '18', courseCode: 'CSS130-1', courseTitle: 'Data Structures And Algorithms', status: 'Approved for Opening', createdAt: '2026-10-20T08:30:00.000Z' },
  { id: 'SOIT-REQ-1002', studentNumber: '2022101142', lastName: 'Santos', firstName: 'Maria Clara', email: 'mcsantos@mymail.mapua.edu.ph', program: 'CS', unitsLeft: '24', courseCode: 'CSS130-1', courseTitle: 'Data Structures And Algorithms', status: 'Threshold Met', createdAt: '2026-10-20T09:15:00.000Z' },
  { id: 'SOIT-REQ-1003', studentNumber: '2022103498', lastName: 'Reyes', firstName: 'Angelo', email: 'areyes@mymail.mapua.edu.ph', program: 'CS', unitsLeft: '15', courseCode: 'CSS130-1', courseTitle: 'Data Structures And Algorithms', status: 'Threshold Met', createdAt: '2026-10-20T10:00:00.000Z' },
  { id: 'SOIT-REQ-1004', studentNumber: '2021109923', lastName: 'Dela Cruz', firstName: 'Rafael', email: 'rdelacruz@mymail.mapua.edu.ph', program: 'BMCS', unitsLeft: '12', courseCode: 'CSS130-1', courseTitle: 'Data Structures And Algorithms', status: 'Threshold Met', createdAt: '2026-10-20T10:45:00.000Z' },
  { id: 'SOIT-REQ-1005', studentNumber: '2022107712', lastName: 'Bautista', firstName: 'Patricia', email: 'pbautista@mymail.mapua.edu.ph', program: 'CS', unitsLeft: '21', courseCode: 'CSS130-1', courseTitle: 'Data Structures And Algorithms', status: 'Threshold Met', createdAt: '2026-10-21T08:20:00.000Z' },
  { id: 'SOIT-REQ-1006', studentNumber: '2023100234', lastName: 'Mendoza', firstName: 'Joshua', email: 'jmendoza@mymail.mapua.edu.ph', program: 'CS', unitsLeft: '33', courseCode: 'CSS130-1', courseTitle: 'Data Structures And Algorithms', status: 'Threshold Met', createdAt: '2026-10-21T09:10:00.000Z' },
  { id: 'SOIT-REQ-1007', studentNumber: '2022108845', lastName: 'Garcia', firstName: 'Dominic', email: 'dgarcia@mymail.mapua.edu.ph', program: 'DS', unitsLeft: '27', courseCode: 'CSS130-1', courseTitle: 'Data Structures And Algorithms', status: 'Threshold Met', createdAt: '2026-10-21T11:00:00.000Z' },
  { id: 'SOIT-REQ-1008', studentNumber: '2021105521', lastName: 'Tan', firstName: 'Kimberly', email: 'ktan@mymail.mapua.edu.ph', program: 'CS', unitsLeft: '15', courseCode: 'CSS130-1', courseTitle: 'Data Structures And Algorithms', status: 'Threshold Met', createdAt: '2026-10-21T13:30:00.000Z' },
  { id: 'SOIT-REQ-1009', studentNumber: '2022106643', lastName: 'Lim', firstName: 'Justin', email: 'jlim@mymail.mapua.edu.ph', program: 'CS', unitsLeft: '18', courseCode: 'CSS130-1', courseTitle: 'Data Structures And Algorithms', status: 'Threshold Met', createdAt: '2026-10-21T14:15:00.000Z' },
  { id: 'SOIT-REQ-1010', studentNumber: '2021103389', lastName: 'Cruz', firstName: 'Stephanie', email: 'scruz@mymail.mapua.edu.ph', program: 'CS', unitsLeft: '9', courseCode: 'CSS130-1', courseTitle: 'Data Structures And Algorithms', status: 'Threshold Met', createdAt: '2026-10-22T08:45:00.000Z' },
  { id: 'SOIT-REQ-1011', studentNumber: '2022104478', lastName: 'Aquino', firstName: 'Christian', email: 'caquino@mymail.mapua.edu.ph', program: 'CS', unitsLeft: '24', courseCode: 'CSS130-1', courseTitle: 'Data Structures And Algorithms', status: 'Threshold Met', createdAt: '2026-10-22T09:30:00.000Z' },
  { id: 'SOIT-REQ-1012', studentNumber: '2023101190', lastName: 'Villanueva', firstName: 'Bea', email: 'bvillanueva@mymail.mapua.edu.ph', program: 'CS', unitsLeft: '30', courseCode: 'CSS130-1', courseTitle: 'Data Structures And Algorithms', status: 'Threshold Met', createdAt: '2026-10-22T10:15:00.000Z' },
  { id: 'SOIT-REQ-1013', studentNumber: '2022109988', lastName: 'Navarro', firstName: 'Paolo', email: 'pnavarro@mymail.mapua.edu.ph', program: 'CS', unitsLeft: '18', courseCode: 'CSS130-1', courseTitle: 'Data Structures And Algorithms', status: 'Threshold Met', createdAt: '2026-10-22T11:45:00.000Z' },
  { id: 'SOIT-REQ-1014', studentNumber: '2021102214', lastName: 'Ramos', firstName: 'Bianca', email: 'bramos@mymail.mapua.edu.ph', program: 'CS', unitsLeft: '12', courseCode: 'CSS130-1', courseTitle: 'Data Structures And Algorithms', status: 'Threshold Met', createdAt: '2026-10-22T13:20:00.000Z' },
  { id: 'SOIT-REQ-1015', studentNumber: '2022105576', lastName: 'Torres', firstName: 'Gabriel', email: 'gtorres@mymail.mapua.edu.ph', program: 'CS', unitsLeft: '21', courseCode: 'CSS130-1', courseTitle: 'Data Structures And Algorithms', status: 'Threshold Met', createdAt: '2026-10-22T15:00:00.000Z' },
  { id: 'SOIT-REQ-1016', studentNumber: '2021106634', lastName: 'Flores', firstName: 'Hannah', email: 'hflores@mymail.mapua.edu.ph', program: 'CS', unitsLeft: '15', courseCode: 'CSS130-1', courseTitle: 'Data Structures And Algorithms', status: 'Threshold Met', createdAt: '2026-10-22T16:10:00.000Z' },

  // ITS121-1L Web Systems 1 (14 students -> 1 more needed for threshold!)
  { id: 'SOIT-REQ-2001', studentNumber: '2022101901', lastName: 'De Leon', firstName: 'Carlos', email: 'cdeleon@mymail.mapua.edu.ph', program: 'IT', unitsLeft: '27', courseCode: 'ITS121-1L', courseTitle: 'Web Systems 1', status: 'Pending Review', createdAt: '2026-10-21T08:15:00.000Z' },
  { id: 'SOIT-REQ-2002', studentNumber: '2022101902', lastName: 'Serrano', firstName: 'Kaye', email: 'kserrano@mymail.mapua.edu.ph', program: 'IT', unitsLeft: '24', courseCode: 'ITS121-1L', courseTitle: 'Web Systems 1', status: 'Pending Review', createdAt: '2026-10-21T09:00:00.000Z' },
  { id: 'SOIT-REQ-2003', studentNumber: '2023101903', lastName: 'Morales', firstName: 'David', email: 'dmorales@mymail.mapua.edu.ph', program: 'IT', unitsLeft: '36', courseCode: 'ITS121-1L', courseTitle: 'Web Systems 1', status: 'Pending Review', createdAt: '2026-10-21T10:30:00.000Z' },
  { id: 'SOIT-REQ-2004', studentNumber: '2022101904', lastName: 'Castillo', firstName: 'Alyssa', email: 'acastillo@mymail.mapua.edu.ph', program: 'IT', unitsLeft: '21', courseCode: 'ITS121-1L', courseTitle: 'Web Systems 1', status: 'Pending Review', createdAt: '2026-10-21T11:45:00.000Z' },
  { id: 'SOIT-REQ-2005', studentNumber: '2021101905', lastName: 'Pascual', firstName: 'Ezekiel', email: 'epascual@mymail.mapua.edu.ph', program: 'IT', unitsLeft: '15', courseCode: 'ITS121-1L', courseTitle: 'Web Systems 1', status: 'Pending Review', createdAt: '2026-10-21T14:00:00.000Z' },
  { id: 'SOIT-REQ-2006', studentNumber: '2022101906', lastName: 'Mercado', firstName: 'Katrina', email: 'kmercado@mymail.mapua.edu.ph', program: 'BMIT', unitsLeft: '18', courseCode: 'ITS121-1L', courseTitle: 'Web Systems 1', status: 'Pending Review', createdAt: '2026-10-22T08:00:00.000Z' },
  { id: 'SOIT-REQ-2007', studentNumber: '2023101907', lastName: 'Valdez', firstName: 'Sean', email: 'svaldez@mymail.mapua.edu.ph', program: 'IT', unitsLeft: '30', courseCode: 'ITS121-1L', courseTitle: 'Web Systems 1', status: 'Pending Review', createdAt: '2026-10-22T09:10:00.000Z' },
  { id: 'SOIT-REQ-2008', studentNumber: '2022101908', lastName: 'Ocampo', firstName: 'Fiona', email: 'focampo@mymail.mapua.edu.ph', program: 'IT', unitsLeft: '24', courseCode: 'ITS121-1L', courseTitle: 'Web Systems 1', status: 'Pending Review', createdAt: '2026-10-22T10:20:00.000Z' },
  { id: 'SOIT-REQ-2009', studentNumber: '2021101909', lastName: 'Salazar', firstName: 'Janice', email: 'jsalazar@mymail.mapua.edu.ph', program: 'IT', unitsLeft: '12', courseCode: 'ITS121-1L', courseTitle: 'Web Systems 1', status: 'Pending Review', createdAt: '2026-10-22T11:30:00.000Z' },
  { id: 'SOIT-REQ-2010', studentNumber: '2022101910', lastName: 'Estrada', firstName: 'Matthew', email: 'mestrada@mymail.mapua.edu.ph', program: 'IT', unitsLeft: '21', courseCode: 'ITS121-1L', courseTitle: 'Web Systems 1', status: 'Pending Review', createdAt: '2026-10-22T13:00:00.000Z' },
  { id: 'SOIT-REQ-2011', studentNumber: '2023101911', lastName: 'Gomez', firstName: 'Lorenzo', email: 'lgomez@mymail.mapua.edu.ph', program: 'CYB', unitsLeft: '33', courseCode: 'ITS121-1L', courseTitle: 'Web Systems 1', status: 'Pending Review', createdAt: '2026-10-22T14:15:00.000Z' },
  { id: 'SOIT-REQ-2012', studentNumber: '2022101912', lastName: 'Coronel', firstName: 'Camille', email: 'ccoronel@mymail.mapua.edu.ph', program: 'IT', unitsLeft: '18', courseCode: 'ITS121-1L', courseTitle: 'Web Systems 1', status: 'Pending Review', createdAt: '2026-10-22T15:25:00.000Z' },
  { id: 'SOIT-REQ-2013', studentNumber: '2021101913', lastName: 'Silverio', firstName: 'Kyle', email: 'ksilverio@mymail.mapua.edu.ph', program: 'IT', unitsLeft: '15', courseCode: 'ITS121-1L', courseTitle: 'Web Systems 1', status: 'Pending Review', createdAt: '2026-10-22T16:00:00.000Z' },
  { id: 'SOIT-REQ-2014', studentNumber: '2022101914', lastName: 'Rosales', firstName: 'Danielle', email: 'drosales@mymail.mapua.edu.ph', program: 'IT', unitsLeft: '27', courseCode: 'ITS121-1L', courseTitle: 'Web Systems 1', status: 'Pending Review', createdAt: '2026-10-23T08:15:00.000Z' },

  // DSS110 Intro to Data Science (10 students)
  { id: 'SOIT-REQ-3001', studentNumber: '2022105101', lastName: 'Alvarez', firstName: 'Samantha', email: 'salvarez@mymail.mapua.edu.ph', program: 'DS', unitsLeft: '30', courseCode: 'DSS110', courseTitle: 'Introduction to Data Science', status: 'Pending Review', createdAt: '2026-10-21T09:00:00.000Z' },
  { id: 'SOIT-REQ-3002', studentNumber: '2022105102', lastName: 'Chua', firstName: 'Brandon', email: 'bchua@mymail.mapua.edu.ph', program: 'DS', unitsLeft: '24', courseCode: 'DSS110', courseTitle: 'Introduction to Data Science', status: 'Pending Review', createdAt: '2026-10-21T10:15:00.000Z' },
  { id: 'SOIT-REQ-3003', studentNumber: '2023105103', lastName: 'Evangelista', firstName: 'Nicole', email: 'nevangelista@mymail.mapua.edu.ph', program: 'DS', unitsLeft: '33', courseCode: 'DSS110', courseTitle: 'Introduction to Data Science', status: 'Pending Review', createdAt: '2026-10-21T14:40:00.000Z' },
  { id: 'SOIT-REQ-3004', studentNumber: '2022105104', lastName: 'Fuentes', firstName: 'Marco', email: 'mfuentes@mymail.mapua.edu.ph', program: 'CS', unitsLeft: '21', courseCode: 'DSS110', courseTitle: 'Introduction to Data Science', status: 'Pending Review', createdAt: '2026-10-22T08:30:00.000Z' },
  { id: 'SOIT-REQ-3005', studentNumber: '2021105105', lastName: 'Go', firstName: 'Althea', email: 'ago@mymail.mapua.edu.ph', program: 'DS', unitsLeft: '18', courseCode: 'DSS110', courseTitle: 'Introduction to Data Science', status: 'Pending Review', createdAt: '2026-10-22T10:00:00.000Z' },
  { id: 'SOIT-REQ-3006', studentNumber: '2022105106', lastName: 'Hernandez', firstName: 'Kurt', email: 'khernandez@mymail.mapua.edu.ph', program: 'DS', unitsLeft: '27', courseCode: 'DSS110', courseTitle: 'Introduction to Data Science', status: 'Pending Review', createdAt: '2026-10-22T11:20:00.000Z' },
  { id: 'SOIT-REQ-3007', studentNumber: '2023105107', lastName: 'Imperial', firstName: 'Gia', email: 'gimperial@mymail.mapua.edu.ph', program: 'DS', unitsLeft: '36', courseCode: 'DSS110', courseTitle: 'Introduction to Data Science', status: 'Pending Review', createdAt: '2026-10-22T13:45:00.000Z' },
  { id: 'SOIT-REQ-3008', studentNumber: '2022105108', lastName: 'Javier', firstName: 'Nico', email: 'njavier@mymail.mapua.edu.ph', program: 'DS', unitsLeft: '24', courseCode: 'DSS110', courseTitle: 'Introduction to Data Science', status: 'Pending Review', createdAt: '2026-10-22T15:10:00.000Z' },
  { id: 'SOIT-REQ-3009', studentNumber: '2021105109', lastName: 'Katigbak', firstName: 'Sabrina', email: 'skatigbak@mymail.mapua.edu.ph', program: 'DS', unitsLeft: '15', courseCode: 'DSS110', courseTitle: 'Introduction to Data Science', status: 'Pending Review', createdAt: '2026-10-23T09:20:00.000Z' },
  { id: 'SOIT-REQ-3010', studentNumber: '2022105110', lastName: 'Laurel', firstName: 'Jian', email: 'jlaurel@mymail.mapua.edu.ph', program: 'DS', unitsLeft: '21', courseCode: 'DSS110', courseTitle: 'Introduction to Data Science', status: 'Pending Review', createdAt: '2026-10-23T10:05:00.000Z' },

  // ECS151P Game Programming (7 students)
  { id: 'SOIT-REQ-4001', studentNumber: '2022106001', lastName: 'Macaraig', firstName: 'Cedric', email: 'cmacaraig@mymail.mapua.edu.ph', program: 'EMC', unitsLeft: '24', courseCode: 'ECS151P', courseTitle: 'Game Programming', status: 'Pending Review', createdAt: '2026-10-21T11:00:00.000Z' },
  { id: 'SOIT-REQ-4002', studentNumber: '2022106002', lastName: 'Natividad', firstName: 'Trisha', email: 'tnatividad@mymail.mapua.edu.ph', program: 'EMC', unitsLeft: '18', courseCode: 'ECS151P', courseTitle: 'Game Programming', status: 'Pending Review', createdAt: '2026-10-21T13:10:00.000Z' },
  { id: 'SOIT-REQ-4003', studentNumber: '2021106003', lastName: 'Ong', firstName: 'Zachary', email: 'zong@mymail.mapua.edu.ph', program: 'EMC', unitsLeft: '12', courseCode: 'ECS151P', courseTitle: 'Game Programming', status: 'Pending Review', createdAt: '2026-10-22T09:40:00.000Z' },
  { id: 'SOIT-REQ-4004', studentNumber: '2022106004', lastName: 'Pineda', firstName: 'Chloe', email: 'cpineda@mymail.mapua.edu.ph', program: 'EMC', unitsLeft: '27', courseCode: 'ECS151P', courseTitle: 'Game Programming', status: 'Pending Review', createdAt: '2026-10-22T11:00:00.000Z' },
  { id: 'SOIT-REQ-4005', studentNumber: '2023106005', lastName: 'Quizon', firstName: 'Aaron', email: 'aquizon@mymail.mapua.edu.ph', program: 'EMC', unitsLeft: '33', courseCode: 'ECS151P', courseTitle: 'Game Programming', status: 'Pending Review', createdAt: '2026-10-22T14:30:00.000Z' },
  { id: 'SOIT-REQ-4006', studentNumber: '2022106006', lastName: 'Ricarte', firstName: 'Elise', email: 'ericarte@mymail.mapua.edu.ph', program: 'EMC', unitsLeft: '21', courseCode: 'ECS151P', courseTitle: 'Game Programming', status: 'Pending Review', createdAt: '2026-10-23T08:50:00.000Z' },
  { id: 'SOIT-REQ-4007', studentNumber: '2021106007', lastName: 'Sison', firstName: 'Ian', email: 'isison@mymail.mapua.edu.ph', program: 'EMC', unitsLeft: '15', courseCode: 'ECS151P', courseTitle: 'Game Programming', status: 'Pending Review', createdAt: '2026-10-23T10:15:00.000Z' },

  // CSS122P Computer Programming 2 (15 students -> Met 15 threshold!)
  { id: 'SOIT-REQ-5001', studentNumber: '2023102001', lastName: 'Tolentino', firstName: 'Mikaela', email: 'mtolentino@mymail.mapua.edu.ph', program: 'CS', unitsLeft: '36', courseCode: 'CSS122P', courseTitle: 'Computer Programming 2', status: 'Threshold Met', createdAt: '2026-10-21T08:00:00.000Z' },
  { id: 'SOIT-REQ-5002', studentNumber: '2023102002', lastName: 'Uy', firstName: 'Clarence', email: 'cuy@mymail.mapua.edu.ph', program: 'CS', unitsLeft: '33', courseCode: 'CSS122P', courseTitle: 'Computer Programming 2', status: 'Threshold Met', createdAt: '2026-10-21T09:10:00.000Z' },
  { id: 'SOIT-REQ-5003', studentNumber: '2023102003', lastName: 'Velasco', firstName: 'Denise', email: 'dvelasco@mymail.mapua.edu.ph', program: 'CS', unitsLeft: '36', courseCode: 'CSS122P', courseTitle: 'Computer Programming 2', status: 'Threshold Met', createdAt: '2026-10-21T10:30:00.000Z' },
  { id: 'SOIT-REQ-5004', studentNumber: '2022102004', lastName: 'Yulo', firstName: 'Sean Patrick', email: 'syulo@mymail.mapua.edu.ph', program: 'CS', unitsLeft: '27', courseCode: 'CSS122P', courseTitle: 'Computer Programming 2', status: 'Threshold Met', createdAt: '2026-10-21T11:45:00.000Z' },
  { id: 'SOIT-REQ-5005', studentNumber: '2023102005', lastName: 'Zamora', firstName: 'Giselle', email: 'gzamora@mymail.mapua.edu.ph', program: 'CS', unitsLeft: '36', courseCode: 'CSS122P', courseTitle: 'Computer Programming 2', status: 'Threshold Met', createdAt: '2026-10-21T13:20:00.000Z' },
  { id: 'SOIT-REQ-5006', studentNumber: '2022102006', lastName: 'Abad', firstName: 'Luis', email: 'labad@mymail.mapua.edu.ph', program: 'CS', unitsLeft: '24', courseCode: 'CSS122P', courseTitle: 'Computer Programming 2', status: 'Threshold Met', createdAt: '2026-10-22T08:15:00.000Z' },
  { id: 'SOIT-REQ-5007', studentNumber: '2023102007', lastName: 'Bernardo', firstName: 'Faith', email: 'fbernardo@mymail.mapua.edu.ph', program: 'CS', unitsLeft: '33', courseCode: 'CSS122P', courseTitle: 'Computer Programming 2', status: 'Threshold Met', createdAt: '2026-10-22T09:25:00.000Z' },
  { id: 'SOIT-REQ-5008', studentNumber: '2022102008', lastName: 'Caparas', firstName: 'Ethan', email: 'ecaparas@mymail.mapua.edu.ph', program: 'BMCS', unitsLeft: '21', courseCode: 'CSS122P', courseTitle: 'Computer Programming 2', status: 'Threshold Met', createdAt: '2026-10-22T10:40:00.000Z' },
  { id: 'SOIT-REQ-5009', studentNumber: '2023102009', lastName: 'Dimaano', firstName: 'Paula', email: 'pdimaano@mymail.mapua.edu.ph', program: 'CS', unitsLeft: '36', courseCode: 'CSS122P', courseTitle: 'Computer Programming 2', status: 'Threshold Met', createdAt: '2026-10-22T11:55:00.000Z' },
  { id: 'SOIT-REQ-5010', studentNumber: '2022102010', lastName: 'Enriquez', firstName: 'Simon', email: 'senriquez@mymail.mapua.edu.ph', program: 'CS', unitsLeft: '27', courseCode: 'CSS122P', courseTitle: 'Computer Programming 2', status: 'Threshold Met', createdAt: '2026-10-22T13:30:00.000Z' },
  { id: 'SOIT-REQ-5011', studentNumber: '2023102011', lastName: 'Galang', firstName: 'Hannah', email: 'hgalang@mymail.mapua.edu.ph', program: 'CS', unitsLeft: '33', courseCode: 'CSS122P', courseTitle: 'Computer Programming 2', status: 'Threshold Met', createdAt: '2026-10-22T14:45:00.000Z' },
  { id: 'SOIT-REQ-5012', studentNumber: '2022102012', lastName: 'Ignacio', firstName: 'Kenneth', email: 'kignacio@mymail.mapua.edu.ph', program: 'CS', unitsLeft: '24', courseCode: 'CSS122P', courseTitle: 'Computer Programming 2', status: 'Threshold Met', createdAt: '2026-10-22T16:00:00.000Z' },
  { id: 'SOIT-REQ-5013', studentNumber: '2023102013', lastName: 'Jacinto', firstName: 'Marielle', email: 'mjacinto@mymail.mapua.edu.ph', program: 'CS', unitsLeft: '36', courseCode: 'CSS122P', courseTitle: 'Computer Programming 2', status: 'Threshold Met', createdAt: '2026-10-23T08:30:00.000Z' },
  { id: 'SOIT-REQ-5014', studentNumber: '2022102014', lastName: 'Ledesma', firstName: 'Patrick', email: 'pledesma@mymail.mapua.edu.ph', program: 'CS', unitsLeft: '21', courseCode: 'CSS122P', courseTitle: 'Computer Programming 2', status: 'Threshold Met', createdAt: '2026-10-23T09:45:00.000Z' },
  { id: 'SOIT-REQ-5015', studentNumber: '2023102015', lastName: 'Magno', firstName: 'Andrea', email: 'amagno@mymail.mapua.edu.ph', program: 'CS', unitsLeft: '33', courseCode: 'CSS122P', courseTitle: 'Computer Programming 2', status: 'Threshold Met', createdAt: '2026-10-23T10:50:00.000Z' }
];

export function getLocalRequests() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_SEED_REQUESTS));
    return INITIAL_SEED_REQUESTS;
  } catch (e) {
    return INITIAL_SEED_REQUESTS;
  }
}

export function saveLocalRequests(requests) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(requests));
  } catch (e) {
    console.error('LocalStorage write error', e);
  }
}

export async function fetchAllRequests() {
  try {
    const res = await fetch('/api/requests');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        saveLocalRequests(data);
        return data;
      }
    }
  } catch (e) {
    // API not reachable, use localStorage
  }
  return getLocalRequests();
}

export function getCustomCourses() {
  try {
    const raw = localStorage.getItem(CUSTOM_COURSES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveCustomCourses(courses) {
  try {
    localStorage.setItem(CUSTOM_COURSES_KEY, JSON.stringify(courses));
  } catch (e) {
    console.error('LocalStorage custom courses write error', e);
  }
}

export async function fetchCustomCourses() {
  const local = getCustomCourses();
  try {
    const res = await fetch('/api/courses');
    if (res.ok) {
      const serverCourses = await res.json();
      if (Array.isArray(serverCourses)) {
        // Merge server and local courses without duplicates
        const merged = [...serverCourses];
        local.forEach(lc => {
          const norm = String(lc.code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
          if (!merged.some(sc => String(sc.code || '').toUpperCase().replace(/[^A-Z0-9]/g, '') === norm)) {
            merged.push(lc);
          }
        });
        saveCustomCourses(merged);
        return merged;
      }
    }
  } catch (e) {
    // fallback to local
  }
  return local;
}

export function addCustomCourse(course) {
  const list = getCustomCourses();
  const cleanCode = String(course.code || '').trim().toUpperCase();
  const cleanTitle = String(course.title || '').trim();
  const normCode = cleanCode.replace(/[^A-Z0-9]/g, '');

  // Check if already in static SOIT_COURSES or custom courses
  const existingStatic = SOIT_COURSES.find(c => String(c.code || '').toUpperCase().replace(/[^A-Z0-9]/g, '') === normCode);
  if (existingStatic) {
    return { success: true, course: existingStatic, alreadyExisted: true };
  }

  const existingCustom = list.find(c => String(c.code || '').toUpperCase().replace(/[^A-Z0-9]/g, '') === normCode);
  if (existingCustom) {
    return { success: true, course: existingCustom, alreadyExisted: true };
  }

  const newCourse = {
    id: `custom_${Date.now()}`,
    raw: `${cleanCode} ${cleanTitle}`,
    code: cleanCode,
    title: cleanTitle,
    dept: course.dept || inferDepartmentFromCode(cleanCode),
    units: course.units || 3,
    hasLab: cleanCode.endsWith('P') || cleanCode.endsWith('L') || cleanCode.includes('-1L') || cleanCode.includes('-1P'),
    isCustom: true,
    isAutoCataloged: Boolean(course.isAutoCataloged),
    addedByStudent: course.addedByStudent || null,
    createdAt: new Date().toISOString()
  };

  list.push(newCourse);
  saveCustomCourses(list);

  // Sync with backend asynchronously
  try {
    fetch('/api/courses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newCourse)
    }).catch(() => {});
  } catch (e) {}

  return { success: true, course: newCourse, alreadyExisted: false };
}

/**
 * Submit a new course request.
 * Automatically validates and adds unlisted courses to the live SOIT Course Catalog
 * so the admin NEVER has to manually approve or copy-paste unlisted courses, and
 * the student's petition immediately counts as 1/15!
 */
export async function submitCourseRequest(requestData) {
  const current = getLocalRequests();
  const customCourses = getCustomCourses();
  const allKnownCourses = [...SOIT_COURSES, ...customCourses];

  const studentNum = String(requestData.studentNumber || '').trim();
  let finalCourseCode = String(requestData.courseCode || '').trim().toUpperCase();
  let finalCourseTitle = String(requestData.courseTitle || '').trim();
  let isAutoCataloged = false;
  let autoCatalogedCourse = null;

  // Automated Unlisted Course Resolution & Instant Cataloging
  if (!finalCourseCode && requestData.customCourseCode) {
    const validation = validateUnlistedCourse(
      requestData.customCourseCode,
      requestData.customCourseTitle,
      allKnownCourses
    );

    if (!validation.valid) {
      return {
        success: false,
        error: validation.error,
        message: validation.error
      };
    }

    finalCourseCode = validation.code;
    finalCourseTitle = validation.title;

    if (validation.isNewCatalogAddition) {
      const addRes = addCustomCourse({
        code: finalCourseCode,
        title: finalCourseTitle,
        dept: validation.dept,
        units: 3,
        isAutoCataloged: true,
        addedByStudent: studentNum
      });
      isAutoCataloged = true;
      autoCatalogedCourse = addRes.course;
    }
  } else if (finalCourseCode && !finalCourseTitle) {
    // Look up title from catalog if not provided
    const match = allKnownCourses.find(c => c.code.toUpperCase() === finalCourseCode);
    if (match) finalCourseTitle = match.title;
  }

  if (!finalCourseCode) {
    return {
      success: false,
      error: 'Course Code is required.',
      message: 'Course Code is required.'
    };
  }

  // Validate duplicate request for the same student + course
  const normFinal = finalCourseCode.replace(/[^A-Z0-9]/g, '');
  const duplicate = current.find(r => 
    String(r.studentNumber).trim() === studentNum && 
    String(r.courseCode || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '') === normFinal
  );

  if (duplicate) {
    return {
      success: false,
      error: `Duplicate request: Student Number ${studentNum} already has an active request for ${finalCourseCode}. You may retract or check your request via the Status Tracker.`,
      message: `Duplicate request: Student Number ${studentNum} already has an active request for ${finalCourseCode}. You may retract or check your request via the Status Tracker.`
    };
  }

  const newRequest = {
    id: `SOIT-REQ-${Math.floor(1000 + Math.random() * 9000)}`,
    studentNumber: studentNum,
    lastName: String(requestData.lastName || '').trim(),
    firstName: String(requestData.firstName || '').trim(),
    email: String(requestData.email || '').trim().toLowerCase(),
    program: String(requestData.program || '').trim(),
    unitsLeft: String(requestData.unitsLeft || '').trim(),
    courseCode: finalCourseCode,
    courseTitle: finalCourseTitle,
    isAutoCataloged,
    autoCatalogedCourse,
    customCourseNote: isAutoCataloged ? `Auto-Cataloged via Student Petition (${finalCourseCode} ${finalCourseTitle})` : null,
    status: 'Pending Review',
    createdAt: new Date().toISOString()
  };

  // Try API POST
  try {
    const res = await fetch('/api/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newRequest)
    });
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.request) {
        const updated = [...current, json.request];
        saveLocalRequests(updated);
        return { success: true, request: json.request, autoCatalogedCourse };
      }
    } else {
      const errJson = await res.json().catch(() => ({}));
      if (errJson.error) {
        return { success: false, error: errJson.error, message: errJson.error };
      }
    }
  } catch (e) {
    // offline fallback
  }

  const updated = [...current, newRequest];
  saveLocalRequests(updated);
  return { success: true, request: newRequest, autoCatalogedCourse };
}

// Retract / cancel request (Enforces student ownership so students can ONLY retract their own petitions)
export async function retractRequest(requestId, currentUser = null) {
  const current = getLocalRequests();
  const target = current.find(r => r.id === requestId || r.studentNumber === requestId);

  if (target && currentUser) {
    if (currentUser.role === 'student') {
      const myEmail = String(currentUser.email || '').trim().toLowerCase();
      const myNum = String(currentUser.studentNumber || '').trim();
      const reqEmail = String(target.email || '').trim().toLowerCase();
      const reqNum = String(target.studentNumber || '').trim();

      if (reqEmail !== myEmail && reqNum !== myNum) {
        throw new Error('Unauthorized: You can only remove your own course petitions.');
      }
    } else if (currentUser.role === 'chair') {
      if (!canAdminManageCourse(currentUser.email, target.courseCode)) {
        throw new Error('Unauthorized: Program Chairs can only remove petitions for their assigned department.');
      }
    }
  }

  const headers = {};
  if (currentUser) {
    headers['x-actor-role'] = currentUser.role || '';
    headers['x-actor-email'] = currentUser.email || '';
    headers['x-actor-student-number'] = currentUser.studentNumber || '';
  }

  try {
    const res = await fetch(`/api/requests/${encodeURIComponent(requestId)}`, {
      method: 'DELETE',
      headers
    });
    if (res.status === 403) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || 'Unauthorized: You can only retract your own course petitions.');
    }
  } catch (e) {
    if (e.message && e.message.startsWith('Unauthorized')) throw e;
  }

  const updated = current.filter(r => r.id !== requestId && r.studentNumber !== requestId);
  saveLocalRequests(updated);

  return { success: true };
}

// Program chair updates status
export async function updateRequestStatus(requestId, newStatus) {
  const current = getLocalRequests();
  const updated = current.map(r => r.id === requestId ? { ...r, status: newStatus } : r);
  saveLocalRequests(updated);
  return { success: true, updated };
}

// Get dynamic demand summary for all courses (including self-healing discovery of any auto-cataloged courses in requests)
export function calculateCourseDemands(requests = [], allCourses = SOIT_COURSES) {
  const counts = {};
  const catalogMap = new Map();

  // 1. Register all known catalog courses
  allCourses.forEach(course => {
    const codeUpper = String(course.code || '').trim().toUpperCase();
    if (codeUpper && !catalogMap.has(codeUpper)) {
      catalogMap.set(codeUpper, course);
    }
  });

  // 2. Count requests AND auto-discover any course codes from requests not yet in catalogMap
  requests.forEach(r => {
    const code = String(r.courseCode || '').trim().toUpperCase();
    if (!code) return;
    counts[code] = (counts[code] || 0) + 1;

    if (!catalogMap.has(code)) {
      catalogMap.set(code, {
        id: `auto_discovered_${code}`,
        raw: `${code} ${r.courseTitle || 'Special Petition Subject'}`,
        code,
        title: r.courseTitle || 'Special Petition Subject',
        dept: inferDepartmentFromCode(code),
        units: 3,
        hasLab: code.endsWith('P') || code.endsWith('L'),
        isCustom: true,
        isAutoCataloged: true
      });
    }
  });

  return Array.from(catalogMap.values()).map(course => {
    const codeUpper = course.code.toUpperCase();
    const count = counts[codeUpper] || 0;
    const progress = Math.min(100, Math.round((count / MIN_STUDENT_THRESHOLD) * 100));
    const isMet = count >= MIN_STUDENT_THRESHOLD;
    const needed = Math.max(0, MIN_STUDENT_THRESHOLD - count);

    return {
      ...course,
      count,
      requestCount: count,
      progressPercentage: progress,
      isThresholdMet: isMet,
      studentsNeeded: needed
    };
  });
}

export function getOpenedSections() {
  try {
    const raw = localStorage.getItem(OPENED_SECTIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveOpenedSections(sections) {
  try {
    localStorage.setItem(OPENED_SECTIONS_KEY, JSON.stringify(sections));
  } catch (e) {
    console.error('LocalStorage opened sections write error', e);
  }
}

export async function fetchOpenedSections() {
  try {
    const res = await fetch('/api/opened-sections');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        saveOpenedSections(data);
        return data;
      }
    }
  } catch (e) {}
  return getOpenedSections();
}

export async function openCourseSection(course, openedBy = 'Program Chair', actionType = 'OPEN') {
  const cleanCode = String(course.code || '').trim().toUpperCase();
  const payload = {
    code: cleanCode,
    title: course.title || '',
    dept: course.dept || 'SOIT',
    units: course.units || 3,
    actionType: actionType === 'CONSULTATION' ? 'CONSULTATION' : 'OPEN',
    openedBy,
    openedAt: new Date().toISOString()
  };

  try {
    const res = await fetch('/api/opened-sections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.openedSections)) {
        saveOpenedSections(json.openedSections);
        return json.openedSections;
      }
    }
  } catch (e) {}

  const current = getOpenedSections();
  const next = [...current.filter(s => String(s.code || '').toUpperCase() !== cleanCode), payload];
  saveOpenedSections(next);
  return next;
}

export async function closeCourseSection(courseCode) {
  const cleanCode = String(courseCode || '').trim().toUpperCase();
  try {
    const res = await fetch(`/api/opened-sections/${encodeURIComponent(cleanCode)}`, {
      method: 'DELETE'
    });
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.openedSections)) {
        saveOpenedSections(json.openedSections);
        return json.openedSections;
      }
    }
  } catch (e) {}

  const current = getOpenedSections();
  const next = current.filter(s => String(s.code || '').toUpperCase() !== cleanCode);
  saveOpenedSections(next);
  return next;
}


export function getLocalQuarterState() {
  try {
    const raw = localStorage.getItem(QUARTER_STATE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return {
          ...DEFAULT_QUARTER_STATE,
          ...parsed,
          archivedQuarters: Array.isArray(parsed.archivedQuarters) ? parsed.archivedQuarters : []
        };
      }
    }
  } catch (e) {}
  return { ...DEFAULT_QUARTER_STATE };
}

export function saveLocalQuarterState(state) {
  try {
    localStorage.setItem(QUARTER_STATE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('LocalStorage quarter state write error', e);
  }
}

export async function fetchQuarterState() {
  try {
    const res = await fetch('/api/quarters');
    if (res.ok) {
      const data = await res.json();
      if (data && typeof data === 'object') {
        const merged = {
          ...DEFAULT_QUARTER_STATE,
          ...data,
          archivedQuarters: Array.isArray(data.archivedQuarters) ? data.archivedQuarters : []
        };
        saveLocalQuarterState(merged);
        return merged;
      }
    }
  } catch (e) {}
  return getLocalQuarterState();
}

export async function endCurrentQuarter({
  actorEmail = 'imppcabalag@gmail.com',
  actorName = 'Program Chair',
  openNextQuarter = false,
  nextQuarterCode = ''
} = {}) {
  try {
    const res = await fetch('/api/quarters/close', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        actorEmail,
        actorName,
        openNextQuarter,
        nextQuarterCode
      })
    });
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.quarterState) {
        saveLocalQuarterState(json.quarterState);
        saveLocalRequests([]);
        saveOpenedSections([]);
        return {
          success: true,
          quarterState: json.quarterState,
          requests: [],
          openedSections: []
        };
      }
    }
  } catch (e) {}

  // Offline / localStorage fallback
  const qState = getLocalQuarterState();
  const currentReqs = getLocalRequests();
  const currentOpened = getOpenedSections();
  const closingCode = String(qState.currentQuarter || '2Q2627').trim().toUpperCase();
  const cleanNext = String(nextQuarterCode || '').trim().toUpperCase();

  const archivedList = Array.isArray(qState.archivedQuarters) ? [...qState.archivedQuarters] : [];
  const snapshot = {
    id: `ARCHIVE-${closingCode}-${Date.now()}`,
    quarterCode: closingCode,
    closedAt: new Date().toISOString(),
    closedBy: actorEmail,
    closedByName: actorName,
    totalRequests: currentReqs.length,
    totalOpenedSections: currentOpened.length,
    requests: currentReqs,
    openedSections: currentOpened
  };
  const existingIdx = archivedList.findIndex(item => String(item.quarterCode || '').toUpperCase() === closingCode);
  if (existingIdx !== -1) {
    archivedList[existingIdx] = snapshot;
  } else {
    archivedList.unshift(snapshot);
  }

  const nextState = {
    ...qState,
    lastClosedQuarter: closingCode,
    currentQuarter: openNextQuarter && cleanNext ? cleanNext : closingCode,
    isQuarterOpen: Boolean(openNextQuarter && cleanNext),
    updatedAt: new Date().toISOString(),
    updatedBy: actorEmail,
    updatedByName: actorName,
    archivedQuarters: archivedList
  };

  saveLocalQuarterState(nextState);
  saveLocalRequests([]);
  saveOpenedSections([]);

  return {
    success: true,
    quarterState: nextState,
    requests: [],
    openedSections: []
  };
}

export async function openNewQuarter({
  quarterCode = '3Q2627',
  actorEmail = 'imppcabalag@gmail.com',
  actorName = 'Program Chair'
} = {}) {
  const cleanCode = String(quarterCode || '3Q2627').trim().toUpperCase();
  try {
    const res = await fetch('/api/quarters/open', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quarterCode: cleanCode,
        actorEmail,
        actorName
      })
    });
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.quarterState) {
        saveLocalQuarterState(json.quarterState);
        saveLocalRequests([]);
        saveOpenedSections([]);
        return {
          success: true,
          quarterState: json.quarterState,
          requests: [],
          openedSections: []
        };
      }
    }
  } catch (e) {}

  const qState = getLocalQuarterState();
  const nextState = {
    ...qState,
    currentQuarter: cleanCode,
    isQuarterOpen: true,
    updatedAt: new Date().toISOString(),
    updatedBy: actorEmail,
    updatedByName: actorName,
    archivedQuarters: Array.isArray(qState.archivedQuarters) ? qState.archivedQuarters : []
  };
  saveLocalQuarterState(nextState);
  saveLocalRequests([]);
  saveOpenedSections([]);
  return {
    success: true,
    quarterState: nextState,
    requests: [],
    openedSections: []
  };
}

export async function reopenArchivedQuarter({
  quarterCode,
  actorEmail = 'imppcabalag@gmail.com',
  actorName = 'Program Chair'
} = {}) {
  const cleanCode = String(quarterCode || '').trim().toUpperCase();
  try {
    const res = await fetch('/api/quarters/reopen', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quarterCode: cleanCode,
        actorEmail,
        actorName
      })
    });
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.quarterState) {
        saveLocalQuarterState(json.quarterState);
        saveLocalRequests(json.requests || []);
        saveOpenedSections(json.openedSections || []);
        return {
          success: true,
          quarterState: json.quarterState,
          requests: json.requests || [],
          openedSections: json.openedSections || []
        };
      }
    }
  } catch (e) {}

  // Fallback offline / localStorage
  const qState = getLocalQuarterState();
  const archivedList = Array.isArray(qState.archivedQuarters) ? qState.archivedQuarters : [];
  const targetArchived = archivedList.find(item => String(item.quarterCode || '').toUpperCase() === cleanCode);
  const restoredRequests = targetArchived?.requests || [];
  const restoredOpened = targetArchived?.openedSections || [];

  const nextState = {
    ...qState,
    currentQuarter: cleanCode,
    isQuarterOpen: true,
    updatedAt: new Date().toISOString(),
    updatedBy: actorEmail,
    updatedByName: actorName
  };

  saveLocalQuarterState(nextState);
  saveLocalRequests(restoredRequests);
  saveOpenedSections(restoredOpened);

  return {
    success: true,
    quarterState: nextState,
    requests: restoredRequests,
    openedSections: restoredOpened
  };
}


export async function deleteArchivedQuarter({
  quarterId,
  quarterCode,
  actorEmail = 'imppcabalag@gmail.com',
  actorName = 'Program Chair'
} = {}) {
  const cleanCode = String(quarterCode || '').trim().toUpperCase();
  const cleanId = String(quarterId || '').trim();

  try {
    const res = await fetch('/api/quarters/archive', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quarterId: cleanId,
        quarterCode: cleanCode,
        actorEmail,
        actorName
      })
    });
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.quarterState) {
        saveLocalQuarterState(json.quarterState);
        return { success: true, quarterState: json.quarterState };
      }
    }
  } catch (e) {}

  // Fallback offline / localStorage
  const qState = getLocalQuarterState();
  const archivedList = Array.isArray(qState.archivedQuarters) ? qState.archivedQuarters : [];
  const remaining = archivedList.filter(item => {
    if (cleanId && item.id === cleanId) return false;
    if (cleanCode && String(item.quarterCode || '').toUpperCase() === cleanCode) return false;
    return true;
  });

  const nextState = {
    ...qState,
    archivedQuarters: remaining,
    updatedAt: new Date().toISOString(),
    updatedBy: actorEmail,
    updatedByName: actorName
  };

  saveLocalQuarterState(nextState);
  return { success: true, quarterState: nextState };
}

export async function deleteArchivedPetitionRecord({
  quarterCode,
  requestId,
  actorEmail = 'imppcabalag@gmail.com',
  actorName = 'Program Chair'
} = {}) {
  const cleanCode = String(quarterCode || '').trim().toUpperCase();
  const cleanReqId = String(requestId || '').trim();

  try {
    const res = await fetch('/api/quarters/archive/record', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quarterCode: cleanCode,
        requestId: cleanReqId,
        actorEmail,
        actorName
      })
    });
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.quarterState) {
        saveLocalQuarterState(json.quarterState);
        return { success: true, quarterState: json.quarterState };
      }
    }
  } catch (e) {}

  // Fallback offline / localStorage
  const qState = getLocalQuarterState();
  const archivedList = Array.isArray(qState.archivedQuarters) ? qState.archivedQuarters : [];

  const updatedArchived = archivedList.map(arch => {
    if (String(arch.quarterCode || '').toUpperCase() !== cleanCode) return arch;
    const reqs = Array.isArray(arch.requests) ? arch.requests : [];
    const filteredReqs = reqs.filter(r => String(r.id || r.requestId || '') !== cleanReqId);
    return {
      ...arch,
      requests: filteredReqs,
      totalRequests: filteredReqs.length
    };
  });

  const nextState = {
    ...qState,
    archivedQuarters: updatedArchived,
    updatedAt: new Date().toISOString(),
    updatedBy: actorEmail,
    updatedByName: actorName
  };

  saveLocalQuarterState(nextState);
  return { success: true, quarterState: nextState };
}


/**
 * Real-Time Firebase Sync Hook
 * Allows any view across the world to subscribe to instant Firestore updates
 */
export function subscribeToFirebaseSync({ onRequests, onOpened, onQuarter } = {}) {
  const db = getFirebaseDb();
  if (!db) return () => {};

  const unsubs = [];
  try {
    if (onRequests) {
      const u1 = onSnapshot(
        collection(db, 'soit_petitions'),
        (snapshot) => {
          const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
          saveLocalRequests(list);
          onRequests(list);
        },
        (error) => {
          console.warn('Real-time soit_petitions listener notice (using local/API fallback):', error.message);
        }
      );
      unsubs.push(u1);
    }
    if (onOpened) {
      const u2 = onSnapshot(
        collection(db, 'soit_opened_sections'),
        (snapshot) => {
          const list = snapshot.docs.map(d => ({ code: d.id, ...d.data() }));
          saveOpenedSections(list);
          onOpened(list);
        },
        (error) => {
          console.warn('Real-time soit_opened_sections listener notice:', error.message);
        }
      );
      unsubs.push(u2);
    }
    if (onQuarter) {
      const u3 = onSnapshot(
        doc(db, 'soit_system_state', 'quarter_state'),
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data();
            saveLocalQuarterState(data);
            onQuarter(data);
          }
        },
        (error) => {
          console.warn('Real-time quarter_state listener notice:', error.message);
        }
      );
      unsubs.push(u3);
    }
  } catch (e) {
    console.warn('Real-time subscription error:', e);
  }

  return () => {
    unsubs.forEach(u => typeof u === 'function' && u());
  };
}
