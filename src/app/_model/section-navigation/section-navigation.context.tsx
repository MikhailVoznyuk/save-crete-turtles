'use client';

import {
    createContext,
    useContext,
    useState,
    useRef,
    useMemo,
    useCallback,
    ReactNode,
    type RefObject,
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
    getScrollRoot: () => HTMLElement | null;
}

const SectionNavigationContext = createContext<SectionNavigationContextValue | null>(null);

type SectionNavigationProviderProps = {
    children: ReactNode;
    scrollRootRef?: RefObject<HTMLElement | null>;
}

export function SectionNavigationProvider({children, scrollRootRef}: SectionNavigationProviderProps) {
    const [activeSection, setActiveSection] = useState<SectionName>();
    const sectionsRef = useRef<Sections>({});

    const registerSection = useCallback(
        (name: SectionName) => (node: HTMLElement | null) => (
            sectionsRef.current[name] = node
        ), []);

    const getSection = useCallback((name: SectionName) => sectionsRef.current[name] ?? null, []);

    const getScrollRoot = useCallback(() => (
        scrollRootRef?.current ?? document.querySelector<HTMLElement>('[data-app-scroll-root]')
    ), [scrollRootRef]);

    const getWindowScrollLeft = () => (
        window.scrollX || window.pageXOffset || document.documentElement.scrollLeft || 0
    );

    const scrollToSection = useCallback((name: SectionName) => {
        const el = sectionsRef.current[name];
        if (!el) return;

        const scrollRoot = getScrollRoot();
        const targetRect = el.getBoundingClientRect();

        if (scrollRoot) {
            const rootRect = scrollRoot.getBoundingClientRect();
            const top = targetRect.top - rootRect.top;

            window.scrollTo({
                top: Math.max(0, top),
                left: getWindowScrollLeft(),
                behavior: 'smooth',
            });
        } else {
            const top = targetRect.top + (window.scrollY || window.pageYOffset || 0);

            window.scrollTo({
                top: Math.max(0, top),
                left: getWindowScrollLeft(),
                behavior: 'smooth',
            });
        }

        setActiveSection(name);
    }, [getScrollRoot]);

    const value = useMemo(() => ({
        sections: PAGE_SECTIONS,
        activeSection: activeSection,
        setActiveSection: setActiveSection,
        registerSection,
        scrollToSection,
        getSection,
        getScrollRoot,
    }), [activeSection, registerSection, scrollToSection, getSection, getScrollRoot]);

    return (
        <SectionNavigationContext.Provider value={value}>{children}</SectionNavigationContext.Provider>
    )
}

export function useSectionNavigation() {
    const ctx = useContext(SectionNavigationContext);

    if (!ctx) throw new Error('useSectionNavigation must be used within SectionNavigationProvider.');

    return ctx;
}
