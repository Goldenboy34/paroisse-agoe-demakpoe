// 1. CONFIGURATION
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
            if (error) alert("Identifiants incorrects.");
            else window.location.href = 'dashboard.html';
        } else {
            if(!username) return alert("Choisissez un pseudo !");
            const { data, error } = await _supabase.auth.signUp({ email: finalEmail, password });
            if (error) return alert(error.message);
            await _supabase.from('profiles').insert([{ id: data.user.id, username: username, email: identifier.includes('@')?identifier:null, phone: identifier.includes('@')?null:identifier }]);
            alert("Compte créé ! Connectez-vous.");
            location.reload();
        }
    };
}

// --- INITIALISATION DU DASHBOARD ---
async function checkUser() {
    console.log("Vérification de l'utilisateur...");
    const { data: { user }, error: authError } = await _supabase.auth.getUser();
    
    if (!user || authError) {
        console.log("Utilisateur non connecté, redirection...");
        if (window.location.pathname.includes('dashboard.html')) window.location.href = 'auth.html';
        return;
    }

    console.log("Utilisateur connecté :", user.email);

    // Charger le Pseudo
    try {
        const { data: prof } = await _supabase.from('profiles').select('username').eq('id', user.id).single();
        const pseudo = prof ? prof.username : user.email.split('@')[0];
        
        if(document.getElementById('displayUsername')) document.getElementById('displayUsername').innerText = pseudo;
        if(document.getElementById('welcomeTitle')) document.getElementById('welcomeTitle').innerHTML = `Bienvenue, <span class="text-[#23318E]">${pseudo}</span> 👋`;
    } catch(e) { console.log("Erreur profil:", e); }

    // Lancer les chargements
    chargerHistorique(user.id);
    chargerPrieres();
    chargerLiturgie();
}

// --- GESTION DE L'HISTORIQUE ---
async function chargerHistorique(uid) {
    console.log("Chargement de l'historique pour :", uid);
    const div = document.getElementById('historique'); 
    if(!div) return;

    const { data, error } = await _supabase
        .from('demandes_messes')
        .select('*')
        .eq('user_id', uid)
        .order('created_at', { ascending: false });
    
    if(error) {
        console.error("Erreur historique Supabase :", error);
        div.innerHTML = "<p class='text-red-500 text-xs'>Erreur de connexion aux données.</p>";
        return;
    }

    if(!data || data.length === 0) { 
        div.innerHTML = "<p class='text-gray-400 py-10'>Aucune demande enregistrée.</p>"; 
        return; 
    }

    let html = `<div class='overflow-x-auto'><table class='w-full text-left text-xs'>
                <thead class='bg-gray-50 uppercase font-black'><tr><th class='p-3'>Bénéficiaire</th><th class='p-3'>Statut</th><th class='p-3'>Reçu</th></tr></thead><tbody>`;
    
    data.forEach(m => {
        const statutBrut = (m.statut_paiement || "").toLowerCase().trim();
        const ok = statutBrut.includes("confirm");
        
        html += `<tr class='border-b'>
                 <td class='p-3 font-bold text-gray-700 break-all max-w-[120px]'>${m.nom_beneficiaire}</td>
                 <td class='p-3 font-black uppercase ${ok?"text-green-600":"text-orange-500"}'>${ok?"Validé":"Attente"}</td>
                 <td class='p-3'>${ok?`<button onclick="genererPDF('${m.id}')" class='text-blue-700 font-bold underline'>Télécharger</button>`:"---"}</td></tr>`;
    });
    div.innerHTML = html + "</tbody></table></div>";
}

