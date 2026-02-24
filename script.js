// ============================================================
// 1. CONFIGURATION & CONNEXION SUPABASE
// ============================================================
const supabaseUrl = 'https://mkufkdtreeqcycnjtcxe.supabase.co'; 
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1rdWZrZHRyZWVxY3ljbmp0Y3hlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4NTA0MjUsImV4cCI6MjA4NzQyNjQyNX0.XG3G_aRQ_NKAu9gxgvWNpKiRCIAX83cps8Jou8S4ne0'; 
const _supabase = supabase.createClient(supabaseUrl, supabaseKey);

// --- FONCTIONS GLOBALES ---
function openModal(id) { document.getElementById(id)?.classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id)?.classList.add('hidden'); }
function logout() { _supabase.auth.signOut().then(() => { window.location.href = "index.html"; }); }

// --- GÉNÉRATION DE REÇU ---
function telechargerRecu(id, beneficiaire, type) {
    const win = window.open('', 'Reçu', 'height=600,width=450');
    win.document.write(`
        <html><body style="font-family:sans-serif; text-align:center; padding:40px; border:10px double #B8860B;">
            <img src="logo-paroisse.jpeg.jpeg" style="width:80px; border-radius:50%;">
            <h1 style="color:#0F172A; margin:10px 0;">NDA DÉMAKPOÈ</h1>
            <p style="font-size:10px; font-weight:bold; color:#B8860B;">ARCHIDIOCÈSE DE LOMÉ</p>
            <hr><h2 style="font-style:italic; color:#0F172A;">Reçu d'Offrande Officiel</h2>
            <div style="text-align:left; background:#F5F1E8; padding:20px; border-radius:15px; border:1px solid #eee;">
                <p><b>Réf :</b> ${id.substring(0,8).toUpperCase()}</p>
                <p><b>Bénéficiaire :</b> ${beneficiaire}</p>
                <p><b>Intention :</b> ${type}</p>
                <p><b>Statut :</b> <span style="color:green; font-weight:bold;">VALIDÉ</span></p>
                <p><b>Délivré le :</b> ${new Date().toLocaleDateString()}</p>
            </div>
            <p style="margin-top:30px; font-size:12px;">"Que le Seigneur vous rende au centuple vos bienfaits."</p>
            <button onclick="window.print()" style="background:#0F172A; color:white; border:none; padding:12px 25px; border-radius:30px; cursor:pointer; font-weight:bold; margin-top:20px;">Imprimer le reçu</button>
        </body></html>
    `);
}

// ============================================================
// 2. AUTHENTIFICATION (Connexion / Inscription)
// ============================================================
const authForm = document.getElementById('authForm');
if (authForm) {
    let isLogin = true;
    const toggleAuth = document.getElementById('toggleAuth');
    const authTitle = document.getElementById('authTitle');
    const usernameField = document.getElementById('usernameField');
    const authBtn = document.getElementById('authBtn');

    toggleAuth.addEventListener('click', () => {
        isLogin = !isLogin;
        authTitle.innerText = isLogin ? "Connexion" : "Inscription";
        usernameField.classList.toggle('hidden', isLogin);
        authBtn.querySelector('span').innerText = isLogin ? "Se Connecter" : "Créer un compte";
        document.getElementById('toggleText').innerText = isLogin ? "Nouveau fidèle ?" : "Déjà un compte ?";
        toggleAuth.innerText = isLogin ? "Créer un compte" : "Se connecter";
    });

    authForm.onsubmit = async (e) => {
        e.preventDefault();
        const email = document.getElementById('identifier').value;
        const password = document.getElementById('password').value;
        const fullName = document.getElementById('username')?.value;

        if (isLogin) {
            const { error } = await _supabase.auth.signInWithPassword({ email, password });
            if (error) alert("Erreur : " + error.message);
            else window.location.href = "dashboard.html";
        } else {
            const { data, error } = await _supabase.auth.signUp({
                email, password, options: { data: { full_name: fullName } }
            });
            if (error) alert("Erreur : " + error.message);
            else {
                await _supabase.from('profiles').insert([{ id: data.user.id, full_name: fullName, email: email, statut: 'ACTIF' }]);
                alert("Compte créé ! Connectez-vous.");
                location.reload();
            }
        }
    };
}

