import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react"; // Only for initial loader for now
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils"; // For combining classnames

// Re-using interfaces and constants from the original DeckBuilder
interface CardData {
  id: string;
  name: string;
  pt_name?: string | null;
  type: string;
  description: string;
  race: string;
  attribute?: string;
  atk?: number;
  def?: number;
  level?: number;
  image_url: string;
  image_url_small: string;
  ban_tcg?: string;
  ban_ocg?: string;
  ban_master_duel?: string | null;
  genesys_points?: number;
  md_rarity?: string | null;
}

interface DeckBuilderProps {
  user: User | null;
  onLogout: () => void;
}

// Placeholder SVG for FontAwesome search icon
const SearchIconSVG = () => (
    <svg className="no-select svelte-fa svelte-xj8byo" style={{height:'1em',verticalAlign:'-.125em',transformOrigin:'center',overflow:'visible'}} viewBox="0 0 512 512" aria-hidden="true" role="img" xmlns="http://www.w3.org/2000/svg"><g transform="translate(256 256)" transformOrigin="128 0"><g transform="translate(0,0) scale(1,1)"><path d="M505 442.7L405.3 343c-4.5-4.5-10.6-7-17-7H372c27.6-35.3 44-79.7 44-128C416 93.1 322.9 0 208 0S0 93.1 0 208s93.1 208 208 208c48.3 0 92.7-16.4 128-44v16.3c0 6.4 2.5 12.5 7 17l99.7 99.7c9.4 9.4 24.6 9.4 33.9 0l28.3-28.3c9.4-9.4 9.4-24.6.1-34zM208 336c-70.7 0-128-57.2-128-128 0-70.7 57.2-128 128-128 70.7 0 128 57.2 128 128 0 70.7-57.2 128-128 128z" fill="currentColor" transform="translate(-256 -256)"></path></g></g></svg>
);

// Placeholder SVG for FontAwesome info icon
const InfoIconSVG = () => (
    <svg className="no-select svelte-fa svelte-xj8byo" style={{height:'1em',verticalAlign:'-.125em',transformOrigin:'center',overflow:'visible'}} viewBox="0 0 512 512" aria-hidden="true" role="img" xmlns="http://www.w3.org/2000/svg"><g transform="translate(256 256)" transformOrigin="128 0"><g transform="translate(0,0) scale(1,1)"><path d="M256 8C119.043 8 8 119.083 8 256c0 136.997 111.043 248 248 248s248-111.003 248-248C504 119.083 392.957 8 256 8zm0 110c23.196 0 42 18.804 42 42s-18.804 42-42 42-42-18.804-42-42 18.804-42 42-42zm56 254c0 6.627-5.373 12-12 12h-88c-6.627 0-12-5.373-12-12v-24c0-6.627 5.373-12 12-12h12v-64h-12c-6.627 0-12-5.373-12-12v-24c0-6.627 5.373-12 12-12h64c6.627 0 12 5.373 12 12v100h12c6.627 0 12 5.373 12 12v24z" fill="currentColor" transform="translate(-256 -256)"></path></g></g></svg>
);

// Placeholder SVG for FontAwesome caret-down icon (for selects)
const CaretDownIconSVG = () => (
    <svg width="100%" height="100%" viewBox="0 0 20 20" focusable="false" aria-hidden="true" className="svelte-14r22mt"><path d="M4.516 7.548c0.436-0.446 1.043-0.481 1.576 0l3.908 3.747
    3.908-3.747c0.533-0.481 1.141-0.446 1.574 0 0.436 0.445 0.408 1.197 0
    1.615-0.406 0.418-4.695 4.502-4.695 4.502-0.217 0.223-0.502
    0.335-0.787 0.335s-0.57-0.112-0.789-0.335c0
    0-4.287-4.084-4.695-4.502s-0.436-1.17 0-1.615z"></path></svg>
);

