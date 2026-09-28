// Roles de usuario. El valor viaja tal cual a Airtable (campo `userRole`),
// así que las cadenas deben coincidir exactamente con las opciones de allí.

export const EXPLORER_ROLE = 'Explorer';
export const CURATOR_ROLE = 'Curators & Providers';

// Explorer va primero: es el rol por defecto y el de la mayoría de usuarios.
export const USER_ROLES = [EXPLORER_ROLE, CURATOR_ROLE];

export const DEFAULT_USER_ROLE = EXPLORER_ROLE;

// Solo los curators registran negocios; el resto no ve el botón.
export const isCurator = (user) => (user?.userRole || '').trim() === CURATOR_ROLE;