// ============================================================
// 3. DASHBOARD FIDÈLE (Historique et Profil)
// ============================================================
async function initDashboard() {
    const userText = document.getElementById('userNameText');
    const { data: { user } } = await _supabase.auth.getUser();
    if (!user) return;

    verifierStatutBannissement(user.id);
    gererPhotoProfil(user.id);

    const fullName = user.user_metadata.full_name || user.email.split('@')[0];
    if (userText) userText.innerText = fullName.toUpperCase();

    _supabase.channel('messes_realtime').on('postgres_changes', { 
        event: 'UPDATE', schema: 'public', table: 'messes', filter: `user_id=eq.${user.id}` 
    }, () => chargerHistoriqueMesse(user.id)).subscribe();

    chargerHistoriqueMesse(user.id);
}

async function gererPhotoProfil(userId) {
    const fileInput = document.getElementById('profileUpload');
    const imgElement = document.getElementById('userPhoto');
    const iconElement = document.getElementById('userIcon');

    if (!imgElement || !fileInput) return;

    const { data: profile } = await _supabase.from('profiles').select('avatar_url').eq('id', userId).maybeSingle();

    if (profile && profile.avatar_url) {
        imgElement.src = profile.avatar_url;
        imgElement.classList.remove('hidden');
        iconElement.classList.add('hidden');
    }

    fileInput.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        iconElement.className = "fa-solid fa-spinner fa-spin"; 

        const fileExt = file.name.split('.').pop();
        const fileName = `${userId}-${Date.now()}.${fileExt}`;

        const { error: uploadError } = await _supabase.storage.from('avatars').upload(fileName, file);
        if (uploadError) { alert("Erreur : " + uploadError.message); return; }

        const { data: { publicUrl } } = _supabase.storage.from('avatars').getPublicUrl(fileName);
        await _supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', userId);

        imgElement.src = publicUrl;
        imgElement.classList.remove('hidden');
        iconElement.classList.add('hidden');
        alert("Photo mise à jour !");
    };
}

async function verifierStatutBannissement(userId) {
    const { data } = await _supabase.from('profiles').select('statut').eq('id', userId).single();
    if (data && data.statut === 'BANNI') {
        alert("Compte suspendu.");
        logout();
    }
}

async function chargerHistoriqueMesse(userId) {
    const el = document.getElementById('historiqueMesseTable');
    if (!el) return;
    const { data } = await _supabase.from('messes').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    if (data && data.length > 0) {
        el.innerHTML = data.map(m => {
            const status = (m.statut || "").toUpperCase();
            const isValid = status.includes("VALIDE");
            return `
            <tr class="border-b border-slate-100 hover:bg-gold/5 transition-all text-slate-800">
                <td class="py-4 font-bold text-[11px]">${m.beneficiaire}</td>
                <td class="py-4 text-[10px]">${m.type_priere}</td>
                <td class="py-4 text-slate-400 text-[10px]">${new Date(m.created_at).toLocaleDateString()}</td>
                <td class="py-4"><span class="px-3 py-1 rounded-full text-[8px] font-black uppercase ${isValid ? 'bg-green-100 text-green-600' : 'bg-gold/10 text-gold'}">${m.statut || 'EN ATTENTE'}</span></td>
                <td class="py-4 text-right">
                    ${isValid ? `<button onclick="telechargerRecu('${m.id}', '${m.beneficiaire}', '${m.type_priere}')" class="text-navy text-lg hover:text-gold transition"><i class="fa-solid fa-circle-down"></i></button>` : `<i class="fa-solid fa-clock text-slate-300"></i>`}
                </td>
            </tr>`;
        }).join('');
    }
}

