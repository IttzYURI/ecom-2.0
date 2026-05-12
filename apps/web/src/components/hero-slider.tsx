"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";

const SLIDE_INTERVAL = 4000;

export function HeroSlider({ images, alt }: { images: string[]; alt: string }) {
  const [current, setCurrent] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const nextSlide = useCallback(() => {
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrent((prev) => (prev + 1) % images.length);
      setIsTransitioning(false);
    }, 600);
  }, [images.length]);

  useEffect(() => {
    if (images.length <= 1) {
      return;
    }

    const timer = setInterval(nextSlide, SLIDE_INTERVAL);
    return () => clearInterval(timer);
  }, [nextSlide, images.length]);

  if (!images.length) {
    return null;
  }

  return (
    <div className="hero-slider">
      {images.map((src, index) => (
        <div
          key={src}
          className={`hero-slide ${index === current ? "is-active" : ""} ${isTransitioning ? "is-leaving" : ""}`}
        >
          <Image
            src={src}
            alt={`${alt} - ${index + 1}`}
            fill
            sizes="100vw"
            className="hero-slide-image"
            priority={index === 0}
          />
        </div>
      ))}
      {images.length > 1 ? (
        <div className="hero-slider-dots">
          {images.map((_, index) => (
            <button
              key={index}
              type="button"
              className={`hero-slider-dot ${index === current ? "is-active" : ""}`}
              onClick={() => {
                setIsTransitioning(true);
                setTimeout(() => {
                  setCurrent(index);
                  setIsTransitioning(false);
                }, 300);
              }}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      ) : null}
      <div className="hero-slider-progress">
        <div
          className="hero-slider-progress-bar"
          style={{ animationDuration: `${SLIDE_INTERVAL}ms` }}
        />
      </div>
    </div>
  );
}
