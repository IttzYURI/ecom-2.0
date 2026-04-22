"use client";

import { useRef } from "react";

type MenuCategoryNavProps = {
  categories: Array<{
    id: string;
    name: string;
    href: string;
  }>;
};

export function MenuCategoryNav({ categories }: MenuCategoryNavProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<{
    isDragging: boolean;
    hasMoved: boolean;
    startX: number;
    startScrollLeft: number;
  }>({
    isDragging: false,
    hasMoved: false,
    startX: 0,
    startScrollLeft: 0
  });

  function scrollByAmount(direction: "prev" | "next") {
    const element = scrollRef.current;

    if (!element) {
      return;
    }

    const amount = Math.max(220, Math.floor(element.clientWidth * 0.6));
    element.scrollBy({
      left: direction === "next" ? amount : -amount,
      behavior: "smooth"
    });
  }

  function handleMouseDown(event: React.MouseEvent<HTMLDivElement>) {
    const element = scrollRef.current;

    if (
      !element ||
      (event.target instanceof Element && event.target.closest(".menu-category-nav-button")) ||
      event.button !== 0
    ) {
      return;
    }

    dragStateRef.current = {
      isDragging: true,
      hasMoved: false,
      startX: event.clientX,
      startScrollLeft: element.scrollLeft
    };
  }

  function handleMouseMove(event: React.MouseEvent<HTMLDivElement>) {
    const element = scrollRef.current;
    const dragState = dragStateRef.current;

    if (!element || !dragState.isDragging) {
      return;
    }

    const deltaX = event.clientX - dragState.startX;

    if (Math.abs(deltaX) > 6) {
      dragState.hasMoved = true;
    }

    if (!dragState.hasMoved) {
      return;
    }

    event.preventDefault();
    element.scrollLeft = dragState.startScrollLeft - deltaX;
  }

  function stopDragging() {
    dragStateRef.current.isDragging = false;
  }

  function handleCategoryClick(event: React.MouseEvent<HTMLAnchorElement>) {
    if (dragStateRef.current.hasMoved) {
      event.preventDefault();
      dragStateRef.current.hasMoved = false;
    }
  }

  return (
    <div
      className="menu-category-nav-shell"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={stopDragging}
      onMouseLeave={stopDragging}
    >
      <button
        type="button"
        className="menu-category-nav-button"
        aria-label="View previous categories"
        onClick={() => scrollByAmount("prev")}
      >
        <svg viewBox="0 0 20 20" aria-hidden="true">
          <path d="M11.75 4.5L6.25 10l5.5 5.5" />
        </svg>
      </button>
      <nav
        className="menu-category-nav"
        aria-label="Menu categories"
        ref={scrollRef}
      >
        {categories.map((category) => (
          <a
            key={category.id}
            href={category.href}
            className="menu-category-pill"
            onClick={handleCategoryClick}
          >
            {category.name}
          </a>
        ))}
      </nav>
      <button
        type="button"
        className="menu-category-nav-button"
        aria-label="View next categories"
        onClick={() => scrollByAmount("next")}
      >
        <svg viewBox="0 0 20 20" aria-hidden="true">
          <path d="M8.25 4.5L13.75 10l-5.5 5.5" />
        </svg>
      </button>
    </div>
  );
}
