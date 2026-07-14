import { useState, useRef, useEffect, useCallback } from "react";

export function useHorizontalScroll(dependencies: any[]) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const handleScroll = useCallback(() => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(Math.ceil(scrollLeft + clientWidth) < scrollWidth);
    }
  }, []);

  useEffect(() => {
    handleScroll();
    window.addEventListener('resize', handleScroll);
    return () => window.removeEventListener('resize', handleScroll);
  }, [handleScroll, ...dependencies]);

  const scrollLeftBy = useCallback((amount = 400) => {
    scrollContainerRef.current?.scrollBy({ left: -amount, behavior: 'smooth' });
  }, []);

  const scrollRightBy = useCallback((amount = 400) => {
    scrollContainerRef.current?.scrollBy({ left: amount, behavior: 'smooth' });
  }, []);

  return {
    scrollContainerRef,
    canScrollLeft,
    canScrollRight,
    handleScroll,
    scrollLeftBy,
    scrollRightBy
  };
}
