const supabaseUrl = 'https://mkufkdtreeqcycnjtcxe.supabase.co'; 
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1rdWZrZHRyZWVxY3ljbmp0Y3hlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4NTA0MjUsImV4cCI6MjA4NzQyNjQyNX0.XG3G_aRQ_NKAu9gxgvWNpKiRCIAX83cps8Jou8S4ne0'; 
const _supabase = supabase.createClient(supabaseUrl, supabaseKey);

// --- LOGIQUE DU COMPTE À REBOURS (INDEX) ---
async function demarrerCountdown() {
    const { data } = await _supabase.from('celebrations').select('*').gt('date_heure', new Date().toISOString()).order('date_heure', {ascending: true}).limit(1);
    
    if (data && data[0]) {
        const cible = new Date(data[0].date_heure).getTime();
        document.getElementById('nomMesse').innerText = data[0].nom_celebration;

        const x = setInterval(function() {
            const maintenant = new Date().getTime();
            const distance = cible - maintenant;

            const jours = Math.floor(distance / (1000 * 60 * 60 * 24));
            const heures = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const secondes = Math.floor((distance % (1000 * 60)) / 1000);

            document.getElementById("countdown").innerHTML = `${jours}j ${heures}h ${minutes}m ${secondes}s`;

            if (distance < 0) {
                clearInterval(x);
                document.getElementById("countdown").innerHTML = "EN COURS";
            }
        }, 1000);
    }
}

// --- LOGIQUE MODAL PUBLIC (ANNONCES & INFOS) ---
async function ouvrirModalPublic(type) {
    const titre = document.getElementById('modalPublicTitre');
    const contenu = document.getElementById('modalPublicContenu');
    const modal = document.getElementById('modalPublic');

    modal.classList.remove('hidden');
    contenu.innerHTML = "Chargement...";

    if (type === 'annonces') {
        titre.innerText = "📢 Dernières Annonces";
        const { data } = await _supabase.from('annonces').select('*').order('created_at', {ascending: false});
        contenu.innerHTML = data.map(a => `
            <div class="p-6 bg-slate-50 rounded-2xl border-l-4 border-blue-900">
                <h4 class="font-black text-blue-900 text-sm uppercase">${a.titre}</h4>
                <p class="text-xs text-gray-500 my-2">${a.contenu}</p>
                <small class="text-[9px] font-bold text-gray-400 uppercase">${new Date(a.created_at).toLocaleDateString()}</small>
            </div>
        `).join('');
    } else {
        titre.innerText = "🤝 Informations Paroissiales";
        const { data } = await _supabase.from('infos_paroisse').select('*');
        contenu.innerHTML = data.map(i => `
            <div class="mb-6">
                <h4 class="font-black text-blue-900 uppercase border-b pb-2 mb-3">${i.titre}</h4>
                <div class="text-sm text-gray-600 italic leading-relaxed">${i.contenu}</div>
            </div>
        `).join('');
    }
}

function fermerModalPublic() {
    document.getElementById('modalPublic').classList.add('hidden');
}

// Lancement automatique si on est sur l'index
if (document.getElementById('countdown')) {
    demarrerCountdown();
}

// ==========================================
// 1. AUTHENTIFICATION & RÔLES
// ==========================================
async function checkUser() {
    const { data: { user } } = await _supabase.auth.getUser();
    if (!user) {
        if (!window.location.pathname.includes('auth.html') && !window.location.pathname.includes('index.html')) {
            window.location.href = 'auth.html';
        }
        return;
    }

    const { data: profile } = await _supabase.from('profiles').select('*').eq('id', user.id).single();

    // SÉCURITÉ ADMIN : Si on est sur admin.html, il faut être admin
    if (window.location.pathname.includes('admin.html')) {
        if (!profile || profile.role !== 'admin') {
            alert("Accès réservé au secrétariat.");
            window.location.href = 'dashboard.html';
            return;
        }
    }

    // SIGNALS (Présence & Last Seen)
    await _supabase.from('profiles').update({ last_seen: new Date().toISOString() }).eq('id', user.id);
    const channel = _supabase.channel('online-users', { config: { presence: { key: user.id } } });
    channel.subscribe(async (s) => { if(s === 'SUBSCRIBED') await channel.track({ user_id: user.id }); });

    // UI UPDATES
    if(document.getElementById('displayUsername')) document.getElementById('displayUsername').innerText = profile.username;
    if(document.getElementById('welcomeTitle')) document.getElementById('welcomeTitle').innerHTML = `Bienvenue, <span class="text-[#23318E]">${profile.username}</span> 👋`;

    // CHARGEMENTS COMMUNS
    chargerAnnonces();
    chargerGalerie();
    if(window.location.pathname.includes('dashboard.html')) {
        chargerLiturgieDashboard();
        chargerHistorique(user.id);
        chargerDons(user.id);
    }
}

