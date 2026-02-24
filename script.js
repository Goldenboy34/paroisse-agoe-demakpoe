const supabaseUrl = 'https://mkufkdtreeqcycnjtcxe.supabase.co'; 
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1rdWZrZHRyZWVxY3ljbmp0Y3hlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4NTA0MjUsImV4cCI6MjA4NzQyNjQyNX0.XG3G_aRQ_NKAu9gxgvWNpKiRCIAX83cps8Jou8S4ne0'; 
const _supabase = supabase.createClient(supabaseUrl, supabaseKey);

// --- NAVIGATION & UI ---
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    sidebar.classList.toggle('-translate-x-full');
    overlay.classList.toggle('hidden');
}

function openModal(id) { document.getElementById(id)?.classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id)?.classList.add('hidden'); }
function logout() { _supabase.auth.signOut().then(() => { window.location.href = "./index.html"; }); }

// --- AUTHENTIFICATION ---
function initAuth() {
    const authForm = document.getElementById('authForm');
    const toggleBtn = document.getElementById('toggleAuth');
    if (!authForm) return;

    let isLogin = true;
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
            if (error) alert(error.message); else window.location.href = "./dashboard.html";
        } else {
            const { data, error } = await _supabase.auth.signUp({ email, password, options: { data: { full_name: fullName } } });
            if (error) alert(error.message); else {
                await _supabase.from('profiles').insert([{ id: data.user.id, full_name: fullName, email, statut: 'ACTIF' }]);
                alert("Compte créé !"); location.reload();
            }
        }
    };
}

// --- DASHBOARD ---
async function initDashboard() {
    if (!document.getElementById('userNameText')) return;

    const { data: { user } } = await _supabase.auth.getUser();
    if (!user) { window.location.href = "./auth.html"; return; }

    const name = (user.user_metadata.full_name || user.email.split('@')[0]).toUpperCase();
    document.getElementById('userNameText').innerText = name;
    if (document.getElementById('userNameMobile')) document.getElementById('userNameMobile').innerText = name;

    // Photo
    const img = document.getElementById('userPhoto');
    const icon = document.getElementById('userIcon');
    const upload = document.getElementById('profileUpload');
    const { data: prof } = await _supabase.from('profiles').select('avatar_url').eq('id', user.id).maybeSingle();
    
    if (prof?.avatar_url && img) {
        img.src = prof.avatar_url; img.classList.remove('hidden'); icon?.classList.add('hidden');
    }

    if (upload) {
        upload.onchange = async (e) => {
            const file = e.target.files[0];
            const path = `${user.id}-${Date.now()}`;
            await _supabase.storage.from('avatars').upload(path, file);
            const { data: { publicUrl } } = _supabase.storage.from('avatars').getPublicUrl(path);
            await _supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id);
            location.reload();
        };
    }

    // Historique
    const { data: messes } = await _supabase.from('messes').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    const table = document.getElementById('historiqueMesseTable');
    if (messes && table) {
        table.innerHTML = messes.map(m => `
            <tr class="border-b border-slate-50 hover:bg-slate-50">
                <td class="py-4 font-bold">${m.beneficiaire}</td>
                <td class="py-4 text-slate-500">${m.type_priere}</td>
                <td class="py-4 text-slate-400">${new Date(m.created_at).toLocaleDateString()}</td>
                <td class="py-4"><span class="px-3 py-1 rounded-full bg-gold/10 text-gold font-black uppercase text-[8px]">${m.statut || 'ATTENTE'}</span></td>
                <td class="py-4 text-right">${m.statut === 'VALIDÉ' ? `<button onclick="downloadRecu('${m.id}')" class="text-slate-900"><i class="fa-solid fa-download"></i></button>` : '<i class="fa-solid fa-clock opacity-20"></i>'}</td>
            </tr>`).join('');
    }

    // Formulaires
    document.getElementById('formMesse').onsubmit = async (e) => {
        e.preventDefault();
        const payload = {
            user_id: user.id,
            beneficiaire: document.getElementById('messeBeneficiaire').value,
            type_priere: document.getElementById('messeType').value,
            intention: document.getElementById('messeIntention').value,
            transaction_id: document.getElementById('messeTransaction').value,
            statut: 'EN ATTENTE'
        };
        await _supabase.from('messes').insert([payload]);
        alert("Demande envoyée !"); location.reload();
    };
}

// --- COMPTEUR ---
function initCompteur() {
    if (!document.getElementById('days')) return;
    function update() {
        const now = new Date(); let target = new Date();
        const dayIdx = now.getDay();
        const daysToSun = (dayIdx === 0 && now.getHours() < 7) ? 0 : (7 - dayIdx);
        target.setDate(now.getDate() + daysToSun); target.setHours(6, 30, 0, 0);
        const diff = target - now; if (diff <= 0) return;
        document.getElementById('days').innerText = Math.floor(diff / 86400000).toString().padStart(2, '0');
        document.getElementById('hours').innerText = Math.floor((diff % 86400000) / 3600000).toString().padStart(2, '0');
        document.getElementById('minutes').innerText = Math.floor((diff % 3600000) / 60000).toString().padStart(2, '0');
        document.getElementById('seconds').innerText = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');
    }
    setInterval(update, 1000); update();
}

document.addEventListener('DOMContentLoaded', () => {
    initAuth(); initCompteur(); initDashboard();
});