import { useState, useRef, useEffect, useCallback } from 'react';
import { BASE_URL } from '../config/api';

/**
 * HospitalAutocomplete — Google Places-powered hospital search component.
 *
 * Props:
 *   value       (string)   — Current input value (controlled)
 *   onChange     (function) — Called with new value string when user types or selects
 *   placeholder  (string)   — Input placeholder text
 *   variant     ('dark' | 'light') — Theme variant to match page styling
 *   className   (string)   — Additional CSS classes for the wrapper
 *   disabled    (boolean)  — Disable the input
 *   inputStyle  (object)   — Inline style overrides for the input element (for RegisterPage)
 */
export default function HospitalAutocomplete({
    value = '',
    onChange,
    placeholder = 'Search hospital name...',
    variant = 'dark',
    className = '',
    disabled = false,
    inputStyle = null,
}) {
    const [suggestions, setSuggestions] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [highlightIndex, setHighlightIndex] = useState(-1);

    const wrapperRef = useRef(null);
    const debounceRef = useRef(null);
    const inputRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
                setIsOpen(false);
                setHighlightIndex(-1);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Debounced fetch
    const fetchHospitals = useCallback(async (inputText) => {
        if (inputText.length < 2) {
            setSuggestions([]);
            setIsOpen(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await fetch(
                `${BASE_URL}/api/hospitals/search?q=${encodeURIComponent(inputText)}`
            );
            const data = await response.json();

            if (data.error) {
                setError(data.error);
                setSuggestions([]);
            } else {
                setSuggestions(data.hospitals || []);
                setIsOpen((data.hospitals || []).length > 0);
            }
        } catch (err) {
            console.error('Hospital search failed:', err);
            setError('Search unavailable');
            setSuggestions([]);
        } finally {
            setLoading(false);
        }
    }, []);

    // Handle input change with debounce
    const handleInputChange = (e) => {
        const newValue = e.target.value;
        onChange(newValue);
        setHighlightIndex(-1);

        // Clear previous debounce
        if (debounceRef.current) clearTimeout(debounceRef.current);

        // Debounce 800ms to save Google API quota
        debounceRef.current = setTimeout(() => {
            fetchHospitals(newValue);
        }, 800);
    };

    // Handle suggestion click
    const handleSelect = (hospital) => {
        // If the address already starts with the name (e.g. OpenStreetMap), just use the address.
        // Otherwise (e.g. Google Maps), combine them so the user sees the full location.
        let fullLocation = hospital.name;
        if (hospital.address) {
            if (hospital.address.startsWith(hospital.name)) {
                fullLocation = hospital.address;
            } else {
                fullLocation = `${hospital.name}, ${hospital.address}`;
            }
        }
        
        onChange(fullLocation);
        setIsOpen(false);
        setSuggestions([]);
        setHighlightIndex(-1);
        inputRef.current?.focus();
    };

    // Keyboard navigation
    const handleKeyDown = (e) => {
        if (!isOpen || suggestions.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlightIndex((prev) =>
                prev < suggestions.length - 1 ? prev + 1 : 0
            );
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlightIndex((prev) =>
                prev > 0 ? prev - 1 : suggestions.length - 1
            );
        } else if (e.key === 'Enter' && highlightIndex >= 0) {
            e.preventDefault();
            handleSelect(suggestions[highlightIndex]);
        } else if (e.key === 'Escape') {
            setIsOpen(false);
            setHighlightIndex(-1);
        }
    };

    // Cleanup debounce on unmount
    useEffect(() => {
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, []);

    const isDark = variant === 'dark';

    return (
        <div ref={wrapperRef} className={`relative ${className}`}>
            {/* Input */}
            <div className="relative">
                <input
                    ref={inputRef}
                    type="text"
                    value={value}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    onFocus={() => suggestions.length > 0 && setIsOpen(true)}
                    placeholder={placeholder}
                    disabled={disabled}
                    className={isDark ? 'med-input w-full' : ''}
                    style={
                        inputStyle
                            ? inputStyle
                            : !isDark
                            ? {
                                  width: '100%',
                                  padding: '12px 14px',
                                  background: '#F8FAFC',
                                  border: '1.5px solid rgba(6,182,212,0.15)',
                                  borderRadius: 10,
                                  fontSize: 13,
                                  fontFamily: "'DM Sans', system-ui, sans-serif",
                                  outline: 'none',
                                  color: '#0B1220',
                              }
                            : undefined
                    }
                    autoComplete="off"
                    id="hospital-autocomplete-input"
                />

                {/* Loading spinner */}
                {loading && (
                    <div
                        className={`absolute right-3 top-1/2 -translate-y-1/2`}
                    >
                        <svg
                            className="animate-spin h-4 w-4"
                            style={{
                                color: isDark
                                    ? 'var(--accent-teal)'
                                    : '#06b6d4',
                            }}
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                        >
                            <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                            />
                            <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                            />
                        </svg>
                    </div>
                )}
            </div>

            {/* Dropdown suggestions */}
            {isOpen && suggestions.length > 0 && (
                <div
                    className={`absolute w-full z-50 mt-1 rounded-lg overflow-hidden ${
                        isDark
                            ? 'bg-gray-900/95 backdrop-blur-xl border border-cyan-500/30 shadow-lg shadow-cyan-500/10'
                            : 'bg-white border border-cyan-200 shadow-xl shadow-cyan-500/5'
                    }`}
                    style={{ maxHeight: '240px', overflowY: 'auto' }}
                    id="hospital-autocomplete-dropdown"
                >
                    {suggestions.map((hospital, index) => (
                        <div
                            key={index}
                            onClick={() => handleSelect(hospital)}
                            onMouseEnter={() => setHighlightIndex(index)}
                            className={`px-4 py-3 cursor-pointer transition-colors duration-150 ${
                                highlightIndex === index
                                    ? isDark
                                        ? 'bg-cyan-500/15'
                                        : 'bg-cyan-50'
                                    : isDark
                                    ? 'hover:bg-cyan-500/10'
                                    : 'hover:bg-gray-50'
                            } ${
                                index < suggestions.length - 1
                                    ? isDark
                                        ? 'border-b border-white/5'
                                        : 'border-b border-gray-100'
                                    : ''
                            }`}
                            id={`hospital-suggestion-${index}`}
                        >
                            <div
                                className={`text-sm font-semibold ${
                                    isDark ? 'text-white' : 'text-gray-900'
                                }`}
                            >
                                {hospital.name}
                            </div>
                            <div
                                className={`text-xs mt-0.5 ${
                                    isDark ? 'text-gray-400' : 'text-gray-500'
                                }`}
                            >
                                {hospital.address}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Error message */}
            {error && !isOpen && (
                <div
                    className={`text-xs mt-1 ${
                        isDark ? 'text-red-400' : 'text-red-500'
                    }`}
                >
                    {error}
                </div>
            )}
        </div>
    );
}
