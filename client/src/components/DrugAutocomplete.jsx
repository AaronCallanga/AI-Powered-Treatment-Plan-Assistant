import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { MedicationIcon, SearchIcon, CloseIcon } from "./Icons";
import "./DrugAutocomplete.css";

// Custom hook for loading and managing drug database
const useDrugDatabase = () => {
  const [drugs, setDrugs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadDrugDatabase = async () => {
      try {
        const response = await fetch("/drug_database_clean.csv");
        const csvText = await response.text();
        const parsedDrugs = parseCSV(csvText);
        setDrugs(parsedDrugs);
        setIsLoading(false);
      } catch (err) {
        console.error("Failed to load drug database:", err);
        setError(err.message);
        setIsLoading(false);
      }
    };

    loadDrugDatabase();
  }, []);

  return { drugs, isLoading, error };
};

// Parse CSV with proper handling of quoted fields
const parseCSV = (csvText) => {
  const lines = csvText.split("\n");
  const headers = parseCSVLine(lines[0]);
  const drugs = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = parseCSVLine(line);
    if (values.length >= 4) {
      drugs.push({
        regId: values[0] || "",
        genericName: values[1] || "",
        brandName: values[2] || "",
        strength: values[3] || "",
        form: values[4] || "",
        category: values[5] || "",
      });
    }
  }

  return drugs;
};

// Parse a single CSV line handling quoted fields with commas
const parseCSVLine = (line) => {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());

  return result;
};

// Debounce hook for search optimization
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

function DrugAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = "Search medication...",
  disabled = false,
  className = "",
}) {
  const [inputValue, setInputValue] = useState(value || "");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [selectedDrug, setSelectedDrug] = useState(null);

  const { drugs, isLoading } = useDrugDatabase();
  const debouncedSearch = useDebounce(inputValue, 150);

  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);
  const containerRef = useRef(null);

  // Sync external value with internal state
  useEffect(() => {
    if (value !== inputValue) {
      setInputValue(value || "");
    }
  }, [value]);

  // Filter drugs based on search term
  const suggestions = useMemo(() => {
    if (!debouncedSearch || debouncedSearch.length < 2) return [];

    const searchLower = debouncedSearch.toLowerCase();
    const matches = drugs
      .filter((drug) => {
        const genericMatch = drug.genericName
          .toLowerCase()
          .includes(searchLower);
        const brandMatch = drug.brandName.toLowerCase().includes(searchLower);
        return genericMatch || brandMatch;
      })
      .slice(0, 50); // Limit to 50 suggestions for performance

    // Sort: exact matches first, then by name
    return matches.sort((a, b) => {
      const aGenericStartsWith = a.genericName
        .toLowerCase()
        .startsWith(searchLower);
      const bGenericStartsWith = b.genericName
        .toLowerCase()
        .startsWith(searchLower);
      const aBrandStartsWith = a.brandName
        .toLowerCase()
        .startsWith(searchLower);
      const bBrandStartsWith = b.brandName
        .toLowerCase()
        .startsWith(searchLower);

      if (
        (aGenericStartsWith || aBrandStartsWith) &&
        !(bGenericStartsWith || bBrandStartsWith)
      ) {
        return -1;
      }
      if (
        !(aGenericStartsWith || aBrandStartsWith) &&
        (bGenericStartsWith || bBrandStartsWith)
      ) {
        return 1;
      }

      return a.genericName.localeCompare(b.genericName);
    });
  }, [debouncedSearch, drugs]);

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Scroll selected item into view
  useEffect(() => {
    if (selectedIndex >= 0 && suggestionsRef.current) {
      const selectedEl = suggestionsRef.current.children[selectedIndex];
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, [selectedIndex]);

  const handleInputChange = useCallback(
    (e) => {
      const newValue = e.target.value;
      setInputValue(newValue);
      setShowSuggestions(true);
      setSelectedIndex(-1);
      setSelectedDrug(null);
      onChange?.(newValue);
    },
    [onChange]
  );

  const handleSelectDrug = useCallback(
    (drug) => {
      const displayName = `${drug.genericName}${
        drug.brandName ? ` (${drug.brandName})` : ""
      }`;
      setInputValue(displayName);
      setSelectedDrug(drug);
      setShowSuggestions(false);
      setSelectedIndex(-1);
      onChange?.(displayName);
      onSelect?.(drug);
    },
    [onChange, onSelect]
  );

  const handleKeyDown = useCallback(
    (e) => {
      if (!showSuggestions || suggestions.length === 0) {
        if (e.key === "ArrowDown" && suggestions.length > 0) {
          setShowSuggestions(true);
        }
        return;
      }

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < suggestions.length - 1 ? prev + 1 : prev
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
          break;
        case "Enter":
          e.preventDefault();
          if (selectedIndex >= 0 && suggestions[selectedIndex]) {
            handleSelectDrug(suggestions[selectedIndex]);
          }
          break;
        case "Escape":
          setShowSuggestions(false);
          setSelectedIndex(-1);
          break;
        case "Tab":
          if (selectedIndex >= 0 && suggestions[selectedIndex]) {
            handleSelectDrug(suggestions[selectedIndex]);
          }
          setShowSuggestions(false);
          break;
        default:
          break;
      }
    },
    [showSuggestions, suggestions, selectedIndex, handleSelectDrug]
  );

  const handleFocus = useCallback(() => {
    if (inputValue.length >= 2 && suggestions.length > 0) {
      setShowSuggestions(true);
    }
  }, [inputValue, suggestions.length]);

  const clearInput = useCallback(() => {
    setInputValue("");
    setSelectedDrug(null);
    setShowSuggestions(false);
    onChange?.("");
    inputRef.current?.focus();
  }, [onChange]);

  const highlightMatch = (text, query) => {
    if (!query || query.length < 2) return text;

    const regex = new RegExp(
      `(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
      "gi"
    );
    const parts = text.split(regex);

    return parts.map((part, i) =>
      regex.test(part) ? (
        <mark key={i} className="highlight">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <div
      ref={containerRef}
      className={`drug-autocomplete ${className} ${disabled ? "disabled" : ""}`}
    >
      <div className="drug-input-wrapper">
        <SearchIcon size={16} className="search-icon" />
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          placeholder={placeholder}
          disabled={disabled}
          className="drug-input"
          autoComplete="off"
        />
        {inputValue && !disabled && (
          <button
            type="button"
            className="clear-btn"
            onClick={clearInput}
            tabIndex={-1}
          >
            <CloseIcon size={14} />
          </button>
        )}
      </div>

      {showSuggestions && !disabled && (
        <div ref={suggestionsRef} className="suggestions-dropdown">
          {isLoading ? (
            <div className="suggestion-loading">
              <span>Loading medications...</span>
            </div>
          ) : suggestions.length > 0 ? (
            suggestions.map((drug, index) => (
              <div
                key={`${drug.regId}-${index}`}
                className={`suggestion-item ${
                  index === selectedIndex ? "selected" : ""
                }`}
                onClick={() => handleSelectDrug(drug)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <div className="suggestion-main">
                  <div className="drug-icon">
                    <MedicationIcon size={16} />
                  </div>
                  <div className="drug-names">
                    <span className="generic-name">
                      {highlightMatch(drug.genericName, debouncedSearch)}
                    </span>
                    {drug.brandName && (
                      <span className="brand-name">
                        {highlightMatch(drug.brandName, debouncedSearch)}
                      </span>
                    )}
                  </div>
                </div>
                {(drug.strength || drug.form) && (
                  <div className="suggestion-details">
                    {drug.strength && (
                      <span className="drug-strength">{drug.strength}</span>
                    )}
                    {drug.form && (
                      <span className="drug-form">{drug.form}</span>
                    )}
                  </div>
                )}
                {drug.category && drug.category !== "-" && (
                  <div className="drug-category">{drug.category}</div>
                )}
              </div>
            ))
          ) : debouncedSearch.length >= 2 ? (
            <div className="no-results">
              <MedicationIcon size={18} />
              <span>No medications found for "{debouncedSearch}"</span>
              <small>You can still enter a custom medication name</small>
            </div>
          ) : (
            <div className="type-more">
              Type at least 2 characters to search
            </div>
          )}
        </div>
      )}

      {selectedDrug && (
        <div className="selected-drug-info">
          <span className="info-label">Selected:</span>
          <span className="info-value">
            {selectedDrug.genericName}
            {selectedDrug.strength && ` - ${selectedDrug.strength}`}
            {selectedDrug.form && ` (${selectedDrug.form})`}
          </span>
        </div>
      )}
    </div>
  );
}

export default DrugAutocomplete;
