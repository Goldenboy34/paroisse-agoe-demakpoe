// ==========================================
// 1. CONFIGURATION SUPABASE
// ==========================================
const supabaseUrl = 'https://mkufkdtreeqcycnjtcxe.supabase.co'; 
const supabaseKey = 'sb_publishable_JOLl20jTfgDDSOjhyP53pA_qXXYz-N7'; 
const _supabase = supabase.createClient(supabaseUrl, supabaseKey);

// ==========================================
// 2. GESTION DE L'AUTHENTIFICATION (auth.html)
// ==========================================
const authForm = document.getElementById('authForm');
if(authForm) {
    authForm.onsubmit = async (e) => {
        e.preventDefault();
        const identifier = document.getElementById('identifier').value.trim();
        const password = document.getElementById('password').value;
        const usernameElem = document.getElementById('username');
        const titleElem = document.getElementById('authTitle');
        
        // Création email fictif pour les numéros de téléphone
        let email = identifier.includes('@') ? identifier : `${identifier}@paroisse.tg`;
        const isLogin = titleElem.innerText === "Connexion";

        try {
            if (isLogin) {
                const { error } = await _supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
                window.location.href = 'dashboard.html';
            } else {
                const username = usernameElem.value.trim();
                if(!username) return alert("Nom complet requis !");
                
                const { data, error } = await _supabase.auth.signUp({ email, password });
                if (error) throw error;

                if (data.user) {
                    await _supabase.from('profiles').insert([{ id: data.user.id, username: username, email: identifier }]);
                    alert("Inscription réussie ! Connectez-vous.");
                    location.reload();
                }
            }
        } catch (err) {
            alert("Erreur : " + err.message);
        }
    };

    // Gestion du basculement Connexion / Inscription
    const toggleBtn = document.getElementById('toggleAuth');
    if(toggleBtn) {
        toggleBtn.onclick = () => {
            const title = document.getElementById('authTitle');
            const btn = document.getElementById('authBtn');
            const userField = document.getElementById('usernameField') || document.getElementById('username');
            const toggleT = document.getElementById('toggleText');

            if (title.innerText === "Connexion") {
                title.innerText = "Inscription";
                btn.innerText = "S'inscrire";
                if(userField) userField.classList.remove('hidden');
                toggleT.innerText = "Déjà inscrit ?";
                toggleBtn.innerText = "Se connecter";
            } else {
                title.innerText = "Connexion";
                btn.innerText = "Entrer";
                if(userField) userField.classList.add('hidden');
                toggleT.innerText = "Pas encore inscrit ?";
                toggleBtn.innerText = "Créer un compte";
            }
        };
    }
}

// ==========================================
// 3. LOGIQUE DU DASHBOARD (dashboard.html)
// ==========================================
async function initDashboard() {
    const { data: { user } } = await _supabase.auth.getUser();
    if (!user) {
        window.location.href = 'auth.html';
        return;
    }

    // Récupérer le pseudo
    const { data: prof } = await _supabase.from('profiles').select('username').eq('id', user.id).single();
    const pseudo = prof ? prof.username : "Fidèle";
    
    // Affichage Bienvenue
    const welcome = document.getElementById('welcomeTitle');
    const displayUser = document.getElementById('displayUsername');
    if(welcome) welcome.innerHTML = `Bienvenue, <span class="text-[#23318E]">${pseudo}</span> 👋`;
    if(displayUser) displayUser.innerText = pseudo;

    // Charger les autres composants
    chargerLiturgie();
    chargerHistorique(user.id);
    async function monitorUsers() {
    const { data: users, error } = await _supabase
        .from('profiles')
        .select('*')
        .order('last_seen', { ascending: false });

    const table = document.getElementById('userMonitoringTable');
    
    // On utilise aussi Realtime pour savoir qui est "Vraiment" là maintenant
    const channel = _supabase.channel('online-users');
    let onlineUsersIds = [];

    channel.on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        onlineUsersIds = Object.keys(state);
        renderTable(users, onlineUsersIds);
    }).subscribe();

    renderTable(users, onlineUsersIds);
}

