// ==========================================
// 1. CONFIGURATION SUPABASE
// ==========================================
const supabaseUrl = 'https://mkufkdtreeqcycnjtcxe.supabase.co'; 
const supabaseKey = 'sb_publishable_JOLl20jTfgDDSOjhyP53pA_qXXYz-N7'; 
const _supabase = supabase.createClient(supabaseUrl, supabaseKey);

// ==========================================
// 2. GESTION DE L'AUTHENTIFICATION
// ==========================================
let isLogin = true;
const toggleBtn = document.getElementById('toggleAuth');

if(toggleBtn) {
    toggleBtn.onclick = () => {
        isLogin = !isLogin;
        document.getElementById('authTitle').innerText = isLogin ? "Connexion" : "Inscription";
        document.getElementById('authBtn').innerText = isLogin ? "Entrer" : "S'inscrire";
        document.getElementById('username').classList.toggle('hidden');
        document.getElementById('toggleText').innerText = isLogin ? "Pas encore inscrit ?" : "Déjà membre ?";
        toggleBtn.innerText = isLogin ? "Créer un compte" : "Se connecter";
    };
}

const authForm = document.getElementById('authForm');
if(authForm) {
    authForm.onsubmit = async (e) => {
        e.preventDefault();
        const identifier = document.getElementById('identifier').value.trim();
        const password = document.getElementById('password').value;
        const username = document.getElementById('username')?.value.trim();
        
        // Création d'un email fictif si l'utilisateur entre un numéro de téléphone
        let finalEmail = identifier.includes('@') ? identifier : `${identifier}@paroisse.tg`;

        if (isLogin) {
            const { error } = await _supabase.auth.signInWithPassword({ email: finalEmail, password });
            if (error) alert("Identifiants incorrects ou compte inexistant.");
            else window.location.href = 'dashboard.html';
        } else {
            if(!username) return alert("Choisissez un pseudo !");
            const { data, error } = await _supabase.auth.signUp({ email: finalEmail, password });
            
            if (error) return alert(error.message);
            
            // Création du profil utilisateur
            await _supabase.from('profiles').insert([{ 
                id: data.user.id, 
                username: username, 
                email: identifier.includes('@') ? identifier : null
            }]);
            
            alert("Compte créé ! Connectez-vous maintenant.");
            location.reload();
        }
    };
}

// ==========================================
// 3. INITIALISATION DU DASHBOARD
// ==========================================
async function checkUser() {
    const { data: { user } } = await _supabase.auth.getUser();
    
    if (!user) {
        if (window.location.pathname.includes('dashboard.html')) window.location.href = 'auth.html';
        return;
    }

    // Récupérer le pseudo depuis la table profiles
    try {
        const { data: prof } = await _supabase.from('profiles').select('username').eq('id', user.id).single();
        const pseudo = prof ? prof.username : user.email.split('@')[0];
        
        if(document.getElementById('displayUsername')) document.getElementById('displayUsername').innerText = pseudo;
        if(document.getElementById('welcomeTitle')) {
            document.getElementById('welcomeTitle').innerHTML = `Bienvenue, <span class="text-[#23318E]">${pseudo}</span> 👋`;
        }
    } catch(e) { console.error("Erreur Profil:", e); }

    // Charger les données du dashboard
    chargerHistorique(user.id);
    chargerPrieres();
    chargerLiturgie();
}

// ==========================================
// 4. DEMANDE DE MESSE (ENVOI)
// ==========================================
const formMesse = document.getElementById('formMesse');
if (formMesse) {
    formMesse.onsubmit = async (e) => {
        e.preventDefault();
        const { data: { user } } = await _supabase.auth.getUser();

        const nouvelleDemande = {
            user_id: user.id,
            nom_beneficiaire: document.getElementById('nomBeneficiaire').value,
            details_intention: document.getElementById('detailsIntention').value,
            type_priere: document.getElementById('typePriere').value,
            date_debut: document.getElementById('dateDebut').value,
            transaction_id: document.getElementById('transactionId').value,
            info_expediteur: document.getElementById('infoExpediteur').value,
            montant_offrande: parseInt(document.getElementById('montant').value),
            statut_paiement: 'en_attente'
        };

        const { error } = await _supabase.from('demandes_messes').insert([nouvelleDemande]);

        if (error) {
            alert("Erreur lors de l'envoi : " + error.message);
        } else {
            alert("🙏 Demande envoyée avec succès ! Le secrétariat va valider votre demande après vérification.");
            if(typeof fermerModal === 'function') fermerModal();
            location.reload(); 
        }
    };
}

