'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { database, ref, onValue, update, set, remove } from '@/lib/firebase';
import { GameState, Player } from '@/lib/types';
import { shuffleRoles, calculatePoints } from '@/lib/gamelogic';
import PaperSlip from '@/components/PaperSlip';
import ShuffleAnimation from '@/components/ShuffleAnimation';
import { onDisconnect } from '@firebase/database';

export default function GamePage() {
    const params = useParams();
    const router = useRouter();
    const roomCode = params.roomCode as string;

    const [gameState, setGameState] = useState<GameState | null>(null);
    const [playerId, setPlayerId] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [revealedSlips, setRevealedSlips] = useState<Set<string>>(new Set());
    const [selectedChor, setSelectedChor] = useState<string>('');
    const [selectedSipahi, setSelectedSipahi] = useState<string>('');
    const [showRajaSpeech, setShowRajaSpeech] = useState(true);
    
    // Track if voice has been played for current round
    const hasPlayedVoiceRef = useRef(false);
    const currentRoundRef = useRef(0);

    // Initialize player and set up room listener
    useEffect(() => {
        const id = localStorage.getItem('playerId');
        if (!id) {
            router.push('/');
            return;
        }
        setPlayerId(id);

        const roomRef = ref(database, `rooms/${roomCode}`);
        const unsubscribe = onValue(roomRef, (snapshot) => {
            const data = snapshot.val();
               if (!data) {
            console.log('Room does not exist');
            router.push('/');
            setLoading(false);
            return;
        }

        // Check if current player still exists in room
        if (!data.players || !data.players[id]) {
            console.log('Player removed from room');
            localStorage.removeItem('playerId');
            localStorage.removeItem('playerName');
            router.push('/');
            setLoading(false);
            return;
        }

        setGameState(data);
            if (data) {
                setGameState(data);

                // Reset voice flag when round changes
                if (data.currentRound !== currentRoundRef.current) {
                    hasPlayedVoiceRef.current = false;
                    currentRoundRef.current = data.currentRound;
                }

                // Play voice ONCE when entering revealing phase
                if (data.gamePhase === 'revealing' && data.rajaId && data.mantriId) {
                    // Play voice only once per round
                    if (!hasPlayedVoiceRef.current) {
                        const voiceAudio = new Audio('/sound/deepaudio.mp3');
                        voiceAudio.volume = 0.9;
                        voiceAudio.play().catch(err => console.log('Voice play failed:', err));
                        hasPlayedVoiceRef.current = true;
                    }

                    const revealed = new Set<string>([data.rajaId, data.mantriId]);
                    setRevealedSlips(revealed);

                    setTimeout(() => {
                        if (data.gamePhase === 'revealing') {
                            update(ref(database, `rooms/${roomCode}`), {
                                gamePhase: 'mantriChoice'
                            });
                        }
                    }, 2000);
                }

                if (data.gamePhase === 'results') {
                    const allPlayers = Object.keys(data.players).filter(
                        pid => data.players[pid] != null
                    );
                    setRevealedSlips(new Set(allPlayers));
                }
            } else {
                router.push('/');
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [roomCode, router]);

    // Handle player connection status and auto-remove on disconnect
    useEffect(() => {
        if (!playerId || !roomCode) return;
        
        const playerRef = ref(database, `rooms/${roomCode}/players/${playerId}`);

        // Set connected status
        set(ref(database, `rooms/${roomCode}/players/${playerId}/isConnected`), true);

        // Setup auto-disconnect: Remove player completely when they leave
        const disconnectRef = onDisconnect(playerRef);
        disconnectRef.remove();

        // Handle beforeunload event for immediate cleanup
        const handleBeforeUnload = () => {
            remove(playerRef);
            localStorage.removeItem('playerId');
            localStorage.removeItem('playerName');
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            remove(playerRef);
        };
    }, [roomCode, playerId]);

    // Reset speech bubble on phase change
    useEffect(() => {
        if (gameState?.gamePhase === 'mantriChoice') {
            setShowRajaSpeech(true);
        }
    }, [gameState?.gamePhase]);

    const startGame = async () => {
        if (!gameState) return;

        const validPlayers = Object.entries(gameState.players || {}).filter(
            ([_, player]) => player != null && player.id && player.name
        );

        if (validPlayers.length !== 4) {
            alert(`Need exactly 4 players to start! Currently: ${validPlayers.length}/4`);
            return;
        }

        // Reset voice flag
        hasPlayedVoiceRef.current = false;
        currentRoundRef.current = 1;

        // Trigger animation for all players
        await update(ref(database, `rooms/${roomCode}`), {
            showShuffleAnimation: true,
            animationRound: 1
        });
    };

    const handleShuffleComplete = async () => {
        if (!gameState) return;
        
        // Only the creator processes the shuffle completion
        if (gameState.createdBy !== playerId) return;

        const validPlayers = Object.entries(gameState.players || {}).filter(
            ([_, player]) => player != null && player.id && player.name
        );
        const playerIds = validPlayers.map(([id, _]) => id);
        const roles = shuffleRoles();

        const updates: any = {
            gamePhase: 'revealing',
            showShuffleAnimation: false,
            animationRound: null
        };

        playerIds.forEach((id, index) => {
            updates[`players/${id}/role`] = roles[index];
            if (roles[index] === 'Raja') updates.rajaId = id;
            if (roles[index] === 'Mantri') updates.mantriId = id;
            if (roles[index] === 'Chor') updates.chorId = id;
            if (roles[index] === 'Sipahi') updates.sipahiId = id;
        });

        await update(ref(database, `rooms/${roomCode}`), updates);
    };

    const submitMantriChoice = async () => {
        if (!gameState || !selectedChor || !selectedSipahi) {
            alert('Please select both Chor and Sipahi!');
            return;
        }

        if (selectedChor === selectedSipahi) {
            alert('Chor and Sipahi must be different players!');
            return;
        }

        const correct = selectedChor === gameState.chorId && selectedSipahi === gameState.sipahiId;

        const points = calculatePoints(
            gameState.players,
            correct,
            gameState.rajaId!,
            gameState.mantriId!,
            gameState.chorId!,
            gameState.sipahiId!
        );

        const updates: any = {
            gamePhase: 'results',
            mantriSelection: {
                chorGuess: selectedChor,
                sipahiGuess: selectedSipahi,
                correct: correct
            }
        };

        Object.keys(points).forEach(id => {
            const currentPoints = gameState.players[id].totalPoints || 0;
            updates[`players/${id}/totalPoints`] = currentPoints + points[id];
        });

        await update(ref(database, `rooms/${roomCode}`), updates);

        setSelectedChor('');
        setSelectedSipahi('');
    };

    const nextRound = async () => {
        if (!gameState) return;

        if (gameState.currentRound >= gameState.totalRounds) {
            await update(ref(database, `rooms/${roomCode}`), {
                gamePhase: 'finished'
            });
            return;
        }

        // Reset voice flag for next round
        hasPlayedVoiceRef.current = false;
        currentRoundRef.current = gameState.currentRound + 1;

        // Trigger animation for all players
        await update(ref(database, `rooms/${roomCode}`), {
            showShuffleAnimation: true,
            animationRound: gameState.currentRound + 1
        });
    };

    const handleNextRoundShuffleComplete = async () => {
        if (!gameState) return;
        
        // Only the creator processes the shuffle completion
        if (gameState.createdBy !== playerId) return;

        const validPlayers = Object.entries(gameState.players || {}).filter(
            ([_, player]) => player != null && player.id && player.name
        );
        const playerIds = validPlayers.map(([id, _]) => id);
        const roles = shuffleRoles();

        const updates: any = {
            gamePhase: 'revealing',
            currentRound: gameState.currentRound + 1,
            mantriSelection: null,
            showShuffleAnimation: false,
            animationRound: null
        };

        playerIds.forEach((id, index) => {
            updates[`players/${id}/role`] = roles[index];
            if (roles[index] === 'Raja') updates.rajaId = id;
            if (roles[index] === 'Mantri') updates.mantriId = id;
            if (roles[index] === 'Chor') updates.chorId = id;
            if (roles[index] === 'Sipahi') updates.sipahiId = id;
        });

        setRevealedSlips(new Set());
        setSelectedChor('');
        setSelectedSipahi('');
        setShowRajaSpeech(true);
        await update(ref(database, `rooms/${roomCode}`), updates);
    };

    const copyRoomCode = () => {
        navigator.clipboard.writeText(roomCode);
        alert('Room code copied to clipboard!');
    };

    const leaveRoom = async () => {
        if (!gameState || !playerId) return;

        await remove(ref(database, `rooms/${roomCode}/players/${playerId}`));
        localStorage.removeItem('playerId');
        localStorage.removeItem('playerName');
        router.push('/');
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center">
                <div className="text-2xl font-semibold text-amber-900">Loading game...</div>
            </div>
        );
    }

    if (!gameState) return null;

    // Show shuffle animation (synced across all players via Firebase)
    if (gameState.showShuffleAnimation && gameState.animationRound) {
        return (
            <ShuffleAnimation
                roundNumber={gameState.animationRound}
                onComplete={gameState.animationRound === 1 ? handleShuffleComplete : handleNextRoundShuffleComplete}
            />
        );
    }

    const players = Object.values(gameState.players || {}).filter(
        (player): player is Player =>
            player != null &&
            typeof player.id === 'string' &&
            player.id.length > 0 &&
            typeof player.name === 'string' &&
            player.name.trim().length > 0
    );
    if (players.length === 0) {
    router.push('/');
    return null;
}
if (!gameState.players || Object.keys(gameState.players).length === 0 || players.length === 0) {
    console.log('No players in room, redirecting to home');
    localStorage.removeItem('playerId');
    localStorage.removeItem('playerName');
    router.push('/');
    return (
        <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center">
            <div className="text-2xl font-semibold text-amber-900">Room is empty. Redirecting...</div>
        </div>
    );
}
const currentPlayer = gameState.players?.[playerId];
if (!currentPlayer) {
    console.log('Current player not found in room, redirecting');
    localStorage.removeItem('playerId');
    localStorage.removeItem('playerName');
    router.push('/');
    return (
        <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center">
            <div className="text-2xl font-semibold text-amber-900">You left the game. Redirecting...</div>
        </div>
    );
}

    const isCreator = gameState.createdBy === playerId;
    const isMantri = gameState.mantriId === playerId;
    const isRaja = gameState.rajaId === playerId;

 const shouldRevealCard = (player: Player) => {
    if (gameState.gamePhase === 'results' || gameState.gamePhase === 'finished') {
        return true;
    }
    if (player.role === 'Raja' || player.role === 'Mantri') {
        return true;
    }
    if (player.id === playerId) {
        return true;
    }
    return false;
};

 const winner = players.length > 0 
    ? players.reduce((max, player) => player.totalPoints > max.totalPoints ? player : max)
    : null;

    return (
        <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 p-4 md:p-8">
            <div className="max-w-7xl mx-auto">

                {/* Header */}
                <div className="bg-white rounded-xl shadow-lg p-4 md:p-6 mb-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold text-amber-900">
                                Raja Mantri Chor Sipahi
                            </h1>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-sm text-gray-600">Room Code:</span>
                                <code className="bg-amber-100 px-3 py-1 rounded font-mono font-bold text-amber-900">
                                    {roomCode}
                                </code>
                                <button
                                    onClick={copyRoomCode}
                                    className="text-xs bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded"
                                >
                                    Copy
                                </button>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="text-right">
                                <div className="text-sm text-gray-600">
                                    Round {gameState.currentRound} / {gameState.totalRounds}
                                </div>
                                <div className="text-xs text-gray-500 capitalize">
                                    Phase: {gameState.gamePhase}
                                </div>
                            </div>
                            <button
                                onClick={leaveRoom}
                                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm"
                            >
                                Leave
                            </button>
                        </div>
                    </div>
                </div>

                {/* Lobby Phase */}
                {gameState.gamePhase === 'lobby' && (
                    <div className="bg-white rounded-xl shadow-lg p-6">
                        <h2 className="text-2xl font-bold mb-4 text-amber-900">
                            Waiting for Players... ({players.length}/4)
                        </h2>
                        <p className="text-gray-600 mb-2">
                            Share the room code with your friends to join!
                        </p>
                        <p className="text-sm text-amber-700 font-semibold mb-6">
                            🎯 Game will be {gameState.totalRounds} rounds
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                            {players.map((player, index) => (
                                <div
                                    key={player.id}
                                    className="p-4 bg-gradient-to-r from-amber-50 to-amber-100 rounded-lg border-2 border-amber-300"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center text-white font-bold">
                                            {index + 1}
                                        </div>
                                        <div>
                                            <div className="font-semibold text-amber-900">{player.name}</div>
                                            <div className="text-xs text-green-600">● Connected</div>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {Array.from({ length: Math.max(0, 4 - players.length) }).map((_, i) => (
                                <div
                                    key={`empty-slot-${i}`}
                                    className="p-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center text-gray-500 font-bold">
                                            {players.length + i + 1}
                                        </div>
                                        <div className="text-gray-400">Waiting for player...</div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {isCreator && players.length === 4 && (
                            <button
                                onClick={startGame}
                                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-lg text-lg transition-colors"
                            >
                                🎮 Start Game
                            </button>
                        )}

                        {isCreator && players.length < 4 && (
                            <div className="text-center text-gray-500">
                                Need {4 - players.length} more player(s) to start
                            </div>
                        )}

                        {!isCreator && (
                            <div className="text-center text-gray-600">
                                Waiting for room creator to start the game...
                            </div>
                        )}
                    </div>
                )}

                {/* Game Phases: Revealing, Mantri Choice, Results */}
                {gameState.gamePhase !== 'lobby' && gameState.gamePhase !== 'finished' && (
                    <div className="space-y-6">

                        {/* Status Message */}
                        <div className="bg-white rounded-xl shadow-lg p-4 text-center">
                            {gameState.gamePhase === 'revealing' && (
                                <div className="text-lg font-semibold text-amber-900">
                                    🎴 Raja and Mantri revealed! Others know only their own roles...
                                </div>
                            )}
                            {gameState.gamePhase === 'mantriChoice' && (
                                <div className="text-lg font-semibold text-blue-900">
                                    {isMantri ? (
                                        <span className="text-blue-600">
                                            👑 You are the Mantri! Identify the Chor and Sipahi below
                                        </span>
                                    ) : (
                                        <span>⏳ Waiting for Mantri to make their choice...</span>
                                    )}
                                </div>
                            )}
                            {gameState.gamePhase === 'results' && (
                                <div className="text-lg font-semibold text-green-900">
                                    📊 Round {gameState.currentRound} Results - All roles revealed!
                                </div>
                            )}
                        </div>

                        {/* Show current player's role */}
                        {currentPlayer?.role && gameState.gamePhase !== 'results' && (
                            <div className="bg-blue-50 border-2 border-blue-300 rounded-xl p-4 text-center">
                                <span className="text-sm text-gray-600">Your Role: </span>
                                <span className="text-xl font-bold text-blue-900">{currentPlayer.role}</span>
                                <span className="text-sm text-gray-600 ml-2">
                                    ({currentPlayer.role === 'Raja' ? '1000' : 
                                      currentPlayer.role === 'Mantri' ? '800' : 
                                      currentPlayer.role === 'Sipahi' ? '200' : '0'} points)
                                </span>
                            </div>
                        )}

                        {/* Paper Slips */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                            {players.map(player => {
                                const isRajaPlayer = player.id === gameState.rajaId;
                                const shouldShowSpeech = isRajaPlayer && 
                                                         gameState.gamePhase === 'mantriChoice' && 
                                                         showRajaSpeech;

                                return (
                                    <div key={player.id} className="flex flex-col items-center relative">
                                        {/* Speech Bubble for Raja */}
                                        {shouldShowSpeech && (
                                            <div className="absolute -top-24 left-1/2 transform -translate-x-1/2 z-20 animate-bounce">
                                                <div className="relative">
                                                    {/* Close button */}
                                                    <button
                                                        onClick={() => setShowRajaSpeech(false)}
                                                        className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shadow-lg transition-all hover:scale-110 z-30"
                                                        aria-label="Close"
                                                    >
                                                        ✕
                                                    </button>

                                                    {/* Speech bubble */}
                                                    <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-5 py-3 rounded-xl shadow-2xl border-2 border-yellow-300">
                                                        <p className="text-sm font-bold text-center leading-tight">
                                                            👑 Mantri, Chor aur<br />
                                                            Sipahi ka pata lagao!
                                                        </p>
                                                    </div>
                                                    
                                                    {/* Triangle pointer */}
                                                    <div className="absolute top-full left-1/2 transform -translate-x-1/2">
                                                        <div className="w-0 h-0 border-l-[12px] border-r-[12px] border-t-[14px] border-l-transparent border-r-transparent border-t-orange-500"></div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        <PaperSlip
                                            role={player.role}
                                            isRevealed={shouldRevealCard(player)}
                                            playerName={player.name}
                                            canReveal={false}
                                            onReveal={() => {}}
                                        />

                                        {/* Mantri Selection Buttons */}
                                        {gameState.gamePhase === 'mantriChoice' &&
                                            isMantri &&
                                            player.id !== playerId &&
                                            player.id !== gameState.rajaId && (
                                                <div className="mt-3 flex gap-2">
                                                    <button
                                                        onClick={() => setSelectedChor(player.id)}
                                                        className={`px-3 py-1 rounded text-sm font-semibold transition-colors ${selectedChor === player.id
                                                                ? 'bg-red-600 text-white'
                                                                : 'bg-red-100 text-red-700 hover:bg-red-200'
                                                            }`}
                                                    >
                                                        Chor
                                                    </button>
                                                    <button
                                                        onClick={() => setSelectedSipahi(player.id)}
                                                        className={`px-3 py-1 rounded text-sm font-semibold transition-colors ${selectedSipahi === player.id
                                                                ? 'bg-green-600 text-white'
                                                                : 'bg-green-100 text-green-700 hover:bg-green-200'
                                                            }`}
                                                    >
                                                        Sipahi
                                                    </button>
                                                </div>
                                            )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Mantri Submit Button */}
                        {gameState.gamePhase === 'mantriChoice' && isMantri && (
                            <div className="bg-blue-50 border-2 border-blue-300 rounded-xl p-6">
                                <p className="text-center mb-4 text-gray-700">
                                    Selected:
                                    <span className="font-bold text-red-600 ml-2">
                                        Chor: {selectedChor ? players.find(p => p.id === selectedChor)?.name : '?'}
                                    </span>
                                    {' | '}
                                    <span className="font-bold text-green-600">
                                        Sipahi: {selectedSipahi ? players.find(p => p.id === selectedSipahi)?.name : '?'}
                                    </span>
                                </p>
                                <button
                                    onClick={submitMantriChoice}
                                    disabled={!selectedChor || !selectedSipahi}
                                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg transition-colors"
                                >
                                    Submit Choice
                                </button>
                            </div>
                        )}

                        {/* Results Display */}
                        {gameState.gamePhase === 'results' && (
                            <div className="bg-white rounded-xl shadow-lg p-6">
                                <h3 className="text-2xl font-bold mb-4 text-center">
                                    {gameState.mantriSelection?.correct ? (
                                        <span className="text-green-600">✅ Mantri was CORRECT!</span>
                                    ) : (
                                        <span className="text-red-600">❌ Mantri was WRONG!</span>
                                    )}
                                </h3>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                    {players.map(player => {
                                        const points = gameState.mantriSelection?.correct
                                            ? (player.role === 'Raja' ? 1000 : player.role === 'Mantri' ? 800 : player.role === 'Sipahi' ? 200 : 0)
                                            : (player.role === 'Raja' ? 1000 : player.role === 'Chor' ? 800 : player.role === 'Sipahi' ? 200 : 0);

                                        return (
                                            <div key={player.id} className="bg-amber-50 p-4 rounded-lg text-center">
                                                <div className="font-semibold">{player.name}</div>
                                                <div className="text-2xl my-2">{player.role}</div>
                                                <div className="text-green-600 font-bold">+{points}</div>
                                            </div>
                                        );
                                    })}
                                </div>

                                <button
                                    onClick={nextRound}
                                    className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 rounded-lg"
                                >
                                    {gameState.currentRound >= gameState.totalRounds ? 'Finish Game' : 'Next Round →'}
                                </button>
                            </div>
                        )}

                        {/* Points Table */}
                        <div className="bg-white rounded-xl shadow-lg p-6">
                            <h3 className="text-xl font-bold mb-4 text-amber-900">📊 Points Table</h3>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b-2 border-amber-200">
                                            <th className="text-left py-3 px-2 text-gray-700">Rank</th>
                                            <th className="text-left py-3 px-2 text-gray-700">Player</th>
                                            <th className="text-right py-3 px-2 text-gray-700">Total Points</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {players
                                            .sort((a, b) => b.totalPoints - a.totalPoints)
                                            .map((player, index) => (
                                                <tr
                                                    key={player.id}
                                                    className={`border-b border-gray-200 ${
                                                        player.id === playerId ? 'bg-blue-50 font-semibold' : ''
                                                    }`}
                                                >
                                                    <td className="py-3 px-2 text-gray-800">
                                                        {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}`}
                                                    </td>
                                                    <td className="py-3 px-2 text-gray-800">
                                                        {player.name}
                                                        {player.id === playerId && (
                                                            <span className="ml-2 text-xs text-blue-600">(You)</span>
                                                        )}
                                                    </td>
                                                    <td className="text-right py-3 px-2 font-bold text-gray-800">{player.totalPoints}</td>
                                                </tr>
                                            ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* Finished Phase */}
                {gameState.gamePhase === 'finished' && winner && (
                    <div className="bg-white rounded-xl shadow-lg p-8 text-center">
                        <h2 className="text-4xl font-bold mb-6 text-amber-900">
                            🎉 Game Over! 🎉
                        </h2>

                        <div className="bg-gradient-to-r from-yellow-100 to-amber-100 p-8 rounded-xl mb-6">
                            <div className="text-6xl mb-4">👑</div>
                            <h3 className="text-3xl font-bold text-amber-900 mb-2">
                                {winner.name} Wins!
                            </h3>
                            <div className="text-2xl font-semibold text-amber-700">
                                {winner.totalPoints} Points
                            </div>
                        </div>

                        <div className="mb-6">
                            <h4 className="text-xl font-bold mb-4 text-gray-800">Final Standings</h4>
                            <div className="space-y-3">
                                {players
                                    .sort((a, b) => b.totalPoints - a.totalPoints)
                                    .map((player, index) => (
                                        <div
                                            key={player.id}
                                            className="flex justify-between items-center bg-gray-50 p-4 rounded-lg"
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className="text-2xl">
                                                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`}
                                                </span>
                                                <span className="font-semibold text-gray-800">{player.name}</span>
                                            </div>
                                            <span className="font-bold text-lg text-gray-800">{player.totalPoints} pts</span>
                                        </div>
                                    ))}
                            </div>
                        </div>

                        <button
                            onClick={() => router.push('/')}
                            className="bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 px-8 rounded-lg"
                        >
                            Back to Home
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
