// Student Authentication & Profile Registry Service
// Persists student accounts across Cloud Firestore (soit_students), /api/students, and localStorage
import { getFirebaseDb, doc, getDoc, setDoc, deleteDoc, getDocs, collection } from './firebase';

const STUDENTS_STORAGE_KEY = 'soit_student_accounts_v1';

export function getLocalStudents() {
  try {
    const raw = localStorage.getItem(STUDENTS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter(s => s && typeof s === 'object' && s.email && String(s.email).toLowerCase() !== 'jdelacruz@mymail.mapua.edu.ph');
      }
    }
  } catch (e) {
    console.warn('Error reading student accounts from localStorage:', e);
  }
  return [];
}

export function saveLocalStudents(students) {
  try {
    localStorage.setItem(STUDENTS_STORAGE_KEY, JSON.stringify(students));
  } catch (e) {
    console.warn('Error saving student accounts:', e);
  }
}

// Fetch all students from Cloud Firestore, falling back to /api/students and localStorage
export async function syncStudentsFromServer() {
  let cloudStudents = [];
  try {
    const db = getFirebaseDb();
    if (db) {
      const snap = await getDocs(collection(db, 'soit_students'));
      if (!snap.empty) {
        snap.forEach(docSnap => {
          const data = docSnap.data();
          if (data && data.email) {
            cloudStudents.push(data);
          }
        });
      }
    }
  } catch (e) {
    console.warn('Cloud sync for students failed:', e);
  }

  // Also check /api/students
  let apiStudents = [];
  try {
    const res = await fetch('/api/students');
    if (res.ok) {
      const json = await res.json();
      if (Array.isArray(json)) apiStudents = json;
    }
  } catch (e) {}

  const local = getLocalStudents();

  // Merge: cloud > api > local
  const studentMap = {};
  [...local, ...apiStudents, ...cloudStudents].forEach(s => {
    if (!s || !s.email) return;
    const key = String(s.email).toLowerCase();
    studentMap[key] = { ...(studentMap[key] || {}), ...s };
  });

  const merged = Object.values(studentMap);
  if (merged.length > 0) {
    saveLocalStudents(merged);
  }
  return merged;
}

