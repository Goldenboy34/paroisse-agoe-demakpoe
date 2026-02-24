// ==========================================
// 1. CONFIGURATION SUPABASE (AVEC TA CLÉ)
// ==========================================
const supabaseUrl = 'https://mkufkdtreeqcycnjtcxe.supabase.co'; 
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1rdWZrZHRyZWVxY3ljbmp0Y3hlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4NTA0MjUsImV4cCI6MjA4NzQyNjQyNX0.XG3G_aRQ_NKAu9gxgvWNpKiRCIAX83cps8Jou8S4ne0'; 
const _supabase = supabase.createClient(supabaseUrl, supabaseKey);

// ==========================================
// 2. GESTION DE L'AUTHENTIFICATION
// ==========================================
let modeInscription = false;
const btnToggle = document.getElementById('toggleAuth');

if(btnToggle) {
    btnToggle.addEventListener('click', () => {
        modeInscription = !modeInscription;
        const titre = document.getElementById('authTitle');
        const bouton = document.getElementById('authBtn');
        const champUser = document.getElementById('usernameField');
        const texteToggle = document.getElementById('toggleText');

        if(modeInscription) {
            titre.innerText = "Inscription";
            bouton.innerText = "S'inscrire";
            champUser.classList.remove('hidden');
            texteToggle.innerText = "Déjà inscrit ?";
            btnToggle.innerText = "Se connecter";
        } else {
            titre.innerText = "Connexion";
            bouton.innerText = "Entrer";
            champUser.classList.add('hidden');
            texteToggle.innerText = "Pas encore inscrit ?";
            btnToggle.innerText = "Créer un compte";
        }
    });
}

const authForm = document.getElementById('authForm');
if(authForm) {
    authForm.onsubmit = async (e) => {
        e.preventDefault();
        const identifier = document.getElementById('identifier').value.trim();
        const password = document.getElementById('password').value;
        const finalEmail = identifier.includes('@') ? identifier : `${identifier}@paroisse.tg`;

        try {
            if (!modeInscription) {
                // --- CONNEXION ---
                const { data, error } = await _supabase.auth.signInWithPassword({ email: finalEmail, password });
                if (error) throw error;
                window.location.href = 'dashboard.html';
            } else {
                // --- INSCRIPTION ---
                const username = document.getElementById('username').value.trim();
                if(!username) return alert("Veuillez entrer votre nom !");

                const { data, error } = await _supabase.auth.signUp({ email: finalEmail, password });
                if (error) throw error;

                if (data.user) {
                    await _supabase.from('profiles').insert([{ 
                        id: data.user.id, 
                        username: username, 
                        email: identifier,
                        is_active: true,
                        last_seen: new Date().toISOString()
                    }]);
                    alert("Compte créé avec succès ! Vous pouvez maintenant vous connecter.");
                    location.reload();
                }
            }
        } catch (err) {
            alert("Erreur : " + err.message);
        }
    };
}

// ==========================================
// 3. LOGIQUE DU DASHBOARD & SURVEILLANCE
// ==========================================
async function checkUser() {
    const { data: { user } } = await _supabase.auth.getUser();
    if (!user) {
        if(window.location.pathname.includes('dashboard.html')) window.location.href = 'auth.html';
        return;
    }

    // Vérifier si actif et signaler présence
    const { data: profile } = await _supabase.from('profiles').select('*').eq('id', user.id).single();
    
    if (profile && profile.is_active === false) {
        alert("Session fermée par l'administrateur.");
        await _supabase.auth.signOut();
        window.location.href = 'auth.html';
        return;
    }

    // Mise à jour de la dernière activité
    await _supabase.from('profiles').update({ last_seen: new Date().toISOString() }).eq('id', user.id);

    // Système Realtime Presence pour l'admin
    const channel = _supabase.channel('online-users', { config: { presence: { key: user.id } } });
    channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
            await channel.track({ user_id: user.id, online_at: new Date().toISOString() });
        }
    });

    // Affichage UI
    const pseudo = profile ? profile.username : "Fidèle";
    if(document.getElementById('displayUsername')) document.getElementById('displayUsername').innerText = pseudo;
    if(document.getElementById('welcomeTitle')) {
        document.getElementById('welcomeTitle').innerHTML = `Bienvenue, <span class="text-[#23318E] italic underline decoration-red-500">${pseudo}</span> 👋`;
    }

    chargerLiturgie();
    chargerHistorique(user.id);
}

// ==========================================
// 4. DEMANDE DE MESSE ET HISTORIQUE
// ==========================================
const formMesse = document.getElementById('formMesse');
if(formMesse) {
    formMesse.onsubmit = async (e) => {
        e.preventDefault();
        const { data: { user } } = await _supabase.auth.getUser();
        
        const demande = {
            user_id: user.id,
            nom_beneficiaire: document.getElementById('nomBeneficiaire').value,
            details_intention: document.getElementById('detailsIntention').value,
            type_priere: document.getElementById('typePriere').value,
            date_debut: document.getElementById('dateDebut').value,
            transaction_id: document.getElementById('transactionId').value,
            montant_offrande: parseInt(document.getElementById('montant').value),
            statut_paiement: 'en_attente'
        };

        const { error } = await _supabase.from('demandes_messes').insert([demande]);
        if(error) alert(error.message);
        else { alert("Demande envoyée ! En attente de validation."); location.reload(); }
    };
}

