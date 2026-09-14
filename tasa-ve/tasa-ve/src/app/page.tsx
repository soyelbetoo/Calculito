import Dashboard from "@/components/Dashboard";

export default function Home() {
  return (
    <main className="flex-1 w-full max-w-md mx-auto px-4 py-6 flex flex-col gap-4">
      <Dashboard />
      <footer className="text-center text-xs text-text-faint pt-2 pb-4">
        Tasa BCV vía pyDolarVenezuela · Tasa P2P vía Binance · EUR/USD vía
        Frankfurter. Datos de referencia, no constituyen asesoría financiera.
      </footer>
    </main>
  );
}
