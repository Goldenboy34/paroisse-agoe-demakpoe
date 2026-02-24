// ============================================================
// 1. CONFIGURATION SUPABASE
// ============================================================
const supabaseUrl = 'https://mkufkdtreeqcycnjtcxe.supabase.co'; 
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1rdWZrZHRyZWVxY3ljbmp0Y3hlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4NTA0MjUsImV4cCI6MjA4NzQyNjQyNX0.XG3G_aRQ_NKAu9gxgvWNpKiRCIAX83cps8Jou8S4ne0'; 
const _supabase = supabase.createClient(supabaseUrl, supabaseKey);

// --- FONCTIONS GLOBALES ---
function openModal(id) { document.getElementById(id)?.classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id)?.classList.add('hidden'); }
function logout() { _supabase.auth.signOut().then(() => { window.location.href = "index.html"; }); }

function telechargerRecu(id, beneficiaire, type) {
    const win = window.open('', 'Reçu', 'height=600,width=450');
    win.document.write(`<html><body style="font-family:sans-serif; text-align:center; padding:40px; border:10px double #B8860B;"><img src="logo-paroisse.jpeg.jpeg" style="width:80px; border-radius:50%;"><h1 style="color:#0F172A; margin:10px 0;">NDA DÉMAKPOÈ</h1><p style="font-size:10px; font-weight:bold; color:#B8860B;">ARCHIDIOCÈSE DE LOMÉ</p><hr><h2 style="font-style:italic; color:#0F172A;">Reçu d'Offrande Officiel</h2><div style="text-align:left; background:#F5F1E8; padding:20px; border-radius:15px; border:1px solid #eee;"><p><b>Réf :</b> ${id.substring(0,8).toUpperCase()}</p><p><b>Bénéficiaire :</b> ${beneficiaire}</p><p><b>Intention :</b> ${type}</p><p><b>Statut :</b> <span style="color:green; font-weight:bold;">VALIDÉ</span></p></div><button onclick="window.print()" style="background:#0F172A; color:white; border:none; padding:12px 25px; border-radius:30px; cursor:pointer; font-weight:bold; margin-top:20px;">Imprimer le reçu</button></body></html>`);
}

// ============================================================
// 2. AUTHENTIFICATION (Connexion / Inscription)
// ============================================================
function initAuthLogic() {
    const authForm = document.getElementById('authForm');
    if (!authForm) return;

    let isLogin = true;
    const toggleAuth = document.getElementById('toggleAuth');
    const authTitle = document.getElementById('authTitle');
    const usernameField = document.getElementById('usernameField');
    const authBtn = document.getElementById('authBtn');

    toggleAuth.onclick = () => {
        isLogin = !isLogin;
        authTitle.innerText = isLogin ? "Connexion" : "Inscription";
        usernameField.classList.toggle('hidden', isLogin);
        authBtn.querySelector('span').innerText = isLogin ? "Se Connecter" : "Créer un compte";
        document.getElementById('toggleText').innerText = isLogin ? "Nouveau fidèle ?" : "Déjà un compte ?";
    };

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
            const { data, error } = await _supabase.auth.signUp({ email, password, options: { data: { full_name: fullName } } });
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
// 3. COMPTEUR (ACCUEIL)
// ============================================================
function lancerCompteur() {
    const daysEl = document.getElementById('days');
    if (!daysEl) return;

    function actualiser() {
        const maintenant = new Date();
        let cible = new Date();
        const jourActuel = maintenant.getDay(); 
        const joursRestants = (jourActuel === 0 && maintenant.getHours() < 7) ? 0 : (7 - jourActuel);
        cible.setDate(maintenant.getDate() + joursRestants);
        cible.setHours(6, 30, 0, 0);

        const diff = cible - maintenant;
        if (diff <= 0) return;

        document.getElementById('days').innerText = Math.floor(diff / (1000 * 60 * 60 * 24)).toString().padStart(2, '0');
        document.getElementById('hours').innerText = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)).toString().padStart(2, '0');
        document.getElementById('minutes').innerText = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)).toString().padStart(2, '0');
        document.getElementById('seconds').innerText = Math.floor((diff % (1000 * 60)) / 1000).toString().padStart(2, '0');
        document.getElementById('nomMesse').innerText = "Prochaine Messe Dominicale";
    }
    setInterval(actualiser, 1000);
    actualiser();
}