async function chargerHistorique(uid) {
    const { data } = await _supabase.from('demandes_messes').select('*').eq('user_id', uid).order('created_at', {ascending: false});
    const div = document.getElementById('historiqueContent');
    if(!div) return;

    if(!data || data.length === 0) {
        div.innerHTML = "<p class='py-10 text-gray-400 italic text-xs uppercase tracking-widest'>Aucune demande enregistrée</p>";
        return;
    }

    div.innerHTML = data.map(m => `
        <div class="flex justify-between items-center p-6 border-b border-gray-50 hover:bg-gray-50/50 transition">
            <div class="text-left">
                <div class="font-black text-xs uppercase text-slate-800">${m.nom_beneficiaire}</div>
                <div class="text-[9px] text-gray-400 font-bold uppercase mt-1">${m.date_debut} • ${m.type_priere.replace('_',' ')}</div>
            </div>
            <div class="flex items-center gap-3">
                ${m.statut_paiement === 'en_attente' 
                    ? '<span class="bg-orange-100 text-orange-600 px-3 py-1 rounded-full text-[9px] font-black uppercase italic animate-pulse">⏳ En attente</span>' 
                    : '<span class="bg-green-100 text-green-600 px-3 py-1 rounded-full text-[9px] font-black uppercase italic">✅ Validée</span>'}
                
                ${m.statut_paiement === 'confirme' 
                    ? `<button onclick="genererPDF('${m.id}')" class="bg-[#23318E] text-white px-4 py-1.5 rounded-lg text-[10px] font-black shadow-lg">REÇU PDF</button>` 
                    : ''}
            </div>
        </div>
    `).join('');
}

// ==========================================
// 5. GÉNÉRATION DU REÇU PDF (DESIGN PRO)
// ==========================================
async function genererPDF(id) {
    const { data: m } = await _supabase.from('demandes_messes').select('*').eq('id', id).single();
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');

    // Entête
    doc.setFillColor(35, 49, 142); doc.rect(0, 0, 210, 45, 'F');
    doc.setTextColor(255); doc.setFontSize(18); doc.setFont("helvetica", "bold");
    doc.text("PAROISSE NOTRE DAME DE L'ASSOMPTION", 105, 20, {align: 'center'});
    doc.setFontSize(10); doc.text("Agoè-Démakpoè, Lomé - TOGO | Reçu Officiel Numérique", 105, 30, {align: 'center'});

    // Corps
    doc.setTextColor(35, 49, 142); doc.setFontSize(22); doc.text("REÇU D'OFFRANDE", 105, 70, {align: 'center'});
    doc.setDrawColor(212, 175, 55); doc.setLineWidth(1); doc.line(70, 75, 140, 75);

    doc.setTextColor(50); doc.setFontSize(11); doc.setFont("helvetica", "normal");
    let y = 95;
    const l = (lab, val) => { doc.setFont("helvetica", "bold"); doc.text(lab, 25, y); doc.setFont("helvetica", "normal"); doc.text(String(val), 70, y); y+=10; };
    
    l("Bénéficiaire :", m.nom_beneficiaire);
    l("Intention :", m.details_intention.substring(0, 50) + "...");
    l("Messe :", m.type_priere.toUpperCase());
    l("Date :", m.date_debut);
    l("Transaction :", m.transaction_id);
    l("Montant :", m.montant_offrande + " FCFA");

    // Tampon
    doc.setDrawColor(200, 0, 0); doc.setLineWidth(1.5);
    doc.setTextColor(200, 0, 0); doc.setFontSize(16); doc.setFont("helvetica", "bold");
    doc.rect(140, 150, 45, 20); doc.text("PAYÉ", 162.5, 160, {align: 'center'});
    doc.setFontSize(8); doc.text("NDA DÉMAKPOÈ", 162.5, 166, {align: 'center'});

    doc.save(`Recu_NDA_${m.nom_beneficiaire}.pdf`);
}

// ==========================================
// 6. LITURGIE (VERSION PROXY)
// ==========================================
async function chargerLiturgie() {
    try {
        const date = new Date().toISOString().split('T')[0];
        const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(`https://api.aelf.org/v1/messe/${date}/france`)}`);
        const json = await res.json();
        const data = JSON.parse(json.contents);
        if(data?.messes?.[0]?.lectures) {
            const ev = data.messes[0].lectures.find(l => l.type === 'evangile') || data.messes[0].lectures[0];
            if(document.getElementById('versetJour')) document.getElementById('versetJour').innerText = ev.titre;
            if(document.getElementById('versetReference')) document.getElementById('versetReference').innerText = "Méditation du jour";
        }
    } catch (e) { console.log("Liturgie indisponible"); }
}

// DÉCONNEXION
const logoutBtn = document.getElementById('logoutBtn');
if(logoutBtn) {
    logoutBtn.onclick = async () => { await _supabase.auth.signOut(); window.location.href = 'auth.html'; };
}

// LANCEMENT
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('dashboard.html')) checkUser();
});