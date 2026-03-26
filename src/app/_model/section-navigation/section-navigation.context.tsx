'use client';

import {
    createContext,
    useContext,
    useState,
    useRef,
    useMemo,
    useCallback,
    ReactNode,
} from 'react';

const PAGE_SECTIONS = ['hero', 'cards', 'steps', 'q&a', 'contacts'] as const;
type SectionName = typeof PAGE_SECTIONS[number];
type Sections = Partial<Record<SectionName, (HTMLElement | null)>>

type SectionNavigationContextValue = {
    sections: readonly SectionName[];
    activeSection?: SectionName;
    setActiveSection: (name: SectionName) => void;
    registerSection: (name: SectionName) => (node: HTMLElement | null) => void;
    scrollToSection: (name: SectionName) => void;
    getSection: (name: SectionName) => HTMLElement | null;
}

const SectionNavigationContext = createContext<SectionNavigationContextValue | null>(null);

export function SectionNavigationProvider({children}: {children: ReactNode}) {
    const [activeSection, setActiveSection] = useState<SectionName>();
    const sectionsRef = useRef<Sections>({});

    const registerSection = useCallback(
        (name: SectionName) => (node: HTMLElement | null) => (
            sectionsRef.current[name] = node
        ), []);

    const getSection = useCallback((name: SectionName) => sectionsRef.current[name] ?? null, []);

    const scrollToSection = useCallback((name: SectionName) => {
        const el = sectionsRef.current[name];
        if (!el) return;

        el.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
        })

        setActiveSection(name);
    }, []);

    const value = useMemo(() => ({
        sections: PAGE_SECTIONS,
        activeSection: activeSection,
        setActiveSection: setActiveSection,
        registerSection,
        scrollToSection,
        getSection
    }), [activeSection, registerSection, scrollToSection, getSection]);

    return (
        <SectionNavigationContext.Provider value={value}>{children}</SectionNavigationContext.Provider>
    )
}

export function useSectionNavigation() {
    const ctx = useContext(SectionNavigationContext);

    if (!ctx) throw new Error('useSectionNavigation must be used within SectionNavigationProvider.');

    return ctx;
}


