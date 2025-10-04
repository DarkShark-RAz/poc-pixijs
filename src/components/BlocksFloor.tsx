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

function iso(col: number, row: number, centerX: number, centerY: number) {
  const x = centerX + (col - row) * (TILE_W / 2);
  const y = centerY + (col + row) * (TILE_H / 2);
  return [x, y] as const;
}

export default function BlocksFloor() {
  const [blockTex, setBlockTex] = useState<Texture | null>(null);
  const [shadowTex, setShadowTex] = useState<Texture | null>(null);
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

  // Load base block and optional shadow
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const tex = (await Assets.load(
          "/assets/room/floorblock.png"
        )) as Texture;
        if (cancelled) return;
        tex.source.scaleMode = "nearest" as const;
        setBlockTex(tex);

        // Optional shadow
        try {
          const s = (await Assets.load(
            "/assets/room/shadow-64x32.png"
          )) as Texture;
          if (!cancelled) {
            s.source.scaleMode = "nearest" as const;
            setShadowTex(s);
          }
        } catch {
          // ignore if not present
        }
      } catch (e) {
        if (!cancelled)
          setError(
            "Failed to load /assets/room/floorblock.png. Place it under public/assets/room/."
          );
        console.error(e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
  const centerY = viewport.height / 3;

  return (
    <div
      ref={containerRef}
      style={{ width: "100vw", height: "100vh", overflow: "hidden" }}
    >
      <Application resizeTo={containerRef}>
        {blockTex ? (
          <pixiContainer sortableChildren>
            {grid.map(({ row, col }) => {
              const [x, y] = iso(col, row, centerX, centerY);
              const yBase = y + TILE_H / 2; // seat on bottom of diamond

              // Uniform scale so width becomes 128px; keep aspect ratio for thickness
              const scale = TILE_W / blockTex.width;

              return (
                <pixiContainer key={`${row}-${col}`}>
                  {shadowTex ? (
                    <pixiSprite
                      texture={shadowTex}
                      x={x}
                      y={yBase}
                      anchor={{ x: 0.5, y: 0.5 }}
                      alpha={0.3}
                      zIndex={yBase - 1}
                    />
                  ) : null}
                  <pixiSprite
                    texture={blockTex}
                    x={x}
                    y={yBase}
                    anchor={{ x: 0.5, y: 1 }}
                    scale={{ x: scale, y: scale }}
                    zIndex={yBase}
                  />
                </pixiContainer>
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
