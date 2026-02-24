// CONFIGURATION SUPABASE
const supabaseUrl = 'https://mkufkdtreeqcycnjtcxe.supabase.co'; 
const supabaseKey = 'sb_publishable_JOLl20jTfgDDSOjhyP53pA_qXXYz-N7'; // Remplace par ta clé eyJ... si possible
const _supabase = supabase.createClient(supabaseUrl, supabaseKey);

// --- AUTHENTIFICATION ---
const authForm = document.getElementById('authForm');
if(authForm) {
    authForm.onsubmit = async (e) => {
        e.preventDefault();
        const identifier = document.getElementById('identifier').value.trim();
        const password = document.getElementById('password').value;
        const title = document.getElementById('authTitle').innerText;
        
        let email = identifier.includes('@') ? identifier : `${identifier}@paroisse.tg`;

        if (title === "Connexion") {
            const { error } = await _supabase.auth.signInWithPassword({ email, password });
            if (error) alert("Erreur : Identifiants incorrects.");
            else window.location.href = 'dashboard.html';
        } else {
            const username = document.getElementById('username')?.value;
            const { data, error } = await _supabase.auth.signUp({ email, password });
            if (error) alert(error.message);
            else {
                await _supabase.from('profiles').insert([{ id: data.user.id, username, email: identifier, is_active: true }]);
                alert("Inscription réussie ! Connectez-vous.");
                location.reload();
            }
        }
    };
}

// --- INITIALISATION DASHBOARD ---
async function checkUser() {
    const { data: { user } } = await _supabase.auth.getUser();
    if (!user) {
        if(window.location.pathname.includes('dashboard.html')) window.location.href = 'auth.html';
        return;
    }

    // 1. Vérification si banni
    const { data: prof } = await _supabase.from('profiles').select('*').eq('id', user.id).single();
    if(prof && prof.is_active === false) {
        alert("Session fermée par l'admin.");
        await _supabase.auth.signOut();
        window.location.href = "auth.html";
        return;
    }

    // 2. Signaler présence (SQL + Realtime)
    await _supabase.from('profiles').update({ last_seen: new Date().toISOString() }).eq('id', user.id);
    
    const channel = _supabase.channel('online-users', { config: { presence: { key: user.id } } });
    channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
            await channel.track({ user_id: user.id, online_at: new Date().toISOString() });
        }
    });

    // 3. Affichage UI
    const pseudo = prof ? prof.username : "Fidèle";
    document.getElementById('displayUsername').innerText = pseudo;
    document.getElementById('welcomeTitle').innerHTML = `Bienvenue, <span class="text-[#23318E]">${pseudo}</span> 👋`;

    chargerHistorique(user.id);
}

// --- ENVOI DE MESSE ---
const formMesse = document.getElementById('formMesse');
if(formMesse) {
    formMesse.onsubmit = async (e) => {
        e.preventDefault();
        const { data: { user } } = await _supabase.auth.getUser();
        const msg = {
            user_id: user.id,
            nom_beneficiaire: document.getElementById('nomBeneficiaire').value,
            details_intention: document.getElementById('detailsIntention').value,
            type_priere: document.getElementById('typePriere').value,
            date_debut: document.getElementById('dateDebut').value,
            transaction_id: document.getElementById('transactionId').value,
            montant_offrande: parseInt(document.getElementById('montant').value),
            statut_paiement: 'en_attente'
        };
        const { error } = await _supabase.from('demandes_messes').insert([msg]);
        if(error) alert(error.message); else { alert("Envoi réussi !"); location.reload(); }
    };
}

// --- HISTORIQUE (FIDÈLE) ---
async function chargerHistorique(uid) {
    const { data } = await _supabase.from('demandes_messes').select('*').eq('user_id', uid).order('created_at', {ascending: false});
    const div = document.getElementById('historiqueContent');
    if(!div || !data) return;

    div.innerHTML = data.map(m => `
        <div class="flex justify-between items-center p-6 border-b">
            <div>
                <div class="font-black text-xs uppercase">${m.nom_beneficiaire}</div>
                <div class="text-[9px] text-gray-400 font-bold">${m.date_debut} • ${m.type_priere}</div>
            </div>
            <div class="flex items-center gap-3">
                ${m.statut_paiement === 'en_attente' 
                    ? '<span class="bg-orange-100 text-orange-600 px-3 py-1 rounded-full text-[9px] font-black uppercase animate-pulse">En attente</span>'
                    : `<button onclick="genererPDF('${m.id}')" class="bg-[#23318E] text-white px-4 py-2 rounded-xl text-[10px] font-black">REÇU PDF</button>`}
            </div>
        </div>
    `).join('');
}

// (La fonction genererPDF reste la même que précédemment...)

if (window.location.pathname.includes('dashboard.html')) checkUser();