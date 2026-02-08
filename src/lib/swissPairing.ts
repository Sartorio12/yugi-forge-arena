import { supabase } from "@/integrations/supabase/client";

interface Participant {
  user_id: string;
  points: number;
  buchholz: number;
}

interface Match {
  player1_id: string | null;
  player2_id: string | null;
}

export const generateSwissPairings = async (tournamentId: number) => {
  // 1. Fetch Standings (Already sorted by Points DESC, Buchholz DESC)
  const { data: standings, error: standingsError } = await supabase.rpc(
    "get_tournament_swiss_standings",
    { p_tournament_id: tournamentId }
  );

  if (standingsError) throw standingsError;
  if (!standings || standings.length < 2) throw new Error("Participantes insuficientes para gerar rodada.");

  // 2. Fetch existing matches to avoid repeats
  const { data: existingMatches, error: matchesError } = await supabase
    .from("tournament_matches")
    .select("player1_id, player2_id")
    .eq("tournament_id", tournamentId);

  if (matchesError) throw matchesError;

  const playedPairs = new Set<string>();
  existingMatches?.forEach((m) => {
    if (m.player1_id && m.player2_id) {
      playedPairs.add(`${m.player1_id}-${m.player2_id}`);
      playedPairs.add(`${m.player2_id}-${m.player1_id}`);
    }
  });

  // 3. Prepare Pairing List
  let players = [...(standings as Participant[])];
  const pairings: { player1: string; player2: string | null }[] = [];
  
  // Handle BYE if odd number of players
  // In Swiss, usually the lowest ranked player gets the bye, provided they haven't had one.
  // For simplicity here, we take the last player in the sorted list.
  if (players.length % 2 !== 0) {
      const byePlayer = players.pop(); // Remove last player
      if (byePlayer) {
          pairings.push({ player1: byePlayer.user_id, player2: null }); // BYE
      }
  }

  // 4. Greedy Pairing Algorithm
  // Since players are already sorted by Score > Buchholz, we try to pair neighbors.
  // If neighbors played, we look for the next available player.
  
  while (players.length > 0) {
    const p1 = players.shift(); // Take top player
    if (!p1) break;

    let p2Index = -1;

    // Find the first valid opponent
    for (let i = 0; i < players.length; i++) {
        const potentialOpponent = players[i];
        if (!playedPairs.has(`${p1.user_id}-${potentialOpponent.user_id}`)) {
            p2Index = i;
            break;
        }
    }

    if (p2Index !== -1) {
        // Valid pair found
        const p2 = players.splice(p2Index, 1)[0]; // Remove from list
        pairings.push({ player1: p1.user_id, player2: p2.user_id });
    } else {
        // CRITICAL FAILSAFE: No valid opponent found (e.g., everyone played everyone).
        // In a rigorous system, we would backtrack. 
        // For this implementation, we force a pairing with the next available player 
        // even if repeated, to prevent crashing, but we warn or prioritize non-repeats.
        // OR we pair with a "BYE" effectively (or random leftover).
        
        // Strategy: Pair with the immediate next player anyway (Rematch forced)
        // Ideally this shouldn't happen often in large Swiss.
        if (players.length > 0) {
             const p2 = players.shift();
             if (p2) pairings.push({ player1: p1.user_id, player2: p2.user_id });
        } else {
             // Leftover player (should have been handled by BYE logic, but just in case)
             pairings.push({ player1: p1.user_id, player2: null });
        }
    }
  }

  return pairings;
};
