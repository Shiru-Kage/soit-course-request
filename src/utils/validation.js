// Validation logic adhering strictly to the Microsoft Form constraints
// + Automated Unlisted Course Parser & Gatekeeper (replacing manual Admin form updates)

const EXCLUDED_PREFIXES = ['CWTS', 'NSTP', 'GED', 'PE', 'PATHFIT', 'NSTP1', 'NSTP2', 'CWTS1', 'CWTS2'];

export function inferDepartmentFromCode(code) {
  const upper = String(code || '').trim().toUpperCase();
  if (upper.startsWith('CSS') || upper.startsWith('CS')) return 'CS';
  if (upper.startsWith('DSS') || upper.startsWith('DS')) return 'DS';
  if (upper.startsWith('ECS') || upper.startsWith('EMC')) return 'EMC';
  if (upper.startsWith('ISS') || upper.startsWith('IS')) return 'IS';
  if (upper.startsWith('MATH')) return 'MATH';
  if (upper.startsWith('ITS') || upper.startsWith('IT') || upper.startsWith('CYB') || upper.startsWith('NET')) return 'IT';
  return 'IT';
}

/**
 * Parses a raw combined string like "CSS122P Computer Programming 3" or "ITS190-1L - Cloud Native Systems"
 * into { code, title }.
 */
export function splitCombinedCourseFormat(rawInput) {
  const clean = String(rawInput || '').trim();
  if (!clean) return { code: '', title: '' };

  // Match leading course code: e.g. CSS122P, ITS162-1L, CSS182-03, MATH170
  const match = clean.match(/^([A-Za-z]{2,7}\s*-?\s*\d{1,4}[A-Za-z0-9-]*)(?:\s*[-–—:|]\s*|\s+)(.+)$/);
  if (match) {
    const normalizedCode = match[1].replace(/\s+/g, '').toUpperCase();
    const cleanedTitle = match[2].trim();
    return { code: normalizedCode, title: cleanedTitle };
  }

  // If the user only typed a single token (like "CSS198"), treat it as code only
  if (/^[A-Za-z]{2,7}\s*-?\s*\d{1,4}[A-Za-z0-9-]*$/.test(clean)) {
    return { code: clean.replace(/\s+/g, '').toUpperCase(), title: '' };
  }

  return { code: '', title: clean };
}

/**
 * Validates and normalizes an unlisted course request so the system can
 * automatically add it to the catalog without manual admin approval.
 */