// ==========================================
// 2. GESTION DES ANNONCES & NOTIFICATIONS
// ==========================================
async function chargerAnnonces() {
    const { data } = await _supabase.from('annonces').select('*').order('created_at', {ascending: false}).limit(5);
    const container = document.getElementById('listeAnnonces');
    const dot = document.getElementById('notifDot');
    
    if(!container || !data || data.length === 0) return;

    if(dot) dot.classList.remove('hidden'); // Allume la cloche
    if(document.getElementById('sectionAnnonces')) document.getElementById('sectionAnnonces').classList.remove('hidden');

    container.innerHTML = data.map(a => `
        <div class="min-w-[300px] bg-white p-6 rounded-[2rem] shadow-lg border-b-4 ${a.priorite === 'urgent' ? 'border-red-500' : 'border-blue-500'}">
            <span class="text-[8px] font-black uppercase text-gray-400">${new Date(a.created_at).toLocaleDateString()}</span>
            <h4 class="font-black text-xs uppercase my-2 text-[#23318E]">${a.titre}</h4>
            <p class="text-[11px] text-gray-500 leading-relaxed italic">"${a.contenu}"</p>
        </div>
    `).join('');
}

// ==========================================
// 3. GESTION DES DONS & CERTIFICATS
// ==========================================
const formDon = document.getElementById('formDon');
if(formDon) {
    formDon.onsubmit = async (e) => {
        e.preventDefault();
        const { data: { user } } = await _supabase.auth.getUser();
        const don = {
            user_id: user.id,
            type_don: document.getElementById('typeDon').value,
            montant: parseInt(document.getElementById('montantDon').value),
            transaction_id: document.getElementById('transIdDon').value,
            statut: 'en_attente'
        };
        const { error } = await _supabase.from('dons').insert([don]);
        if(error) alert(error.message);
        else { alert("Merci pour votre générosité ! En attente de validation."); location.reload(); }
    };
}

async function chargerDons(uid) {
    const { data } = await _supabase.from('dons').select('*').eq('user_id', uid).order('created_at', {ascending: false});
    const container = document.getElementById('historiqueDons');
    if(!container || !data) return;

    container.innerHTML = data.map(d => `
        <div class="flex justify-between items-center p-4 bg-gray-50 rounded-2xl mb-2">
            <div>
                <div class="text-[10px] font-black uppercase">${d.type_don}</div>
                <div class="text-xs font-bold text-blue-900">${d.montant} FCFA</div>
            </div>
            ${d.statut === 'confirme' ? `<button onclick="genererCertificatDon('${d.id}')" class="bg-green-600 text-white px-3 py-1 rounded-lg text-[10px] font-black">CERTIFICAT</button>` : '<span class="text-[9px] italic text-orange-500">Vérification...</span>'}
        </div>
    `).join('');
}

// ==========================================
// 4. GALERIE PHOTOS
// ==========================================
async function chargerGalerie() {
    const { data } = await _supabase.from('galerie').select('*').order('created_at', {ascending: false}).limit(8);
    const container = document.getElementById('galeriePhotos');
    if(!container || !data) return;

    container.innerHTML = data.map(img => `
        <div class="aspect-square rounded-[1.5rem] overflow-hidden shadow-md group border-2 border-white">
            <img src="${img.url_image}" class="w-full h-full object-cover group-hover:scale-110 transition duration-700">
        </div>
    `).join('');
}

// ==========================================
// 5. FONCTIONS PDF & UI
// ==========================================
async function genererCertificatDon(id) {
    const { data: d } = await _supabase.from('dons').select('*, profiles(username)').eq('id', id).single();
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    doc.setFillColor(35, 49, 142); doc.rect(0, 0, 210, 50, 'F');
    doc.setTextColor(255); doc.setFontSize(22); doc.text("CERTIFICAT DE DON", 105, 25, {align:'center'});
    doc.setFontSize(10); doc.text("Paroisse Notre Dame de l'Assomption - Agoè Démakpoè", 105, 35, {align:'center'});

    doc.setTextColor(0); doc.setFontSize(14);
    doc.text(`La Paroisse certifie avoir reçu de :`, 105, 80, {align:'center'});
    doc.setFontSize(18); doc.setFont("helvetica", "bold");
    doc.text(d.profiles.username.toUpperCase(), 105, 95, {align:'center'});
    
    doc.setFontSize(12); doc.setFont("helvetica", "normal");
    doc.text(`La somme de : ${d.montant} FCFA`, 105, 115, {align:'center'});
    doc.text(`Au titre de : ${d.type_don.toUpperCase()}`, 105, 125, {align:'center'});
    
    doc.setDrawColor(212, 175, 55); doc.line(50, 140, 160, 140);
    doc.text("Fait à Lomé, le " + new Date(d.created_at).toLocaleDateString(), 105, 155, {align:'center'});
    
    doc.save(`Certificat_Don_${d.id.substring(0,5)}.pdf`);
}

// (Autres fonctions existantes: chargerLiturgieDashboard, chargerHistorique, etc.)
// ... Garder tes fonctions existantes ici ...

document.addEventListener('DOMContentLoaded', checkUser);