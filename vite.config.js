import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

const DEFAULT_DEMO_STUDENTS = [];

function apiDevPlugin() {
  const dataDir = path.resolve(process.cwd(), 'data');
  const requestsFile = path.resolve(dataDir, 'requests.json');
  const coursesFile = path.resolve(dataDir, 'courses.json');
  const studentsFile = path.resolve(dataDir, 'students.json');
  const openedSectionsFile = path.resolve(dataDir, 'opened_sections.json');
  const consultationsFile = path.resolve(dataDir, 'admin_consultations.json');
  const quartersFile = path.resolve(dataDir, 'quarters.json');

  const DEFAULT_QUARTER_STATE = {
    currentQuarter: '2Q2627',
    isQuarterOpen: true,
    lastClosedQuarter: null,
    updatedAt: '2026-10-31T00:00:00.000Z',
    updatedBy: 'imppcabalag@gmail.com',
    archivedQuarters: []
  };

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  function readJSON(file, fallback) {
    try {
      if (fs.existsSync(file)) {
        return JSON.parse(fs.readFileSync(file, 'utf-8'));
      }
    } catch (e) {
      console.error(e);
    }
    return fallback;
  }

  function writeJSON(file, data) {
    try {
      fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
      console.error(e);
    }
  }

  if (!fs.existsSync(studentsFile)) {
    writeJSON(studentsFile, DEFAULT_DEMO_STUDENTS);
  }
  if (!fs.existsSync(quartersFile)) {
    writeJSON(quartersFile, DEFAULT_QUARTER_STATE);
  }

  let sseClients = [];

  function broadcast(data) {
    const payload = `data: ${JSON.stringify(data)}\n\n`;
    sseClients.forEach(res => {
      try { res.write(payload); } catch { /* ignore */ }
    });
  }

  return {
    name: 'api-dev-middleware',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url?.split('?')[0];

        // 0a. GET /api/students
        if (url === '/api/students' && req.method === 'GET') {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(readJSON(studentsFile, DEFAULT_DEMO_STUDENTS)));
          return;
        }

        // 0b. POST /api/students/register
        if (url === '/api/students/register' && req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', () => {
            try {
              const incoming = JSON.parse(body);
              const cleanNum = String(incoming.studentNumber || '').trim();
              const cleanEmail = String(incoming.email || '').trim().toLowerCase();
              const students = readJSON(studentsFile, DEFAULT_DEMO_STUDENTS);

              if (students.some(s => String(s.email || '').toLowerCase() === cleanEmail)) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: false, error: 'An account with this MyMapúa email already exists. Please sign in.' }));
                return;
              }
              if (students.some(s => String(s.studentNumber || '').trim() === cleanNum)) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: false, error: 'An account with this 10-digit Student Number already exists. Please sign in.' }));
                return;
              }

              const newStudent = {
                studentNumber: cleanNum,
                email: cleanEmail,
                firstName: String(incoming.firstName || '').trim(),
                lastName: String(incoming.lastName || '').trim(),
                program: String(incoming.program || '').trim(),
                unitsLeft: String(incoming.unitsLeft ?? '').trim(),
                password: String(incoming.password || ''),
                createdAt: new Date().toISOString()
              };
              students.push(newStudent);
              writeJSON(studentsFile, students);

              res.statusCode = 201;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true, student: newStudent }));
            } catch (err) {
              res.statusCode = 500;
              res.end(JSON.stringify({ success: false, error: err.message }));
            }
          });
          return;
        }

        // 0c. POST /api/students/login
        if (url === '/api/students/login' && req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', () => {
            try {
              const { email, password } = JSON.parse(body);
              const cleanEmail = String(email || '').trim().toLowerCase();
              const students = readJSON(studentsFile, DEFAULT_DEMO_STUDENTS);
              const match = students.find(s => String(s.email || '').toLowerCase() === cleanEmail);
              if (!match) {
                res.statusCode = 404;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: false, error: 'No student account found for this email. Please Sign Up first to create your Student Profile.' }));
                return;
              }
              if (match.password !== String(password || '')) {
                res.statusCode = 401;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: false, error: 'Incorrect password. Please try again or reset your password.' }));
                return;
              }
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true, student: match }));
            } catch (err) {
              res.statusCode = 500;
              res.end(JSON.stringify({ success: false, error: err.message }));
            }
          });
          return;
        }

        // 0d. PUT /api/students/profile
        if (url === '/api/students/profile' && req.method === 'PUT') {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', () => {
            try {
              const updates = JSON.parse(body);
              const cleanEmail = String(updates.email || '').trim().toLowerCase();
              const students = readJSON(studentsFile, DEFAULT_DEMO_STUDENTS);
              let updatedStudent = null;
              const next = students.map(s => {
                if (String(s.email || '').toLowerCase() === cleanEmail) {
                  updatedStudent = {
                    ...s,
                    firstName: updates.firstName !== undefined ? String(updates.firstName).trim() : s.firstName,
                    lastName: updates.lastName !== undefined ? String(updates.lastName).trim() : s.lastName,
                    program: updates.program !== undefined ? String(updates.program).trim() : s.program,
                    unitsLeft: updates.unitsLeft !== undefined ? String(updates.unitsLeft).trim() : s.unitsLeft
                  };
                  return updatedStudent;
                }
                return s;
              });
              if (!updatedStudent) {
                res.statusCode = 404;
                res.end(JSON.stringify({ success: false, error: 'Student account not found.' }));
                return;
              }
              writeJSON(studentsFile, next);
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true, student: updatedStudent }));
            } catch (err) {
              res.statusCode = 500;
              res.end(JSON.stringify({ success: false, error: err.message }));
            }
          });
          return;
        }

        // 0e. POST /api/students/reset-password
        if (url === '/api/students/reset-password' && req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', () => {
            try {
              const { email, studentNumber, newPassword } = JSON.parse(body);
              const cleanEmail = String(email || '').trim().toLowerCase();
              const cleanNum = String(studentNumber || '').trim();
              const students = readJSON(studentsFile, DEFAULT_DEMO_STUDENTS);
              const idx = students.findIndex(
                s => String(s.email || '').toLowerCase() === cleanEmail && String(s.studentNumber || '').trim() === cleanNum
              );
              if (idx === -1) {
                res.statusCode = 404;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: false, error: 'No matching student account found for that MyMapúa Email and 10-digit Student Number.' }));
                return;
              }
              students[idx].password = String(newPassword || '');
              writeJSON(studentsFile, students);
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true }));
            } catch (err) {
              res.statusCode = 500;
              res.end(JSON.stringify({ success: false, error: err.message }));
            }
          });
          return;
        }

        // 1i. GET /api/quarters
        if (url === '/api/quarters' && req.method === 'GET') {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(readJSON(quartersFile, DEFAULT_QUARTER_STATE)));
          return;
        }

        // 1j. POST /api/quarters/close (End Current Quarter & Move Data to Archive)
        if (url === '/api/quarters/close' && req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', () => {
            try {
              const incoming = JSON.parse(body || '{}');
              const actorEmail = String(incoming.actorEmail || 'imppcabalag@gmail.com').trim();
              const actorName = String(incoming.actorName || 'Program Chair').trim();
              const openNextQuarter = Boolean(incoming.openNextQuarter);
              const nextQuarterCode = String(incoming.nextQuarterCode || '').trim().toUpperCase();

              const qState = readJSON(quartersFile, DEFAULT_QUARTER_STATE);
              const currentReqs = readJSON(requestsFile, []);
              const currentOpened = readJSON(openedSectionsFile, []);
              const closingCode = String(qState.currentQuarter || '2Q2627').trim().toUpperCase();

              const archivedList = Array.isArray(qState.archivedQuarters) ? [...qState.archivedQuarters] : [];
              const existingIdx = archivedList.findIndex(
                item => String(item.quarterCode || '').toUpperCase() === closingCode
              );

              if (existingIdx !== -1 && currentReqs.length === 0 && archivedList[existingIdx].requests?.length > 0) {
                // Keep existing populated archive if re-closing an already empty quarter
                archivedList[existingIdx] = {
                  ...archivedList[existingIdx],
                  closedAt: new Date().toISOString(),
                  closedBy: actorEmail,
                  closedByName: actorName
                };
              } else {
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
                if (existingIdx !== -1) {
                  archivedList[existingIdx] = snapshot;
                } else {
                  archivedList.unshift(snapshot);
                }
              }

              // Clear active quarter data so the next quarter starts fresh
              writeJSON(requestsFile, []);
              writeJSON(openedSectionsFile, []);

              const nextState = {
                ...qState,
                lastClosedQuarter: closingCode,
                currentQuarter: openNextQuarter && nextQuarterCode ? nextQuarterCode : closingCode,
                isQuarterOpen: Boolean(openNextQuarter && nextQuarterCode),
                updatedAt: new Date().toISOString(),
                updatedBy: actorEmail,
                updatedByName: actorName,
                archivedQuarters: archivedList
              };
              writeJSON(quartersFile, nextState);

              broadcast({ type: 'quarter_updated', quarterState: nextState });
              broadcast({ type: 'requests_updated', requests: [] });
              broadcast({ type: 'opened_sections_updated', openedSections: [] });

              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                success: true,
                quarterState: nextState,
                requests: [],
                openedSections: []
              }));
            } catch (err) {
              res.statusCode = 500;
              res.end(JSON.stringify({ success: false, error: err.message }));
            }
          });
          return;
        }

        // 1k. POST /api/quarters/open (Open a New Fresh Quarter)
        if (url === '/api/quarters/open' && req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', () => {
            try {
              const incoming = JSON.parse(body || '{}');
              const quarterCode = String(incoming.quarterCode || '3Q2627').trim().toUpperCase();
              const actorEmail = String(incoming.actorEmail || 'imppcabalag@gmail.com').trim();
              const actorName = String(incoming.actorName || 'Program Chair').trim();

              if (!quarterCode) {
                res.statusCode = 400;
                res.end(JSON.stringify({ success: false, error: 'Quarter code is required (e.g. 3Q2627).' }));
                return;
              }

              const qState = readJSON(quartersFile, DEFAULT_QUARTER_STATE);
              const nextState = {
                ...qState,
                currentQuarter: quarterCode,
                isQuarterOpen: true,
                updatedAt: new Date().toISOString(),
                updatedBy: actorEmail,
                updatedByName: actorName,
                archivedQuarters: Array.isArray(qState.archivedQuarters) ? qState.archivedQuarters : []
              };

              // Opening a new quarter starts fresh with 0 student petitions and 0 opened sections
              writeJSON(requestsFile, []);
              writeJSON(openedSectionsFile, []);
              writeJSON(quartersFile, nextState);

              broadcast({ type: 'quarter_updated', quarterState: nextState });
              broadcast({ type: 'requests_updated', requests: [] });
              broadcast({ type: 'opened_sections_updated', openedSections: [] });

              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                success: true,
                quarterState: nextState,
                requests: [],
                openedSections: []
              }));
            } catch (err) {
              res.statusCode = 500;
              res.end(JSON.stringify({ success: false, error: err.message }));
            }
          });
          return;
        }

        // 1l. POST /api/quarters/reopen (Reopen / Restore an Archived Quarter)
        if (url === '/api/quarters/reopen' && req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', () => {
            try {
              const incoming = JSON.parse(body || '{}');
              const quarterCode = String(incoming.quarterCode || '').trim().toUpperCase();
              const actorEmail = String(incoming.actorEmail || 'imppcabalag@gmail.com').trim();
              const actorName = String(incoming.actorName || 'Program Chair').trim();

              const qState = readJSON(quartersFile, DEFAULT_QUARTER_STATE);
              const archivedList = Array.isArray(qState.archivedQuarters) ? [...qState.archivedQuarters] : [];
              const targetArchived = archivedList.find(
                item => String(item.quarterCode || '').toUpperCase() === quarterCode
              );

              if (!targetArchived) {
                res.statusCode = 404;
                res.end(JSON.stringify({ success: false, error: `Archived quarter ${quarterCode} not found.` }));
                return;
              }

              // Also if there is currently active data that wasn't archived, optionally preserve or let user know
              const restoredRequests = Array.isArray(targetArchived.requests) ? targetArchived.requests : [];
              const restoredOpened = Array.isArray(targetArchived.openedSections) ? targetArchived.openedSections : [];

              writeJSON(requestsFile, restoredRequests);
              writeJSON(openedSectionsFile, restoredOpened);

              const nextState = {
                ...qState,
                currentQuarter: quarterCode,
                isQuarterOpen: true,
                updatedAt: new Date().toISOString(),
                updatedBy: actorEmail,
                updatedByName: actorName
              };
              writeJSON(quartersFile, nextState);

              broadcast({ type: 'quarter_updated', quarterState: nextState });
              broadcast({ type: 'requests_updated', requests: restoredRequests });
              broadcast({ type: 'opened_sections_updated', openedSections: restoredOpened });

              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                success: true,
                quarterState: nextState,
                requests: restoredRequests,
                openedSections: restoredOpened
              }));
            } catch (err) {
              res.statusCode = 500;
              res.end(JSON.stringify({ success: false, error: err.message }));
            }
          });
          return;
        }

        // 1m. DELETE /api/quarters/archive (Delete an Entire Archived Quarter Record)
        if (url === '/api/quarters/archive' && req.method === 'DELETE') {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', () => {
            try {
              const incoming = JSON.parse(body || '{}');
              const quarterCode = String(incoming.quarterCode || '').trim().toUpperCase();
              const quarterId = String(incoming.quarterId || '').trim();
              const actorEmail = String(incoming.actorEmail || 'imppcabalag@gmail.com').trim();
              const actorName = String(incoming.actorName || 'Program Chair').trim();

              const qState = readJSON(quartersFile, DEFAULT_QUARTER_STATE);
              const archivedList = Array.isArray(qState.archivedQuarters) ? [...qState.archivedQuarters] : [];

              const remaining = archivedList.filter(item => {
                if (quarterId && item.id === quarterId) return false;
                if (quarterCode && String(item.quarterCode || '').toUpperCase() === quarterCode) return false;
                return true;
              });

              const nextState = {
                ...qState,
                archivedQuarters: remaining,
                updatedAt: new Date().toISOString(),
                updatedBy: actorEmail,
                updatedByName: actorName
              };

              writeJSON(quartersFile, nextState);
              broadcast({ type: 'quarter_updated', quarterState: nextState });

              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true, quarterState: nextState }));
            } catch (err) {
              res.statusCode = 500;
              res.end(JSON.stringify({ success: false, error: err.message }));
            }
          });
          return;
        }

        // 1n. DELETE /api/quarters/archive/record (Delete an individual student record within an archived quarter)
        if (url === '/api/quarters/archive/record' && req.method === 'DELETE') {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', () => {
            try {
              const incoming = JSON.parse(body || '{}');
              const quarterCode = String(incoming.quarterCode || '').trim().toUpperCase();
              const requestId = String(incoming.requestId || '').trim();
              const actorEmail = String(incoming.actorEmail || 'imppcabalag@gmail.com').trim();
              const actorName = String(incoming.actorName || 'Program Chair').trim();

              const qState = readJSON(quartersFile, DEFAULT_QUARTER_STATE);
              const archivedList = Array.isArray(qState.archivedQuarters) ? [...qState.archivedQuarters] : [];

              const updatedArchived = archivedList.map(arch => {
                if (String(arch.quarterCode || '').toUpperCase() !== quarterCode) return arch;
                const reqs = Array.isArray(arch.requests) ? arch.requests : [];
                const filteredReqs = reqs.filter(r => String(r.id || r.requestId || '') !== requestId);
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

              writeJSON(quartersFile, nextState);
              broadcast({ type: 'quarter_updated', quarterState: nextState });

              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true, quarterState: nextState }));
            } catch (err) {
              res.statusCode = 500;
              res.end(JSON.stringify({ success: false, error: err.message }));
            }
          });
          return;
        }

        // 1. GET /api/requests
        if (url === '/api/requests' && req.method === 'GET') {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(readJSON(requestsFile, [])));
          return;
        }

        // 1b. GET /api/courses (Custom / Auto-Cataloged Courses)
        if (url === '/api/courses' && req.method === 'GET') {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(readJSON(coursesFile, [])));
          return;
        }

        // 1c. POST /api/courses (Add Custom or Student Auto-Cataloged Course)
        if (url === '/api/courses' && req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', () => {
            try {
              const incoming = JSON.parse(body);
              const cleanCode = String(incoming.code || '').trim().toUpperCase();
              const cleanTitle = String(incoming.title || '').trim();
              if (!cleanCode || !cleanTitle) {
                res.statusCode = 400;
                res.end(JSON.stringify({ success: false, error: 'Course code and title are required.' }));
                return;
              }
              const courses = readJSON(coursesFile, []);
              const normTarget = cleanCode.replace(/[^A-Z0-9]/g, '');
              const existing = courses.find(c => String(c.code || '').toUpperCase().replace(/[^A-Z0-9]/g, '') === normTarget);
              if (existing) {
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: true, course: existing, alreadyExisted: true }));
                return;
              }
              const newCourse = {
                id: incoming.id || `auto_${Date.now()}`,
                raw: `${cleanCode} ${cleanTitle}`,
                code: cleanCode,
                title: cleanTitle,
                dept: incoming.dept || 'IT',
                units: incoming.units || 3,
                hasLab: Boolean(incoming.hasLab),
                isCustom: true,
                isAutoCataloged: Boolean(incoming.isAutoCataloged),
                addedByStudent: incoming.addedByStudent || null,
                createdAt: incoming.createdAt || new Date().toISOString()
              };
              courses.push(newCourse);
              writeJSON(coursesFile, courses);
              broadcast({ type: 'courses_updated', courses });

              res.statusCode = 201;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true, course: newCourse }));
            } catch (err) {
              res.statusCode = 500;
              res.end(JSON.stringify({ success: false, error: err.message }));
            }
          });
          return;
        }

        // 1d. GET /api/opened-sections
        if (url === '/api/opened-sections' && req.method === 'GET') {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(readJSON(openedSectionsFile, [])));
          return;
        }

        // 1e. POST /api/opened-sections (Open a course section OR mark For Consultation)
        if (url === '/api/opened-sections' && req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', () => {
            try {
              const incoming = JSON.parse(body);
              const cleanCode = String(incoming.code || '').trim().toUpperCase();
              const actionType = incoming.actionType === 'CONSULTATION' ? 'CONSULTATION' : 'OPEN';
              if (!cleanCode) {
                res.statusCode = 400;
                res.end(JSON.stringify({ success: false, error: 'Course code is required.' }));
                return;
              }
              const opened = readJSON(openedSectionsFile, []);
              const existingIdx = opened.findIndex(s => String(s.code || '').toUpperCase() === cleanCode);
              const entry = {
                code: cleanCode,
                title: String(incoming.title || '').trim(),
                dept: incoming.dept || 'SOIT',
                units: incoming.units || 3,
                actionType,
                openedBy: incoming.openedBy || 'Program Chair',
                openedAt: new Date().toISOString()
              };
              if (existingIdx === -1) {
                opened.push(entry);
              } else {
                opened[existingIdx] = entry;
              }
              writeJSON(openedSectionsFile, opened);

              const targetStatus = actionType === 'CONSULTATION' ? 'For Consultation' : 'Section Opened';
              const requests = readJSON(requestsFile, []);
              const updatedRequests = requests.map(r =>
                String(r.courseCode || '').toUpperCase() === cleanCode
                  ? { ...r, status: targetStatus }
                  : r
              );
              writeJSON(requestsFile, updatedRequests);

              broadcast({ type: 'opened_sections_updated', openedSections: opened });
              broadcast({ type: 'requests_updated', requests: updatedRequests });

              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true, openedSections: opened }));
            } catch (err) {
              res.statusCode = 500;
              res.end(JSON.stringify({ success: false, error: err.message }));
            }
          });
          return;
        }

        // 1g. GET /api/consultations
        if (url === '/api/consultations' && req.method === 'GET') {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(readJSON(consultationsFile, {})));
          return;
        }

        // 1h. PUT /api/consultations
        if (url === '/api/consultations' && req.method === 'PUT') {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', () => {
            try {
              const { email, profile } = JSON.parse(body);
              const norm = String(email || '').trim().toLowerCase();
              const current = readJSON(consultationsFile, {});
              current[norm] = profile;
              writeJSON(consultationsFile, current);
              broadcast({ type: 'consultations_updated', consultations: current });
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true, consultations: current }));
            } catch (err) {
              res.statusCode = 500;
              res.end(JSON.stringify({ success: false, error: err.message }));
            }
          });
          return;
        }

        // 1f. DELETE /api/opened-sections/:code (Close an opened section & hide from students)
        if (url?.startsWith('/api/opened-sections/') && req.method === 'DELETE') {
          const targetCode = decodeURIComponent(url.replace('/api/opened-sections/', '').trim()).toUpperCase();
          let opened = readJSON(openedSectionsFile, []);
          opened = opened.filter(s => String(s.code || '').toUpperCase() !== targetCode);
          writeJSON(openedSectionsFile, opened);

          // Revert matching student requests from "Section Opened" to "Threshold Met"
          const requests = readJSON(requestsFile, []);
          const updatedRequests = requests.map(r =>
            String(r.courseCode || '').toUpperCase() === targetCode && (r.status === 'Section Opened' || r.status === 'For Consultation')
              ? { ...r, status: 'Threshold Met' }
              : r
          );
          writeJSON(requestsFile, updatedRequests);

          broadcast({ type: 'opened_sections_updated', openedSections: opened });
          broadcast({ type: 'requests_updated', requests: updatedRequests });

          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: true, openedSections: opened }));
          return;
        }

        // 2. POST /api/requests
        if (url === '/api/requests' && req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', () => {
            try {
              const newReq = JSON.parse(body);
              if (!newReq.studentNumber || !newReq.courseCode) {
                res.statusCode = 400;
                res.end(JSON.stringify({ success: false, error: 'Student Number and Course Code required' }));
                return;
              }

              const requests = readJSON(requestsFile, []);
              
              // Prevent exact duplicate request
              const cleanNum = String(newReq.studentNumber).trim();
              const cleanCourse = String(newReq.courseCode).trim().toUpperCase();
              const existing = requests.find(r => 
                String(r.studentNumber).trim() === cleanNum && 
                String(r.courseCode).trim().toUpperCase() === cleanCourse
              );

              if (existing) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ 
                  success: false, 
                  error: `Duplicate request: Student ${cleanNum} has already submitted a request for ${cleanCourse}. You can check or retract your request in the Status Tracker.` 
                }));
                return;
              }

              // If this request carries a newly auto-cataloged course, persist it to courses.json automatically!
              if (newReq.autoCatalogedCourse && newReq.autoCatalogedCourse.code && newReq.autoCatalogedCourse.title) {
                const courses = readJSON(coursesFile, []);
                const normCode = String(newReq.autoCatalogedCourse.code).toUpperCase().replace(/[^A-Z0-9]/g, '');
                if (!courses.some(c => String(c.code || '').toUpperCase().replace(/[^A-Z0-9]/g, '') === normCode)) {
                  courses.push(newReq.autoCatalogedCourse);
                  writeJSON(coursesFile, courses);
                  broadcast({ type: 'courses_updated', courses });
                }
              }

              newReq.id = newReq.id || `SOIT-${Date.now().toString().slice(-6)}`;
              newReq.courseCode = cleanCourse;
              newReq.createdAt = newReq.createdAt || new Date().toISOString();
              newReq.status = newReq.status || 'Pending Review';

              requests.push(newReq);
              writeJSON(requestsFile, requests);
              broadcast({ type: 'requests_updated', requests });

              res.statusCode = 201;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true, request: newReq }));
            } catch (err) {
              res.statusCode = 500;
              res.end(JSON.stringify({ success: false, error: err.message }));
            }
          });
          return;
        }

        // 3. DELETE /api/requests/:id (Enforces Student Ownership or Chair Role)
        if (url?.startsWith('/api/requests/') && req.method === 'DELETE') {
          const reqId = decodeURIComponent(url.replace('/api/requests/', '').trim());
          const actorRole = String(req.headers['x-actor-role'] || '').toLowerCase();
          const actorEmail = String(req.headers['x-actor-email'] || '').toLowerCase();
          const actorStudentNumber = String(req.headers['x-actor-student-number'] || '').trim();

          let requests = readJSON(requestsFile, []);
          const target = requests.find(r => r.id === reqId || r.studentNumber === reqId);

          if (target && actorRole === 'student') {
            const isOwnerByEmail = actorEmail && String(target.email || '').toLowerCase() === actorEmail;
            const isOwnerByNumber = actorStudentNumber && String(target.studentNumber || '').trim() === actorStudentNumber;
            if (!isOwnerByEmail && !isOwnerByNumber) {
              res.statusCode = 403;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                success: false,
                error: 'Access Denied: You can only retract your own course petitions.'
              }));
              return;
            }
          }

          requests = requests.filter(r => r.id !== reqId && r.studentNumber !== reqId);
          writeJSON(requestsFile, requests);
          broadcast({ type: 'requests_updated', requests });
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: true }));
          return;
        }

        // 4. GET /api/export-csv
        if (url === '/api/export-csv' && req.method === 'GET') {
          const requests = readJSON(requestsFile, []);
          const headers = [
            'Reference ID',
            'Student Number',
            'Student Name',
            'MyMapua Email',
            'Program',
            'Overall Units Left',
            'Requested Course Code',
            'Requested Course Title',
            'Catalog Source',
            'Status',
            'Date Submitted'
          ];
          const rows = requests.map(r => [
            `"${r.id || ''}"`,
            `"${r.studentNumber || ''}"`,
            `"${((r.lastName || '') + ', ' + (r.firstName || '')).replace(/"/g, '""')}"`,
            `"${r.email || ''}"`,
            `"${r.program || ''}"`,
            `"${r.unitsLeft || ''}"`,
            `"${r.courseCode || ''}"`,
            `"${(r.courseTitle || '').replace(/"/g, '""')}"`,
            `"${r.isAutoCataloged ? 'Auto-Cataloged (Student Petition)' : 'Official Catalog'}"`,
            `"${r.status || 'Pending'}"`,
            `"${r.createdAt || ''}"`
          ]);
          const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\r\n');
          const filename = `SOIT_Course_Requests_${new Date().toISOString().slice(0, 10)}.csv`;

          res.writeHead(200, {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="${filename}"`,
            'Content-Length': Buffer.byteLength(csvContent, 'utf-8'),
          });
          res.end(csvContent);
          return;
        }

        // 5. GET /api/events (SSE)
        if (url === '/api/events' && req.method === 'GET') {
          res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          });
          res.write(`data: ${JSON.stringify({ 
            type: 'init', 
            requests: readJSON(requestsFile, []),
            courses: readJSON(coursesFile, []),
            openedSections: readJSON(openedSectionsFile, []),
            quarterState: readJSON(quartersFile, DEFAULT_QUARTER_STATE)
          })}\n\n`);
          sseClients.push(res);
          req.on('close', () => {
            sseClients = sseClients.filter(c => c !== res);
          });
          return;
        }

        next();
      });
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [react(), apiDevPlugin()],
  server: {
    port: 5174,
    host: true,
  },
});
