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
                // Création auto du profil dans la table 'profiles'
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
    if (!userText || window.location.pathname.includes('admin.html')) return;

    const { data: { user } } = await _supabase.auth.getUser();
    if (!user) { window.location.href = "auth.html"; return; }

    // Gardien de bannissement
    verifierStatutBannissement(user.id);

    const fullName = user.user_metadata.full_name || user.email.split('@')[0];
    userText.innerText = fullName.toUpperCase();

    // Temps réel pour les validations de messes
    _supabase.channel('messes_realtime').on('postgres_changes', { 
        event: 'UPDATE', schema: 'public', table: 'messes', filter: `user_id=eq.${user.id}` 
    }, payload => {
        chargerHistoriqueMesse(user.id);
    }).subscribe();

    chargerHistoriqueMesse(user.id);
}

async function verifierStatutBannissement(userId) {
    _supabase.channel('check_ban').on('postgres_changes', { 
        event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` 
    }, payload => {
        if (payload.new.statut === 'BANNI') {
            alert("Votre compte a été suspendu par l'administration.");
            logout();
        }
    }).subscribe();

    const { data } = await _supabase.from('profiles').select('statut').eq('id', userId).single();
    if (data && data.statut === 'BANNI') logout();
}

async function chargerHistoriqueMesse(userId) {
    const el = document.getElementById('historiqueMesseTable');
    if (!el) return;

    const { data } = await _supabase.from('messes').select('*').eq('user_id', userId).order('created_at', { ascending: false });

    if (data && data.length > 0) {
        el.innerHTML = data.map(m => {
            const statusNormalise = m.statut ? m.statut.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase() : "";
            const isValid = (statusNormalise === "VALIDE" || statusNormalise === "VALIDÉ"); 

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
    } else {
        el.innerHTML = "<tr><td colspan='5' class='py-10 text-center opacity-30 uppercase text-[10px] font-black'>Aucune donnée trouvée</td></tr>";
    }
}

// ============================================================
// 4. ADMINISTRATION (Membres, Validation et Stats)
// ============================================================
async function initAdminAdvanced() {
    if (!document.getElementById('userRadarTable')) return;

    document.getElementById('currentDate').innerText = new Date().toLocaleDateString('fr-FR', {weekday: 'long', day: 'numeric', month: 'long'});
    
    chargerStatsAdmin();
    chargerMembresEnLigne();
    chargerValidationMesses();
    chargerGestionPublications();
}

async function chargerMembresEnLigne() {
    const el = document.getElementById('userRadarTable');
    if (!el) return;
    const { data: users } = await _supabase.from('profiles').select('*').limit(20);
    if (users) {
        el.innerHTML = users.map(u => `
            <tr>
                <td class="p-4 flex items-center gap-3">
                    <div class="h-8 w-8 bg-navy text-white rounded-lg flex items-center justify-center font-bold text-[10px] uppercase">${(u.full_name || u.email || "?").charAt(0)}</div>
                    <div><p class="font-bold text-[11px] text-slate-800">${u.full_name || 'Fidèle'}</p><p class="text-[9px] text-slate-400">${u.email || ''}</p></div>
                </td>
                <td class="p-4"><span class="text-[10px] ${u.statut === 'BANNI' ? 'text-red-500 font-bold' : 'text-green-500'}">${u.statut === 'BANNI' ? 'BANNI' : 'EN LIGNE'}</span></td>
                <td class="p-4 text-right">
                    <button onclick="bannirFidele('${u.id}', '${u.statut}')" class="${u.statut === 'BANNI' ? 'text-green-500' : 'text-red-300 hover:text-red-600'} transition text-sm">
                        <i class="fa-solid ${u.statut === 'BANNI' ? 'fa-user-check' : 'fa-user-slash'}"></i>
                    </button>
                </td>
            </tr>`).join('');
    }
}

async function bannirFidele(userId, statutActuel) {
    const nouveauStatut = statutActuel === 'BANNI' ? 'ACTIF' : 'BANNI';
    if (confirm(`Changer le statut vers ${nouveauStatut} ?`)) {
        await _supabase.from('profiles').update({ statut: nouveauStatut }).eq('id', userId);
        chargerMembresEnLigne();
    }
}

async function chargerValidationMesses() {
    const el = document.getElementById('adminMesseTable');
    if (!el) return;
    const { data } = await _supabase.from('messes').select('*').eq('statut', 'EN ATTENTE');
    if (data && data.length > 0) {
        el.innerHTML = data.map(m => `
            <div class="flex justify-between items-center p-4 bg-white border border-slate-100 rounded-2xl shadow-sm mb-3">
                <div><p class="font-black text-[11px] uppercase">${m.beneficiaire}</p><p class="text-[9px] text-slate-400">ID: ${m.transaction_id}</p></div>
                <button onclick="validerMesse('${m.id}')" class="bg-green-600 text-white px-5 py-2 rounded-xl text-[9px] font-black uppercase">Valider</button>
            </div>`).join('');
    } else el.innerHTML = `<p class="text-center py-6 text-slate-300 text-[10px] italic">Tout est à jour.</p>`;
}

async function validerMesse(id) {
    const { error } = await _supabase.from('messes').update({ statut: 'VALIDÉ' }).eq('id', id);
    if (!error) { alert("Validé !"); chargerValidationMesses(); chargerStatsAdmin(); }
}

async function chargerStatsAdmin() {
    const { count: userCount } = await _supabase.from('profiles').select('*', { count: 'exact', head: true });
    if(document.getElementById('onlineCount')) document.getElementById('onlineCount').innerText = userCount || 0;
    const { count: messeCount } = await _supabase.from('messes').select('*', { count: 'exact', head: true }).eq('statut', 'EN ATTENTE');
    if(document.getElementById('pendingMesseCount')) document.getElementById('pendingMesseCount').innerText = messeCount || 0;
}

async function chargerAnnoncesAccueil() {
    const container = document.getElementById('indexAnnonces');
    if (!container) return;

    // On récupère les 3 dernières publications de liturgie comme annonces
    const { data: annonces } = await _supabase
        .from('liturgie_maison')
        .select('*')
        .order('date_jour', { ascending: false })
        .limit(3);

    if (annonces && annonces.length > 0) {
        container.innerHTML = annonces.map(a => `
            <div class="glass-card p-6 border-l-4 border-gold mb-4">
                <p class="text-[10px] font-black text-gold uppercase">${new Date(a.date_jour).toLocaleDateString()}</p>
                <h4 class="font-bold text-lg text-slate-900">${a.titre_jour}</h4>
                <p class="text-sm text-slate-600 line-clamp-2">${a.evangile_texte.substring(0, 150)}...</p>
                <a href="lectures.html" class="text-xs font-bold text-navy mt-3 inline-block hover:underline">Lire la suite →</a>
            </div>
        `).join('');
    } else {
        container.innerHTML = "<p class='text-slate-400 italic'>Aucune annonce récente.</p>";
    }
}

// N'oubliez pas d'ajouter chargerAnnoncesAccueil() dans le DOMContentLoaded !

// ============================================================
// 5. LITURGIE & LECTURES (Admin + Page Publique)
// ============================================================
const formLiturgie = document.getElementById('formLiturgie');
if (formLiturgie) {
    formLiturgie.onsubmit = async (e) => {
        e.preventDefault();
        const btn = formLiturgie.querySelector('button');
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Publication...';
        
        const payload = {
            date_jour: document.getElementById('litDate').value,
            couleur: document.getElementById('litCouleur').value,
            titre_jour: document.getElementById('litTitre').value,
            lecture1_titre: document.getElementById('litL1')?.value || "",
            lecture1_texte: document.getElementById('litL1Texte')?.value || "",
            psaume_titre: document.getElementById('litPs')?.value || "",
            psaume_texte: document.getElementById('litPsTexte')?.value || "",
            lecture2_titre: document.getElementById('litL2')?.value || "",
            lecture2_texte: document.getElementById('litL2Texte')?.value || "",
            evangile_titre: document.getElementById('litEv')?.value || "",
            evangile_texte: document.getElementById('litEvTexte').value
        };

        const { error } = await _supabase.from('liturgie_maison').upsert([payload], { onConflict: 'date_jour' }); 

        if (!error) { alert("✨ Parole publiée !"); formLiturgie.reset(); }
        else alert("Erreur : " + error.message);
        btn.innerText = "Publier la Parole";
    };
}

async function afficherLecturesDuJour() {
    const container = document.getElementById('contenuLectures');
    if (!container) return;

    const d = new Date();
    const today = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');

    const { data: l } = await _supabase.from('liturgie_maison').select('*').eq('date_jour', today).maybeSingle();

    if (l) {
        document.getElementById('viewTitreJour').innerText = l.titre_jour;
        document.getElementById('viewDate').innerText = new Date(l.date_jour).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        document.getElementById('badgeCouleur').innerText = l.couleur;
        
        const colorClasses = { 'VERT': 'bg-green-700', 'ROUGE': 'bg-red-700', 'BLANC': 'bg-slate-500', 'VIOLET': 'bg-purple-800' };
        document.getElementById('headerLiturgie').className = `text-center mb-12 p-10 rounded-[3rem] text-white shadow-2xl transition-all ${colorClasses[l.couleur] || 'bg-navy'}`;

        let html = "";
        if(l.lecture1_texte) html += designLecture("Première Lecture", l.lecture1_titre, l.lecture1_texte, "border-navy");
        if(l.psaume_texte) html += designLecture("Psaume Responsorial", l.psaume_titre, l.psaume_texte, "border-gold", "font-serif italic");
        if(l.lecture2_texte) html += designLecture("Deuxième Lecture", l.lecture2_titre, l.lecture2_texte, "border-navy");
        if(l.evangile_texte) html += designLecture("Saint Évangile", l.evangile_titre, l.evangile_texte, "border-red-600", "font-bold text-lg", true);
        container.innerHTML = html;
    } else {
        container.innerHTML = `<div class="text-center py-20 opacity-40 italic"><p>Aucun texte pour aujourd'hui.</p></div>`;
    }
}

function designLecture(type, ref, texte, borderColor, extraClass = "", isEvangile = false) {
    return `
        <div class="glass-card p-8 md:p-12 border-l-8 ${borderColor} shadow-xl mb-8 bg-white/90">
            <div class="flex items-center gap-3 mb-4">
                <span class="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">${type}</span>
                <div class="h-[1px] flex-1 bg-slate-100"></div>
                ${isEvangile ? '<i class="fa-solid fa-cross text-red-600"></i>' : ''}
            </div>
            <h3 class="text-xl font-serif italic mb-6 text-slate-900">${ref}</h3>
            <div class="text-slate-800 leading-relaxed space-y-4 ${extraClass}">${texte.replace(/\n/g, '<br>')}</div>
        </div>`;
}

// ============================================================
// 6. INITIALISATION GLOBALE
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    initDashboard();
    initAdminAdvanced();
    if (window.location.pathname.includes('lectures.html')) afficherLecturesDuJour();
    async function initDashboard() {
    // ... votre code existant ...
    const { data: { user } } = await _supabase.auth.getUser();
    if (!user) { window.location.href = "auth.html"; return; }

    // AJOUTER CETTE LIGNE ICI :
    gererPhotoProfil(user.id); 

    // ... reste du code ...
}
});
// ============================================================
// 0. COMPTEUR DE LA PAGE D'ACCUEIL (INDEX.HTML)
// ============================================================
function lancerCompteur() {
    const joursEl = document.getElementById('days');
    const heuresEl = document.getElementById('hours');
    const minutesEl = document.getElementById('minutes');
    const secondesEl = document.getElementById('seconds');
    const titreMesseEl = document.getElementById('nomMesse');

    if (!joursEl) return; // Si on n'est pas sur la page d'accueil, on arrête

    function actualiser() {
        const maintenant = new Date();
        
        // Cible : Prochain Dimanche à 06:30
        let cible = new Date();
        cible.setDate(maintenant.getDate() + (7 - maintenant.getDay()) % 7);
        cible.setHours(6, 30, 0, 0);

        // Si on est dimanche après 06:30, on vise le dimanche suivant
        if (maintenant > cible) {
            cible.setDate(cible.getDate() + 7);
        }

        titreMesseEl.innerText = "Prochaine Messe Dominicale";

        const difference = cible - maintenant;

        const d = Math.floor(difference / (1000 * 60 * 60 * 24));
        const h = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const m = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((difference % (1000 * 60)) / 1000);

        joursEl.innerText = d.toString().padStart(2, '0');
        heuresEl.innerText = h.toString().padStart(2, '0');
        minutesEl.innerText = m.toString().padStart(2, '0');
        secondesEl.innerText = s.toString().padStart(2, '0');
    }

    setInterval(actualiser, 1000);
    actualiser();
}

