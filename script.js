// --- CONFIGURATION SUPABASE ---
const supabaseUrl = 'https://mkufkdtreeqcycnjtcxe.supabase.co'; 
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1rdWZrZHRyZWVxY3ljbmp0Y3hlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4NTA0MjUsImV4cCI6MjA4NzQyNjQyNX0.XG3G_aRQ_NKAu9gxgvWNpKiRCIAX83cps8Jou8S4ne0'; 
const _supabase = supabase.createClient(supabaseUrl, supabaseKey);

// --- 1. AUTHENTIFICATION (INDEX / AUTH) ---
let isSignUp = false;
const authForm = document.getElementById('authForm');
const toggleAuth = document.getElementById('toggleAuth');

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

        // Cas : Email simple ou numéro de téléphone (Supabase demande souvent email)
        const emailToSubmit = email.includes('@') ? email : `${email}@nda.tg`;

        if (isSignUp) {
            const { data, error } = await _supabase.auth.signUp({ email: emailToSubmit, password });
            if (error) alert(error.message);
            else {
                await _supabase.from('profiles').insert([{ id: data.user.id, username: username, role: 'membre' }]);
                alert("Compte créé ! Veuillez vous connecter.");
                location.reload();
            }
        } else {
            const { error } = await _supabase.auth.signInWithPassword({ email: emailToSubmit, password });
            if (error) alert("Accès refusé. Vérifiez vos identifiants.");
            else window.location.href = 'dashboard.html';
        }
    };
}

// --- 2. SURVEILLANCE UTILISATEUR ET SÉCURITÉ ---
async function checkUser() {
    const { data: { user } } = await _supabase.auth.getUser();
    
    // Pages nécessitant d'être connecté
    const isPrivate = ['dashboard.html', 'admin.html', 'lectures.html'].some(p => window.location.pathname.includes(p));

    if (!user && isPrivate) {
        window.location.href = 'auth.html';
        return;
    }

    if (user) {
        // Mise à jour presence
        await _supabase.from('profiles').update({ last_seen: new Date().toISOString() }).eq('id', user.id);
        
        const { data: profile } = await _supabase.from('profiles').select('*').eq('id', user.id).single();
        
        // Affichage Nom
        if(document.getElementById('displayUsername')) document.getElementById('displayUsername').innerText = profile.username;
        if(document.getElementById('welcomeTitle')) document.getElementById('welcomeTitle').innerHTML = `Bienvenue, <span class="text-[#23318E]">${profile.username}</span> 👋`;

        // Données Dashboard
        if (window.location.pathname.includes('dashboard.html')) {
            chargerAnnoncesDashboard();
            chargerGalerieDashboard();
            chargerHistoriqueMesses(user.id);
            chargerHistoriqueDons(user.id);
        }
    }
}

// --- 3. DÉCONNEXION ---
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.onclick = async () => {
        await _supabase.auth.signOut();
        window.location.href = 'index.html';
    };
}

// --- 4. LOGIQUE DES ANNONCES ---
async function chargerAnnoncesDashboard() {
    const { data } = await _supabase.from('annonces').select('*').order('created_at', {ascending: false}).limit(5);
    const container = document.getElementById('listeAnnonces');
    if(container && data.length > 0) {
        document.getElementById('sectionAnnonces').classList.remove('hidden');
        container.innerHTML = data.map(a => `
            <div class="min-w-[280px] bg-white p-5 rounded-[2rem] shadow-lg border-b-4 ${a.priorite === 'urgent' ? 'border-red-500' : 'border-blue-900'}">
                <h4 class="font-black text-[11px] uppercase text-[#23318E] mb-2">${a.titre}</h4>
                <p class="text-[10px] text-gray-500 leading-relaxed italic">"${a.contenu}"</p>
            </div>
        `).join('');
    }
}