export function validateStudentRegistration(data) {
  const errors = {};
  const cleanNum = String(data.studentNumber || '').trim();
  const cleanEmail = String(data.email || '').trim().toLowerCase();
  const cleanFirst = String(data.firstName || '').trim();
  const cleanLast = String(data.lastName || '').trim();
  const cleanProg = String(data.program || '').trim();
  const cleanUnits = String(data.unitsLeft ?? '').trim();
  const pass = String(data.password || '');
  const confirmPass = String(data.confirmPassword ?? pass);

  if (!/^\d{10}$/.test(cleanNum)) {
    errors.studentNumber = 'Student Number must be exactly 10 digits (e.g. 2023104521).';
  }
  if (!cleanEmail || !cleanEmail.endsWith('@mymail.mapua.edu.ph')) {
    errors.email = 'Please use your official @mymail.mapua.edu.ph email address.';
  }
  if (!cleanLast || cleanLast.length < 2) {
    errors.lastName = 'Last Name is required.';
  }
  if (!cleanFirst || cleanFirst.length < 2) {
    errors.firstName = 'First Name is required.';
  }
  if (!cleanProg) {
    errors.program = 'Please select your SOIT Degree Program.';
  }
  const unitsNum = Number(cleanUnits);
  if (cleanUnits === '' || isNaN(unitsNum) || unitsNum < 0 || unitsNum > 250) {
    errors.unitsLeft = 'Enter valid remaining units (0 - 250).';
  }
  if (!pass || pass.length < 4) {
    errors.password = 'Password must be at least 4 characters.';
  }
  if (pass !== confirmPass) {
    errors.confirmPassword = 'Passwords do not match.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

export async function registerStudentAccount(data) {
  const validation = validateStudentRegistration(data);
  if (!validation.isValid) {
    const firstErr = Object.values(validation.errors)[0];
    return { success: false, error: firstErr, errors: validation.errors };
  }

  const cleanNum = String(data.studentNumber).trim();
  const cleanEmail = String(data.email).trim().toLowerCase();
  const newStudent = {
    studentNumber: cleanNum,
    email: cleanEmail,
    firstName: String(data.firstName).trim(),
    lastName: String(data.lastName).trim(),
    program: String(data.program).trim(),
    unitsLeft: String(data.unitsLeft).trim(),
    password: String(data.password),
    createdAt: new Date().toISOString()
  };

  // 1. Save to Cloud Firestore
  try {
    const db = getFirebaseDb();
    if (db) {
      await setDoc(doc(db, 'soit_students', cleanEmail), newStudent, { merge: true });
    }
  } catch (err) {
    console.warn('Note: Storing student profile locally (offline / cloud sync delayed):', err);
  }

  // 2. Try server registration
  try {
    await fetch('/api/students/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newStudent)
    }).catch(() => {});
  } catch (e) {}

  // 3. Save to localStorage
  const students = getLocalStudents();
  const updated = [...students.filter(s => String(s?.email || '').toLowerCase() !== cleanEmail && String(s?.studentNumber || '') !== cleanNum), newStudent];
  saveLocalStudents(updated);

  return {
    success: true,
    student: sanitizeStudentSession(newStudent)
  };
}

export async function verifyStudentCredentials(email, password) {
  const cleanEmail = String(email || '').trim().toLowerCase();
  const rawPass = String(password || '');

  if (!cleanEmail || !rawPass) {
    return { success: false, error: 'Please enter both your MyMapúa email and password.' };
  }

  // Try Cloud Firestore first for cross-device authentication
  try {
    const db = getFirebaseDb();
    if (db) {
      const snap = await getDoc(doc(db, 'soit_students', cleanEmail));
      if (snap.exists()) {
        const student = snap.data();
        if (student && String(student.password || '') === rawPass) {
          // Update local cache
          const local = getLocalStudents().filter(s => String(s?.email || '').toLowerCase() !== cleanEmail);
          local.push(student);
          saveLocalStudents(local);
          return { success: true, student: sanitizeStudentSession(student) };
        } else {
          return { success: false, error: 'Incorrect password. Please verify your credentials or reset password.' };
        }
      }
    }
  } catch (err) {
    console.warn('Checking local cache for student login:', err);
  }

  // Fallback to local
  const students = getLocalStudents();
  const match = students.find(s => String(s?.email || '').toLowerCase() === cleanEmail);
  if (!match) {
    return {
      success: false,
      error: 'No student account found for this email. Please Sign Up first to create your Student Profile.'
    };
  }
  if (String(match.password || '') !== rawPass) {
    return {
      success: false,
      error: 'Incorrect password. Please try again or reset your password.'
    };
  }

  return {
    success: true,
    student: sanitizeStudentSession(match)
  };
}

export async function updateStudentProfile(email, updates) {
  const cleanEmail = String(email || '').trim().toLowerCase();

  // 1. Update in Cloud Firestore
  try {
    const db = getFirebaseDb();
    if (db) {
      await setDoc(doc(db, 'soit_students', cleanEmail), updates, { merge: true });
    }
  } catch (err) {
    console.warn('Error syncing profile update to Firestore:', err);
  }

  // 2. Update server
  try {
    fetch('/api/students/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, ...updates })
    }).catch(() => {});
  } catch (e) {}

  // 3. Update localStorage
  const students = getLocalStudents();
  let updatedStudent = null;
  const next = students.map(s => {
    if (String(s?.email || '').toLowerCase() === cleanEmail) {
      updatedStudent = { ...s, ...updates };
      return updatedStudent;
    }
    return s;
  });
  saveLocalStudents(next);

  if (!updatedStudent) {
    return { success: false, error: 'Student profile not found.' };
  }
  return { success: true, student: sanitizeStudentSession(updatedStudent) };
}