// --- GÉNÉRATION PDF CHIC AVEC CACHET ---
async function genererPDF(id) {
    const { data: m } = await _supabase.from('demandes_messes').select('*').eq('id', id).single();
    if (!m) return alert("Données introuvables");

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    const construire = (logo = null) => {
        // En-tête bleu
        doc.setFillColor(35, 49, 142); doc.rect(0, 0, 210, 50, 'F');
        
        if(logo) {
            doc.setFillColor(255, 255, 255); doc.circle(25, 25, 18, 'F');
            doc.addImage(logo, 'JPEG', 10, 10, 30, 30);
        }

        doc.setTextColor(255); doc.setFont("helvetica", "bold"); doc.setFontSize(14);
        doc.text("PAROISSE NOTRE DAME DE L'ASSOMPTION", 45, 20);
        doc.setFontSize(9); doc.setFont("helvetica", "normal");
        doc.text("Agoè Démakpoè Apegnigbi - Lomé, Togo", 45, 28);
        doc.text("Reçu Officiel Numérique", 45, 34);

        // Corps
        doc.setTextColor(35, 49, 142); doc.setFontSize(22); doc.text("REÇU D'OFFRANDE", 105, 75, { align: "center" });
        doc.setDrawColor(35, 49, 142); doc.line(60, 80, 150, 80);

        doc.setTextColor(0); doc.setFontSize(11);
        let y = 100;
        const line = (lab, val) => {
            doc.setFont("helvetica", "bold"); doc.text(lab, 20, y);
            doc.setFont("helvetica", "normal");
            const txt = doc.splitTextToSize(String(val), 130);
            doc.text(txt, 65, y); y += (txt.length * 7) + 2;
        };

        line("Bénéficiaire :", m.nom_beneficiaire);
        line("Intention :", m.details_intention || "Non précisée");
        line("Type :", m.type_priere.toUpperCase());
        line("Date :", new Date(m.date_debut).toLocaleDateString('fr-FR'));
        line("Montant :", m.montant_offrande + " FCFA");
        line("Transaction :", m.transaction_id + " (" + (m.info_expediteur || "Mobile") + ")");

        // CACHET VERT "PAYÉ"
        doc.setDrawColor(34, 197, 94); doc.setLineWidth(1);
        doc.roundedRect(140, 170, 50, 25, 3, 3, 'D');
        doc.setTextColor(34, 197, 94); doc.setFontSize(20); doc.setFont("helvetica", "bold");
        doc.text("PAYÉ", 165, 183, { align: "center" });
        doc.setFontSize(8); doc.text("Validé le " + new Date().toLocaleDateString(), 165, 190, { align: "center" });

        doc.save(`Recu_NDA_${m.nom_beneficiaire}.pdf`);
    };

    const img = new Image();
    img.src = 'logo-paroisse.jpeg.jpeg';
    img.onload = () => construire(img);
    img.onerror = () => construire(null);
}

// --- AUTRES FONCTIONS ---
async function posterPriere() {
    const t = document.getElementById('nouvellePriere').value; if(!t) return;
    await _supabase.from('mur_prieres').insert([{ texte_priere: t }]);
    document.getElementById('nouvellePriere').value = ""; chargerPrieres();
}
async function chargerPrieres() {
    const { data } = await _supabase.from('mur_prieres').select('*').order('created_at', { ascending: false }).limit(4);
    const d = document.getElementById('listePrieres'); if(!d) return;
    d.innerHTML = data.map(p => `<div class="bg-gray-50 p-4 rounded-2xl flex justify-between items-center shadow-sm border border-gray-100"><p class="italic text-[11px] text-gray-600">"${p.texte_priere}"</p><button onclick="ajouterAmen('${p.id}', ${p.compteur_amen})" class="bg-white border text-orange-600 px-3 py-1 rounded-xl font-bold text-xs">🙏 ${p.compteur_amen}</button></div>`).join('');
}
async function ajouterAmen(id, act) { await _supabase.from('mur_prieres').update({ compteur_amen: act + 1 }).eq('id', id); chargerPrieres(); }

async function chargerLiturgie() {
    try {
        const d = new Date().toISOString().split('T')[0];
        const res = await fetch(`https://api.aelf.org/v1/messe/${d}/france`);
        const data = await res.json();
        if(data.messes) {
            const l = data.messes[0].lectures[data.messes[0].lectures.length-1];
            document.getElementById('titreJour').innerText = "Évangile du Jour";
            document.getElementById('texteLecture').innerHTML = l.texte;
        }
    } catch(e) { document.getElementById('titreJour').innerText = "Parole de Dieu"; }
}

const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) { logoutBtn.onclick = async () => { await _supabase.auth.signOut(); window.location.href = 'auth.html'; }; }

// LANCEMENT
document.addEventListener('DOMContentLoaded', checkUser);