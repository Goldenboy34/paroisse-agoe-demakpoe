export default function Home() {
  return (
    <main className="min-h-screen bg-white font-sans text-gray-900">
      {/* Barre de Navigation */}
      <nav className="bg-[#23318E] text-white p-4 sticky top-0 z-50 shadow-2xl">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
             <img src="logo-paroisse.jpg" alt="Logo" className="h-12 w-12 rounded-full border-2 border-white shadow-md shadow-blue-400" />
             <span className="font-black text-sm md:text-lg leading-tight">NOTRE DAME DE L'ASSOMPTION</span>
          </div>
          <div className="hidden md:flex space-x-8 font-bold text-xs tracking-widest">
            <a href="." className="border-b-2 border-red-600">ACCUEIL</a>
            <a href="messes" className="hover:text-red-500 transition">DEMANDER UNE MESSE</a>
            <a href="#" className="hover:text-red-500 transition">ACTUALITÉS</a>
          </div>
        </div>
      </nav>

      {/* Hero Section - Image de fond et Titre */}
      <section className="relative h-[70vh] flex items-center justify-center text-center px-4 bg-gradient-to-b from-[#23318E] to-blue-900 text-white">
        <div className="z-10 animate-fade-in">
          <h2 className="text-sm md:text-xl font-bold uppercase tracking-[0.3em] mb-4 text-red-400">Paroisse d'Agoè Démakpoè</h2>
          <h1 className="text-4xl md:text-7xl font-black mb-8 leading-tight drop-shadow-2xl">
            La Foi qui agit <br/> par la Charité
          </h1>
          <div className="flex flex-wrap justify-center gap-6">
            <a href="messes" className="bg-[#E30613] hover:bg-white hover:text-[#E30613] text-white px-10 py-5 rounded-full font-black text-sm transition-all duration-300 transform hover:scale-110 shadow-2xl">
              DEMANDER UNE MESSE
            </a>
            <button className="bg-transparent border-2 border-white text-white px-10 py-5 rounded-full font-black text-sm hover:bg-white hover:text-blue-900 transition-all shadow-xl">
              HORAIRES DES MESSES
            </button>
          </div>
        </div>
      </section>

      {/* Section Infos Rapides */}
      <section className="py-20 container mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 px-6 -mt-16 relative z-20">
        <div className="bg-white p-8 rounded-2xl shadow-2xl border-b-8 border-blue-800">
          <h3 className="font-black text-blue-900 mb-4 uppercase">Horaires</h3>
          <p className="text-gray-600 text-sm">Semaine : 06h00 <br/> Dimanche : 07h00 - 09h30</p>
        </div>
        <div className="bg-white p-8 rounded-2xl shadow-2xl border-b-8 border-red-600">
          <h3 className="font-black text-red-600 mb-4 uppercase">Confessions</h3>
          <p className="text-gray-600 text-sm">Samedi : 16h00 - 18h00 <br/> Après chaque messe de semaine</p>
        </div>
        <div className="bg-white p-8 rounded-2xl shadow-2xl border-b-8 border-blue-800">
          <h3 className="font-black text-blue-900 mb-4 uppercase">Secrétariat</h3>
          <p className="text-gray-600 text-sm">Lundi au Vendredi <br/> 08h00 - 12h00 / 15h00 - 18h00</p>
        </div>
      </section>
    </main>
  );
}
