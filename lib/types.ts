export type RoleName = 'Raja' | 'Mantri' | 'Chor' | 'Sipahi';

export interface Role {
  name: RoleName;
  points: number;
  color: string;
}

export interface Player {
  id: string;
  name: string;
  role?: RoleName;
  totalPoints: number;
  isReady: boolean;
  isConnected: boolean;
  roleHistory?: RoleName[]; // Track roles across rounds
}

export interface GameState {
  roomCode: string;
  players: { [key: string]: Player };
  currentRound: number;
  totalRounds: number;
  gamePhase: 'lobby' | 'distributing' | 'revealing' | 'mantriChoice' | 'results' | 'finished';
  rajaId?: string;
  mantriId?: string;
  chorId?: string;
  sipahiId?: string;
  mantriSelection?: {
    chorGuess: string;
    sipahiGuess: string;
    correct?: boolean;
  };
  createdAt: number;
  createdBy: string;
}

export const ROLES: Role[] = [
  { name: 'Raja', points: 1000, color: '#FFD700' },
  { name: 'Mantri', points: 800, color: '#4169E1' },
  { name: 'Chor', points: 0, color: '#DC143C' },
  { name: 'Sipahi', points: 200, color: '#228B22' }
];
