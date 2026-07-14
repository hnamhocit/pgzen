import { useDataViewerStore } from "../store/useDataViewerStore";

export type SuggestionItem = { type: 'history' | 'column' | 'keyword', value: string, dataType?: string };

export function useFilterSuggestions() {
  const {
    filterText,
    setFilterText,
    setAppliedFilter,
    setShowSuggestions,
    filterHistory,
    setFilterHistory,
    columns,
    setPage,
  } = useDataViewerStore();

  const getSuggestions = (): SuggestionItem[] => {
    const keywords = ["&&", "||", "==", "!=", ">=", "<=", "between ()", "IS NULL", "IS NOT NULL", "LIKE"];

    if (!filterText) {
      return filterHistory.map(h => ({ type: 'history', value: h } as SuggestionItem));
    }
    
    const words = filterText.split(/\\s+/);
    const lastWord = words[words.length - 1].toLowerCase();
    
    if (!lastWord) {
      return [
        ...columns.map(c => ({ type: 'column', value: c.name, dataType: c.data_type } as SuggestionItem)),
        ...keywords.map(k => ({ type: 'keyword', value: k } as SuggestionItem))
      ];
    }

    const matchesColumn = columns
      .filter(c => c.name.toLowerCase().includes(lastWord) && c.name.toLowerCase() !== lastWord)
      .sort((a, b) => {
        const aStarts = a.name.toLowerCase().startsWith(lastWord);
        const bStarts = b.name.toLowerCase().startsWith(lastWord);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        return a.name.length - b.name.length;
      })
      .map(c => ({ type: 'column', value: c.name, dataType: c.data_type } as SuggestionItem));
      
    const matchesKeyword = keywords
      .filter(k => k.toLowerCase().includes(lastWord) && k.toLowerCase() !== lastWord)
      .map(k => ({ type: 'keyword', value: k } as SuggestionItem));

    return [...matchesColumn, ...matchesKeyword];
  };

  const saveHistory = (filter: string) => {
    if (!filter) return;
    const newHist = [filter, ...filterHistory.filter(f => f !== filter)].slice(0, 5);
    setFilterHistory(newHist);
  };

  const clearHistory = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setFilterHistory([]);
  };

  const suggestions = getSuggestions();

  const handleSuggestionClick = (item: SuggestionItem, inputRef: React.RefObject<HTMLInputElement | null>) => {
    if (item.type === 'history') {
      setFilterText(item.value);
      setAppliedFilter(item.value);
      saveHistory(item.value);
      setPage(1);
      setShowSuggestions(false);
      return;
    }

    if (!filterText || filterText.endsWith(" ")) {
      setFilterText(filterText + item.value + " ");
      inputRef.current?.focus();
      return;
    }
    const words = filterText.split(/\\s+/);
    words[words.length - 1] = item.value;
    setFilterText(words.join(" ") + " ");
    inputRef.current?.focus();
  };

  return {
    suggestions,
    saveHistory,
    clearHistory,
    handleSuggestionClick,
  };
}
