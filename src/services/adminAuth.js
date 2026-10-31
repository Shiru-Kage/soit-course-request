import { getFirebaseDb, doc, getDoc, setDoc } from './firebase';
// SOIT Dynamic Enrollment System - Administrator & Faculty Authentication Service

export const SUPER_ADMIN_EMAIL = 'imppcabalag@gmail.com';

export const INITIAL_ADMIN_EMAILS = [
  'imppcabalag@gmail.com',
  'jpqtomas@mapua.edu.ph',
  'mjcsamonte@mapua.edu.ph',
  'rmdadigan@mapua.edu.ph',
  'capascua@mapua.edu.ph',
  'gldintal@mapua.edu.ph'
];

export const DEFAULT_ADMIN_PASSWORD = '1234';

// Fixed department mapping for the 5 SOIT Program Chairs + Super Admin
export const FIXED_ADMIN_DEPARTMENTS = {
  'jpqtomas@mapua.edu.ph': 'CS',
  'mjcsamonte@mapua.edu.ph': 'IT',
  'rmdadigan@mapua.edu.ph': 'DS',
  'capascua@mapua.edu.ph': 'EMC',
  'gldintal@mapua.edu.ph': 'IS',
  'imppcabalag@gmail.com': 'SOIT'
};

export const DEFAULT_CHAIR_CONSULTATIONS = {
  'jpqtomas@mapua.edu.ph': {
    email: 'jpqtomas@mapua.edu.ph',
    displayEmail: 'JPQTomas@mapua.edu.ph',
    name: 'Sir JP',
    dept: 'CS',
    programTitle: 'Computer Science (CS)',
    slots: [
      { day: 'Monday', startTime: '09:00 AM', endTime: '12:00 PM' },
      { day: 'Wednesday', startTime: '01:00 PM', endTime: '04:00 PM' }
    ]
  },
  'mjcsamonte@mapua.edu.ph': {
    email: 'mjcsamonte@mapua.edu.ph',
    displayEmail: 'mjcsamonte@mapua.edu.ph',
    name: "Ma'am Samonte",
    dept: 'IT',
    programTitle: 'Information Technology (IT)',
    slots: [
      { day: 'Tuesday', startTime: '09:00 AM', endTime: '12:00 PM' },
      { day: 'Thursday', startTime: '01:00 PM', endTime: '04:00 PM' }
    ]
  },
  'rmdadigan@mapua.edu.ph': {
    email: 'rmdadigan@mapua.edu.ph',
    displayEmail: 'rmdadigan@mapua.edu.ph',
    name: 'Sir Dadigan',
    dept: 'DS',
    programTitle: 'Data Science (DS)',
    slots: [
      { day: 'Monday', startTime: '01:00 PM', endTime: '04:00 PM' },
      { day: 'Friday', startTime: '09:00 AM', endTime: '12:00 PM' }
    ]
  },
  'capascua@mapua.edu.ph': {
    email: 'capascua@mapua.edu.ph',
    displayEmail: 'capascua@mapua.edu.ph',
    name: "Ma'am Pascua",
    dept: 'EMC',
    programTitle: 'Entertainment & Multimedia Computing (EMC)',
    slots: [
      { day: 'Tuesday', startTime: '01:00 PM', endTime: '04:00 PM' },
      { day: 'Friday', startTime: '01:00 PM', endTime: '04:00 PM' }
    ]
  },
  'gldintal@mapua.edu.ph': {
    email: 'gldintal@mapua.edu.ph',
    displayEmail: 'gldintal@mapua.edu.ph',
    name: "Ma'am Intal",
    dept: 'IS',
    programTitle: 'Information Systems (IS)',
    slots: [
      { day: 'Wednesday', startTime: '09:00 AM', endTime: '12:00 PM' },
      { day: 'Thursday', startTime: '09:00 AM', endTime: '12:00 PM' }
    ]
  },
  'imppcabalag@gmail.com': {
    email: 'imppcabalag@gmail.com',
    displayEmail: 'imppcabalag@gmail.com',
    name: 'SOIT System Administrator',
    dept: 'SOIT',
    programTitle: 'SOIT General Administration (All Courses)',
    slots: [
      { day: 'Tuesday', startTime: '10:00 AM', endTime: '12:00 PM' },
      { day: 'Friday', startTime: '02:00 PM', endTime: '04:00 PM' }
    ]
  }
};

