// Student Authentication & Profile Registry Service
// Persists student accounts in both /api/students (data/students.json) and localStorage

const STUDENTS_STORAGE_KEY = 'soit_student_accounts_v1';

export function getLocalStudents() {
  try {
    const raw = localStorage.getItem(STUDENTS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter(s => String(s.email || '').toLowerCase() !== 'jdelacruz@mymail.mapua.edu.ph');
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

export async function syncStudentsFromServer() {
  try {
    const res = await fetch('/api/students');
    if (res.ok) {
      const serverStudents = await res.json();
      if (Array.isArray(serverStudents) && serverStudents.length > 0) {
        saveLocalStudents(serverStudents);
        return serverStudents;
      }
    }
  } catch (e) {
    // Fallback to local
  }
  return getLocalStudents();
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

  // Try server registration first
  try {
    const res = await fetch('/api/students/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newStudent)
    });
    const payload = await res.json();
    if (!res.ok || !payload.success) {
      return {
        success: false,
        error: payload.error || 'Could not register student account.'
      };
    }
    const students = getLocalStudents();
    const updated = [...students.filter(s => s.email.toLowerCase() !== cleanEmail && s.studentNumber !== cleanNum), payload.student];
    saveLocalStudents(updated);
    return {
      success: true,
      student: sanitizeStudentSession(payload.student)
    };
  } catch (e) {
    // Offline / localStorage fallback
    const students = getLocalStudents();
    if (students.some(s => s.email.toLowerCase() === cleanEmail)) {
      return { success: false, error: 'An account with this MyMapúa email already exists. Please sign in.' };
    }
    if (students.some(s => s.studentNumber === cleanNum)) {
      return { success: false, error: 'An account with this 10-digit Student Number already exists. Please sign in.' };
    }
    students.push(newStudent);
    saveLocalStudents(students);
    return {
      success: true,
      student: sanitizeStudentSession(newStudent)
    };
  }
}

export async function verifyStudentCredentials(email, password) {
  const cleanEmail = String(email || '').trim().toLowerCase();
  const rawPass = String(password || '');

  if (!cleanEmail || !rawPass) {
    return { success: false, error: 'Please enter both your MyMapúa email and password.' };
  }

  try {
    const res = await fetch('/api/students/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, password: rawPass })
    });
    const payload = await res.json();
    if (res.ok && payload.success) {
      return {
        success: true,
        student: sanitizeStudentSession(payload.student)
      };
    }
    if (res.status === 401 || res.status === 404) {
      return {
        success: false,
        error: payload.error || 'Invalid MyMapúa email or password.'
      };
    }
  } catch (e) {
    // Fallback to local
  }

  const students = getLocalStudents();
  const match = students.find(s => s.email.toLowerCase() === cleanEmail);
  if (!match) {
    return {
      success: false,
      error: 'No student account found for this email. Please Sign Up first to create your Student Profile.'
    };
  }
  if (match.password !== rawPass) {
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
  try {
    const res = await fetch('/api/students/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, ...updates })
    });
    const payload = await res.json();
    if (res.ok && payload.success) {
      const students = getLocalStudents().map(s =>
        s.email.toLowerCase() === cleanEmail ? { ...s, ...payload.student } : s
      );
      saveLocalStudents(students);
      return { success: true, student: sanitizeStudentSession(payload.student) };
    }
  } catch (e) {
    // Fallback to local
  }

  const students = getLocalStudents();
  let updatedStudent = null;
  const next = students.map(s => {
    if (s.email.toLowerCase() === cleanEmail) {
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

  try {
    const res = await fetch('/api/students/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, studentNumber: cleanNum, newPassword })
    });
    const payload = await res.json();
    if (res.ok && payload.success) {
      const students = getLocalStudents().map(s =>
        s.email.toLowerCase() === cleanEmail ? { ...s, password: newPassword } : s
      );
      saveLocalStudents(students);
      return { success: true };
    } else if (payload.error) {
      return { success: false, error: payload.error };
    }
  } catch (e) {
    // Fallback to local
  }

  const students = getLocalStudents();
  const target = students.find(s => s.email.toLowerCase() === cleanEmail && s.studentNumber === cleanNum);
  if (!target) {
    return { success: false, error: 'No matching account found with that Email and Student Number combination.' };
  }
  target.password = newPassword;
  saveLocalStudents(students);
  return { success: true };
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