// Placeholder SVG for FontAwesome sort icon
const SortIconSVG = () => (
    <svg className="no-select svelte-fa svelte-xj8byo" style={{height:'1em',verticalAlign:'-.125em',transformOrigin:'center',overflow:'visible'}} viewBox="0 0 512 512" aria-hidden="true" role="img" xmlns="http://www.w3.org/2000/svg"><g transform="translate(256 256)" transformOrigin="128 0"><g transform="translate(0,0) scale(1,1)"><path d="M304 416h-64a16 16 0 0 0-16 16v32a16 16 0 0 0 16 16h64a16 16 0 0 0 16-16v-32a16 16 0 0 0-16-16zm-128-64h-48V48a16 16 0 0 0-16-16H80a16 16 0 0 0-16 16v304H16c-14.19 0-21.37 17.24-11.29 27.31l80 96a16 16 0 0 0 22.62 0l80-96C197.35 369.26 190.22 352 176 352zm256-192H240a16 16 0 0 0-16 16v32a16 16 0 0 0 16 16h192a16 16 0 0 0 16-16v-32a16 16 0 0 0-16-16zm-64 128H240a16 16 0 0 0-16 16v32a16 16 0 0 0 16 16h128a16 16 0 0 0 16-16v-32a16 16 0 0 0-16-16zM496 32H240a16 16 0 0 0-16 16v32a16 16 0 0 0 16 16h256a16 16 0 0 0 16-16V48a16 16 0 0 0-16-16z" fill="currentColor" transform="translate(-256 -256)"></path></g></g></svg>
);


// Placeholder SVG for FontAwesome question-circle icon (for status info)
const QuestionCircleIconSVG = () => (
    <svg className="no-select svelte-fa svelte-xj8byo" style={{height:'1em',verticalAlign:'-.125em',transformOrigin:'center',overflow:'visible'}} viewBox="0 0 512 512" aria-hidden="true" role="img" xmlns="http://www.w3.org/2000/svg"><g transform="translate(256 256)" transformOrigin="128 0"><g transform="translate(0,0) scale(1,1)"><path d="M256 8C119.043 8 8 119.083 8 256c0 136.997 111.043 248 248 248s248-111.003 248-248C504 119.083 392.957 8 256 8zm0 110c23.196 0 42 18.804 42 42s-18.804 42-42 42-42-18.804-42-42 18.804-42 42-42zm56 254c0 6.627-5.373 12-12 12h-88c-6.627 0-12-5.373-12-12v-24c0-6.627 5.373-12 12-12h12v-64h-12c-6.627 0-12-5.373-12-12v-24c0-6.627 5.373-12 12-12h64c6.627 0 12 5.373 12 12v100h12c6.627 0 12 5.373 12 12v24z" fill="currentColor" transform="translate(-256 -256)"></path></g></g></svg>
);