const STORAGE_ADMIN_EMAILS_KEY = 'soit_allowed_admin_emails_v3';
const STORAGE_ADMIN_PASSWORDS_KEY = 'soit_admin_passwords';
const STORAGE_ADMIN_RESET_CODES_KEY = 'soit_admin_reset_codes';
const STORAGE_CONSULTATIONS_KEY = 'soit_admin_consultations_v2';

export function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

export function isSuperAdmin(email) {
  return normalizeEmail(email) === SUPER_ADMIN_EMAIL;
}

export function inferCourseDepartment(courseOrCode) {
  if (!courseOrCode) return 'CS';
  if (typeof courseOrCode === 'object') {
    const explicitDept = String(courseOrCode.dept || '').trim().toUpperCase();
    if (['CS', 'IT', 'DS', 'EMC', 'IS', 'MATH'].includes(explicitDept)) {
      return explicitDept;
    }
    const codeStr = String(courseOrCode.code || courseOrCode.courseCode || '').trim().toUpperCase();
    return inferCourseDepartment(codeStr);
  }
  const code = String(courseOrCode).trim().toUpperCase();
  if (code.startsWith('CSS')) return 'CS';
  if (code.startsWith('ITS')) return 'IT';
  if (code.startsWith('DSS')) return 'DS';
  if (code.startsWith('ECS') || code.startsWith('EMC')) return 'EMC';
  if (code.startsWith('ISS')) return 'IS';
  if (code.startsWith('MATH')) return 'MATH';
  return 'CS';
}

export function canAdminManageCourse(adminEmail, courseOrCode, consultationsMap = null) {
  const norm = normalizeEmail(adminEmail);
  if (!norm) return false;
  // imppcabalag@gmail.com (SOIT General Administration) can edit all courses & settings
  if (isSuperAdmin(norm)) return true;

  const profile = getConsultationProfileForEmail(norm, consultationsMap);
  const adminDept = String(FIXED_ADMIN_DEPARTMENTS[norm] || profile?.dept || '').toUpperCase();
  const courseDept = inferCourseDepartment(courseOrCode);

  return Boolean(adminDept && adminDept === courseDept);
}

export function getAllowedAdminEmails() {
  const defaults = INITIAL_ADMIN_EMAILS.map(normalizeEmail);
  try {
    const raw = localStorage.getItem(STORAGE_ADMIN_EMAILS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const merged = Array.from(new Set([...defaults, ...parsed.map(normalizeEmail)]));
        return merged;
      }
    }
  } catch (e) {
    console.warn('Error reading admin emails from storage:', e);
  }

  saveAllowedAdminEmails(defaults);
  return defaults;
}

export function saveAllowedAdminEmails(emails) {
  try {
    const clean = Array.from(new Set(emails.map(normalizeEmail).filter(Boolean)));
    localStorage.setItem(STORAGE_ADMIN_EMAILS_KEY, JSON.stringify(clean));
    return clean;
  } catch (e) {
    console.error('Error saving admin emails to storage:', e);
    return emails;
  }
}

export function isAllowedAdminEmail(email) {
  const norm = normalizeEmail(email);
  if (!norm) return false;
  const list = getAllowedAdminEmails();
  return list.includes(norm);
}

export const CLUSTER_PROGRAM_LABELS = {
  CS: 'Computer Science (CS)',
  IT: 'Information Technology (IT)',
  DS: 'Data Science (DS)',
  EMC: 'Entertainment & Multimedia (EMC)',
  IS: 'Information Systems (IS)',
  SOIT: 'SOIT General Administration (All Courses)'
};

export function isLeadProgramChair(email) {
  const norm = normalizeEmail(email);
  return Boolean(FIXED_ADMIN_DEPARTMENTS[norm]);
}

