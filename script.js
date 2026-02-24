// ============================================================
// 1. CONFIGURATION SUPABASE
// ============================================================
const supabaseUrl = 'https://mkufkdtreeqcycnjtcxe.supabase.co'; 
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1rdWZrZHRyZWVxY3ljbmp0Y3hlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4NTA0MjUsImV4cCI6MjA4NzQyNjQyNX0.XG3G_aRQ_NKAu9gxgvWNpKiRCIAX83cps8Jou8S4ne0'; 
const _supabase = supabase.createClient(supabaseUrl, supabaseKey);

// --- FONCTIONS NAVIGATION ---
function logout() { 
    _supabase.auth.signOut().then(() => { window.location.href = "./index.html"; }); 
}

// ============================================================
// 2. COMPTEUR (ACCUEIL) - Version compatible Mobile/Safari
// ============================================================
function lancerCompteur() {
    const daysEl = document.getElementById('days');
    const hoursEl = document.getElementById('hours');
    const minsEl = document.getElementById('minutes');
    const secsEl = document.getElementById('seconds');
    const titleEl = document.getElementById('nomMesse');

    // On vérifie que TOUS les éléments existent avant de continuer
    if (!daysEl || !hoursEl || !minsEl || !secsEl) return;

    function actualiser() {
        const maintenant = new Date();
        
        // Calcul du prochain dimanche 06:30
        let cible = new Date();
        const jourActuel = maintenant.getDay(); 
        const joursRestants = (jourActuel === 0 && maintenant.getHours() < 7) ? 0 : (7 - jourActuel);
        
        cible.setDate(maintenant.getDate() + joursRestants);
        cible.setHours(6, 30, 0, 0);

        const diff = cible - maintenant;

        if (diff <= 0) {
            if (titleEl) titleEl.innerText = "Célébration en cours...";
            return;
        }

        const d = Math.floor(diff / (1000 * 60 * 60 * 24));
        const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((diff % (1000 * 60)) / 1000);

        daysEl.innerText = d.toString().padStart(2, '0');
        hoursEl.innerText = h.toString().padStart(2, '0');
        minsEl.innerText = m.toString().padStart(2, '0');
        secsEl.innerText = s.toString().padStart(2, '0');
        if (titleEl) titleEl.innerText = "Prochaine Messe Dominicale";
    }

    setInterval(actualiser, 1000);
    actualiser();
}

// ============================================================
// 3. GESTION PROFIL & PHOTO
// ============================================================
async function initDashboard() {
    const { data: { user } } = await _supabase.auth.getUser();
    if (!user) return;

    const userText = document.getElementById('userNameText');
    if (userText) userText.innerText = (user.user_metadata.full_name || user.email.split('@')[0]).toUpperCase();

    gererPhotoProfil(user.id);
    chargerHistoriqueMesse(user.id);
}

async function gererPhotoProfil(userId) {
    const img = document.getElementById('userPhoto');
    const icon = document.getElementById('userIcon');
    const input = document.getElementById('profileUpload');

    if (!img || !input) return;

    const { data: profile } = await _supabase.from('profiles').select('avatar_url').eq('id', userId).maybeSingle();
    if (profile?.avatar_url) {
        img.src = profile.avatar_url;
        img.classList.remove('hidden');
        icon?.classList.add('hidden');
    }

    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const fileName = `${userId}-${Date.now()}`;
        await _supabase.storage.from('avatars').upload(fileName, file);
        const { data: { publicUrl } } = _supabase.storage.from('avatars').getPublicUrl(fileName);
        await _supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', userId);
        location.reload();
    };
}

async function chargerHistoriqueMesse(userId) {
    const el = document.getElementById('historiqueMesseTable');
    if (!el) return;
    const { data } = await _supabase.from('messes').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    if (data) {
        el.innerHTML = data.map(m => `
            <tr class="border-b border-slate-100 text-slate-800 text-[10px]">
                <td class="py-4 font-bold">${m.beneficiaire}</td>
                <td class="py-4">${m.type_priere}</td>
                <td class="py-4 text-slate-400">${new Date(m.created_at).toLocaleDateString()}</td>
                <td class="py-4"><span class="px-2 py-1 rounded-full bg-gold/10 text-gold uppercase font-black">${m.statut || 'ATTENTE'}</span></td>
            </tr>`).join('');
    }
}

// ============================================================
// 4. INITIALISATION (Correction boucle GitHub & Mobile)
// ============================================================
document.addEventListener('DOMContentLoaded', async () => {
    const path = window.location.pathname;

    // A. Lancer le compteur si les éléments sont présents (Accueil)
    if (document.getElementById('days')) {
        lancerCompteur();
    }

    // B. Logique spécifique au Dashboard
    // On vérifie que l'URL se termine par dashboard.html pour éviter les erreurs sur GitHub
    if (path.endsWith('dashboard.html') || path.includes('/dashboard.html')) {
        const { data: { user } } = await _supabase.auth.getUser();
        if (!user) {
            window.location.href = "./auth.html";
        } else {
            initDashboard();
        }
    }

    // C. Logique Admin
    if (document.getElementById('userRadarTable')) {
        const { data: users } = await _supabase.from('profiles').select('*');
        document.getElementById('userRadarTable').innerHTML = users.map(u => `
            <tr class="text-[10px] border-b">
                <td class="p-4 font-bold">${u.full_name || u.email}</td>
                <td class="p-4 text-green-500">EN LIGNE</td>
            </tr>`).join('');
    }
});