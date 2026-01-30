-- 1. Inscrever YNUI no torneio 36 se não estiver
INSERT INTO public.tournament_participants (tournament_id, user_id, total_wins_in_tournament)
VALUES (36, '456b75f7-cab6-4333-bd83-7869aa3eae5a', 0)
ON CONFLICT DO NOTHING;

-- 2. Registrar a partida SPOOKY 2 x 1 YNUI
INSERT INTO public.tournament_matches (tournament_id, player1_id, player2_id, winner_id, round_name)
VALUES (
    36, 
    '80193776-6790-457c-906d-ed45ea16df9f', -- SPOOKY
    '456b75f7-cab6-4333-bd83-7869aa3eae5a', -- YNUI
    '80193776-6790-457c-906d-ed45ea16df9f', -- Vencedor: SPOOKY
    'Teste de Rivalidade'
);

-- 3. Atualizar as vitórias e XP do SPOOKY usando a função atômica
-- Precisamos do ID do participante (tournament_participants.id)
-- SPOOKY é o ID 245 no torneio 36 (visto no comando anterior)
SELECT update_player_wins(245, 1);
