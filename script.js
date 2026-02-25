// ============================================================
// 1. CONFIGURATION SUPABASE
// ============================================================
const supabaseUrl = 'https://mkufkdtreeqcycnjtcxe.supabase.co'; 
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1rdWZrZHRyZWVxY3ljbmp0Y3hlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4NTA0MjUsImV4cCI6MjA4NzQyNjQyNX0.XG3G_aRQ_NKAu9gxgvWNpKiRCIAX83cps8Jou8S4ne0'; 
const _supabase = supabase.createClient(supabaseUrl, supabaseKey);

// --- FONCTIONS NAVIGATION ---
function logout() { 
    _supabase.auth.signOut().then(() => { window.location.href = "index.html"; }); 
}

// ============================================================
// 2. SYNCHRONISATION DE L'ÉTAT DE CONNEXION (GLOBAL)
// ============================================================
async function synchroniserUtilisateur() {
    const { data: { user } } = await _supabase.auth.getUser();
    const authSection = document.getElementById('navAuthSection');

    if (user && authSection) {
        // 1. Récupérer les infos du profil (nom + photo)
        const { data: profile } = await _supabase.from('profiles').select('full_name, avatar_url').eq('id', user.id).maybeSingle();
        const userName = profile?.full_name || user.email.split('@')[0];
        const userPhoto = profile?.avatar_url || null;

        // 2. Mettre à jour la barre de navigation (Accueil & Global)
        authSection.innerHTML = `
            <div class="flex items-center gap-3 bg-white/50 backdrop-blur-md p-2 pr-4 rounded-full border border-gold/20 shadow-sm cursor-pointer" onclick="window.location.href='dashboard.html'">
                <div class="h-10 w-10 bg-slate-900 rounded-full flex items-center justify-center text-white overflow-hidden border-2 border-gold">
                    ${userPhoto ? `<img src="${userPhoto}" class="h-full w-full object-cover">` : `<i class="fa-solid fa-user text-xs"></i>`}
                </div>
                <div class="hidden md:block text-left">
                    <p class="text-[8px] font-black text-gold uppercase leading-none">Bienvenue,</p>
                    <p class="text-[11px] font-black text-slate-900 leading-tight">${userName.toUpperCase()}</p>
                </div>
            </div>
        `;

        // 3. Si on est sur le Dashboard, remplir aussi les éléments spécifiques
        const dashName = document.getElementById('userNameText');
        if (dashName) dashName.innerText = userName.toUpperCase();
        
        const dashPhoto = document.getElementById('userPhoto');
        const dashIcon = document.getElementById('userIcon');
        if (userPhoto && dashPhoto) {
            dashPhoto.src = userPhoto;
            dashPhoto.classList.remove('hidden');
            if (dashIcon) dashIcon.classList.add('hidden');
        }
    }
}

// ============================================================
// 3. COMPTEUR (PAGE D'ACCUEIL)
// ============================================================
function initCompteur() {
    const daysEl = document.getElementById('days');
    if (!daysEl) return;

    function update() {
        const now = new Date();
        let target = new Date();
        const dayIdx = now.getDay();
        const daysToSun = (dayIdx === 0 && now.getHours() < 7) ? 0 : (7 - dayIdx);
        target.setDate(now.getDate() + daysToSun);
        target.setHours(6, 30, 0, 0);

        const diff = target - now;
        if (diff <= 0) return;

        document.getElementById('days').innerText = Math.floor(diff / 86400000).toString().padStart(2, '0');
        document.getElementById('hours').innerText = Math.floor((diff % 86400000) / 3600000).toString().padStart(2, '0');
        document.getElementById('minutes').innerText = Math.floor((diff % 3600000) / 60000).toString().padStart(2, '0');
        document.getElementById('seconds').innerText = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');
        document.getElementById('nomMesse').innerText = "Prochaine Messe Dominicale";
    }
    setInterval(update, 1000);
    update();
}

// ============================================================
// 4. AUTHENTIFICATION (Connexion / Inscription)
// ============================================================
function initAuth() {
    const authForm = document.getElementById('authForm');
    if (!authForm) return;

    let isLogin = true;
    const toggleBtn = document.getElementById('toggleAuth');
    
    if (toggleBtn) {
        toggleBtn.onclick = (e) => {
            e.preventDefault();
            isLogin = !isLogin;
            document.getElementById('authTitle').innerText = isLogin ? "Connexion" : "Inscription";
            document.getElementById('usernameField').classList.toggle('hidden', isLogin);
            document.getElementById('authBtn').querySelector('span').innerText = isLogin ? "Se Connecter" : "Créer un compte";
        };
    }

    authForm.onsubmit = async (e) => {
        e.preventDefault();
        const email = document.getElementById('identifier').value;
        const password = document.getElementById('password').value;
        const fullName = document.getElementById('username')?.value;

        if (isLogin) {
            const { error } = await _supabase.auth.signInWithPassword({ email, password });
            if (error) alert(error.message); else window.location.href = "dashboard.html";
        } else {
            const { data, error } = await _supabase.auth.signUp({ email, password, options: { data: { full_name: fullName } } });
            if (error) alert(error.message); else {
                await _supabase.from('profiles').insert([{ id: data.user.id, full_name: fullName, email, statut: 'ACTIF' }]);
                alert("Compte créé !"); location.reload();
            }
        }
    };
}

// ============================================================
// 5. GESTION PHOTO DE PROFIL (DASHBOARD)
// ============================================================
async function initPhotoUpload() {
    const uploadInput = document.getElementById('profileUpload');
    if (!uploadInput) return;

    const { data: { user } } = await _supabase.auth.getUser();

    uploadInput.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const fileName = `${user.id}-${Date.now()}`;
        
        await _supabase.storage.from('avatars').upload(fileName, file);
        const { data: { publicUrl } } = _supabase.storage.from('avatars').getPublicUrl(fileName);
        await _supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id);
        
        location.reload();
    };
}

// ============================================================
// 6. INITIALISATION TOUT-EN-UN
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    // Vérifie la connexion sur toutes les pages pour mettre à jour la Nav
    synchroniserUtilisateur();
    
    // Fonctions spécifiques selon la page
    initAuth();
    initCompteur();
    initPhotoUpload();

    // Si on est sur le dashboard, on peut aussi charger l'historique ici...
});