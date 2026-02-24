// ============================================================
// 1. CONFIGURATION SUPABASE
// ============================================================
const supabaseUrl = 'https://mkufkdtreeqcycnjtcxe.supabase.co'; 
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1rdWZrZHRyZWVxY3ljbmp0Y3hlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4NTA0MjUsImV4cCI6MjA4NzQyNjQyNX0.XG3G_aRQ_NKAu9gxgvWNpKiRCIAX83cps8Jou8S4ne0'; 

const _supabase = supabase.createClient(supabaseUrl, supabaseKey);

// --- NAVIGATION ---
function logout() { 
    _supabase.auth.signOut().then(() => { window.location.href = "./index.html"; }); 
}

// ============================================================
// 2. AUTHENTIFICATION (Connexion / Inscription)
// ============================================================
function initAuth() {
    const authForm = document.getElementById('authForm');
    const toggleBtn = document.getElementById('toggleAuth');
    
    if (!authForm) return;

    let isLogin = true;

    // Utilisation de addEventListener (plus stable sur mobile)
    if (toggleBtn) {
        toggleBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            isLogin = !isLogin;
            
            document.getElementById('authTitle').innerText = isLogin ? "Connexion" : "Inscription";
            document.getElementById('usernameField').classList.toggle('hidden', isLogin);
            document.getElementById('authBtn').querySelector('span').innerText = isLogin ? "Se Connecter" : "Créer un compte";
            document.getElementById('toggleText').innerText = isLogin ? "Nouveau fidèle ?" : "Déjà un compte ?";
        });
    }

    authForm.addEventListener('submit', async function(e) {
        e.preventDefault(); // Empêche le rafraîchissement immédiat sur mobile
        
        const email = document.getElementById('identifier').value;
        const password = document.getElementById('password').value;
        const fullName = document.getElementById('username') ? document.getElementById('username').value : "";

        const btnLabel = document.getElementById('authBtn').querySelector('span');
        const originalText = btnLabel.innerText;
        btnLabel.innerText = "Chargement...";

        try {
            if (isLogin) {
                const { error } = await _supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
                window.location.replace("./dashboard.html"); // replace est mieux pour mobile
            } else {
                const { data, error } = await _supabase.auth.signUp({ 
                    email, 
                    password, 
                    options: { data: { full_name: fullName } } 
                });
                if (error) throw error;
                
                await _supabase.from('profiles').insert([{ id: data.user.id, full_name: fullName, email: email, statut: 'ACTIF' }]);
                alert("Compte créé ! Veuillez vous connecter.");
                window.location.reload();
            }
        } catch (err) {
            alert("Erreur : " + err.message);
            btnLabel.innerText = originalText;
        }
    });
}

// ============================================================
// 3. COMPTEUR (ACCUEIL)
// ============================================================
function initCompteur() {
    if (!document.getElementById('days')) return;

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
    }
    setInterval(update, 1000);
    update();
}

// ============================================================
// 4. DASHBOARD
// ============================================================
async function initDashboard() {
    if (!document.getElementById('userNameText')) return;

    const { data: { user } } = await _supabase.auth.getUser();
    if (!user) {
        window.location.replace("./auth.html");
        return;
    }

    document.getElementById('userNameText').innerText = (user.user_metadata.full_name || user.email.split('@')[0]).toUpperCase();

    // Photo
    const { data: prof } = await _supabase.from('profiles').select('avatar_url').eq('id', user.id).maybeSingle();
    if (prof?.avatar_url && document.getElementById('userPhoto')) {
        document.getElementById('userPhoto').src = prof.avatar_url;
        document.getElementById('userPhoto').classList.remove('hidden');
        document.getElementById('userIcon')?.classList.add('hidden');
    }
}

// ============================================================
// 5. LANCEMENT UNIQUE
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    initAuth();
    initCompteur();
    initDashboard();
});
// Fonction pour ouvrir/fermer la barre latérale sur mobile
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    
    if (sidebar.classList.contains('-translate-x-full')) {
        sidebar.classList.remove('-translate-x-full');
        overlay.classList.remove('hidden');
    } else {
        sidebar.classList.add('-translate-x-full');
        overlay.classList.add('hidden');
    }
}