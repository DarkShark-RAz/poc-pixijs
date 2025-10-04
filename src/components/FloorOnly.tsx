"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Application, extend } from "@pixi/react";
import { Assets, Container, Sprite, Texture } from "pixi.js";

// Register Pixi components
extend({ Container, Sprite });

const TILE_W = 128;
const TILE_H = 64;
const ROWS = 6;
const COLS = 8;

export default function FloorOnly() {
  const [texture, setTexture] = useState<Texture | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewport, setViewport] = useState<{ width: number; height: number }>({
    width: typeof window !== "undefined" ? window.innerWidth : 800,
    height: typeof window !== "undefined" ? window.innerHeight : 600,
  });
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onResize = () =>
      setViewport({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Load the oversized floor tile and prepare it
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const tex = (await Assets.load(
          "/assets/room/floor-128.png"
        )) as Texture;
        if (cancelled) return;
        // Crisp pixel-art scaling
        tex.source.scaleMode = "nearest" as const;
        setTexture(tex);
      } catch (e) {
        if (!cancelled)
          setError(
            "Failed to load /assets/room/floor-128.png. Place it under public/assets/room/."
          );
        console.error(e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Generate grid coordinates
  const grid = useMemo(() => {
    const coords: { row: number; col: number }[] = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        coords.push({ row: r, col: c });
      }
    }
    return coords;
  }, []);

  const centerX = viewport.width / 2;
  const centerY = viewport.height / 3; // raise a bit

  return (
    <div
      ref={containerRef}
      style={{ width: "100vw", height: "100vh", overflow: "hidden" }}
    >
      <Application resizeTo={containerRef}>
        {texture ? (
          <pixiContainer>
            {grid.map(({ row, col }) => {
              // 2:1 iso placement using desired tile dimensions
              const x = centerX + (col - row) * (TILE_W / 2);
              const y = centerY + (col + row) * (TILE_H / 2);

              // Runtime scaling to behave like 128x64 (non-uniform to force exact fit)
              const scaleX = TILE_W / texture.width;
              const scaleY = TILE_H / texture.height;

              return (
                <pixiSprite
                  key={`${row}-${col}`}
                  texture={texture}
                  x={x}
                  y={y}
                  anchor={{ x: 0.5, y: 0.5 }}
                  scale={{ x: scaleX, y: scaleY }}
                />
              );
            })}
          </pixiContainer>
        ) : null}
      </Application>
      {error ? (
        <div
          style={{
            position: "absolute",
            top: 12,
            left: 12,
            color: "#fff",
            background: "#e11",
            padding: "6px 10px",
            borderRadius: 4,
            fontFamily: "ui-sans-serif, system-ui, sans-serif",
            fontSize: 12,
          }}
        >
          {error}
        </div>
      ) : null}
    </div>
  );
}
