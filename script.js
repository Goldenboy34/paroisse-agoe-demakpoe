// --- CONFIGURATION SUPABASE ---
const supabaseUrl = 'https://mkufkdtreeqcycnjtcxe.supabase.co'; 
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1rdWZrZHRyZWVxY3ljbmp0Y3hlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4NTA0MjUsImV4cCI6MjA4NzQyNjQyNX0.XG3G_aRQ_NKAu9gxgvWNpKiRCIAX83cps8Jou8S4ne0'; 
const _supabase = supabase.createClient(supabaseUrl, supabaseKey);

// --- 1. AUTHENTIFICATION (LOGIN / REGISTER) ---
const authForm = document.getElementById('authForm');
const toggleAuth = document.getElementById('toggleAuth');
let isSignUp = false;

if (toggleAuth) {
    toggleAuth.onclick = () => {
        isSignUp = !isSignUp;
        document.getElementById('authTitle').innerText = isSignUp ? "Inscription" : "Connexion";
        document.getElementById('authBtn').innerText = isSignUp ? "Créer mon compte" : "Entrer";
        document.getElementById('usernameField').classList.toggle('hidden');
        document.getElementById('toggleText').innerText = isSignUp ? "Déjà un compte ?" : "Pas encore inscrit ?";
        toggleAuth.innerText = isSignUp ? "Se connecter" : "Créer un compte";
    };
}

if (authForm) {
    authForm.onsubmit = async (e) => {
        e.preventDefault();
        const email = document.getElementById('identifier').value;
        const password = document.getElementById('password').value;
        const username = document.getElementById('username')?.value;

        if (isSignUp) {
            const { data, error } = await _supabase.auth.signUp({ email, password });
            if (error) alert("Erreur: " + error.message);
            else {
                await _supabase.from('profiles').insert([{ id: data.user.id, username: username, role: 'membre' }]);
                alert("Compte créé ! Vérifiez vos emails.");
            }
        } else {
            const { error } = await _supabase.auth.signInWithPassword({ email, password });
            if (error) alert("Erreur: " + error.message);
            else window.location.href = 'dashboard.html';
        }
    };
}

// --- 2. GESTION DU DASHBOARD & MESSES ---
async function ouvrirModalMesse() {
    document.getElementById('modalMesse').classList.remove('hidden');
}

function fermerModalMesse() {
    document.getElementById('modalMesse').classList.add('hidden');
}

const formMesse = document.getElementById('formMesse');
if (formMesse) {
    formMesse.onsubmit = async (e) => {
        e.preventDefault();
        const { data: { user } } = await _supabase.auth.getUser();
        const messe = {
            user_id: user.id,
            nom_beneficiaire: document.getElementById('messeNom').value,
            intention: document.getElementById('messeIntention').value,
            type_priere: document.getElementById('typePriere').value,
            transaction_id: document.getElementById('transIdMesse').value,
            statut_paiement: 'en_attente'
        };
        const { error } = await _supabase.from('demandes_messes').insert([messe]);
        if (error) alert(error.message);
        else { alert("Demande de messe envoyée !"); fermerModalMesse(); chargerHistorique(user.id); }
    };
}

async function chargerHistorique(uid) {
    const { data } = await _supabase.from('demandes_messes').select('*').eq('user_id', uid).order('created_at', {ascending: false});
    const container = document.getElementById('historiqueContent');
    if (!container) return;
    container.innerHTML = data.map(m => `
        <div class="p-3 bg-slate-50 rounded-xl border-l-4 ${m.statut_paiement === 'confirme' ? 'border-green-500' : 'border-blue-500'} mb-2">
            <div class="text-[10px] font-black uppercase text-slate-800">${m.nom_beneficiaire}</div>
            <div class="text-[9px] text-slate-500">${m.intention.substring(0, 50)}...</div>
            <div class="text-[8px] font-bold mt-1 uppercase">${m.statut_paiement === 'confirme' ? '✅ Confirmée' : '⏳ En attente'}</div>
        </div>
    `).join('');
}

// --- 3. COUNTDOWN (HOME) ---
async function demarrerCountdown() {
    const { data } = await _supabase.from('celebrations').select('*').gt('date_heure', new Date().toISOString()).order('date_heure', {ascending: true}).limit(1);
    if (data && data[0]) {
        const cible = new Date(data[0].date_heure).getTime();
        document.getElementById('nomMesse').innerText = data[0].nom_celebration;
        setInterval(function() {
            const distance = cible - new Date().getTime();
            const j = Math.floor(distance / (86400000)), h = Math.floor((distance % 86400000) / 3600000), m = Math.floor((distance % 3600000) / 60000), s = Math.floor((distance % 60000) / 1000);
            document.getElementById("countdown").innerHTML = `${j}j ${h}h ${m}m ${s}s`;
        }, 1000);
    }
}

// --- 4. INITIALISATION GENERALE ---
async function init() {
    const { data: { user } } = await _supabase.auth.getUser();
    
    // Déconnexion
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.onclick = async () => { await _supabase.auth.signOut(); window.location.href = 'index.html'; };

    // Si on est sur l'index (Public)
    if (document.getElementById('countdown')) demarrerCountdown();

    // Si on est connecté
    if (user) {
        const { data: profile } = await _supabase.from('profiles').select('*').eq('id', user.id).single();
        if (document.getElementById('displayUsername')) document.getElementById('displayUsername').innerText = profile.username;
        if (document.getElementById('welcomeTitle')) document.getElementById('welcomeTitle').innerHTML = `Bienvenue, <span class="text-[#23318E]">${profile.username}</span> 👋`;
        
        chargerAnnonces();
        chargerGalerie();
        if (window.location.pathname.includes('dashboard.html')) {
            chargerHistorique(user.id);
            chargerDons(user.id);
        }
    }
}

document.addEventListener('DOMContentLoaded', init);