export function validateUnlistedCourse(codeInput, titleInput, existingCourses = []) {
  let cleanCode = String(codeInput || '').trim().replace(/\s+/g, '').toUpperCase();
  let cleanTitle = String(titleInput || '').trim();

  // If the user pasted the full "CODE Title" into the code input and left title empty, split it automatically
  if (String(codeInput || '').trim().includes(' ') && !cleanTitle) {
    const split = splitCombinedCourseFormat(codeInput);
    if (split.code) {
      cleanCode = split.code;
      cleanTitle = split.title;
    }
  }

  if (!cleanCode && !cleanTitle) {
    return { valid: false, error: 'Please provide both Course Code and Course Title (e.g., CSS122P Computer Programming 3).' };
  }

  if (!cleanCode) {
    return { valid: false, error: 'Course Code is required (e.g., CSS155P, ITS190-1L).' };
  }

  // Check Excluded Non-SOIT Courses (CWTS, NSTP, GED, PE)
  const isExcluded = EXCLUDED_PREFIXES.some(prefix => 
    cleanCode === prefix || 
    cleanCode.startsWith(prefix + '-') || 
    /^((CWTS|NSTP|GED|PE|PATHFIT)\d*)/.test(cleanCode)
  );
  if (isExcluded) {
    return {
      valid: false,
      isExcluded: true,
      error: 'Excluded Department: CWTS, NSTP, GED, and PE courses are not handled by SOIT and cannot be petitioned or added to the catalog.'
    };
  }

  // Validate Course Code syntax (2-6 letters + 1-4 digits + optional suffix like -1L, P, -01)
  const codeRegex = /^[A-Z]{2,6}\d{1,4}(?:-[A-Z0-9]{1,4}|[A-Z0-9]{0,3})$/;
  if (!codeRegex.test(cleanCode)) {
    return {
      valid: false,
      error: `Invalid Course Code format "${cleanCode}". Use standard Mapúa code format (e.g., CSS122P, ITS161-1L, DSS110).`
    };
  }

  // Enforce the MS Form Rule: "If you ONLY put course code without Course title it will not be added to the list."
  if (!cleanTitle || cleanTitle.length < 3) {
    return {
      valid: false,
      missingTitle: true,
      error: 'Course Title is required! Per SOIT policy, submitting only a Course Code without its descriptive Course Title cannot be added to the catalog.'
    };
  }

  // Prevent user from just typing the course code again as the title
  const normCodeAlnum = cleanCode.replace(/[^A-Z0-9]/g, '');
  const normTitleAlnum = cleanTitle.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (normTitleAlnum === normCodeAlnum || !/[A-Za-z]{3,}/.test(cleanTitle)) {
    return {
      valid: false,
      missingTitle: true,
      error: 'Please enter the actual descriptive Course Title (e.g., "Computer Programming 3"), not just the course code.'
    };
  }

  // Check if this course already exists in the catalog (fuzzy code match)
  const existingMatch = existingCourses.find(c => {
    const cNorm = String(c.code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    return cNorm === normCodeAlnum;
  });

  const dept = inferDepartmentFromCode(cleanCode);
  const hasLab = cleanCode.endsWith('P') || cleanCode.endsWith('L') || cleanCode.includes('-1L') || cleanCode.includes('-1P');

  return {
    valid: true,
    code: existingMatch ? existingMatch.code : cleanCode,
    title: existingMatch ? existingMatch.title : cleanTitle,
    dept: existingMatch ? existingMatch.dept : dept,
    hasLab,
    raw: `${existingMatch ? existingMatch.code : cleanCode} ${existingMatch ? existingMatch.title : cleanTitle}`,
    existingMatch: existingMatch || null,
    isNewCatalogAddition: !existingMatch
  };
}

export function validateStudentNumber(num) {
  const clean = String(num || '').trim();
  if (!clean) return { valid: false, error: 'Student Number is required.' };
  if (!/^\d+$/.test(clean)) return { valid: false, error: 'Student Number must be a whole number (digits only).' };
  if (clean.length < 9 || clean.length > 12) {
    return { valid: false, error: 'Mapúa student numbers are typically 10 digits (e.g. 2022101234).' };
  }
  return { valid: true };
}

export function validateMapuaEmail(email) {
  const clean = String(email || '').trim().toLowerCase();
  if (!clean) return { valid: false, error: 'MyMapua Email is required.' };
  if (!clean.includes('@mymail.mapua.edu.ph') && !clean.endsWith('@mapua.edu.ph')) {
    return { 
      valid: false, 
      error: 'Must be an official Mapúa student email ending in @mymail.mapua.edu.ph' 
    };
  }
  const emailRegex = /^[a-zA-Z0-9._%+-]+@(?:mymail\.)?mapua\.edu\.ph$/;
  if (!emailRegex.test(clean)) {
    return { valid: false, error: 'Please enter a valid Mapúa email address.' };
  }
  return { valid: true };
}

export function validateUnitsLeft(units) {
  const clean = String(units || '').trim();
  if (!clean) return { valid: false, error: 'Overall units left is required.' };
  const val = Number(clean);
  if (isNaN(val) || val < 1 || val > 300) {
    return { valid: false, error: 'Please enter a valid number of units remaining (e.g. 15).' };
  }
  return { valid: true };
}

export function validateForm(data, existingCourses = []) {
  const errors = {};

  const numVal = validateStudentNumber(data.studentNumber);
  if (!numVal.valid) errors.studentNumber = numVal.error;

  if (!String(data.lastName || '').trim()) {
    errors.lastName = 'Last Name is required.';
  }

  if (!String(data.firstName || '').trim()) {
    errors.firstName = 'First Name is required.';
  }

  const emailVal = validateMapuaEmail(data.email);
  if (!emailVal.valid) errors.email = emailVal.error;

  const unitsVal = validateUnitsLeft(data.unitsLeft);
  if (!unitsVal.valid) errors.unitsLeft = unitsVal.error;

  if (!data.program) {
    errors.program = 'Please select your degree program.';
  }

  if (!data.courseCode && !data.customCourseCode) {
    errors.courseCode = 'Please select a course from the catalog or enter an unlisted course to auto-add.';
  } else if (!data.courseCode && data.customCourseCode) {
    const unlistedCheck = validateUnlistedCourse(data.customCourseCode, data.customCourseTitle, existingCourses);
    if (!unlistedCheck.valid) {
      if (unlistedCheck.missingTitle) {
        errors.customCourseTitle = unlistedCheck.error;
      } else {
        errors.customCourseCode = unlistedCheck.error;
      }
      errors.course = unlistedCheck.error;
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}
