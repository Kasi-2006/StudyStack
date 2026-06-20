
import React, { useState, useEffect, useRef } from 'react';
import { Search, FileText, Book, Folder, X, Loader2, ChevronRight } from 'lucide-react';
import { api } from '../services/api';

interface SearchResult {
  id: string;
  name: string;
  type: 'subject' | 'file' | 'category';
  category?: string;
  course?: string;
  semester?: string;
  url?: string;
  unit?: string;
}

const GlobalSearch: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const categories = [
    "Assignments",
    "Notes",
    "Lab Resources",
    "Previous Year Question Papers"
  ];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const performSearch = async () => {
      if (query.trim().length < 2) {
        setResults([]);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      setIsOpen(true);

      try {
        const lowerQuery = query.toLowerCase();

        // 1. Search Categories
        const matchedCategories: SearchResult[] = categories
          .filter(cat => cat.toLowerCase().includes(lowerQuery))
          .map(cat => ({
            id: `cat-${cat}`,
            name: cat,
            type: 'category'
          }));

        // 2. Search Subjects & Files (via API)
        const data = await api.searchFiles(query);

        const subjectResults: SearchResult[] = (data.subjects || []).map((s: any) => ({
          id: s.id,
          name: s.name,
          type: 'subject',
          category: s.category
        }));

        const fileResults: SearchResult[] = (data.files || []).map((f: any) => ({
          id: f.id,
          name: f.file_name,
          type: 'file',
          category: f.category,
          url: f.file_url,
          unit: f.unit_no
        }));

        const combined = [...fileResults, ...matchedCategories, ...subjectResults];
        setResults(combined);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setIsSearching(false);
      }
    };

    const timeoutId = setTimeout(performSearch, 300);
    return () => clearTimeout(timeoutId);
  }, [query]);

  const handleResultClick = async (result: SearchResult) => {
    setIsOpen(false);
    setQuery('');

    if (result.type === 'file' && result.url) {
      if (result.url === 'db') {
        try {
          const { content } = await api.getFileContent(result.id);
          let blob;
          if (content.startsWith('data:')) {
            const res = await fetch(content);
            blob = await res.blob();
          } else {
            const byteCharacters = atob(content);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
              byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            blob = new Blob([byteArray], { type: 'application/pdf' });
          }
          const url = window.URL.createObjectURL(blob);
          window.open(url, '_blank');
        } catch (err) {
          console.error("View failed from search:", err);
          alert("Failed to load file for viewing.");
        }
      } else {
        window.open(result.url, '_blank');
      }
    } else {
      const viewMap: Record<string, string> = {
        "Assignments": "assignments",
        "Notes": "notes",
        "Lab Resources": "lab-resources",
        "Previous Year Question Papers": "prev-year-qs"
      };

      const targetCategory = result.type === 'category' ? result.name : result.category;
      window.dispatchEvent(new CustomEvent('changeView', {
        detail: viewMap[targetCategory || ''] || 'home'
      }));
    }
  };

  return (
    <div className="relative w-full max-w-2xl mx-auto mb-8" ref={searchRef}>
      <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search className={`w-5 h-5 transition-colors ${query ? 'text-indigo-600' : 'text-slate-400'}`} />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.length >= 2 && setIsOpen(true)}
          placeholder="Search subjects, categories, or resources..."
          className="w-full pl-12 pr-12 py-4 bg-white border-2 border-slate-100 rounded-2xl shadow-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none font-bold text-slate-800 placeholder:text-slate-400"
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setResults([]); }}
            className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Search Results Dropdown */}
      {isOpen && (query.length >= 2) && (
        <div className="absolute top-full left-0 right-0 mt-3 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-[100] animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="max-h-[400px] overflow-y-auto p-2">
            {isSearching ? (
              <div className="flex items-center justify-center py-12 text-slate-400 gap-3">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm font-bold uppercase tracking-widest">Searching...</span>
              </div>
            ) : results.length > 0 ? (
              <div className="space-y-1">
                {results.map((result) => (
                  <button
                    key={result.id}
                    onClick={() => handleResultClick(result)}
                    className="w-full flex items-center gap-4 p-3 hover:bg-slate-50 rounded-xl transition-all group text-left"
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${result.type === 'category' ? 'bg-indigo-50 text-indigo-600' :
                        result.type === 'subject' ? 'bg-amber-50 text-amber-600' :
                          'bg-emerald-50 text-emerald-600'
                      }`}>
                      {result.type === 'category' ? <Folder className="w-5 h-5" /> :
                        result.type === 'subject' ? <Book className="w-5 h-5" /> :
                          <FileText className="w-5 h-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800 truncate">{result.name}</span>
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full">
                          {result.type}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {result.unit && (
                          <>
                            <span className="text-slate-300">•</span>
                            <span className="text-[10px] font-black text-indigo-500 uppercase tracking-tighter">{result.unit}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8 text-slate-300" />
                </div>
                <p className="text-slate-500 font-bold">No resources found.</p>
                <p className="text-slate-400 text-xs mt-1">Try searching for something else</p>
              </div>
            )}
          </div>
          {results.length > 0 && (
            <div className="p-3 bg-slate-50 border-t border-slate-100 text-[10px] font-bold text-slate-400 text-center uppercase tracking-widest">
              Showing {results.length} results for "{query}"
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GlobalSearch;
