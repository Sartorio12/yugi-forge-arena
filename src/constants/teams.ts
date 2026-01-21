export const FOOTBALL_TEAMS = [
  "Liverpool", "Tottenham", "Chelsea", "Manchester City", "Manchester United", "Arsenal",
  "Barcelona", "Real Madrid", "Atlético Madrid",
  "Bayern Munique", "Borussia Dortmund",
  "Ajax", "PSV",
  "Porto", "Benfica", "Sporting",
  "Celtic", "Rangers",
  "PSG", "Lyon", "Olympique Marseille",
  "Galatasaray", "Fenerbahçe",
  "Olympiacos",
  "Brugge",
  "Inter de Milão", "Milan", "Juventus", "Napoli", "Atalanta", "Fiorentina",
  "Sevilla"
];

const TEAM_LOGOS: Record<string, string> = {
  // Premier League
  "Liverpool": "https://en.wikipedia.org/wiki/Special:FilePath/Liverpool_FC.svg",
  "Tottenham": "https://en.wikipedia.org/wiki/Special:FilePath/Tottenham_Hotspur.svg",
  "Chelsea": "https://en.wikipedia.org/wiki/Special:FilePath/Chelsea_FC.svg",
  "Manchester City": "https://en.wikipedia.org/wiki/Special:FilePath/Manchester_City_FC_badge.svg",
  "Manchester United": "https://en.wikipedia.org/wiki/Special:FilePath/Manchester_United_FC_crest.svg",
  "Arsenal": "https://en.wikipedia.org/wiki/Special:FilePath/Arsenal_FC.svg",
  
  // La Liga
  "Barcelona": "https://en.wikipedia.org/wiki/Special:FilePath/FC_Barcelona_(crest).svg",
  "Real Madrid": "https://en.wikipedia.org/wiki/Special:FilePath/Real_Madrid_CF.svg",
  "Atlético Madrid": "https://en.wikipedia.org/wiki/Special:FilePath/Atletico_Madrid_logo.svg",
  "Sevilla": "https://en.wikipedia.org/wiki/Special:FilePath/Sevilla_FC_logo.svg",

  // Bundesliga
  "Bayern Munique": "https://commons.wikimedia.org/wiki/Special:FilePath/FC_Bayern_München_logo_(2017).svg",
  "Borussia Dortmund": "https://commons.wikimedia.org/wiki/Special:FilePath/Borussia_Dortmund_logo.svg",

  // Eredivisie
  "Ajax": "https://en.wikipedia.org/wiki/Special:FilePath/Ajax_Amsterdam.svg",
  "PSV": "https://en.wikipedia.org/wiki/Special:FilePath/PSV_Eindhoven.svg",

  // Liga Portugal
  "Porto": "https://en.wikipedia.org/wiki/Special:FilePath/FC_Porto.svg",
  "Benfica": "https://en.wikipedia.org/wiki/Special:FilePath/SL_Benfica_logo.svg",
  "Sporting": "https://en.wikipedia.org/wiki/Special:FilePath/Sporting_Clube_de_Portugal.svg",

  // Scottish Premiership
  "Celtic": "https://en.wikipedia.org/wiki/Special:FilePath/Celtic_FC.svg",
  "Rangers": "https://en.wikipedia.org/wiki/Special:FilePath/Rangers_FC.svg",

  // Ligue 1
  "PSG": "https://en.wikipedia.org/wiki/Special:FilePath/Paris_Saint-Germain_F.C..svg",
  "Lyon": "https://upload.wikimedia.org/wikipedia/pt/6/6d/Olympique_lyonnais.png",
  "Olympique Marseille": "https://en.wikipedia.org/wiki/Special:FilePath/Olympique_Marseille_logo.svg",

  // Süper Lig & Greek
  "Galatasaray": "https://commons.wikimedia.org/wiki/Special:FilePath/Galatasaray_Sports_Club_Logo.svg",
  "Fenerbahçe": "https://commons.wikimedia.org/wiki/Special:FilePath/Fenerbahçe_Spor_Kulübü_(logo,_1923).svg",
  "Olympiacos": "https://commons.wikimedia.org/wiki/Special:FilePath/Olympiacos_F.C_Emblem.svg",

  // Belgian Pro League
  "Brugge": "https://en.wikipedia.org/wiki/Special:FilePath/Club_Brugge_KV_logo.svg",

  // Serie A
  "Inter de Milão": "https://commons.wikimedia.org/wiki/Special:FilePath/Inter_Milano_2021_logo_with_2_stars.svg",
  "Milan": "https://commons.wikimedia.org/wiki/Special:FilePath/Logo_of_AC_Milan.svg",
  "Juventus": "https://commons.wikimedia.org/wiki/Special:FilePath/Juventus_FC_-_logo_black_(Italy,_2020).svg",
  "Napoli": "https://commons.wikimedia.org/wiki/Special:FilePath/SSC_Napoli_2024_(deep_blue_navy).svg",
  "Atalanta": "https://commons.wikimedia.org/wiki/Special:FilePath/Logo_Atalanta_Bergamo.svg",
  "Fiorentina": "https://commons.wikimedia.org/wiki/Special:FilePath/ACF_Fiorentina_-_logo_(Italy,_2022).svg"
};

// Helper to get logo URL
export const getTeamLogoUrl = (teamName: string) => {
  return TEAM_LOGOS[teamName] || `https://ui-avatars.com/api/?name=${encodeURIComponent(teamName)}&background=random&color=fff&size=128`;
};