export function canManageClusterMember(actorEmail, targetEmail, consultationsMap = null) {
  const actorNorm = normalizeEmail(actorEmail);
  const targetNorm = normalizeEmail(targetEmail);
  if (!actorNorm || !targetNorm) return false;
  if (actorNorm === targetNorm) return false; // cannot remove/reassign own active session here
  if (isSuperAdmin(actorNorm)) return true; // imppcabalag@gmail.com can manage all clusters

  // Lead Program Chairs cannot be removed or reassigned by another Chair
  if (isLeadProgramChair(targetNorm)) return false;

  const actorProfile = getConsultationProfileForEmail(actorNorm, consultationsMap);
  const targetProfile = getConsultationProfileForEmail(targetNorm, consultationsMap);
  const actorDept = String(FIXED_ADMIN_DEPARTMENTS[actorNorm] || actorProfile?.dept || 'CS').toUpperCase();
  const targetDept = String(FIXED_ADMIN_DEPARTMENTS[targetNorm] || targetProfile?.dept || 'CS').toUpperCase();

  return actorDept === targetDept;
}

export function addAdminEmail(newEmail, assignedDept = 'CS', facultyName = '', authorizedBy = '') {
  const norm = normalizeEmail(newEmail);
  if (!norm) {
    return { success: false, error: 'Please enter a valid email address.' };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(norm)) {
    return { success: false, error: 'Please enter a valid email format (e.g. faculty@mapua.edu.ph).' };
  }

  const current = getAllowedAdminEmails();
  if (current.includes(norm)) {
    return { success: false, error: `Email "${newEmail}" is already an authorized administrator.` };
  }

  const cleanDept = ['CS', 'IT', 'DS', 'EMC', 'IS'].includes(String(assignedDept || '').toUpperCase())
    ? String(assignedDept).toUpperCase()
    : 'CS';

  const cleanName = String(facultyName || '').trim() || norm.split('@')[0];
  const profile = {
    email: norm,
    displayEmail: String(newEmail).trim(),
    name: cleanName,
    dept: cleanDept,
    programTitle: CLUSTER_PROGRAM_LABELS[cleanDept] || `${cleanDept} Cluster`,
    roleType: 'Cluster Faculty',
    authorizedBy: normalizeEmail(authorizedBy) || 'Program Chair',
    createdAt: new Date().toISOString(),
    slots: [
      { day: 'Monday', startTime: '09:00 AM', endTime: '12:00 PM' }
    ]
  };

  const updated = [...current, norm];
  saveAllowedAdminEmails(updated);

  // Save cluster assignment immediately in consultation profiles
  const currentMap = getLocalConsultations();
  const nextMap = { ...currentMap, [norm]: profile };
  saveLocalConsultations(nextMap);

  try {
    fetch('/api/consultations', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: norm, profile })
    }).catch(() => {});
  } catch (e) {}

  return {
    success: true,
    emails: updated,
    profile,
    consultations: nextMap,
    message: `Successfully authorized "${newEmail}" under the ${cleanDept} (${CLUSTER_PROGRAM_LABELS[cleanDept]}) cluster.`
  };
}

export async function updateAdminClusterAssignment(targetEmail, newDept, updatedName = null) {
  const norm = normalizeEmail(targetEmail);
  if (!norm) return { success: false, error: 'Invalid administrator email.' };
  const cleanDept = ['CS', 'IT', 'DS', 'EMC', 'IS'].includes(String(newDept || '').toUpperCase())
    ? String(newDept).toUpperCase()
    : 'CS';

  const currentMap = getLocalConsultations();
  const existing = getConsultationProfileForEmail(norm, currentMap);
  const nextProfile = {
    ...existing,
    dept: FIXED_ADMIN_DEPARTMENTS[norm] || cleanDept,
    programTitle: CLUSTER_PROGRAM_LABELS[FIXED_ADMIN_DEPARTMENTS[norm] || cleanDept],
    name: updatedName !== null && String(updatedName).trim() ? String(updatedName).trim() : existing.name
  };

  const updatedConsultations = await saveAdminConsultationProfile(norm, nextProfile);
  return {
    success: true,
    consultations: updatedConsultations,
    profile: nextProfile,
    message: `Updated ${existing.displayEmail || norm} to the ${nextProfile.dept} cluster.`
  };
}

