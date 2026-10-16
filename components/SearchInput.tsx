'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTransition, useState, useEffect, useCallback, useRef } from 'react';
import { Search, X, Loader2 } from 'lucide-react';

interface SearchInputProps {
  defaultValue?: string;
}

function buildSearchQueryString(searchParamsStr: string, term: string): string {
  const params = new URLSearchParams(searchParamsStr);
  const trimmed = term.trim();
  if (trimmed) {
    params.set('q', trimmed);
  } else {
    params.delete('q');
  }
  return params.toString();
}

function ClearButton({ onClear }: { onClear: () => void }) {
  return (
    <button
      type="button"
      onClick={onClear}
      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
      aria-label="Clear search"
    >
      <X className="w-3.5 h-3.5" />
    </button>
  );
}

function useSearchSync(
  text: string,
  applySearch: (term: string) => void,
  isFocused: () => boolean,
  setText: (v: string) => void
) {
  const searchParams = useSearchParams();
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const onCancel = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
    window.addEventListener('csr:cancel-search', onCancel);
    return () => window.removeEventListener('csr:cancel-search', onCancel);
  }, []);

  useEffect(() => {
    const currentQ = searchParams.get('q') ?? '';
    if (text.trim() === currentQ.trim()) return;

    timerRef.current = setTimeout(() => applySearch(text), 300);
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [text, searchParams, applySearch]);

  useEffect(() => {
    if (!isFocused()) {
      setText(searchParams.get('q') ?? '');
    }
  }, [searchParams, isFocused, setText]);

  useEffect(() => {
    const onPopState = () => {
      setText(new URLSearchParams(window.location.search).get('q') ?? '');
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [setText]);
}

function cancelPendingDebounce() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('csr:cancel-search'));
  }
}

function useSearchInput(defaultValue: string) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [text, setText] = useState(defaultValue);
  const isFocusedRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const applySearch = useCallback(
    (term: string) => {
      const currentSearch = typeof window !== 'undefined'
        ? window.location.search
        : searchParams.toString();
      const query = buildSearchQueryString(currentSearch, term);
      startTransition(() => {
        router.replace(`${pathname}?${query}`, { scroll: false });
      });
    },
    [pathname, router, searchParams]
  );

  const isFocused = useCallback(
    () => isFocusedRef.current || (typeof document !== 'undefined' && document.activeElement === inputRef.current),
    []
  );
  useSearchSync(text, applySearch, isFocused, setText);

  const handleClear = () => {
    setText('');
    applySearch('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      cancelPendingDebounce();
      const currentQ = searchParams.get('q') ?? '';
      if (text.trim() !== currentQ.trim()) applySearch(text);
      inputRef.current?.blur();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelPendingDebounce();
      handleClear();
      inputRef.current?.blur();
    }
  };

  return { text, setText, isPending, inputRef, isFocusedRef, handleClear, handleKeyDown };
}

export function SearchInput({ defaultValue = '' }: SearchInputProps) {
  const { text, setText, isPending, inputRef, isFocusedRef, handleClear, handleKeyDown } =
    useSearchInput(defaultValue);

  return (
    <div className="relative mb-4">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
        {isPending ? <Loader2 className="w-4 h-4 animate-spin text-sky-600" /> : <Search className="w-4 h-4" />}
      </div>
      <input
        ref={inputRef}
        type="text"
        role="searchbox"
        inputMode="search"
        autoComplete="off"
        spellCheck={false}
        value={text}
        onFocus={() => { isFocusedRef.current = true; }}
        onBlur={() => { isFocusedRef.current = false; }}
        onKeyDown={handleKeyDown}
        onChange={(e) => setText(e.target.value)}
        placeholder="Search name, email, phone, or license plate..."
        className="w-full pl-9 pr-9 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all shadow-2xs"
        aria-label="Search customers by name, email, phone, or license plate"
      />
      {text && <ClearButton onClear={handleClear} />}
    </div>
  );
}
