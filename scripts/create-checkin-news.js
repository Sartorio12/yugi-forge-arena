import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Missing Supabase credentials.");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const META_BOT_ID = 'ec2018d3-c57f-42a0-bf15-ebb9a60c8fbd';

const htmlContent = `
<p style="color: #cbd5e1; font-size: 0.95rem; line-height: 1.5; margin-bottom: 0.8rem;">
    Olá, Duelistas! Estamos implementando mudanças importantes na estrutura dos nossos torneios para melhorar a experiência competitiva e reduzir o número de W.O. (ausências). Confira abaixo como funcionará o novo sistema de <b>Check-in</b>.
</p>

<h2 style="color: #60a5fa; font-size: 1.4rem; font-weight: bold; margin-top: 1.5rem; margin-bottom: 0.5rem; border-bottom: 1px solid #1e293b;">
    ✅ Sistema de Check-in (Torneios Diários)
</h2>

<p style="color: #cbd5e1; font-size: 0.95rem; line-height: 1.5; margin-bottom: 0.8rem;">
    A partir de agora, a inscrição não garante mais sua vaga na chave final se você não confirmar sua presença.
</p>

<ul style="color: #94a3b8; font-size: 0.9rem; list-style-type: square; padding-left: 15px;">
    <li>O Check-in abre <b>30 minutos antes</b> do horário marcado para o início do torneio.</li>
    <li>Você deve acessar a página do torneio e clicar no botão <b style="color: #22c55e;">"Fazer Check-in Agora!"</b>.</li>
    <li>Jogadores que não realizarem o check-in serão <b>removidos automaticamente</b> da lista de participantes antes do início das rodadas.</li>
</ul>

<h2 style="color: #ef4444; font-size: 1.4rem; font-weight: bold; margin-top: 1.5rem; margin-bottom: 0.5rem; border-bottom: 1px solid #1e293b;">
    🚫 Política de Bloqueio por Ausência
</h2>

<p style="color: #cbd5e1; font-size: 0.95rem; line-height: 1.5; margin-bottom: 0.8rem;">
    Para combater o abandono de torneios, introduzimos uma regra rigorosa de faltas consecutivas:
</p>

<ul style="color: #94a3b8; font-size: 0.9rem; list-style-type: square; padding-left: 15px;">
    <li>Cada vez que você se inscreve em um torneio diário e <b>não faz o check-in</b>, você acumula <b style="color: #fca5a5;">1 Falta</b>.</li>
    <li>Ao completar o check-in em um evento, suas faltas são zeradas.</li>
    <li>Se você acumular <b>3 faltas consecutivas</b>, sua conta receberá um <b style="color: #ef4444;">Bloqueio de 7 Dias</b>.</li>
</ul>

<p style="color: #cbd5e1; font-size: 0.95rem; line-height: 1.5; margin-bottom: 0.8rem;">
    Durante o período de bloqueio, você ficará impedido de se inscrever em <b>qualquer torneio</b> da plataforma (incluindo Ligas e Semanais). Organizem seus horários e só se inscrevam se realmente forem participar!
</p>
`;

async function createPost() {
    const { data, error } = await supabase.from('news_posts').insert({
        author_id: META_BOT_ID,
        title: 'Atualização: Check-in Obrigatório e Nova Política de Faltas',
        label: 'Update',
        banner_url: '/hero-bg.jpg',
        content: htmlContent
    }).select();

    if (error) {
        console.error("Error creating post:", error);
    } else {
        console.log("News post created successfully:", data);
    }
}

createPost();
