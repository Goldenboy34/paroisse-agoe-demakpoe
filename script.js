// 1. CONFIGURATION SUPABASE
const supabaseUrl = 'https://mkufkdtreeqcycnjtcxe.supabase.co'; 
const supabaseKey = 'sb_publishable_JOLl20jTfgDDSOjhyP53pA_qXXYz-N7'; 
const _supabase = supabase.createClient(supabaseUrl, supabaseKey);

// --- AUTHENTIFICATION ---
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
        let finalEmail = identifier.includes('@') ? identifier : `${identifier}@paroisse.tg`;

        if (isLogin) {
            const { error } = await _supabase.auth.signInWithPassword({ email: finalEmail, password });
            if (error) alert("Erreur : " + error.message);
            else window.location.href = 'dashboard.html';
        } else {
            if(!username) return alert("Choisissez un pseudo !");
            const { data, error } = await _supabase.auth.signUp({ email: finalEmail, password });
            if (error) return alert(error.message);
            
            // Créer le profil après l'inscription
            await _supabase.from('profiles').insert([{ 
                id: data.user.id, 
                username: username, 
                email: identifier.includes('@') ? identifier : null, 
                phone: identifier.includes('@') ? null : identifier 
            }]);
            
            alert("Compte créé ! Connectez-vous maintenant.");
            location.reload();
        }
    };
}

// --- INITIALISATION DU DASHBOARD ---
async function checkUser() {
    const { data: { user }, error: authError } = await _supabase.auth.getUser();
    
    if (!user || authError) {
        if (window.location.pathname.includes('dashboard.html')) window.location.href = 'auth.html';
        return;
    }

    // Charger le Pseudo
    try {
        const { data: prof } = await _supabase.from('profiles').select('username').eq('id', user.id).single();
        const pseudo = prof ? prof.username : user.email.split('@')[0];
        
        if(document.getElementById('displayUsername')) document.getElementById('displayUsername').innerText = pseudo;
        if(document.getElementById('welcomeTitle')) document.getElementById('welcomeTitle').innerHTML = `Bienvenue, <span class="text-[#23318E]">${pseudo}</span> 👋`;
    } catch(e) { console.log("Erreur profil:", e); }

    // Charger les données
    chargerHistorique(user.id);
    chargerPrieres();
    chargerLiturgie();
}

// --- ENVOI DEMANDE DE MESSE ---
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
            alert("Demande envoyée avec succès ! Le secrétariat validera après vérification du transfert.");
            if(typeof fermerModal === 'function') fermerModal();
            location.reload();
        }
    };
}

// --- GESTION DE L'HISTORIQUE ---
async function chargerHistorique(uid) {
    const div = document.getElementById('historique'); 
    if(!div) return;

    const { data, error } = await _supabase
        .from('demandes_messes')
        .select('*')
        .eq('user_id', uid)
        .order('created_at', { ascending: false });
    
    if(error || !data || data.length === 0) { 
        div.innerHTML = "<p class='text-gray-400 py-10'>Aucune demande enregistrée.</p>"; 
        return; 
    }

    let html = `<div class='overflow-x-auto'><table class='w-full text-left text-xs'>
                <thead class='bg-gray-50 uppercase font-black'><tr><th class='p-3'>Bénéficiaire</th><th class='p-3'>Statut</th><th class='p-3'>Reçu</th></tr></thead><tbody>`;
    
    data.forEach(m => {
        const ok = m.statut_paiement === 'confirme';
        html += `<tr class='border-b'>
                 <td class='p-3 font-bold text-gray-700'>${m.nom_beneficiaire}</td>
                 <td class='p-3 font-black uppercase ${ok?"text-green-600":"text-orange-500"}'>${ok?"Validé":"Attente"}</td>
                 <td class='p-3'>${ok?`<button onclick="genererPDF('${m.id}')" class='text-blue-700 font-bold underline'>Télécharger</button>`:"---"}</td></tr>`;
    });
    div.innerHTML = html + "</tbody></table></div>";
}

// --- GÉNÉRATION PDF ---
async function genererPDF(id) {
    const { data: m } = await _supabase.from('demandes_messes').select('*').eq('id', id).single();
    if (!m) return alert("Données introuvables");

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    const construire = (logo = null) => {
        // Design du reçu
        doc.setFillColor(35, 49, 142); doc.rect(0, 0, 210, 40, 'F');
        if(logo) doc.addImage(logo, 'JPEG', 10, 5, 30, 30);
        
        doc.setTextColor(255); doc.setFontSize(16); doc.text("NDA DÉMAKPOÈ - REÇU OFFICIEL", 50, 20);
        
        doc.setTextColor(0); doc.setFontSize(12);
        let y = 60;
        const line = (label, val) => {
            doc.setFont("helvetica", "bold"); doc.text(label, 20, y);
            doc.setFont("helvetica", "normal"); doc.text(String(val), 70, y);
            y += 10;
        };

        line("Bénéficiaire :", m.nom_beneficiaire);
        line("Type :", m.type_priere.toUpperCase());
        line("Montant :", m.montant_offrande + " FCFA");
        line("Date de début :", m.date_debut);
        line("ID Transaction :", m.transaction_id);

        doc.setDrawColor(34, 197, 94); doc.rect(140, 100, 40, 20);
        doc.setTextColor(34, 197, 94); doc.text("PAYÉ", 150, 113);

        doc.save(`Recu_Messe_${m.nom_beneficiaire}.pdf`);
    };

    const img = new Image();
    img.src = 'logo-paroisse.jpeg.jpeg';
    img.onload = () => construire(img);
    img.onerror = () => construire(null);
}

// --- MUR DE PRIÈRES ---
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
        <div class="bg-gray-50 p-4 rounded-2xl flex justify-between items-center shadow-sm border border-gray-100">
            <p class="italic text-[11px] text-gray-600">"${p.texte_priere}"</p>
            <button onclick="ajouterAmen('${p.id}', ${p.compteur_amen})" class="bg-white border text-orange-600 px-3 py-1 rounded-xl font-bold text-xs hover:bg-orange-50 transition">🙏 ${p.compteur_amen}</button>
        </div>
    `).join('');
}

async function ajouterAmen(id, act) { 
    await _supabase.from('mur_prieres').update({ compteur_amen: act + 1 }).eq('id', id); 
    chargerPrieres(); 
}

// --- LITURGIE ---
async function chargerLiturgie() {
    try {
        const d = new Date().toISOString().split('T')[0];
        const res = await fetch(`https://api.aelf.org/v1/messe/${d}/france`);
        const data = await res.json();
        if(data.messes && data.messes[0].lectures) {
            const lectures = data.messes[0].lectures;
            const evangile = lectures[lectures.length - 1];
            document.getElementById('titreJour').innerText = evangile.titre || "Évangile du jour";
            document.getElementById('texteLecture').innerHTML = evangile.texte;
        }
    } catch(e) { 
        document.getElementById('titreJour').innerText = "La Parole de Dieu";
        document.getElementById('texteLecture').innerText = "Lectures disponibles à la paroisse.";
    }
}

// LOGOUT
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) { 
    logoutBtn.onclick = async () => { 
        await _supabase.auth.signOut(); 
        window.location.href = 'auth.html'; 
    }; 
}

// LANCEMENT
document.addEventListener('DOMContentLoaded', () => {
    if(window.location.pathname.includes('dashboard.html')) {
        checkUser();
    }
});