// src/features/venues/schedules.js
export const WEEKDAYS = ["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado","Domingo"];

export const ALLOWED_TIMES = [
  "00:00","00:30","01:00","01:30","02:00","02:30","03:00","03:30",
  "04:00","04:30","05:00","05:30","06:00","06:30","07:00","07:30",
  "08:00","08:30","09:00","09:30","10:00","10:30","11:00","11:30",
  "12:00","12:30","13:00","13:30","14:00","14:30","15:00","15:30",
  "16:00","16:30","17:00","17:30","18:00","18:30","19:00","19:30",
  "20:00","20:30","21:00","21:30","22:00","22:30","23:00","23:30"
];


export const buildDefaultSchedules = () =>
  WEEKDAYS.map(d => ({
    weekDay: d,
    enabled: false,
    segments: [{ scheduleID: undefined, openingTime_: '08:00', closingTime_: '22:00' }],
  }));

const isAllowed = (t) => ALLOWED_TIMES.includes(t);

export function sortSegments(segments = []) {
  return [...segments].sort((a, b) => (a.openingTime_ > b.openingTime_ ? 1 : -1));
}

// 🔁 1) Backend → UI (agrupa por día, preserva IDs de cada franja)
export const groupVenueSchedules = (venueSchedules = []) => {
  const byDay = Object.fromEntries(WEEKDAYS.map(d => [d, []]));
  for (const r of venueSchedules) {
    const scheduleID = r?.scheduleID ?? r?.fields?.scheduleID;
    const f  = r?.fields ? r.fields : r;
    const d  = f?.weekDay;
    if (!d || !byDay[d]) continue;
    byDay[d].push({
      scheduleID,
      openingTime_: isAllowed(f.openingTime_) ? f.openingTime_ : '08:00',
      closingTime_: isAllowed(f.closingTime_) ? f.closingTime_ : '22:00',
    });
  }
  return WEEKDAYS.map(d => ({
    weekDay: d,
    enabled: byDay[d].length > 0,
    segments: (byDay[d].length ? sortSegments(byDay[d]) : [{ scheduleID: undefined, openingTime_: '08:00', closingTime_: '22:00' }]),
  }));
};

// 🔁 2) UI → POST payload (crear nuevas filas)
export const buildCreatePayload = (schedules, venueID) =>
  (schedules || [])
    .filter(d => d.enabled)
    .flatMap(d =>
      (d.segments || [])
        .filter(seg => !seg.scheduleID) // solo nuevas (sin id)
        .map(seg => ({
          fields: {
            linkedVenue: [venueID],
            weekDay: d.weekDay,
            openingTime_: seg.openingTime_,
            closingTime_: seg.closingTime_,
          }
        }))
    );

// 🔁 3) UI + original → PUT payload (actualizar filas existentes con id)
export const buildUpdatePayload = (schedules, venueID, originalFlat = []) => {
  // originalFlat = array plano [{id, weekDay, openingTime_, closingTime_}]
  const byId = Object.fromEntries(originalFlat.map(o => [o.scheduleID, o]));
  const updates = [];

  (schedules || [])
    .filter(d => d.enabled)
    .forEach(d => {
      (d.segments || [])
        .filter(seg => !!seg.scheduleID)
        .forEach(seg => {
          const old = byId[seg.scheduleID];
          if (!old) return; // seguridad
          const changed =
            old.weekDay !== d.weekDay ||
            old.openingTime_ !== seg.openingTime_ ||
            old.closingTime_ !== seg.closingTime_;
          if (changed) {
            updates.push({
              id: seg.scheduleID,
              fields: {
                linkedVenue: [venueID], // según tu backend ejemplo
                weekDay: d.weekDay,
                openingTime_: seg.openingTime_,
                closingTime_: seg.closingTime_,
              }
            });
          }
        });
    });

  return updates;
};

// 🔁 4) UI + original → IDs a borrar
export const buildDeleteIds = (schedules, originalFlat = []) => {
  const keepIds = new Set();
  (schedules || [])
    .filter(d => d.enabled)
    .forEach(d => (d.segments || []).forEach(seg => { if (seg.scheduleID) keepIds.add(seg.scheduleID); }));

  const deletes = [];
  for (const o of originalFlat) {
    if (!keepIds.has(o.scheduleID)) deletes.push(o.scheduleID);
  }
  return deletes;
};

// Utilitario: aplanar respuesta original a [{id, weekDay, openingTime_, closingTime_}]
export const flattenOriginal = (venueSchedules = []) =>{
  return (venueSchedules || []).map(r => {
    const scheduleID = r?.scheduleID ?? r?.fields?.scheduleID;
    const f  = r?.fields ? r.fields : r;
    return {
      scheduleID,
      weekDay: f?.weekDay,
      linkedVenue: f?.linkedVenue,
      openingTime_: f?.openingTime_,
      closingTime_: f?.closingTime_,
    };
  }).filter(x => !!x.scheduleID);
}

export function validateDaySegments(segments = []) {
  const sorted = sortSegments(segments);
  for (let i = 0; i < sorted.length; i++) {
    const { openingTime_, closingTime_ } = sorted[i];
    if (!isAllowed(openingTime_) || !isAllowed(closingTime_)) {
      return 'Usa tiempos válidos como 08:00, 12:30, 22:00.';
    }
    if (openingTime_ >= closingTime_) {
      return 'La hora de apertura debe ser menor que la de cierre.';
    }
    if (i > 0) {
      const prev = sorted[i - 1];
      // solape si el inicio es menor que el cierre anterior
      if (openingTime_ < prev.closingTime_) {
        return 'Hay solapamientos entre franjas en un mismo día.';
      }
    }
  }
  return null;
}