export async function resetStudentPassword(email, studentNumber, newPassword) {
  const cleanEmail = String(email || '').trim().toLowerCase();
  const cleanNum = String(studentNumber || '').trim();
  if (!cleanEmail || !cleanNum) {
    return { success: false, error: 'Please provide both your registered MyMapúa Email and 10-digit Student Number.' };
  }
  if (!newPassword || newPassword.length < 4) {
    return { success: false, error: 'New password must be at least 4 characters long.' };
  }

  // 1. Cloud Firestore
  try {
    const db = getFirebaseDb();
    if (db) {
      await setDoc(doc(db, 'soit_students', cleanEmail), { password: newPassword }, { merge: true });
    }
  } catch (err) {}

  // 2. Server
  try {
    fetch('/api/students/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, studentNumber: cleanNum, newPassword })
    }).catch(() => {});
  } catch (e) {}

  // 3. Local
  const students = getLocalStudents();
  const target = students.find(s => String(s?.email || '').toLowerCase() === cleanEmail && String(s?.studentNumber || '') === cleanNum);
  if (target) {
    target.password = newPassword;
    saveLocalStudents(students);
  }
  return { success: true };
}

// Admin-exclusive management operations
export async function adminUpdateStudentAccount(targetEmail, updates) {
  const cleanEmail = String(targetEmail || '').trim().toLowerCase();
  if (!cleanEmail) return { success: false, error: 'Target student email is required.' };

  try {
    const db = getFirebaseDb();
    if (db) {
      await setDoc(doc(db, 'soit_students', cleanEmail), updates, { merge: true });
    }
  } catch (e) {
    console.warn('Firestore update failed, persisting locally:', e);
  }

  const students = getLocalStudents();
  let found = false;
  const next = students.map(s => {
    if (String(s?.email || '').toLowerCase() === cleanEmail) {
      found = true;
      return { ...s, ...updates };
    }
    return s;
  });

  if (!found) {
    next.push({ email: cleanEmail, ...updates });
  }

  saveLocalStudents(next);
  return { success: true, students: next };
}

export async function adminResetStudentPassword(targetEmail, newPassword) {
  const cleanEmail = String(targetEmail || '').trim().toLowerCase();
  if (!cleanEmail) return { success: false, error: 'Target student email is required.' };
  if (!newPassword || newPassword.length < 4) {
    return { success: false, error: 'Password must be at least 4 characters.' };
  }

  try {
    const db = getFirebaseDb();
    if (db) {
      await setDoc(doc(db, 'soit_students', cleanEmail), { password: newPassword }, { merge: true });
    }
  } catch (e) {
    console.warn('Firestore password reset failed, persisting locally:', e);
  }

  const students = getLocalStudents();
  const next = students.map(s => {
    if (String(s?.email || '').toLowerCase() === cleanEmail) {
      return { ...s, password: newPassword };
    }
    return s;
  });
  saveLocalStudents(next);
  return { success: true, message: `Password for ${cleanEmail} updated successfully.` };
}

export async function adminDeleteStudentAccount(targetEmail) {
  const cleanEmail = String(targetEmail || '').trim().toLowerCase();
  if (!cleanEmail) return { success: false, error: 'Target student email is required.' };

  try {
    const db = getFirebaseDb();
    if (db) {
      await deleteDoc(doc(db, 'soit_students', cleanEmail));
    }
  } catch (e) {
    console.warn('Firestore deletion failed:', e);
  }

  const students = getLocalStudents();
  const next = students.filter(s => String(s?.email || '').toLowerCase() !== cleanEmail);
  saveLocalStudents(next);
  return { success: true, students: next, message: `Account for ${cleanEmail} has been deleted.` };
}

export function sanitizeStudentSession(s) {
  return {
    role: 'student',
    studentNumber: s.studentNumber,
    email: s.email,
    firstName: s.firstName,
    lastName: s.lastName,
    program: s.program,
    unitsLeft: String(s.unitsLeft ?? '')
  };
}
