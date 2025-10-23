'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { database, ref, set, get } from '@/lib/firebase';
import { generateRoomCode } from '@/lib/gamelogic';
import { GameState } from '@/lib/types';

export default function HomeScreen() {
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [totalRounds, setTotalRounds] = useState(5); // Default 5 rounds
  const router = useRouter();

  const createRoom = async () => {
    if (!playerName.trim()) {
      alert('Please enter your name');
      return;
    }

    setLoading(true);
    const code = generateRoomCode();
    const playerId = Date.now().toString();

    // Create room with selected number of rounds
    const initialGameState: GameState = {
      roomCode: code,
      players: {
        [playerId]: {
          id: playerId,
          name: playerName.trim(),
          totalPoints: 0,
          isReady: false,
          isConnected: true
        }
      },
      currentRound: 1,
      totalRounds: totalRounds, // Use selected rounds
      gamePhase: 'lobby',
      createdAt: Date.now(),
      createdBy: playerId
    };

    try {
      await set(ref(database, `rooms/${code}`), initialGameState);
      
      localStorage.setItem('playerId', playerId);
      localStorage.setItem('playerName', playerName.trim());
      
      router.push(`/game/${code}`);
    } catch (error) {
      console.error('Error creating room:', error);
      alert('Failed to create room. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const joinRoom = async () => {
    if (!playerName.trim() || !roomCode.trim()) {
      alert('Please enter your name and room code');
      return;
    }

    setLoading(true);
    const playerId = Date.now().toString();
    const upperRoomCode = roomCode.toUpperCase().trim();

    try {
      const roomRef = ref(database, `rooms/${upperRoomCode}`);
      const snapshot = await get(roomRef);
      const gameState = snapshot.val();
      
      if (!gameState) {
        alert('Room not found. Please check the room code.');
        setLoading(false);
        return;
      }

      // Count only valid players
      const existingPlayers = gameState.players || {};
      const validPlayerCount = Object.values(existingPlayers).filter(
        (player: any) => player != null && player.id && player.name
      ).length;
      
      if (validPlayerCount >= 4) {
        alert(`Room is full (${validPlayerCount}/4 players)`);
        setLoading(false);
        return;
      }

      // Add new player to the room
      const playerRef = ref(database, `rooms/${upperRoomCode}/players/${playerId}`);
      await set(playerRef, {
        id: playerId,
        name: playerName.trim(),
        totalPoints: 0,
        isReady: false,
        isConnected: true
      });

      localStorage.setItem('playerId', playerId);
      localStorage.setItem('playerName', playerName.trim());
      
      router.push(`/game/${upperRoomCode}`);
    } catch (error) {
      console.error('Error joining room:', error);
      alert('Failed to join room. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
        <h1 className="text-4xl font-bold text-center mb-2 text-amber-900">
          Raja Mantri
        </h1>
        <h2 className="text-2xl font-semibold text-center mb-6 text-amber-700">
          Chor Sipahi
        </h2>
        
        <p className="text-center text-gray-600 mb-8">
          The classic Indian paper slip game, now online!
        </p>

        <div className="space-y-4">
          <input
            type="text"
            placeholder="Enter your name"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && createRoom()}
            className="w-full px-4 py-3 border-2 border-amber-200 text-black rounded-lg focus:outline-none focus:border-amber-500"
            maxLength={20}
          />

          {/* Rounds Selector - Only shown when creating */}
          <div className="bg-amber-50 p-4 rounded-lg border-2 border-amber-200">
            <label className="block text-sm font-semibold text-amber-900 mb-2">
              Number of Rounds
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="5"
                max="15"
                step="1"
                value={totalRounds}
                onChange={(e) => setTotalRounds(parseInt(e.target.value))}
                className="flex-1 h-2 bg-amber-200 rounded-lg appearance-none cursor-pointer accent-amber-600"
              />
              <div className="text-2xl font-bold text-amber-900 w-12 text-center">
                {totalRounds}
              </div>
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>5 rounds</span>
              <span>15 rounds</span>
            </div>
          </div>

          <button
            onClick={createRoom}
            disabled={loading || !playerName.trim()}
            className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating...' : '🎮 Create Game Room'}
          </button>

          <div className="flex items-center gap-4">
            <div className="flex-1 h-px bg-gray-300"></div>
            <span className="text-gray-500 text-sm">OR</span>
            <div className="flex-1 h-px bg-gray-300"></div>
          </div>

          <input
            type="text"
            placeholder="Enter room code"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            onKeyPress={(e) => e.key === 'Enter' && joinRoom()}
            className="w-full px-4 py-3 border-2 border-amber-200 text-black rounded-lg focus:outline-none focus:border-amber-500 uppercase"
            maxLength={6}
          />

          <button
            onClick={joinRoom}
            disabled={loading || !playerName.trim() || !roomCode.trim()}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Joining...' : '🚪 Join Game Room'}
          </button>
        </div>

        <div className="mt-6 text-center text-xs text-gray-500">
          <p>Need 4 players to start • {totalRounds} rounds per game</p>
        </div>
      </div>
    </div>
  );
}
