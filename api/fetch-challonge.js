import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { url, apiKey } = req.body;
  const apiKeyToUse = apiKey || process.env.CHALLONGE_API_KEY;

  if (!url || !apiKeyToUse) {
    return res.status(400).json({ error: 'URL and API Key are required (provide in body or CHALLONGE_API_KEY env var).' });
  }

  try {
    // 1. Extract Slug
    // URLs can be: https://challonge.com/my_tournament OR https://challonge.com/communities/org/tournaments/my_tournament
    // We need the last part usually, or the subdomain if subdomain.challonge.com
    
    // Simplest extraction:
    const urlObj = new URL(url);
    let tournamentSlug = urlObj.pathname.split('/').pop();
    const subdomain = urlObj.hostname.split('.')[0];
    
    if (subdomain !== 'challonge' && subdomain !== 'www') {
        tournamentSlug = `${subdomain}-${tournamentSlug}`;
    }
    
    // Challonge API requires the full identifier if subdomains are used, but typically the "url" param works if unique.
    // Let's rely on the user providing the public URL and us taking the last segment. 
    // If it fails, we might need a more complex parser or ask for the ID.

    console.log(`Fetching Challonge data for slug: ${tournamentSlug}`);

    // 2. Fetch Participants
    const participantsUrl = `https://api.challonge.com/v1/tournaments/${tournamentSlug}/participants.json?api_key=${apiKeyToUse}`;
    const pRes = await fetch(participantsUrl);
    if (!pRes.ok) throw new Error(`Failed to fetch participants: ${pRes.statusText}`);
    const participantsData = await pRes.json();

    // 3. Fetch Matches
    const matchesUrl = `https://api.challonge.com/v1/tournaments/${tournamentSlug}/matches.json?api_key=${apiKeyToUse}`;
    const mRes = await fetch(matchesUrl);
    if (!mRes.ok) throw new Error(`Failed to fetch matches: ${mRes.statusText}`);
    const matchesData = await mRes.json();

    // 4. Fetch Local Profiles (for mapping)
    // We need a way to map Challonge Names to Local User IDs.
    // We will fetch ALL usernames (optimized: maybe just fetch needed ones? No, we don't know needed ones yet).
    // Fetching 1000 users might be okay. If huge, we need a better strategy. 
    // Assuming < 2000 users for now.
    const { data: profiles, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('id, username, discord_username');
    
    if (profileError) throw profileError;

    // Create lookup map (lowercase for fuzzy match)
    const localUsersMap = new Map();
    profiles.forEach(p => {
        if (p.username) localUsersMap.set(p.username.toLowerCase(), p.id);
        if (p.discord_username) localUsersMap.set(p.discord_username.toLowerCase(), p.id); // Also match by discord
    });

    // 5. Map Challonge Participants
    const participantMap = new Map(); // Challonge ID -> { name, localId }
    const unknownParticipants = [];

    participantsData.forEach(entry => {
        const p = entry.participant;
        const name = p.name || p.username || p.display_name; // Challonge naming can vary
        const lowerName = name.toLowerCase();
        
        const localId = localUsersMap.get(lowerName);
        
        if (localId) {
            participantMap.set(p.id, { name, localId });
        } else {
            participantMap.set(p.id, { name, localId: null });
            unknownParticipants.push(name);
        }
    });

    // 6. Process Matches
    const processedMatches = [];
    
    matchesData.forEach(entry => {
        const m = entry.match;
        if (m.state !== 'complete') return; // Only finished matches

        const p1 = participantMap.get(m.player1_id);
        const p2 = participantMap.get(m.player2_id);
        
        // Skip if any player is missing (bye rounds or errors)
        if (!p1 || !p2) return;

        const winnerId = m.winner_id === m.player1_id ? p1.localId : (m.winner_id === m.player2_id ? p2.localId : null);

        processedMatches.push({
            challonge_match_id: m.id,
            round: m.round,
            player1: p1,
            player2: p2,
            winner_local_id: winnerId,
            score: m.scores_csv,
            completed_at: m.completed_at
        });
    });

    return res.status(200).json({
        matches: processedMatches,
        unknown_participants: unknownParticipants,
        total_found: processedMatches.length
    });

  } catch (error) {
    console.error('Error fetching Challonge:', error);
    return res.status(500).json({ error: error.message });
  }
}