function renderTable(users, onlineIds) {
    const table = document.getElementById('userMonitoringTable');
    table.innerHTML = users.map(u => {
        const isOnline = onlineIds.includes(u.id);
        const lastSeenDate = new Date(u.last_seen).toLocaleString('fr-FR');
        
        return `
            <tr class="hover:bg-gray-50 transition">
                <td class="p-6">
                    <div class="font-black text-gray-800 uppercase text-xs">${u.username}</div>
                    <div class="text-[9px] text-gray-400">${u.email || 'Pas d\'email'}</div>
                </td>
                <td class="p-6 text-[11px] font-bold text-gray-500">
                    ${lastSeenDate}
                </td>
                <td class="p-6">
                    ${isOnline 
                        ? '<span class="bg-green-100 text-green-600 px-3 py-1 rounded-full text-[9px] font-black uppercase italic">En ligne</span>' 
                        : '<span class="bg-gray-100 text-gray-400 px-3 py-1 rounded-full text-[9px] font-black uppercase">Hors ligne</span>'}
                </td>
                <td class="p-6 text-right">
                    ${u.is_active 
                        ? `<button onclick="toggleUserStatus('${u.id}', false)" class="bg-red-50 text-red-600 border border-red-100 px-4 py-2 rounded-xl text-[10px] font-black hover:bg-red-600 hover:text-white transition">DÉCONNECTER</button>`
                        : `<button onclick="toggleUserStatus('${u.id}', true)" class="bg-green-600 text-white px-4 py-2 rounded-xl text-[10px] font-black">RÉACTIVER</button>`
                    }
                </td>
            </tr>
        `;
    }).join('');
}

// Fonction pour déconnecter / bloquer
async function toggleUserStatus(userId, status) {
    const action = status ? "réactiver" : "déconnecter de force";
    if(confirm(`Voulez-vous vraiment ${action} cet utilisateur ?`)) {
        const { error } = await _supabase
            .from('profiles')
            .update({ is_active: status })
            .eq('id', userId);
        
        if(error) alert(error.message);
        else location.reload();
    }
}

// Lancer la surveillance
window.onload = () => {
    loadAdmin(); // Ta fonction de chargement des messes
    monitorUsers(); // La nouvelle fonction de surveillance
};
}