// ==========================================
// 5. HISTORIQUE ET REÇU PDF
// ==========================================
async function chargerHistorique(uid) {
    const div = document.getElementById('historique'); 
    if(!div) return;

    const { data, error } = await _supabase
        .from('demandes_messes')
        .select('*')
        .eq('user_id', uid)
        .order('created_at', { ascending: false });
    
    if(error || !data || data.length === 0) { 
        div.innerHTML = "<p class='text-gray-400 py-10 italic'>Aucune demande enregistrée.</p>"; 
        return; 
    }

    let html = `<div class='overflow-x-auto'><table class='w-full text-left text-[11px]'>
                <thead class='bg-gray-50 uppercase font-black'>
                    <tr><th class='p-3'>Bénéficiaire</th><th class='p-3'>Statut</th><th class='p-3 text-right'>Action</th></tr>
                </thead><tbody class='divide-y'>`;
    
    data.forEach(m => {
        const estValide = m.statut_paiement === 'confirme';
        html += `<tr>
                 <td class='p-3'><div class='font-bold text-gray-800'>${m.nom_beneficiaire}</div><div class='text-[9px] opacity-50'>${m.type_priere}</div></td>
                 <td class='p-3 font-black uppercase ${estValide ? "text-green-600" : "text-orange-500"}'>
                    ${estValide ? "✅ Validé" : "⏳ Attente"}
                 </td>
                 <td class='p-3 text-right'>
                    ${estValide ? 
                        `<button onclick="genererPDF('${m.id}')" class='bg-blue-600 text-white px-3 py-1 rounded-lg font-bold shadow-sm'>REÇU PDF</button>` : 
                        `<span class='text-gray-300 italic'>En cours...</span>`}
                 </td></tr>`;
    });
    div.innerHTML = html + "</tbody></table></div>";
}

async function genererPDF(id) {
    const { data: m, error } = await _supabase.from('demandes_messes').select('*').eq('id', id).single();
    if (error || !m) return alert("Erreur de récupération des données.");

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');

    const dessinerRecu = (logoData = null) => {
        // --- DESIGN GÉNÉRAL ---
        doc.setDrawColor(35, 49, 142); doc.setLineWidth(0.5);
        doc.rect(7, 7, 196, 283); // Bordure

        // --- HEADER ---
        doc.setFillColor(35, 49, 142); doc.rect(7, 7, 196, 40, 'F');
        if (logoData) doc.addImage(logoData, 'JPEG', 15, 12, 30, 30);
        
        doc.setTextColor(255); doc.setFontSize(18); doc.setFont("helvetica", "bold");
        doc.text("PAROISSE NOTRE DAME DE L'ASSOMPTION", 50, 22);
        doc.setFontSize(10); doc.setFont("helvetica", "normal");
        doc.text("Agoè Démakpoè, Lomé - TOGO", 50, 28);
        doc.text("Plateforme Numérique Officielle", 50, 33);

        // --- TITRE ---
        doc.setTextColor(35, 49, 142); doc.setFontSize(22);
        doc.text("REÇU D'OFFRANDE", 105, 65, { align: "center" });
        doc.setFontSize(9); doc.setTextColor(150);
        doc.text("RÉFÉRENCE : " + m.id.substring(0, 8).toUpperCase(), 105, 72, { align: "center" });

        // --- TABLEAU ---
        let y = 90;
        const row = (label, val) => {
            doc.setFont("helvetica", "bold"); doc.setTextColor(80); doc.text(label, 25, y);
            doc.setFont("helvetica", "normal"); doc.setTextColor(0);
            const lines = doc.splitTextToSize(String(val || ""), 110);
            doc.text(lines, 75, y);
            y += (lines.length * 7) + 5;
            doc.setDrawColor(230); doc.line(25, y - 5, 185, y - 5);
        };

        row("Bénéficiaire :", m.nom_beneficiaire);
        row("Intention :", m.details_intention);
        row("Type :", m.type_priere.toUpperCase());
        row("Date de début :", m.date_debut);
        row("Transaction :", m.transaction_id + " (" + m.info_expediteur + ")");

        // --- MONTANT ---
        y += 10;
        doc.setFillColor(245, 247, 255); doc.roundedRect(25, y, 160, 20, 3, 3, 'F');
        doc.setFont("helvetica", "bold"); doc.setFontSize(14); doc.setTextColor(35, 49, 142);
        doc.text("MONTANT PAYÉ :", 35, y + 13);
        doc.text(m.montant_offrande + " FCFA", 180, y + 13, { align: "right" });

        // --- TAMPON ---
        y += 40;
        doc.setDrawColor(34, 197, 94); doc.rect(140, y, 45, 20);
        doc.setTextColor(34, 197, 94); doc.setFontSize(12); doc.text("PAYÉ / VALIDÉ", 162.5, y + 10, { align: "center" });
        doc.setFontSize(7); doc.text("SECRETARIAT NUMÉRIQUE", 162.5, y + 16, { align: "center" });

        // --- FOOTER ---
        doc.setTextColor(180); doc.setFontSize(8); doc.setFont("helvetica", "italic");
        doc.text("« Que le Seigneur vous bénisse pour votre offrande. »", 105, 275, { align: "center" });
        doc.text("Document généré le " + new Date().toLocaleString(), 105, 280, { align: "center" });

        doc.save(`Recu_Messe_${m.nom_beneficiaire}.pdf`);
    };

    const img = new Image();
    img.src = 'logo-paroisse.jpeg.jpeg';
    img.onload = () => dessinerRecu(img);
    img.onerror = () => dessinerRecu(null);
}

