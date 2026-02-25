// 1. CONFIGURATION
const supabaseUrl = 'https://mkufkdtreeqcycnjtcxe.supabase.co'; 
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1rdWZrZHRyZWVxY3ljbmp0Y3hlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4NTA0MjUsImV4cCI6MjA4NzQyNjQyNX0.XG3G_aRQ_NKAu9gxgvWNpKiRCIAX83cps8Jou8S4ne0'; 
const _supabase = supabase.createClient(supabaseUrl, supabaseKey);

// 2. NAVIGATION & UI
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    if (sidebar && overlay) {
        sidebar.classList.toggle('-translate-x-full');
        overlay.classList.toggle('hidden');
    }
}

function openModal(id) { document.getElementById(id)?.classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id)?.classList.add('hidden'); }
function logout() { _supabase.auth.signOut().then(() => { window.location.href = "index.html"; }); }

// 3. SYNCHRONISATION DU PROFIL (Sur toutes les pages)
async function syncProfil() {
    const { data: { user } } = await _supabase.auth.getUser();
    
    // Si on est sur l'accueil, on gère la Nav dynamique
    const navAuth = document.getElementById('navAuthSection');
    
    if (user) {
        const { data: profile } = await _supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
        const name = (profile?.full_name || user.email.split('@')[0]).toUpperCase();
        const photo = profile?.avatar_url;

        // Mise à jour de tous les éléments "Nom" et "Photo" présents sur la page
        document.querySelectorAll('.user-name-display').forEach(el => el.innerText = name);
        if (photo) {
            document.querySelectorAll('.user-photo-display').forEach(img => {
                img.src = photo;
                img.classList.remove('hidden');
            });
            document.querySelectorAll('#userIcon').forEach(icon => icon.classList.add('hidden'));
        }

        // Si on est sur l'accueil (index.html), on remplace le bouton par le profil
        if (navAuth) {
            navAuth.innerHTML = `
                <div class="flex items-center gap-3 bg-white/80 p-2 pr-4 rounded-full border border-gold/20 shadow-sm cursor-pointer" onclick="window.location.href='dashboard.html'">
                    <div class="h-10 w-10 bg-slate-900 rounded-full flex items-center justify-center text-white overflow-hidden border-2 border-gold">
                        ${photo ? `<img src="${photo}" class="h-full w-full object-cover">` : `<i class="fa-solid fa-user text-xs"></i>`}
                    </div>
                    <div class="hidden sm:block text-left">
                        <p class="text-[7px] font-black text-gold uppercase leading-none">Connecté</p>
                        <p class="text-[10px] font-black text-slate-900">${name}</p>
                    </div>
                </div>
            `;
        }
    }
}

// 4. GESTION UPLOAD PHOTO
async function initPhotoUpload() {
    const input = document.getElementById('profileUpload');
    if (!input) return;

    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const { data: { user } } = await _supabase.auth.getUser();
        const fileName = `${user.id}-${Date.now()}`;

        // 1. Upload
        const { error: upErr } = await _supabase.storage.from('avatars').upload(fileName, file);
        if (upErr) return alert("Erreur upload");

        // 2. URL
        const { data: { publicUrl } } = _supabase.storage.from('avatars').getPublicUrl(fileName);

        // 3. SQL
        await _supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id);
        
        location.reload();
    };
}

// 5. INITIALISATION
document.addEventListener('DOMContentLoaded', () => {
    syncProfil();
    initPhotoUpload();
    
    // Autres fonctions (Auth, Compteur, Historique)
    if (document.getElementById('authForm')) initAuth();
    if (document.getElementById('days')) lancerCompteur();
    if (document.getElementById('historiqueMesseTable')) chargerHistorique(); 
});

// Inclure ici tes autres fonctions existantes : initAuth(), lancerCompteur(), etc.