// Liturgie (AELF via Proxy)
async function chargerLiturgie() {
    try {
        const date = new Date().toISOString().split('T')[0];
        const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(`https://api.aelf.org/v1/messe/${date}/france`)}`);
        const json = await res.json();
        const data = JSON.parse(json.contents);

        if(data?.messes?.[0]?.lectures) {
            const ev = data.messes[0].lectures.find(l => l.type === 'evangile') || data.messes[0].lectures[0];
            const verset = document.getElementById('versetJour');
            const titre = document.getElementById('titreLecture');
            const texte = document.getElementById('texteLecture');

            if(verset) verset.innerText = ev.titre;
            if(titre) titre.innerText = ev.titre;
            if(texte) texte.innerHTML = ev.texte;
        }
    } catch (e) {
        console.error("Erreur API AELF");
    }
}

// Envoi Formulaire Messe
const formMesse = document.getElementById('formMesse');
if(formMesse) {
    formMesse.onsubmit = async (e) => {
        e.preventDefault();
        const { data: { user } } = await _supabase.auth.getUser();

        const dataMesse = {
            user_id: user.id,
            nom_beneficiaire: document.getElementById('nomBeneficiaire').value,
            details_intention: document.getElementById('detailsIntention').value,
            type_priere: document.getElementById('typePriere').value,
            date_debut: document.getElementById('dateDebut').value,
            transaction_id: document.getElementById('transactionId').value,
            montant_offrande: parseInt(document.getElementById('montant').value),
            statut_paiement: 'en_attente'
        };

        const { error } = await _supabase.from('demandes_messes').insert([dataMesse]);
        if(error) alert(error.message);
        else {
            alert("Demande envoyée au secrétariat !");
            location.reload();
        }
    };
}

// Historique
async function chargerHistorique(uid) {
    const div = document.getElementById('historiqueContent');
    if(!div) return;

    const { data } = await _supabase.from('demandes_messes').select('*').eq('user_id', uid).order('created_at', {ascending: false});

    if(!data || data.length === 0) {
        div.innerHTML = "<p class='py-6 text-gray-400'>Aucune demande enregistrée.</p>";
        return;
    }

    div.innerHTML = data.map(m => `
        <div class="flex justify-between items-center p-4 border-b">
            <div class="text-left">
                <div class="font-black text-xs uppercase text-gray-800">${m.nom_beneficiaire}</div>
                <div class="text-[9px] text-gray-400 font-bold">${m.date_debut}</div>
            </div>
            <div class="flex items-center gap-2">
                ${m.statut_paiement === 'en_attente' 
                    ? '<span class="text-[9px] font-bold text-orange-500 bg-orange-50 px-2 py-1 rounded">ATTENTE</span>' 
                    : '<span class="text-[9px] font-bold text-green-600 bg-green-50 px-2 py-1 rounded">VALIDÉ</span>'}
                
                ${m.statut_paiement === 'confirme' 
                    ? `<button onclick="genererPDF('${m.id}')" class="bg-[#23318E] text-white px-3 py-1 rounded text-[10px] font-bold">PDF</button>` 
                    : ''}
            </div>
        </div>
    `).join('');
}

// PDF
async function genererPDF(id) {
    console.log("Génération du PDF pour l'ID:", id);
    
    try {
        // 1. Récupération des données
        const { data: m, error } = await _supabase.from('demandes_messes').select('*').eq('id', id).single();
        
        if (error || !m) {
            alert("Erreur Supabase : Impossible de trouver les données de la messe.");
            return;
        }

        // 2. Initialisation de jsPDF
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');

        // --- DESIGN DE L'ENTÊTE ---
        doc.setFillColor(35, 49, 142); // Bleu Marine
        doc.rect(0, 0, 210, 40, 'F'); 

        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(18);
        doc.text("PAROISSE NOTRE DAME DE L'ASSOMPTION", 105, 15, { align: "center" });
        
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text("Agoè-Démakpoè, Lomé - TOGO", 105, 22, { align: "center" });
        doc.text("Secrétariat Paroissial - Reçu Officiel numérique", 105, 28, { align: "center" });

        // --- CORPS DU DOCUMENT ---
        doc.setTextColor(35, 49, 142);
        doc.setFontSize(20);
        doc.setFont("times", "bold");
        doc.text("REÇU D'OFFRANDE", 105, 55, { align: "center" });
        
        // Ligne de séparation Or
        doc.setDrawColor(212, 175, 55);
        doc.setLineWidth(0.8);
        doc.line(60, 60, 150, 60);

        // Informations de référence
        doc.setTextColor(100);
        doc.setFontSize(9);
        const dateEmi = m.created_at ? new Date(m.created_at).toLocaleDateString('fr-FR') : new Date().toLocaleDateString('fr-FR');
        doc.text(`Réf : NDA-${m.id.substring(0, 8).toUpperCase()}`, 20, 70);
        doc.text(`Fait à Lomé, le ${dateEmi}`, 150, 70);

        // --- ENCADRÉ DES DÉTAILS ---
        doc.setDrawColor(200);
        doc.setFillColor(248, 248, 248);
        doc.roundedRect(15, 75, 180, 85, 3, 3, 'FD');

        doc.setTextColor(40);
        doc.setFontSize(11);
        
        let y = 90;
        const ligne = (label, valeur) => {
            doc.setFont("helvetica", "bold");
            doc.text(label, 25, y);
            doc.setFont("helvetica", "normal");
            const textValue = doc.splitTextToSize(String(valeur || ""), 110);
            doc.text(textValue, 75, y);
            y += (textValue.length * 7) + 4;
        };

        ligne("Bénéficiaire :", m.nom_beneficiaire);
        ligne("Intention :", m.details_intention);
        ligne("Type de Messe :", m.type_priere ? m.type_priere.toUpperCase() : "MESSE UNIQUE");
        ligne("Date demandée :", m.date_debut ? new Date(m.date_debut).toLocaleDateString('fr-FR') : "-");
        ligne("Paiement via :", m.transaction_id || "Mobile Money");

        // --- MONTANT ---
        y += 5;
        doc.setFillColor(35, 49, 142);
        doc.roundedRect(120, y, 70, 12, 2, 2, 'F');
        doc.setTextColor(255);
        doc.setFont("helvetica", "bold");
        doc.text(`TOTAL : ${m.montant_offrande} FCFA`, 155, y + 8, { align: "center" });

        // --- TAMPON DE VALIDATION (Version simplifiée pour éviter les bugs) ---
        const stampX = 135;
        const stampY = 180;
        doc.setDrawColor(200, 0, 0); // Rouge
        doc.setLineWidth(1);
        doc.setTextColor(200, 0, 0);
        
        // Dessin du cadre du tampon
        doc.rect(stampX, stampY, 50, 20); 
        doc.setFontSize(14);
        doc.text("PAYÉ", stampX + 25, stampY + 10, { align: "center" });
        doc.setFontSize(8);
        doc.text(`VALIDÉ LE ${new Date().toLocaleDateString()}`, stampX + 25, stampY + 16, { align: "center" });

        // --- BAS DE PAGE ---
        doc.setTextColor(150);
        doc.setFont("times", "italic");
        doc.setFontSize(10);
        doc.text("« Que le Seigneur vous bénisse pour votre offrande et exauce vos prières. »", 105, 260, { align: "center" });

        // --- DÉCLENCHEMENT DU TÉLÉCHARGEMENT ---
        doc.save(`Recu_NDA_${m.nom_beneficiaire.replace(/\s+/g, '_')}.pdf`);
        console.log("PDF généré avec succès.");

    } catch (err) {
        console.error("Erreur critique PDF:", err);
        alert("Désolé, une erreur est survenue lors de la création du PDF : " + err.message);
    }
    // --- DANS LA FONCTION checkUser() ---

async function checkUser() {
    const { data: { user } } = await _supabase.auth.getUser();
    if (!user) { /* ... redirection auth.html ... */ return; }

    // 1. Vérifier si l'admin a déconnecté cet utilisateur
    const { data: profile } = await _supabase.from('profiles').select('is_active').eq('id', user.id).single();
    if (profile && profile.is_active === false) {
        alert("Votre session a été fermée par l'administrateur.");
        await _supabase.auth.signOut();
        window.location.href = 'auth.html';
        return;
    }

    // 2. Mettre à jour l'heure de dernière vue (Database)
    await _supabase.from('profiles').update({ last_seen: new Date().toISOString() }).eq('id', user.id);

    // 3. Système Realtime (Presence) pour l'admin
    const channel = _supabase.channel('online-users', {
        config: { presence: { key: user.id } }
    });

    channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
            // On envoie les infos de l'utilisateur sur le canal direct
            await channel.track({
                user_id: user.id,
                online_at: new Date().toISOString()
            });
        }
    });
}
}



// Déconnexion
const logoutBtn = document.getElementById('logoutBtn');
if(logoutBtn) {
    logoutBtn.onclick = async () => {
        await _supabase.auth.signOut();
        window.location.href = 'auth.html';
    };
}

// Lancement automatique
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('dashboard.html')) {
        initDashboard();
    }
});