import React, { useState, useRef, useEffect } from 'react';

const GlassSelect = ({ value, onChange, options, placeholder, disabled, className = '' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (ref.current && !ref.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (optionValue) => {
        onChange({ target: { value: optionValue } });
        setIsOpen(false);
    };

    const selectedOption = options.find(opt => String(opt.value) === String(value));

    return (
        <div className={`relative ${className}`} ref={ref}>
            <button
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                className={`glass-input text-left flex justify-between items-center w-full min-h-[42px] ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                disabled={disabled}
            >
                <span className={`truncate ${!selectedOption ? 'text-gray-500 dark:text-gray-400' : 'text-gray-800 dark:text-neutral-200'}`}>
                    {selectedOption ? selectedOption.label : placeholder || 'Select...'}
                </span>
                <svg className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {isOpen && (
                <div className="absolute z-50 w-full mt-2 overflow-hidden glass-card animate-fade-in origin-top-right shadow-xl">
                    <div className="max-h-60 overflow-y-auto customer-scrollbar py-1 bg-white/70 dark:bg-neutral-900/90 backdrop-blur-xl">
                        {options.map((option) => (
                            <div
                                key={option.value}
                                onClick={() => handleSelect(option.value)}
                                className={`px-4 py-2.5 cursor-pointer transition-colors text-sm
                                    ${String(value) === String(option.value) 
                                        ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium' 
                                        : 'text-gray-700 dark:text-gray-200 hover:bg-blue-500/5 dark:hover:bg-white/5'
                                    }`}
                            >
                                {option.label}
                            </div>
                        ))}
                        {options.length === 0 && (
                             <div className="px-4 py-3 text-sm text-gray-500 text-center italic">No options available</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default GlassSelect;
