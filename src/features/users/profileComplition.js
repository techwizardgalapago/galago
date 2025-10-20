// src/features/users/profileCompletion.js

// Accepts either shape:
// - Remote (Airtable): { fullName, userEmail, userRole, countryOfOrigin, reasonForTravel: [] }
// - Local (SQLite): { firstName, lastName, userEmail, userRole, countryOfOrigin, reasonForTravel: "A, B" }

const hasName = (u) => {
  if (!u) return false;
  if (u.fullName && u.fullName.trim().length > 1) return true;
  const fn = (u.firstName || '').trim();
  const ln = (u.lastName || '').trim();
  return Boolean(fn) && Boolean(ln);
};

const getReasonsArray = (u) => {
  if (!u) return [];
  if (Array.isArray(u.reasonForTravel)) return u.reasonForTravel;
  if (typeof u.reasonForTravel === 'string') {
    return u.reasonForTravel
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
};

export const isProfileComplete = (u) => {
  if (!u) return false;
  const reasons = getReasonsArray(u);
  return (
    hasName(u) &&
    Boolean((u.userEmail || '').trim()) &&
    Boolean((u.userRole || '').trim()) &&
    Boolean((u.countryOfOrigin || '').trim()) &&
    reasons.length > 0
  );
};

// Convenience: split/join conversions
export const splitFullName = (fullName = '') => {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 0) return { firstName: '', lastName: '' };
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  const firstName = parts.slice(0, -1).join(' ');
  const lastName = parts.slice(-1).join(' ');
  return { firstName, lastName };
};

export const joinFullName = (firstName = '', lastName = '') =>
  [firstName, lastName].filter(Boolean).join(' ');
