export default function Home() {
  return (
    <main className="min-h-screen bg-white font-sans">
      <nav className="bg-[#23318E] text-white p-5 shadow-xl">
        <div className="container mx-auto flex justify-between items-center">
          <span className="font-bold text-lg uppercase tracking-wider">Notre Dame de l'Assomption</span>
          <div className="hidden md:flex space-x-6 text-sm font-medium">
            <a href="#" className="border-b-2 border-[#E30613]">ACCUEIL</a>
            <a href="#" className="hover:text-red-400">DEMANDER UNE MESSE</a>
            <a href="#" className="hover:text-red-400">CONTACT</a>
          </div>
        </div>
      </nav>

      <section className="py-24 text-center px-4">
        <h1 className="text-5xl font-black text-[#23318E] mb-6">
          Paroisse d'Agoè Démakpoè
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
          Bienvenue sur la plateforme digitale de la communauté chrétienne 
          Apegnigbi. Un lieu de foi et de service.
        </p>
        <div className="mt-12 flex justify-center gap-4">
          <button className="bg-[#E30613] text-white px-10 py-4 rounded-full font-bold shadow-2xl hover:scale-105 transition">
            FAIRE UNE OFFRANDE
          </button>
        </div>
      </section>
    </main>
  );
}
