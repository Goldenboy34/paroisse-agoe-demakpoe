// ============================================================
// 1. CONFIGURATION SUPABASE
// ============================================================
const supabaseUrl = 'https://mkufkdtreeqcycnjtcxe.supabase.co'; 
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1rdWZrZHRyZWVxY3ljbmp0Y3hlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4NTA0MjUsImV4cCI6MjA4NzQyNjQyNX0.XG3G_aRQ_NKAu9gxgvWNpKiRCIAX83cps8Jou8S4ne0'; 
const _supabase = supabase.createClient(supabaseUrl, supabaseKey);

// --- NAVIGATION ---
function logout() { 
    _supabase.auth.signOut().then(() => { window.location.href = "index.html"; }); 
}

// ============================================================
// 2. COMPTEUR (ACCUEIL)
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
    }
    setInterval(actualiser, 1000);
    actualiser();
}

// ============================================================
// 3. LOGIQUE DASHBOARD (PHOTO & INFOS)
// ============================================================
async function chargerDashboard() {
    const { data: { user } } = await _supabase.auth.getUser();
    if (!user) {
        window.location.href = "auth.html"; // Redirige si non connecté
        return;
    }

    const userText = document.getElementById('userNameText');
    if (userText) userText.innerText = (user.user_metadata.full_name || user.email.split('@')[0]).toUpperCase();

    // Gestion photo
    const img = document.getElementById('userPhoto');
    const icon = document.getElementById('userIcon');
    const { data: profile } = await _supabase.from('profiles').select('avatar_url').eq('id', user.id).maybeSingle();
    
    if (profile?.avatar_url && img) {
        img.src = profile.avatar_url;
        img.classList.remove('hidden');
        icon?.classList.add('hidden');
    }

    // Historique
    const el = document.getElementById('historiqueMesseTable');
    if (el) {
        const { data } = await _supabase.from('messes').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
        if (data) {
            el.innerHTML = data.map(m => `
                <tr class="border-b border-slate-100 text-[10px]">
                    <td class="py-4 font-bold text-slate-800">${m.beneficiaire}</td>
                    <td class="py-4 text-slate-500">${m.type_priere}</td>
                    <td class="py-4"><span class="px-2 py-1 rounded-full bg-gold/10 text-gold font-black">${m.statut || 'ATTENTE'}</span></td>
                </tr>`).join('');
        }
    }
}

// ============================================================
// 4. INITIALISATION (DÉTECTION PAR ÉLÉMENTS)
// ============================================================
document.addEventListener('DOMContentLoaded', async () => {
    
    // CAS 1 : On est sur la page d'ACCUEIL (car 'days' existe)
    if (document.getElementById('days')) {
        console.log("Mode: Accueil");
        lancerCompteur();
    }

    // CAS 2 : On est sur le DASHBOARD (car 'userNameText' existe)
    if (document.getElementById('userNameText')) {
        console.log("Mode: Dashboard");
        chargerDashboard();
    }

    // CAS 3 : On est sur l'ADMIN (car 'userRadarTable' existe)
    if (document.getElementById('userRadarTable')) {
        console.log("Mode: Admin");
        // ... (votre code admin si besoin)
    }

    // CAS 4 : On est sur AUTH (car 'authForm' existe)
    // On ne fait rien de spécial, l'authForm a déjà son propre code plus haut
});