// ============================================================
// 4. DASHBOARD FIDÈLE
// ============================================================
async function initDashboardLogic() {
    const { data: { user } } = await _supabase.auth.getUser();
    if (!user) { window.location.href = "auth.html"; return; }

    // Nom Utilisateur
    const userText = document.getElementById('userNameText');
    if (userText) userText.innerText = (user.user_metadata.full_name || user.email.split('@')[0]).toUpperCase();

    // Photo de Profil
    const img = document.getElementById('userPhoto');
    const icon = document.getElementById('userIcon');
    const uploadInput = document.getElementById('profileUpload');
    const { data: profile } = await _supabase.from('profiles').select('avatar_url').eq('id', user.id).maybeSingle();
    
    if (profile?.avatar_url && img) {
        img.src = profile.avatar_url;
        img.classList.remove('hidden');
        icon?.classList.add('hidden');
    }

    if(uploadInput) {
        uploadInput.onchange = async (e) => {
            const file = e.target.files[0];
            const fileName = `${user.id}-${Date.now()}`;
            await _supabase.storage.from('avatars').upload(fileName, file);
            const { data: { publicUrl } } = _supabase.storage.from('avatars').getPublicUrl(fileName);
            await _supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id);
            location.reload();
        };
    }

    // Historique des Messes
    const el = document.getElementById('historiqueMesseTable');
    if (el) {
        const { data } = await _supabase.from('messes').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
        if (data) {
            el.innerHTML = data.map(m => `
                <tr class="border-b border-slate-100 text-[10px]">
                    <td class="py-4 font-bold text-slate-800">${m.beneficiaire}</td>
                    <td class="py-4 text-slate-500">${m.type_priere}</td>
                    <td class="py-4 text-slate-400">${new Date(m.created_at).toLocaleDateString()}</td>
                    <td class="py-4"><span class="px-2 py-1 rounded-full bg-gold/10 text-gold font-black uppercase">${m.statut || 'EN ATTENTE'}</span></td>
                    <td class="py-4 text-right">${m.statut === 'VALIDÉ' ? `<button onclick="telechargerRecu('${m.id}','${m.beneficiaire}','${m.type_priere}')" class="text-navy"><i class="fa-solid fa-download"></i></button>` : ''}</td>
                </tr>`).join('');
        }
    }
}

// ============================================================
// 5. ADMINISTRATION
// ============================================================
async function initAdminLogic() {
    if (!document.getElementById('userRadarTable')) return;
    
    // Stats
    const { count: userCount } = await _supabase.from('profiles').select('*', { count: 'exact', head: true });
    document.getElementById('onlineCount').innerText = userCount || 0;

    // Membres
    const { data: users } = await _supabase.from('profiles').select('*');
    document.getElementById('userRadarTable').innerHTML = users.map(u => `
        <tr class="text-[10px] border-b">
            <td class="p-4 font-bold">${u.full_name || u.email}</td>
            <td class="p-4 text-green-500">ACTIF</td>
            <td class="p-4 text-right"><button class="text-red-400"><i class="fa-solid fa-ban"></i></button></td>
        </tr>`).join('');

    // Messes à valider
    const { data: messes } = await _supabase.from('messes').select('*').eq('statut', 'EN ATTENTE');
    const mTable = document.getElementById('adminMesseTable');
    if (messes && mTable) {
        mTable.innerHTML = messes.map(m => `
            <div class="flex justify-between p-4 bg-slate-50 rounded-xl mb-2">
                <p class="text-[10px] font-bold">${m.beneficiaire}</p>
                <button onclick="validerMesseAdmin('${m.id}')" class="bg-green-600 text-white px-3 py-1 rounded-lg text-[8px]">VALIDER</button>
            </div>`).join('');
    }
}

window.validerMesseAdmin = async (id) => {
    await _supabase.from('messes').update({ statut: 'VALIDÉ' }).eq('id', id);
    alert("Validé !"); location.reload();
};

// ============================================================
// 6. INITIALISATION PAR PAGE (SÉCURITÉ MOBILE)
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    // 1. Toujours charger la logique d'auth si le formulaire existe
    if (document.getElementById('authForm')) initAuthLogic();

    // 2. Page Accueil
    if (document.getElementById('days')) lancerCompteur();

    // 3. Page Dashboard
    if (document.getElementById('userNameText')) initDashboardLogic();

    // 4. Page Admin
    if (document.getElementById('userRadarTable')) initAdminLogic();
});