// ============================================================
// 4. ADMINISTRATION
// ============================================================
async function initAdminAdvanced() {
    if (!document.getElementById('userRadarTable')) return;
    document.getElementById('currentDate').innerText = new Date().toLocaleDateString('fr-FR', {weekday: 'long', day: 'numeric', month: 'long'});
    chargerStatsAdmin();
    chargerMembresEnLigne();
    chargerValidationMesses();
}

async function chargerMembresEnLigne() {
    const el = document.getElementById('userRadarTable');
    const { data: users } = await _supabase.from('profiles').select('*').limit(20);
    if (users && el) {
        el.innerHTML = users.map(u => `
            <tr>
                <td class="p-4 flex items-center gap-3">
                    <div class="h-8 w-8 bg-navy text-white rounded-lg flex items-center justify-center font-bold text-[10px] uppercase">${(u.full_name || u.email || "?").charAt(0)}</div>
                    <div><p class="font-bold text-[11px] text-slate-800">${u.full_name || 'Fidèle'}</p></div>
                </td>
                <td class="p-4"><span class="text-[10px] ${u.statut === 'BANNI' ? 'text-red-500 font-bold' : 'text-green-500'}">${u.statut === 'BANNI' ? 'BANNI' : 'EN LIGNE'}</span></td>
                <td class="p-4 text-right">
                    <button onclick="bannirFidele('${u.id}', '${u.statut}')" class="text-red-300 hover:text-red-600"><i class="fa-solid fa-user-slash"></i></button>
                </td>
            </tr>`).join('');
    }
}

async function chargerStatsAdmin() {
    const { count: uC } = await _supabase.from('profiles').select('*', { count: 'exact', head: true });
    if(document.getElementById('onlineCount')) document.getElementById('onlineCount').innerText = uC || 0;
}

// ============================================================
// 5. ACCUEIL ET COMPTEUR
// ============================================================
function lancerCompteur() {
    const joursEl = document.getElementById('days');
    if (!joursEl) return;

    function actualiser() {
        const maintenant = new Date();
        let cible = new Date();
        cible.setDate(maintenant.getDate() + (7 - maintenant.getDay()) % 7);
        cible.setHours(6, 30, 0, 0);
        if (maintenant > cible) cible.setDate(cible.getDate() + 7);

        const diff = cible - maintenant;
        const d = Math.floor(diff / (1000 * 60 * 60 * 24));
        const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((diff % (1000 * 60)) / 1000);

        joursEl.innerText = d.toString().padStart(2, '0');
        document.getElementById('hours').innerText = h.toString().padStart(2, '0');
        document.getElementById('minutes').innerText = m.toString().padStart(2, '0');
        document.getElementById('seconds').innerText = s.toString().padStart(2, '0');
        document.getElementById('nomMesse').innerText = "Prochaine Messe Dominicale";
    }
    setInterval(actualiser, 1000);
    actualiser();
}

async function afficherLecturesDuJour() {
    const container = document.getElementById('contenuLectures');
    if (!container) return;
    const today = new Date().toISOString().split('T')[0];
    const { data: l } = await _supabase.from('liturgie_maison').select('*').eq('date_jour', today).maybeSingle();
    if (l) {
        document.getElementById('viewTitreJour').innerText = l.titre_jour;
        document.getElementById('badgeCouleur').innerText = l.couleur;
        // ... Logique d'affichage des textes ...
    }
}

// ============================================================
// 6. INITIALISATION MAÎTRESSE (Fix pour GitHub et Mobile)
// ============================================================
document.addEventListener('DOMContentLoaded', async () => {
    
    // 1. Compteur (Page d'accueil)
    if (document.getElementById('days')) {
        lancerCompteur();
    }

    // 2. Lectures (Page Lectures)
    if (document.getElementById('contenuLectures')) {
        afficherLecturesDuJour();
    }

    // 3. Protection Dashboard (Uniquement sur dashboard.html)
    if (window.location.pathname.includes('dashboard.html')) {
        const { data: { user } } = await _supabase.auth.getUser();
        if (!user) {
            window.location.href = "auth.html";
        } else {
            initDashboard();
        }
    }

    // 4. Admin
    if (document.getElementById('userRadarTable')) {
        initAdminAdvanced();
    }
});