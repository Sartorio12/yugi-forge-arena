import { createClient } from '@supabase/supabase-js';

const META_BOT_ID = 'ec2018d3-c57f-42a0-bf15-ebb9a60c8fbd';

async function testFinalStrategy() {
    console.log("Starting test...");

    try {
        const allTypesRes = await fetch('https://www.masterduelmeta.com/api/v1/deck-types?limit=1000');
        const allDeckTypes = await allTypesRes.json();
        console.log(`Loaded ${allDeckTypes.length} deck types.`);

        const archetypesToTest = ['Snake-Eye', 'Yummy'];

        for (const archetypeRaw of archetypesToTest) {
            console.log(`Processing: ${archetypeRaw}`);

            const match = allDeckTypes.find(t => t.name.toLowerCase() === archetypeRaw.toLowerCase()) || 
                          allDeckTypes.find(t => t.name.toLowerCase().includes(archetypeRaw.toLowerCase()));

            if (!match) {
                console.warn(`No match for ${archetypeRaw}`);
                continue;
            }

            const deckTypeId = match._id;
            console.log(`Match found: ${match.name} (${deckTypeId})`);

            const decksApiUrl = `https://www.masterduelmeta.com/api/v1/top-decks?deckType=${deckTypeId}&limit=2&sort=-created`;
            const decksRes = await fetch(decksApiUrl);
            
            if (decksRes.ok) {
                const decksData = await decksRes.json();
                console.log(`Found ${decksData.length} decks.`);
                decksData.forEach(d => {
                    console.log(` - ${d.author?.username || 'Top Deck'}`);
                });
            }
        }
    } catch (e) {
        console.error(e);
    }
}

testFinalStrategy();
