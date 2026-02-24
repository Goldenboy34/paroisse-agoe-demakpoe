// ============================================================
// 1. CONFIGURATION SUPABASE
// ============================================================
const supabaseUrl = 'https://mkufkdtreeqcycnjtcxe.supabase.co'; 
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1rdWZrZHRyZWVxY3ljbmp0Y3hlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4NTA0MjUsImV4cCI6MjA4NzQyNjQyNX0.XG3G_aRQ_NKAu9gxgvWNpKiRCIAX83cps8Jou8S4ne0'; 

// On vérifie si la bibliothèque Supabase est bien chargée
let _supabase;
try {
    _supabase = supabase.createClient(supabaseUrl, supabaseKey);
    console.log("Supabase chargé avec succès");
} catch (e) {
    console.error("Erreur critique : Supabase n'est pas chargé !");
}

// --- FONCTIONS NAVIGATION ---
function logout() { 
    _supabase.auth.signOut().then(() => { window.location.href = "index.html"; }); 
}

// ============================================================
// 2. AUTHENTIFICATION (Connexion / Inscription)
// ============================================================
function initAuth() {
    const authForm = document.getElementById('authForm');
    if (!authForm) return;

    let isLogin = true;
    const toggleBtn = document.getElementById('toggleAuth');
    const authTitle = document.getElementById('authTitle');
    const userField = document.getElementById('usernameField');
    const authBtn = document.getElementById('authBtn');

    if (toggleBtn) {
        toggleBtn.onclick = (e) => {
            e.preventDefault();
            isLogin = !isLogin;
            authTitle.innerText = isLogin ? "Connexion" : "Inscription";
            userField.classList.toggle('hidden', isLogin);
            authBtn.querySelector('span').innerText = isLogin ? "Se Connecter" : "Créer un compte";
            document.getElementById('toggleText').innerText = isLogin ? "Nouveau fidèle ?" : "Déjà un compte ?";
        };
    }

    authForm.onsubmit = async (e) => {
        e.preventDefault();
        const email = document.getElementById('identifier').value;
        const password = document.getElementById('password').value;
        const fullName = document.getElementById('username')?.value;

        try {
            if (isLogin) {
                const { error } = await _supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
                window.location.href = "dashboard.html";
            } else {
                const { data, error } = await _supabase.auth.signUp({ 
                    email, 
                    password, 
                    options: { data: { full_name: fullName } } 
                });
                if (error) throw error;
                // Créer le profil manuellement
                await _supabase.from('profiles').insert([{ id: data.user.id, full_name: fullName, email: email, statut: 'ACTIF' }]);
                alert("Compte créé ! Connectez-vous maintenant.");
                location.reload();
            }
        } catch (err) {
            alert("Erreur : " + err.message);
        }
    };
}

// ============================================================
// 3. COMPTEUR (ACCUEIL)
// ============================================================
function initCompteur() {
    const daysEl = document.getElementById('days');
    if (!daysEl) return;

    function update() {
        const now = new Date();
        let target = new Date();
        // Calcul du prochain dimanche 06h30
        const dayIdx = now.getDay();
        const daysToSun = (dayIdx === 0 && now.getHours() < 7) ? 0 : (7 - dayIdx);
        target.setDate(now.getDate() + daysToSun);
        target.setHours(6, 30, 0, 0);

        const diff = target - now;
        if (diff <= 0) return;

        const d = Math.floor(diff / 86400000);
        const h = Math.floor((diff % 86400000) / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);

        if(document.getElementById('days')) document.getElementById('days').innerText = d.toString().padStart(2, '0');
        if(document.getElementById('hours')) document.getElementById('hours').innerText = h.toString().padStart(2, '0');
        if(document.getElementById('minutes')) document.getElementById('minutes').innerText = m.toString().padStart(2, '0');
        if(document.getElementById('seconds')) document.getElementById('seconds').innerText = s.toString().padStart(2, '0');
        if(document.getElementById('nomMesse')) document.getElementById('nomMesse').innerText = "Prochaine Messe Dominicale";
    }
    setInterval(update, 1000);
    update();
}

// ============================================================
// 4. DASHBOARD (LOGIQUE PHOTO & HISTORIQUE)
// ============================================================
async function initDashboard() {
    const nameEl = document.getElementById('userNameText');
    if (!nameEl) return; // Sécurité : n'exécute que sur le dashboard

    const { data: { user } } = await _supabase.auth.getUser();
    if (!user) {
        window.location.href = "auth.html";
        return;
    }

    // Affichage Nom
    nameEl.innerText = (user.user_metadata.full_name || user.email.split('@')[0]).toUpperCase();

    // Photo
    const img = document.getElementById('userPhoto');
    const icon = document.getElementById('userIcon');
    const upload = document.getElementById('profileUpload');

    const { data: prof } = await _supabase.from('profiles').select('avatar_url').eq('id', user.id).maybeSingle();
    if (prof?.avatar_url && img) {
        img.src = prof.avatar_url;
        img.classList.remove('hidden');
        icon?.classList.add('hidden');
    }

    if(upload) {
        upload.onchange = async (e) => {
            const file = e.target.files[0];
            if(!file) return;
            const path = `${user.id}-${Date.now()}`;
            await _supabase.storage.from('avatars').upload(path, file);
            const { data: { publicUrl } } = _supabase.storage.from('avatars').getPublicUrl(path);
            await _supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id);
            location.reload();
        };
    }
}

// ============================================================
// 5. LANCEMENT GÉNÉRAL
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM chargé, lancement des modules...");
    
    // On lance chaque module dans un try/catch pour qu'une erreur n'arrête pas les autres
    try { initAuth(); } catch(e) { console.error("Erreur Auth:", e); }
    try { initCompteur(); } catch(e) { console.error("Erreur Compteur:", e); }
    try { initDashboard(); } catch(e) { console.error("Erreur Dashboard:", e); }
});