// Modifier votre section d'initialisation à la fin du fichier script.js :
document.addEventListener('DOMContentLoaded', () => {
    lancerCompteur(); // <--- AJOUTER CECI
    initDashboard();
    initAdminAdvanced();
    if (window.location.pathname.includes('lectures.html')) {
        afficherLecturesDuJour();
    }
});
// ============================================================
// GESTION DE LA PHOTO DE PROFIL
// ============================================================

async function gererPhotoProfil(userId) {
    const fileInput = document.getElementById('profileUpload');
    const imgElement = document.getElementById('userPhoto');
    const iconElement = document.getElementById('userIcon');

    if (!imgElement || !fileInput) return;

    // --- ÉTAPE A : RÉCUPÉRER LA PHOTO AU CHARGEMENT ---
    const { data: profile, error: fetchError } = await _supabase
        .from('profiles')
        .select('avatar_url')
        .eq('id', userId)
        .maybeSingle(); // Utilise maybeSingle pour éviter les erreurs si vide

    if (profile && profile.avatar_url) {
        console.log("Photo trouvée :", profile.avatar_url);
        imgElement.src = profile.avatar_url;
        imgElement.classList.remove('hidden');
        iconElement.classList.add('hidden');
    } else {
        console.log("Aucune photo dans la base de données.");
    }

    // --- ÉTAPE B : ENREGISTRER UNE NOUVELLE PHOTO ---
    fileInput.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Afficher un petit indicateur de chargement (optionnel)
        iconElement.className = "fa-solid fa-spinner fa-spin"; 

        const fileExt = file.name.split('.').pop();
        const fileName = `${userId}-${Date.now()}.${fileExt}`; // Date.now évite les conflits de cache
        const filePath = `${fileName}`;

        // 1. Envoyer au stockage Supabase
        const { error: uploadError } = await _supabase.storage
            .from('avatars')
            .upload(filePath, file);

        if (uploadError) {
            alert("Erreur stockage : " + uploadError.message);
            return;
        }

        // 2. Récupérer l'URL publique
        const { data: { publicUrl } } = _supabase.storage
            .from('avatars')
            .getPublicUrl(filePath);

        // 3. MISE À JOUR CRUCIALE DANS LA TABLE PROFILES
        const { error: updateError } = await _supabase
            .from('profiles')
            .update({ avatar_url: publicUrl })
            .eq('id', userId);

        if (updateError) {
            alert("Erreur mise à jour profil : " + updateError.message);
        } else {
            // 4. Mettre à jour l'affichage immédiatement
            imgElement.src = publicUrl;
            imgElement.classList.remove('hidden');
            iconElement.classList.add('hidden');
            alert("Photo enregistrée avec succès !");
        }
    };
}