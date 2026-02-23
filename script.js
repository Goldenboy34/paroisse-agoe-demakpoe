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
        document.getElementById('usernameField').classList.toggle('hidden');
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
            if (error) alert("Identifiants incorrects ou compte inexistant.");
            else window.location.href = 'dashboard.html';
        } else {
            if(!username) return alert("Veuillez entrer votre nom complet !");
            const { data, error } = await _supabase.auth.signUp({ email: finalEmail, password });
            
            if (error) return alert(error.message);
            if (data.user) {
                await _supabase.from('profiles').insert([{ id: data.user.id, username: username, email: identifier }]);
                alert("Compte créé avec succès ! Connectez-vous.");
                location.reload();
            }
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

    try {
        const { data: prof } = await _supabase.from('profiles').select('username').eq('id', user.id).single();
        const pseudo = prof ? prof.username : "Fidèle";
        
        if(document.getElementById('displayUsername')) document.getElementById('displayUsername').innerText = pseudo;
        if(document.getElementById('welcomeTitle')) {
            document.getElementById('welcomeTitle').innerHTML = `Bienvenue, <span class="text-[#23318E] underline">${pseudo}</span> 👋`;
        }
    } catch(e) { console.error(e); }

    chargerHistorique(user.id);
    chargerPrieres();
    chargerLiturgie();
}

// ==========================================
// 4. DEMANDE DE MESSE
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
        if (error) alert(error.message);
        else {
            alert("🙏 Demande envoyée ! Elle sera validée dès réception du transfert.");
            location.reload(); 
        }
    };
}

// ==========================================
// 5. HISTORIQUE ET PDF
// ==========================================
async function chargerHistorique(uid) {
    const div = document.getElementById('historique'); 
    if(!div) return;

    const { data, error } = await _supabase.from('demandes_messes').select('*').eq('user_id', uid).order('created_at', { ascending: false });
    
    if(error || !data || data.length === 0) { 
        div.innerHTML = "<p class='py-4'>Aucune demande pour le moment.</p>"; 
        return; 
    }

    div.innerHTML = `
        <div class='overflow-x-auto'>
            <table class='w-full text-left text-[11px]'>
                <tbody class='divide-y'>
                    ${data.map(m => `
                        <tr class="py-2">
                            <td class='py-3'>
                                <div class='font-bold text-gray-800 uppercase'>${m.nom_beneficiaire}</div>
                                <div class='text-[9px] opacity-50 uppercase font-bold'>${m.type_priere} • ${m.date_debut}</div>
                            </td>
                            <td class='py-3'>
                                <span class='px-2 py-1 rounded-full text-[9px] font-black uppercase ${m.statut_paiement === 'confirme' ? "bg-green-100 text-green-600" : "bg-orange-100 text-orange-600"}'>
                                    ${m.statut_paiement === 'confirme' ? "Validé" : "Attente"}
                                </span>
                            </td>
                            <td class='py-3 text-right'>
                                ${m.statut_paiement === 'confirme' ? 
                                `<button onclick="genererPDF('${m.id}')" class='bg-[#23318E] text-white px-3 py-1 rounded-lg font-bold'>REÇU</button>` : 
                                `<span class='text-[10px] italic'>En cours</span>`}
                            </td>
                        </tr>`).join('')}
                </tbody>
            </table>
        </div>`;
}

async function genererPDF(id) {
    const { data: m } = await _supabase.from('demandes_messes').select('*').eq('id', id).single();
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Design du Reçu
    doc.setFillColor(35, 49, 142); doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255); doc.setFontSize(16); doc.text("NDA DÉMAKPOÈ - REÇU OFFREANDE", 105, 25, {align: 'center'});
    
    doc.setTextColor(0); doc.setFontSize(12);
    let y = 60;
    doc.text(`Bénéficiaire : ${m.nom_beneficiaire}`, 20, y); y += 10;
    doc.text(`Intention : ${m.details_intention}`, 20, y, {maxWidth: 170}); y += 20;
    doc.text(`Type : ${m.type_priere}`, 20, y); y += 10;
    doc.text(`Montant : ${m.montant_offrande} FCFA`, 20, y); y += 10;
    doc.text(`Réf Transaction : ${m.transaction_id}`, 20, y); y += 20;
    
    doc.setFontSize(10); doc.setTextColor(100);
    doc.text("« Que le Seigneur vous bénisse pour votre générosité. »", 105, y + 20, {align: 'center'});
    doc.save(`Recu_${m.nom_beneficiaire}.pdf`);
}

// ==========================================
// 6. MUR DE PRIÈRES
// ==========================================
async function posterPriere() {
    const txt = document.getElementById('nouvellePriere').value; 
    if(!txt) return;
    await _supabase.from('mur_prieres').insert([{ texte_priere: txt }]);
    document.getElementById('nouvellePriere').value = ""; 
    chargerPrieres();
}

async function chargerPrieres() {
    const { data } = await _supabase.from('mur_prieres').select('*').order('created_at', { ascending: false }).limit(5);
    const d = document.getElementById('listePrieres'); 
    if(!d || !data) return;
    d.innerHTML = data.map(p => `
        <div class="bg-gray-50 p-4 rounded-2xl flex justify-between items-center border border-gray-100">
            <p class="italic text-xs text-gray-600">"${p.texte_priere}"</p>
            <button onclick="ajouterAmen('${p.id}', ${p.compteur_amen})" class="bg-white border text-orange-600 px-3 py-1 rounded-xl font-bold text-xs hover:bg-orange-50 transition">🙏 ${p.compteur_amen} Amen</button>
        </div>
    `).join('');
}

async function ajouterAmen(id, count) { 
    await _supabase.from('mur_prieres').update({ compteur_amen: count + 1 }).eq('id', id); 
    chargerPrieres(); 
}

// ==========================================
// 7. LITURGIE DU JOUR (API AELF)
// ==========================================
async function chargerLiturgie() {
    const t = document.getElementById('titreJour');
    const x = document.getElementById('texteLecture');
    if (!t || !x) return;

    try {
        const date = new Date().toISOString().split('T')[0];
        const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(`https://api.aelf.org/v1/messe/${date}/france`)}`);
        const json = await res.json();
        const data = JSON.parse(json.contents);

        if(data?.messes?.[0]?.lectures) {
            const lect = data.messes[0].lectures.find(l => l.type === 'evangile') || data.messes[0].lectures[0];
            t.innerText = lect.titre;
            x.innerHTML = lect.texte;
        }
    } catch (e) {
        t.innerText = "Parole de Dieu";
        x.innerHTML = "« Ta parole est une lampe à mes pieds, une lumière sur mon sentier. » (Ps 118)";
    }
}

// ==========================================
// 8. DÉCONNEXION ET INITIALISATION
// ==========================================
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) { 
    logoutBtn.onclick = async () => { 
        await _supabase.auth.signOut(); 
        window.location.href = 'auth.html'; 
    }; 
}

document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('dashboard.html')) checkUser();
});