// ==========================================
// 6. MUR DE PRIÈRES
// ==========================================
async function posterPriere() {
    const t = document.getElementById('nouvellePriere').value; 
    if(!t) return;
    await _supabase.from('mur_prieres').insert([{ texte_priere: t }]);
    document.getElementById('nouvellePriere').value = ""; 
    chargerPrieres();
}

async function chargerPrieres() {
    const { data } = await _supabase.from('mur_prieres').select('*').order('created_at', { ascending: false }).limit(6);
    const d = document.getElementById('listePrieres'); 
    if(!d || !data) return;
    d.innerHTML = data.map(p => `
        <div class="bg-gray-50 p-3 rounded-2xl flex justify-between items-center border border-gray-100 shadow-sm">
            <p class="italic text-[10px] text-gray-600">"${p.texte_priere}"</p>
            <button onclick="ajouterAmen('${p.id}', ${p.compteur_amen})" class="bg-white border text-orange-600 px-3 py-1 rounded-xl font-bold text-[10px] hover:bg-orange-50 transition">🙏 ${p.compteur_amen}</button>
        </div>
    `).join('');
}

async function ajouterAmen(id, act) { 
    await _supabase.from('mur_prieres').update({ compteur_amen: act + 1 }).eq('id', id); 
    chargerPrieres(); 
}

// ==========================================
// 7. LITURGIE (API AELF AVEC SÉCURITÉ)
// ==========================================
// --- FONCTION LITURGIE (VERSION PROXY POUR ÉVITER LES BLOCAGES) ---
async function chargerLiturgie() {
    const titreElem = document.getElementById('titreJour');
    const texteElem = document.getElementById('texteLecture');
    if (!titreElem || !texteElem) return;

    try {
        const aujourdhui = new Date().toISOString().split('T')[0];
        // Nous utilisons un proxy (allorigins) pour contourner le blocage CORS de l'AELF
        const apiUrl = `https://api.aelf.org/v1/messe/${aujourdhui}/france`;
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(apiUrl)}`;

        const res = await fetch(proxyUrl);
        if (!res.ok) throw new Error();
        
        const responseData = await res.json();
        // AllOrigins renvoie les données dans un champ "contents" sous forme de texte, on doit le transformer en JSON
        const data = JSON.parse(responseData.contents);

        if(data && data.messes && data.messes.length > 0) {
            const messe = data.messes[0];
            // On cherche l'évangile ou la dernière lecture disponible
            const evangile = messe.lectures.find(l => l.type === 'evangile') || messe.lectures[messe.lectures.length - 1];
            
            titreElem.innerText = evangile.titre || "Évangile du jour";
            // On remplace les sauts de ligne par des balises <br> pour un meilleur affichage
            texteElem.innerHTML = evangile.texte.replace(/\n/g, '<br>');
        } else {
            throw new Error("Données vides");
        }
    } catch (e) {
        console.error("Erreur Liturgie Proxy:", e);
        // Message de secours si même le proxy échoue
        titreElem.innerText = "Parole de Dieu";
        texteElem.innerHTML = `
            <div class="text-center py-6">
                <p class="text-xl italic font-serif">« Ta parole est une lampe à mes pieds, une lumière sur mon sentier. »</p>
                <p class="mt-3 font-bold text-blue-300">(Psaume 118, 105)</p>
                <div class="mt-6">
                    <a href="https://www.aelf.org" target="_blank" class="bg-white/20 px-4 py-2 rounded-full text-xs hover:bg-white/30 transition">Lire sur AELF.org</a>
                </div>
            </div>
        `;
    }
}
}

// ==========================================
// 8. DÉCONNEXION ET LANCEMENT
// ==========================================
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) { 
    logoutBtn.onclick = async () => { 
        await _supabase.auth.signOut(); 
        window.location.href = 'auth.html'; 
    }; 
}

// Lancement automatique au chargement de la page
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('dashboard.html')) {
        checkUser();
    }
});