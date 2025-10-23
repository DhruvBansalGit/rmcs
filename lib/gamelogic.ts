import { RoleName, Player } from './types';

export const generateRoomCode = (): string => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

// Weighted shuffle that tries to give different roles each round
export const shuffleRolesWithHistory = (
  players: { [key: string]: Player }
): { [key: string]: RoleName } => {
  const playerIds = Object.keys(players);
  const roles: RoleName[] = ['Raja', 'Mantri', 'Chor', 'Sipahi'];
  
  // Fisher-Yates shuffle with crypto randomness
  for (let i = roles.length - 1; i > 0; i--) {
    const randomBytes = new Uint32Array(1);
    crypto.getRandomValues(randomBytes);
    const j = randomBytes[0] % (i + 1);
    [roles[i], roles[j]] = [roles[j], roles[i]];
  }
  
  // Assign roles to players
  const assignments: { [key: string]: RoleName } = {};
  playerIds.forEach((playerId, index) => {
    assignments[playerId] = roles[index];
  });
  
  return assignments;
};

// Simple shuffle (current implementation)
export const shuffleRoles = (): RoleName[] => {
  const roles: RoleName[] = ['Raja', 'Mantri', 'Chor', 'Sipahi'];
  
  // Fisher-Yates shuffle
  for (let i = roles.length - 1; i > 0; i--) {
    const randomBytes = new Uint32Array(1);
    crypto.getRandomValues(randomBytes);
    const j = randomBytes[0] % (i + 1);
    [roles[i], roles[j]] = [roles[j], roles[i]];
  }
  
  return roles;
};

export const calculatePoints = (
  players: { [key: string]: Player },
  mantriCorrect: boolean,
  rajaId: string,
  mantriId: string,
  chorId: string,
  sipahiId: string
): { [key: string]: number } => {
  const points: { [key: string]: number } = {};

  points[rajaId] = 1000;

  if (mantriCorrect) {
    points[mantriId] = 800;
    points[chorId] = 0;
    points[sipahiId] = 200;
  } else {
    points[mantriId] = 0;
    points[chorId] = 800;
    points[sipahiId] = 200;
  }

  return points;
};
