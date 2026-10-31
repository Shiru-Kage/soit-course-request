/**
 * Consultation Schedule Utility
 * Calculates real-time presence and session status for Program Chairs based on local Manila time.
 */

const DAY_MAP = {
  'sunday': 0,
  'sun': 0,
  'monday': 1,
  'mon': 1,
  'tuesday': 2,
  'tue': 2,
  'wednesday': 3,
  'wed': 3,
  'thursday': 4,
  'thu': 4,
  'friday': 5,
  'fri': 5,
  'saturday': 6,
  'sat': 6
};

function parseTimeToMinutes(timeStr) {
  if (!timeStr) return null;
  const cleaned = timeStr.trim().toLowerCase();
  const match = cleaned.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)/);
  if (!match) return null;

  let hours = parseInt(match[1], 10);
  const minutes = match[2] ? parseInt(match[2], 10) : 0;
  const meridian = match[3];

  if (meridian === 'pm' && hours < 12) hours += 12;
  if (meridian === 'am' && hours === 12) hours = 0;

  return hours * 60 + minutes;
}

/**
 * Evaluates whether a Program Chair is currently in session or when their next session is.
 */
export function getChairPresenceStatus(dayString = '', timeString = '') {
  if (!dayString || !timeString) {
    return {
      inSession: false,
      statusLabel: 'By Appointment',
      subtext: 'Contact via official email',
      color: 'var(--text-muted)'
    };
  }

  const now = new Date();
  const currentDay = now.getDay();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  // Parse days from dayString (supports "Mon, Wed, Fri" or "Tuesday & Thursday")
  const dayTokens = dayString.toLowerCase().replace(/&/g, ',').replace(/\//g, ',').split(',');
  const targetDays = [];
  dayTokens.forEach(t => {
    const trimmed = t.trim();
    for (const [key, val] of Object.entries(DAY_MAP)) {
      if (trimmed.includes(key) && !targetDays.includes(val)) {
        targetDays.push(val);
      }
    }
  });

  // Parse start and end time (e.g. "10:00 AM - 12:00 PM" or "2:00 PM - 5:00 PM")
  const timeParts = timeString.split(/-|–|to/);
  if (timeParts.length < 2) {
    return {
      inSession: false,
      statusLabel: 'Scheduled',
      subtext: `${dayString} • ${timeString}`,
      color: 'var(--text-muted)'
    };
  }

  const startMin = parseTimeToMinutes(timeParts[0]);
  const endMin = parseTimeToMinutes(timeParts[1]);

  const isToday = targetDays.length === 0 || targetDays.includes(currentDay);

  if (isToday && startMin !== null && endMin !== null) {
    if (currentMinutes >= startMin && currentMinutes <= endMin) {
      const remainingMinutes = endMin - currentMinutes;
      return {
        inSession: true,
        statusLabel: 'In Session Now',
        subtext: `Available • Ends in ${remainingMinutes} min`,
        color: 'var(--emerald-core)'
      };
    } else if (currentMinutes < startMin) {
      const waitMin = startMin - currentMinutes;
      const hours = Math.floor(waitMin / 60);
      const mins = waitMin % 60;
      const waitStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
      return {
        inSession: false,
        statusLabel: 'Upcoming Today',
        subtext: `Starts in ${waitStr} (${timeParts[0].trim()})`,
        color: '#f59e0b'
      };
    }
  }

  return {
    inSession: false,
    statusLabel: 'Scheduled Hours',
    subtext: `${dayString} • ${timeString}`,
    color: 'var(--text-muted)'
  };
}