// --- Main Component ---
const DeckBuilderV2 = ({ user, onLogout }: DeckBuilderProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();

  // States from original DeckBuilder (to be wired up)
  const [deckName, setDeckName] = useState("New deck");
  const [editingDeckId, setEditingDeckId] = useState<number | null>(null);
  const [mainDeck, setMainDeck] = useState<CardData[]>([]);
  const [extraDeck, setExtraDeck] = useState<CardData[]>([]);
  const [sideDeck, setSideDeck] = useState<CardData[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeckLocked, setIsDeckLocked] = useState(false); // To be fully integrated
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false); // To be fully integrated
  const [isLoadingDeck, setIsLoadingDeck] = useState(true); // From original, for initial load
  const [isSuperAdmin, setIsSuperAdmin] = useState(false); // From original, for super admin override
  const [selectedTab, setSelectedTab] = useState("build"); // For the tabs

  // Placeholder for the old loadDeckForEditing logic, will be migrated
  const loadDeckForEditing = useCallback(async (deckId: number) => {
    setIsLoadingDeck(true);
    try {
      // Placeholder logic for now, actual implementation will come from original DeckBuilder.tsx
      console.log("Loading deck for editing:", deckId);
      // Simulate loading
      await new Promise(resolve => setTimeout(resolve, 500)); 
      setDeckName("Loaded Deck Example");
      setMainDeck([{id: "1", name: "Dark Magician", type: "Spellcaster/Effect", description: "...", race: "Spellcaster", image_url: "https://ygoprodeck.com/pics/33400877.jpg", image_url_small: "https://ygoprodeck.com/pics_small/33400877.jpg"}]);
      setIsDeckLocked(false);
    } catch (error) {
      console.error("Failed to load deck:", error);
      toast({ title: "Error loading deck", variant: "destructive" });
    } finally {
      setIsLoadingDeck(false);
    }
  }, [toast]);

  // Placeholder for useEffect to load deck from URL params
  useEffect(() => {
    const deckId = new URLSearchParams(window.location.search).get('edit');
    if (deckId && user) {
      loadDeckForEditing(Number(deckId));
    } else {
      setIsLoadingDeck(false); // If no deck to edit, stop loading
    }
  }, [user, loadDeckForEditing]);


  if (isLoadingDeck) {
    return (
      <div className="min-h-screen bg-[#0E1013] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div style={{
          backgroundColor: '#0e1013',
          color: '#dedede',
          fontFamily: 'Roboto,sans-serif',
          fontSize: '16px',
          WebkitFontSmoothing: 'antialiased',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
        }}>
        {/* The original HTML includes a navbar that we won't replicate directly as we already have one */}
        <Navbar user={user} onLogout={onLogout} />

        <div id="svelte"> {/* Outer Svelte div from HTML */}
            <div id="error-container" className="is-hidden p-2 line-height-1 svelte-yxaw39 sf-hidden" data-html2canvas-ignore=""></div> {/* Error container */}

            <nav className="navbar is-transparent is-flex is-align-items-center svelte-5x5tvn" aria-label="main navigation">
                <div className="navbar-inner svelte-5x5tvn">
                    <div className="outer-navbar-section is-flex is-justify-content-flex-start pr-2 is-align-items-center">
                        <a sveltekit:prefetch="" className="logo-wrapper mdm-logo-wrapper is-flex is-align-items-center is-hidden-mobile is-hidden-tablet-only svelte-5x5tvn" href="https://www.masterduelmeta.com/">
                            <img className="navbar-logo svelte-5x5tvn" src="data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPHN2ZyBkYXRhLW5hbWU9IkxheWVyIDEiIHZlcnNpb249IjEuMSIgdmlld0JveD0iMCAwIDI5NTguNCA2MDAuMjgiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CiAgICA8ZGVmcz4KICAgICAgICA8c3R5bGU+LmNscy0xe2ZpbGw6IzA0MDQwNDt9LmNscy0ye2ZpbGw6IzA1MDUwNTt9LmNscy0ze2ZpbGw6IzBlMGUwZTt9LmNscy00e2ZpbGw6IzBmMGYwZjt9LmNscy01e2ZpbGw6I2RjZGNkYzt9LmNscy02e2ZpbGw6I2ZlZmVmZTt9LmNscy03e2ZpbGw6IzYyNjI2Mjt9LmNscy04e2ZpbGw6IzcwNzA3MDt9LmNscy05e2ZpbGw6IzZmNmY2Zjt9LmNscy0xMHtmaWxsOiMzMDMwMzA7fS5jbHMtMTF7ZmlsvcIzNzM3Mzc7fS5jbHMtMTJ7ZmlsvcM1OTU5NTk7fS5jbHMtMTN7ZmlsvcM0YzRjNGM7fS5jbHMtMTR7ZmlsvcM2OTY5Njk7fS5jbHMtMTV7ZmlsvcM2NjY2Njg7fS5jbHMtMTZ7ZmlsvcMyNDI0MjQ7fS5jbHMtMTd7ZmlsvcMzZDNkM2Q7fS5jbHMtMTh7ZmlsvcMxYzFjMWM7fS5jbHMtMTl7ZmlsvcM0YTRhNGE7fS5jbHMtMjB7ZmlsvcMxZTFkMWQ7fS5jbHMtMjF7ZmlsvcMxZjFmMWY7fS5jbHMtMjJ7ZmlsvcMxZDFkMWQ7fS5jbHMtMjN7ZmlsvcM1MTUxNTE7fS5jbHMtMjR7ZmlsvcM0MjQyNDI7fS5jbHMtMjV7ZmlsvcMzYjNiM2I7fS5jbHMtMjZ7ZmlsvcM0ZjRmNGY7fS5jbHMtMjd7ZmlsvcM1YTVhNWE7fS5jbHMtMjh7ZmlsvcMyMDMwMjA7fS5jbHMtMjl7ZmlsvcM3OTc5Nzk7fS5jbHMtMzA7ZmlsvcMzNjM2MzY7fS5jbHMtMzF7ZmlsvcM5Nzk3OTc7fS5jbHMtMzJ7ZmlsvcM0ZTRlNGU7fS5jbHMtMzN7ZmlsvcM1YjViNWI7fS5jbHMtMzR7ZmlsvcM1MzUzNTM7fS5jbHMtMzV7ZmlsvcMyMzIzMjM7fS5jbHMtMzZ7ZmlsvcMyMjI7fS5jbHMtMzd7ZmlsvcMzMzM7fS5jbHMtMzh7ZmlsvcM3ZTdlN2U7fS5jbHMtMzl7ZmlsvcM3MzczNzM7fS5jbHMtNDB7ZmlsvcM3MjcyNzI... [truncated]" alt="Master Duel Meta Logo"/>
                        </a>
                    </div>
                </div>
            </nav>

            <div className="main-content-wrapper p-3 px-3 m-auto is-flex is-flex-direction-column svelte-1266drb" style={{maxWidth: '1440px'}}>
                <div className="top-row columns is-variable is-1-mobile is-multiline is-mobile pt-0 pb-0 mb-3 svelte-1266drb">
                    <div className="column is-one-fifth-tablet is-6-mobile pb-1">
                        <div className="select-component-container">
                            <div className="top-container">
                                <div className="selectContainer svelte-14r22mt" style={{fontSize:'1rem'}}>
                                    <span aria-live="polite" aria-atomic="false" aria-relevant="additions text" className="a11yText svelte-14r22mt"></span>
                                    <input placeholder="Decks..." autocapitalize="none" autocomplete="off" autocorrect="off" spellcheck="false" tabIndex={0} type="text" aria-autocomplete="list" maxLength={2000} className="svelte-14r22mt" value=""/>
                                    <div className="indicator svelte-14r22mt" aria-hidden="true">
                                        <CaretDownIconSVG />
                                    </div>
                                    <input type="hidden" className="svelte-14r22mt" value="New deck"/>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="column is-half pt-0 pb-1">
                        <div className="left-container svelte-1266drb">
                            <div className="top-container svelte-1266drb">
                                <span className="svelte-1266drb">Name</span>
                                <div className="input-container svelte-1266drb">
                                    <input 
                                        maxLength={2000} 
                                        type="text" 
                                        style={{}} 
                                        pattern="" 
                                        placeholder="Enter deck label" 
                                        autocomplete="off" 
                                        className="svelte-1266drb"
                                        value={deckName}
                                        onChange={(e) => setDeckName(e.target.value)}
                                        disabled={isDeckLocked} // Connect to state
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="column is-one-fifth-tablet is-6-mobile pb-1">
                        <button style={{height:'40px',width:'100%',padding:'8px'}} className="is-flex is-justify-content-center is-align-items-center is-unselectable svelte-retuhv">
                            <div className="has-text-centered" style={{order:0,overflow:'visible'}}>Save</div>
                        </button>
                    </div>

                    <div className="column is-one-fifth-tablet is-6-mobile pb-1">
                        <div className="select-component-container">
                            <div className="top-container">
                                <div className="selectContainer svelte-14r22mt" style={{fontSize:'1rem'}}>
                                    <span aria-live="polite" aria-atomic="false" aria-relevant="additions text" className="a11yText svelte-14r22mt"></span>
                                    <input placeholder="Share..." autocapitalize="none" autocomplete="off" autocorrect="off" spellcheck="false" tabIndex={0} type="text" aria-autocomplete="list" maxLength={2000} className="svelte-14r22mt" value=""/>
                                    <div className="indicator svelte-14r22mt" aria-hidden="true">
                                        <CaretDownIconSVG />
                                    </div>
                                    <input type="hidden" className="svelte-14r22mt" value=""/>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="column is-one-fifth-tablet is-6-mobile pb-1">
                        <span className=" svelte-1kg7ic5">
                            <div className="select-component-container">
                                <div className="top-container">
                                    <div className="selectContainer svelte-14r22mt" style={{fontSize:'1rem'}}>
                                        <span aria-live="polite" aria-atomic="false" aria-relevant="additions text" className="a11yText svelte-14r22mt"></span>
                                        <input placeholder="Import..." autocapitalize="none" autocomplete="off" autocorrect="off" spellcheck="false" tabIndex={0} type="text" aria-autocomplete="list" maxLength={2000} className="svelte-14r22mt" value=""/>
                                        <div className="indicator svelte-14r22mt" aria-hidden="true">
                                            <CaretDownIconSVG />
                                        </div>
                                        <input type="hidden" className="svelte-14r22mt" value=""/>
                                    </div>
                                </div>
                            </div>
                        </span>
                    </div>

                    <div className="column is-one-fifth-tablet is-6-mobile pb-1">
                        <button style={{height:'40px',width:'100%',padding:'8px'}} className="is-flex is-justify-content-center is-align-items-center is-unselectable svelte-retuhv danger" disabled="">
                            <div className="has-text-centered" style={{order:0,overflow:'visible'}}>Delete</div>
                        </button>
                    </div>

                    <div className="column is-one-fifth-tablet is-6-mobile is-align-self-center is-flex is-align-items-center pb-1">
                        <div style={{height:'40px',width:'100%',progress:0}} className="is-flex is-flex-direction-row is-justify-content-center is-align-items-center pl-2 pr-1 status-container form-control-border none svelte-y03s2h progress-bar">
                            <span className="ml-2 svelte-y03s2h">
                                <div className="is-flex">
                                    <span className="mr-1">0 / 10 Decks</span>
                                    <span className=" svelte-1kg7ic5" aria-expanded="false">
                                        <span className="svelte-ribs5h is-flex">
                                            <QuestionCircleIconSVG />
                                        </span>
                                    </span>
                                </div>
                            </span>
                        </div>
                    </div>
                </div>

                <div className="tabbed-container svelte-umfxo">
                    <div style={{backgroundColor:'#123F50'}}>
                        <ul className="svelte-umfxo">
                            <li className={cn("svelte-umfxo", selectedTab === "build" && "active")} onClick={() => setSelectedTab("build")}>Build</li>
                            <li className={cn("svelte-umfxo", selectedTab === "draw" && "active")} onClick={() => setSelectedTab("draw")}>Draw Simulator</li>
                            <li className={cn("svelte-umfxo", selectedTab === "stats" && "active")} onClick={() => setSelectedTab("stats")}>Stats</li>
                            <li className="filler full-width svelte-umfxo" style={{flexGrow: 1}}></li>
                        </ul>
                    </div>

                    {selectedTab === "build" && (
                        <div className="tab-content active svelte-5no1h4" style={{backgroundColor: '#0E1013'}}>
                            <div className="columns is-variable is-1-mobile">
                                {/* Deck Display */}
                                <div className="column is-two-thirds-desktop is-full-tablet pt-0">
                                    <div className="deck-main-container svelte-16m5x5h" style={{minHeight:'200px'}}>
                                        {/* Main Deck */}
                                        <div className="deck-container svelte-16m5x5h">
                                            <div className="card-grid svelte-16m5x5h" style={{'--num-cards':'60', '--min-cards':'40', '--max-cards':'60', '--min-row':'6', '--max-row':'8'}}>
                                                {/* Main Deck Cards */}
                                            </div>
                                            <div className="info-container svelte-16m5x5h">
                                                <div className="card-count svelte-16m5x5h">0/60</div>
                                            </div>
                                        </div>
                                        {/* Extra Deck */}
                                        <div className="deck-container svelte-16m5x5h">
                                            <div className="card-grid svelte-16m5x5h" style={{'--num-cards':'15', '--min-cards':'0', '--max-cards':'15', '--min-row':'3', '--max-row':'5'}}>
                                                {/* Extra Deck Cards */}
                                            </div>
                                            <div className="info-container svelte-16m5x5h">
                                                <div className="card-count svelte-16m5x5h">0/15</div>
                                            </div>
                                        </div>
                                        {/* Side Deck */}
                                        <div className="deck-container svelte-16m5x5h">
                                            <div className="card-grid svelte-16m5x5h" style={{'--num-cards':'15', '--min-cards':'0', '--max-cards':'15', '--min-row':'3', '--max-row':'5'}}>
                                                {/* Side Deck Cards */}
                                            </div>
                                            <div className="info-container svelte-16m5x5h">
                                                <div className="card-count svelte-16m5x5h">0/15</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Search & Filter Section */}
                                <div className="column is-one-third-desktop is-full-tablet pt-0">
                                    <div className="search-wrapper svelte-x6v7c1">
                                        <div className="search-container svelte-1d8aw4l">
                                            <div className="input-container is-flex is-align-items-flex-end mb-1 svelte-1d8aw4l">
                                                <div className="is-flex-grow-1">
                                                    <div className="left-container svelte-1266drb">
                                                        <div className="top-container svelte-1266drb">
                                                            <div className="input-container svelte-1266drb">
                                                                <div className="icon-container svelte-1266drb">
                                                                    <span className="icon is-flex svelte-1266drb">
                                                                        <SearchIconSVG />
                                                                    </span>
                                                                </div>
                                                                <input maxLength={2000} type="text" style={{}} pattern="" placeholder="Search cards..." autocomplete="off" className="svelte-1266drb has-icon has-info is-clearable" value=""/>
                                                                <div className="info-container svelte-1266drb">
                                                                    <span className=" svelte-1kg7ic5" aria-expanded="false">
                                                                        <span className="svelte-ribs5h is-flex">
                                                                            <InfoIconSVG />
                                                                        </span>
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="options-container svelte-x6v7c1">
                                                    <div className="column is-4-desktop is-10-tablet is-10-mobile">
                                                        <div className="select-component-container">
                                                            <div className="top-container has-icon">
                                                                <div className="selectContainer svelte-14r22mt" style={{fontSize:'1rem'}}>
                                                                    <span aria-live="polite" aria-atomic="false" aria-relevant="additions text" className="a11yText svelte-14r22mt"></span>
                                                                    <span className="is-flex is-justify-content-center is-align-items-center svelte-y8wo9w">
                                                                        <SortIconSVG />
                                                                    </span>
                                                                    <input placeholder="" autocapitalize="none" autocomplete="off" autocorrect="off" spellcheck="false" tabIndex={0} type="text" aria-autocomplete="list" maxLength={2000} className="svelte-14r22mt" value=""/>
                                                                    <div className="selectedItem svelte-14r22mt">
                                                                        <div className="selection svelte-1bl23jb">Popularity</div>
                                                                    </div>
                                                                    <div className="indicator svelte-14r22mt">
                                                                        <CaretDownIconSVG />
                                                                    </div>
                                                                    <input type="hidden" className="svelte-14r22mt" value="Popularity"/>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="column is-1-desktop is-2-tablet is-2-mobile">
                                                        <div className="sort-button svelte-1d8aw4l">
                                                            <div style={{'--dim': '100%'}} className="button-container form-control-border svelte-1kinwdg">
                                                                <div className="is-flex is-justify-content-center is-align-items-center is-unselectable svelte-1kinwdg">
                                                                    <SortIconSVG />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                {/* Search results */}
                                                <div className="query-wrapper svelte-1d8aw4l"></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
      </div>
    </DndProvider>
  );
};

export default DeckBuilderV2;
