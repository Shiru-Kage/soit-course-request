// Official 9 Programs from SOIT Course Request Microsoft Form
export const SOIT_PROGRAMS = [
  {
    code: 'CS',
    name: 'BS Computer Science',
    dept: 'Computer Science',
    color: '#3b82f6',
    desc: 'Theory of computation, algorithms, artificial intelligence, and software systems architecture.'
  },
  {
    code: 'DS',
    name: 'BS Data Science',
    dept: 'Data Science',
    color: '#8b5cf6',
    desc: 'Big data analytics, machine learning, statistical modeling, and data engineering pipelines.'
  },
  {
    code: 'EMC',
    name: 'BS Entertainment and Multimedia Computing',
    dept: 'Game & Multimedia',
    color: '#ec4899',
    desc: 'Interactive digital media, game programming, animation, and real-time graphics rendering.'
  },
  {
    code: 'IS',
    name: 'BS Information Systems',
    dept: 'Information Systems',
    color: '#10b981',
    desc: 'Bridging business operations, enterprise architecture, and strategic technology solutions.'
  },
  {
    code: 'IT',
    name: 'BS Information Technology',
    dept: 'Information Technology',
    color: '#f59e0b',
    desc: 'Network infrastructure, cybersecurity, cloud platforms, web engineering, and systems administration.'
  },
  {
    code: 'BMIT',
    name: 'BS Business Management & Information Technology',
    dept: 'Information Systems',
    color: '#06b6d4',
    desc: 'Cross-functional executive leadership, corporate IT governance, and technopreneurship.'
  },
  {
    code: 'BMCS',
    name: 'BS Business Management & Computer Science',
    dept: 'Computer Science',
    color: '#6366f1',
    desc: 'Advanced software venture engineering, financial computing, and algorithmic management.'
  },
  {
    code: 'ISMAN',
    name: 'Information Systems Management',
    dept: 'Information Systems',
    color: '#14b8a6',
    desc: 'Enterprise resource planning, database systems management, and digital innovation stewardship.'
  },
  {
    code: 'CYB',
    name: 'BS Cybersecurity',
    dept: 'Information Technology',
    color: '#ef4444',
    desc: 'Threat intelligence, ethical hacking, digital forensics, network defense, and cryptography.'
  }
];

export const PROGRAM_TO_CLUSTER_MAP = {
  CS: 'CS',
  BMCS: 'CS',
  IT: 'IT',
  CYB: 'IT',
  DS: 'DS',
  EMC: 'EMC',
  IS: 'IS',
  BMIT: 'IS',
  ISMAN: 'IS'
};

export function getClusterForProgram(progCode) {
  const code = String(progCode || '').trim().toUpperCase();
  return PROGRAM_TO_CLUSTER_MAP[code] || 'CS';
}

export function getProgramsForCluster(clusterDept) {
  const dept = String(clusterDept || '').trim().toUpperCase();
  return SOIT_PROGRAMS.filter(p => getClusterForProgram(p.code) === dept);
}