// --- 5. HISTORIQUE & DONS ---
async function chargerHistoriqueMesses(uid) {
    const { data } = await _supabase.from('demandes_messes').select('*').eq('user_id', uid).order('created_at', {ascending: false});
    const container = document.getElementById('historiqueContent');
    if(container) {
        container.innerHTML = data.length ? data.map(m => `
            <div class="flex justify-between items-center p-3 bg-slate-50 rounded-xl mb-2 border">
                <div class="text-[10px] font-black uppercase">${m.nom_beneficiaire}</div>
                <div class="text-[8px] font-bold ${m.statut_paiement === 'confirme' ? 'text-green-600' : 'text-blue-600'}">
                    ${m.statut_paiement === 'confirme' ? 'CONFIRMÉE ✅' : 'EN ATTENTE ⏳'}
                </div>
            </div>
        `).join('') : '<p class="text-[10px] italic text-gray-400">Aucune demande.</p>';
    }
}

async function chargerHistoriqueDons(uid) {
    const { data } = await _supabase.from('dons').select('*').eq('user_id', uid).order('created_at', {ascending: false});
    const container = document.getElementById('historiqueDons');
    if(container) {
        container.innerHTML = data.length ? data.map(d => `
            <div class="flex justify-between items-center p-3 bg-slate-50 rounded-xl mb-2 border">
                <div>
                    <div class="text-[9px] font-black uppercase text-green-700">${d.type_don}</div>
                    <div class="text-[11px] font-bold">${d.montant} FCFA</div>
                </div>
                ${d.statut === 'confirme' 
                    ? `<button onclick="genererCertificatDon('${d.id}')" class="bg-green-600 text-white px-2 py-1 rounded text-[8px] font-black">REÇU PDF</button>` 
                    : '<span class="text-[8px] italic text-orange-500">Vérification...</span>'}
            </div>
        `).join('') : '<p class="text-[10px] italic text-gray-400">Aucun don.</p>';
    }
}

// --- 6. GÉNÉRATION DE REÇU PDF ---
async function genererCertificatDon(id) {
    const { data: d } = await _supabase.from('dons').select('*, profiles(username)').eq('id', id).single();
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFillColor(35, 49, 142); doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255); doc.setFontSize(18); doc.text("REÇU DE DON OFFICIEL", 105, 20, {align:'center'});
    doc.setFontSize(8); doc.text("PAROISSE NOTRE DAME DE L'ASSOMPTION - DÉMAKPOÈ", 105, 30, {align:'center'});

    doc.setTextColor(0); doc.setFontSize(12);
    doc.text(`Donateur : ${d.profiles.username.toUpperCase()}`, 20, 60);
    doc.text(`Type de contribution : ${d.type_don}`, 20, 75);
    doc.text(`Montant versé : ${d.montant} FCFA`, 20, 90);
    doc.text(`ID Transaction : ${d.transaction_id}`, 20, 105);
    doc.text(`Fait à Lomé, le ${new Date(d.created_at).toLocaleDateString()}`, 20, 130);

    doc.setDrawColor(200); doc.line(20, 140, 190, 140);
    doc.setFontSize(8); doc.text("Merci pour votre générosité. 'Dieu aime celui qui donne avec joie.'", 105, 150, {align:'center'});

    doc.save(`Recu_NDA_${id.substring(0,5)}.pdf`);
}

// --- 7. GALERIE ---
async function chargerGalerieDashboard() {
    const { data } = await _supabase.from('galerie').select('*').order('created_at', {ascending: false}).limit(4);
    const container = document.getElementById('galeriePhotos');
    if(container && data) {
        container.innerHTML = data.map(img => `
            <div class="aspect-square rounded-2xl overflow-hidden shadow">
                <img src="${img.url_image}" class="w-full h-full object-cover">
            </div>
        `).join('');
    }
}

// --- 8. INITIALISATION AU CHARGEMENT ---
document.addEventListener('DOMContentLoaded', checkUser);