export function removeAdminEmail(emailToRemove) {
  const norm = normalizeEmail(emailToRemove);
  const current = getAllowedAdminEmails();

  if (current.length <= 1) {
    return { success: false, error: 'Cannot remove the last remaining administrator account.' };
  }

  if (isSuperAdmin(norm)) {
    return { success: false, error: 'The primary SOIT General Administration account cannot be removed.' };
  }

  const updated = current.filter(e => e !== norm);
  saveAllowedAdminEmails(updated);
  return { success: true, emails: updated, message: `Removed "${emailToRemove}" from cluster & admin privileges.` };
}

function getStoredPasswords() {
  try {
    const raw = localStorage.getItem(STORAGE_ADMIN_PASSWORDS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Error reading admin passwords:', e);
  }
  return {};
}

function saveStoredPassword(email, newPassword) {
  const norm = normalizeEmail(email);
  const passwords = getStoredPasswords();
  passwords[norm] = newPassword;
  try {
    localStorage.setItem(STORAGE_ADMIN_PASSWORDS_KEY, JSON.stringify(passwords));
  } catch (e) {
    console.error('Error saving admin password:', e);
  }
}

export async function verifyAdminCredentials(email, password) {
  const norm = normalizeEmail(email);
  if (!norm) {
    return { success: false, error: 'Please enter your administrator email.' };
  }

  if (!isAllowedAdminEmail(norm)) {
    return { 
      success: false, 
      error: `Access Denied: "${email}" is not an authorized Program Chair or Faculty administrator.` 
    };
  }

  const inputPass = String(password || '').trim();
  if (!inputPass) {
    return { success: false, error: 'Please enter your password.' };
  }

  // 1. Check Cloud Firestore for latest cloud-synchronized password
  let cloudPass = null;
  try {
    const db = getFirebaseDb();
    if (db) {
      const snap = await getDoc(doc(db, 'settings', 'chair_auth'));
      if (snap.exists()) {
        const data = snap.data();
        if (data && data.passwords && data.passwords[norm]) {
          cloudPass = data.passwords[norm];
          saveStoredPassword(norm, cloudPass);
        }
      }
    }
  } catch (err) {
    console.warn('Note: Checking local cache for chair password (offline / fallback mode):', err);
  }

  const passwords = getStoredPasswords();
  const expected = cloudPass || passwords[norm] || DEFAULT_ADMIN_PASSWORD;

  if (inputPass === expected) {
    return { success: true, email: norm };
  }

  return { 
    success: false, 
    error: 'Incorrect password. Please verify your credentials or use Forgot Password.' 
  };
}

export async function changeCurrentAdminPassword(email, currentPassword, newPassword) {
  const verify = await verifyAdminCredentials(email, currentPassword);
  if (!verify.success) {
    return { success: false, error: 'Current password verification failed.' };
  }

  const cleanNew = String(newPassword || '').trim();
  if (!cleanNew || cleanNew.length < 4) {
    return { success: false, error: 'New password must be at least 4 characters long.' };
  }

  return resetAdminPassword(email, cleanNew);
}

export async function resetAdminPassword(email, newPassword) {
  const norm = normalizeEmail(email);
  if (!isAllowedAdminEmail(norm)) {
    return { success: false, error: `Email "${email}" is not authorized for password reset.` };
  }

  const cleanPass = String(newPassword || '').trim();
  if (!cleanPass || cleanPass.length < 4) {
    return { success: false, error: 'New password must be at least 4 characters long.' };
  }

  // 1. Save locally
  saveStoredPassword(norm, cleanPass);

  // 2. Synchronize to Cloud Firestore
  try {
    const db = getFirebaseDb();
    if (db) {
      const passRef = doc(db, 'settings', 'chair_auth');
      const snap = await getDoc(passRef);
      const existingData = snap.exists() ? snap.data() : { passwords: {} };
      const updatedPasswords = {
        ...(existingData.passwords || {}),
        [norm]: cleanPass
      };
      await setDoc(passRef, {
        passwords: updatedPasswords,
        lastUpdated: new Date().toISOString(),
        updatedBy: norm
      }, { merge: true });
    }
  } catch (err) {
    console.warn('Note: Could not sync updated chair password to Firestore:', err);
  }

  return { success: true, message: 'Password reset successful! You may now sign in with your new password.' };
}

export async function sendPasswordResetCode(email) {
  const norm = normalizeEmail(email);
  if (!isAllowedAdminEmail(norm)) {
    return { 
      success: false, 
      error: `"${email}" is not found in authorized administrator accounts.` 
    };
  }

  // 6-digit numeric verification code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 15 * 60 * 1000; // 15 mins validity

  // 1. Save in local storage
  try {
    const existing = JSON.parse(localStorage.getItem(STORAGE_ADMIN_RESET_CODES_KEY) || '{}');
    existing[norm] = { code, expiresAt };
    localStorage.setItem(STORAGE_ADMIN_RESET_CODES_KEY, JSON.stringify(existing));
  } catch (e) {
    console.warn('Error saving reset code locally:', e);
  }

  // 2. Synchronize reset code to Cloud Firestore
  try {
    const db = getFirebaseDb();
    if (db) {
      const resetRef = doc(db, 'settings', 'chair_reset_codes');
      const snap = await getDoc(resetRef);
      const existingCodes = snap.exists() ? snap.data() : {};
      const safeKey = norm.replace(/[^a-zA-Z0-9]/g, '_');
      await setDoc(resetRef, {
        ...existingCodes,
        [safeKey]: { code, expiresAt, email: norm, requestedAt: new Date().toISOString() }
      }, { merge: true });
    }
  } catch (e) {
    console.warn('Error syncing reset code to Firestore:', e);
  }

  // 3. Dispatch actual email notification via ShipMyForm and FormSubmit
  const timestamp = new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' });
  const payload = {
    _subject: `[Mapúa SOIT Course Request] Program Chair Password Reset Code: ${code}`,
    "Recipient": norm,
    "Verification Code": code,
    "Purpose": "SOIT Course Request - Program Chair / Faculty Password Recovery",
    "Expiration": "15 Minutes",
    "Requested At": `${timestamp} (PHT)`,
    "Security Note": "If you did not initiate this password reset, your account credentials remain unchanged."
  };

  try {
    await fetch(`https://shipmyform.com/to/${encodeURIComponent(norm)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (e) {
    console.warn('ShipMyForm reset email dispatch error, trying FormSubmit:', e);
  }

  try {
    await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(norm)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        ...payload,
        _template: 'box',
        _captcha: 'false',
        _replyto: 'noreply-soit@mapua.edu.ph'
      })
    });
  } catch (e) {
    console.warn('FormSubmit reset email dispatch warning:', e);
  }

  return {
    success: true,
    code, // Provided for instant convenience
    message: `Verification code sent to ${norm}. Please check your inbox or spam folder.`
  };
}

export async function verifyResetCode(email, inputCode) {
  const norm = normalizeEmail(email);
  const cleanCode = String(inputCode || '').trim();

  // 1. Check local storage
  try {
    const existing = JSON.parse(localStorage.getItem(STORAGE_ADMIN_RESET_CODES_KEY) || '{}');
    const record = existing[norm];
    if (record) {
      if (Date.now() <= record.expiresAt && String(record.code).trim() === cleanCode) {
        return { success: true };
      }
    }
  } catch (e) {}

  // 2. Check Cloud Firestore for cross-device verification
  try {
    const db = getFirebaseDb();
    if (db) {
      const snap = await getDoc(doc(db, 'settings', 'chair_reset_codes'));
      if (snap.exists()) {
        const data = snap.data();
        const safeKey = norm.replace(/[^a-zA-Z0-9]/g, '_');
        const record = data[safeKey] || data[norm];
        if (record && Date.now() <= record.expiresAt && String(record.code).trim() === cleanCode) {
          return { success: true };
        }
      }
    }
  } catch (e) {}

  return { success: false, error: 'Incorrect or expired verification code. Please check your email and try again.' };
}

/**
 * Per-Administrator Consultation Schedule Helpers
 */
function sanitizeConsultationsMap(rawMap) {
  const merged = { ...DEFAULT_CHAIR_CONSULTATIONS, ...(rawMap || {}) };
  const result = {};
  for (const [k, val] of Object.entries(merged)) {
    const norm = normalizeEmail(k);
    if (!val || typeof val !== 'object') continue;
    const fixedDept = FIXED_ADMIN_DEPARTMENTS[norm];
    // Only imppcabalag@gmail.com may hold the 'SOIT' General Administration role
    let dept = fixedDept || String(val.dept || 'CS').toUpperCase();
    if (dept === 'SOIT' && !isSuperAdmin(norm)) {
      dept = 'CS';
    }
    result[norm] = {
      ...val,
      email: norm,
      dept
    };
  }
  return result;
}

export function getLocalConsultations() {
  try {
    const raw = localStorage.getItem(STORAGE_CONSULTATIONS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return sanitizeConsultationsMap(parsed);
      }
    }
  } catch (e) {}
  return sanitizeConsultationsMap(DEFAULT_CHAIR_CONSULTATIONS);
}

export function saveLocalConsultations(map) {
  try {
    const clean = sanitizeConsultationsMap(map);
    localStorage.setItem(STORAGE_CONSULTATIONS_KEY, JSON.stringify(clean));
  } catch (e) {}
}

export async function fetchAdminConsultations() {
  const local = getLocalConsultations();
  try {
    const res = await fetch('/api/consultations');
    if (res.ok) {
      const data = await res.json();
      if (data && typeof data === 'object') {
        const merged = sanitizeConsultationsMap({ ...local, ...data });
        saveLocalConsultations(merged);
        return merged;
      }
    }
  } catch (e) {}
  return local;
}

export function getConsultationProfileForEmail(email, consultationsMap = null) {
  const norm = normalizeEmail(email);
  const map = sanitizeConsultationsMap(consultationsMap || getLocalConsultations());
  if (map[norm]) return map[norm];
  return {
    email: norm,
    displayEmail: email || norm,
    name: norm.split('@')[0],
    dept: isSuperAdmin(norm) ? 'SOIT' : 'CS',
    programTitle: isSuperAdmin(norm) ? 'SOIT General Administration (All Courses)' : 'Computer Science (CS)',
    slots: [
      { day: 'Monday', startTime: '09:00 AM', endTime: '12:00 PM' }
    ]
  };
}

export async function saveAdminConsultationProfile(email, profileUpdates) {
  const norm = normalizeEmail(email);
  const currentMap = getLocalConsultations();
  const existing = getConsultationProfileForEmail(norm, currentMap);

  const fixedDept = FIXED_ADMIN_DEPARTMENTS[norm];
  let nextDept = fixedDept || String(profileUpdates?.dept || existing.dept || 'CS').toUpperCase();
  if (nextDept === 'SOIT' && !isSuperAdmin(norm)) {
    nextDept = 'CS';
  }

  const updatedProfile = {
    ...existing,
    ...profileUpdates,
    dept: nextDept,
    email: norm,
    updatedAt: new Date().toISOString()
  };
  const nextMap = sanitizeConsultationsMap({
    ...currentMap,
    [norm]: updatedProfile
  });
  saveLocalConsultations(nextMap);

  try {
    const res = await fetch('/api/consultations', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: norm, profile: updatedProfile })
    });
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.consultations) {
        const synced = sanitizeConsultationsMap(json.consultations);
        saveLocalConsultations(synced);
        return synced;
      }
    }
  } catch (e) {}

  return nextMap;
}
