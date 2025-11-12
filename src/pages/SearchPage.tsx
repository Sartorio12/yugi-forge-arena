import { GlobalSearch } from "@/components/GlobalSearch";
import Navbar from "@/components/Navbar";
import { User } from "@supabase/supabase-js";

interface SearchPageProps {
  user: User | null;
  onLogout: () => void;
}

const SearchPage = ({ user, onLogout }: SearchPageProps) => {
  return (
    <div className="min-h-screen bg-background text-white">
      <Navbar user={user} onLogout={onLogout} />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Buscar</h1>
        <GlobalSearch />
      </main>
    </div>
  );
};

export default SearchPage;
