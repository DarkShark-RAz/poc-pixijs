"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Application, extend, useTick } from "@pixi/react";
import { Assets, Container, Sprite, Spritesheet, Texture, TilingSprite } from "pixi.js";

// Register Pixi components for JSX usage
extend({ Container, Sprite, TilingSprite });

// Sprite sheet metadata (Tinyblocks example)
// Ensure you place the image at: public/assets/sprites/structural_blocks.png
const atlasData = {
  frames: {
    pale_green_grass: {
      frame: { x: 0, y: 0, w: 18, h: 18 },
      sourceSize: { w: 18, h: 18 },
      spriteSourceSize: { x: 0, y: 0, w: 18, h: 18 },
    },
  },
  meta: {
    image: "/assets/sprites/structural_blocks.png",
    format: "RGBA8888",
    size: { w: 180, h: 180 },
    scale: "1",
  },
} as const;

const TILE_PX = 18;
const SCALE = 4; // pixel-art scale-up
const TILE = TILE_PX * SCALE; // 72px tile size when scaled 4x

function screenToIsometric(gridX: number, gridY: number): [number, number] {
  const X = gridX * TILE;
  const Y = gridY * TILE;
  // isoX = 0.5X - 0.5Y; isoY = 0.25X + 0.25Y
  return [0.5 * X - 0.5 * Y, 0.25 * X + 0.25 * Y];
}

type GrassBlockProps = {
  x: number;
  y: number;
  texture: Texture;
  viewportW: number;
  viewportH: number;
  animate: boolean;
};

function GrassBlock({ x, y, texture, viewportW, viewportH, animate }: GrassBlockProps) {
  const [isoX, isoY] = useMemo(() => screenToIsometric(x, y), [x, y]);
  const [elevation, setElevation] = useState(0);
  const timeRef = useRef(0);
  const animateRef = useRef(animate);

  useEffect(() => {
    animateRef.current = animate;
    if (!animate) setElevation(0);
  }, [animate]);

  const tick = useCallback(() => {
    // advance a simple time accumulator each frame (approx.)
    if (!animateRef.current) return;
    timeRef.current += 0.1; // tune speed
    setElevation(16 * Math.cos(timeRef.current - x));
  }, [x]);

  useTick(tick);

  return (
    <pixiSprite
      texture={texture}
      x={isoX + viewportW / 2}
      y={isoY + viewportH / 4 + elevation}
      anchor={{ x: 0, y: 0 }}
      scale={{ x: SCALE, y: SCALE }}
    />
  );
}

export default function GameRoom({ animate = true }: { animate?: boolean }) {
  const [textures, setTextures] = useState<Record<string, Texture> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewport, setViewport] = useState<{ width: number; height: number }>({
    width: typeof window !== "undefined" ? window.innerWidth : 800,
    height: typeof window !== "undefined" ? window.innerHeight : 600,
  });
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Handle window resize for centering calculations
  useEffect(() => {
    const onResize = () =>
      setViewport({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Load sprite sheet (Pixi v8)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const texture = (await Assets.load(atlasData.meta.image)) as Texture;
        const sheet = new Spritesheet({ texture, data: atlasData as any });
        await sheet.parse();
        if (cancelled) return;
        // Ensure pixel-art crisp scaling
        Object.values(sheet.textures).forEach((t) => {
          t.source.scaleMode = "nearest" as const;
        });
        setTextures(sheet.textures as unknown as Record<string, Texture>);
      } catch (e) {
        if (!cancelled)
          setError(
            "Failed to load spritesheet. Ensure /public/assets/sprites/structural_blocks.png exists."
          );
        console.error(e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const grid = useMemo(() => {
    const items: { x: number; y: number }[] = [];
    for (let i = 0; i < 16; i++) {
      for (let j = 0; j < 16; j++) {
        items.push({ x: i, y: j });
      }
    }
    return items;
  }, []);

  const grass = textures?.["pale_green_grass"];

  return (
    <div ref={containerRef} style={{ width: "100vw", height: "100vh", overflow: "hidden" }}>
      <Application resizeTo={containerRef}>
        {grass ? (
          <pixiContainer>
            {/* Background tiling layer (screen-space). Optional: adjust tileScale or alpha */}
            <pixiTilingSprite
              texture={grass}
              width={viewport.width}
              height={viewport.height}
              tileScale={{ x: SCALE, y: SCALE }}
              alpha={0.25}
            />
            {grid.map(({ x, y }) => (
              <GrassBlock
                key={`${x}-${y}`}
                x={x}
                y={y}
                texture={grass}
                viewportW={viewport.width}
                viewportH={viewport.height}
                animate={animate}
              />
            ))}
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
