"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Application, extend } from "@pixi/react";
import { Assets, Container, Rectangle, Sprite, Texture } from "pixi.js";

extend({ Container, Sprite });

type Mode = "sheet" | "tile" | "cuboid";

const defaults = {
  sheetPath: "/assets/sprites/structural_blocks.png",
  tilePath: "/assets/room/floor-128.png",
  cuboidPath: "/assets/room/new-floor-block.png",
};

function isoPosition(
  col: number,
  row: number,
  tileWidth: number,
  tileHeight: number
) {
  return [
    (col - row) * (tileWidth / 2),
    (col + row) * (tileHeight / 2),
  ] as const;
}

const panelStyle: React.CSSProperties = {
  position: "absolute",
  top: 16,
  right: 16,
  width: 320,
  maxHeight: "90vh",
  overflowY: "auto",
  background: "rgba(10, 14, 26, 0.9)",
  border: "1px solid #2a3f5f",
  borderRadius: 8,
  padding: 16,
  color: "#e5ecff",
  fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
  fontSize: 13,
  lineHeight: 1.4,
};

const labelStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
  marginBottom: 12,
};

const inputStyle: React.CSSProperties = {
  padding: "6px 8px",
  borderRadius: 4,
  border: "1px solid #2a3f5f",
  background: "rgba(26, 31, 46, 0.9)",
  color: "#e5ecff",
};

const rowStyle: React.CSSProperties = {
  display: "flex",
  gap: 12,
};

export default function FloorLab() {
  const [mode, setMode] = useState<Mode>("sheet");
  const [imagePath, setImagePath] = useState(defaults.sheetPath);
  const [frameSize, setFrameSize] = useState(18);
  const [sheetScale, setSheetScale] = useState(4);
  const [frameIndex, setFrameIndex] = useState(0);

  const [tileWidth, setTileWidth] = useState(128);
  const [tileHeight, setTileHeight] = useState(64);
  const [fitFlatTile, setFitFlatTile] = useState(true);
  const [uniformCuboid, setUniformCuboid] = useState(true);

  const [rows, setRows] = useState(6);
  const [cols, setCols] = useState(8);

  const [textures, setTextures] = useState<Texture[]>([]);
  const [sheetInfo, setSheetInfo] = useState<{
    cols: number;
    rows: number;
    width: number;
    height: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [viewport, setViewport] = useState<{ width: number; height: number }>({
    width: typeof window !== "undefined" ? window.innerWidth : 1280,
    height: typeof window !== "undefined" ? window.innerHeight : 720,
  });

  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onResize = () =>
      setViewport({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Reset defaults when switching modes
  useEffect(() => {
    if (mode === "sheet") {
      setImagePath((prev) => prev || defaults.sheetPath);
      setFrameSize((prev) => (prev ? prev : 18));
      setSheetScale((prev) => (prev ? prev : 4));
    } else if (mode === "tile") {
      setImagePath((prev) =>
        prev === defaults.sheetPath ? defaults.tilePath : prev
      );
    } else {
      setImagePath((prev) =>
        prev === defaults.sheetPath ? defaults.cuboidPath : prev
      );
    }
  }, [mode]);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    setTextures([]);
    setSheetInfo(null);

    (async () => {
      try {
        if (mode === "sheet") {
          const base = (await Assets.load(imagePath)) as Texture;
          if (cancelled) return;
          base.source.scaleMode = "nearest" as const;
          const cols = Math.floor(base.width / frameSize);
          const rows = Math.floor(base.height / frameSize);
          if (!cols || !rows) {
            throw new Error(
              `Frame size ${frameSize}px does not evenly divide sheet (${base.width}×${base.height}).`
            );
          }
          const list: Texture[] = [];
          for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
              const rect = new Rectangle(
                x * frameSize,
                y * frameSize,
                frameSize,
                frameSize
              );
              list.push(new Texture({ source: base.source, frame: rect }));
            }
          }
          setTextures(list);
          setSheetInfo({ cols, rows, width: base.width, height: base.height });
          setFrameIndex((index) => (list.length ? index % list.length : 0));
        } else {
          const tex = (await Assets.load(imagePath)) as Texture;
          if (cancelled) return;
          tex.source.scaleMode = "nearest" as const;
          setTextures([tex]);
          setFrameIndex(0);
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setError(
            `Failed to load ${imagePath}. ${
              e instanceof Error ? e.message : "Unknown error"
            }`
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [imagePath, frameSize, mode]);

  const grid = useMemo(() => {
    const coords: { row: number; col: number }[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) coords.push({ row: r, col: c });
    }
    return coords;
  }, [rows, cols]);

  const activeTexture = useMemo(() => {
    if (!textures.length) return null;
    if (mode === "sheet") {
      const index = Math.max(0, Math.min(frameIndex, textures.length - 1));
      return textures[index];
    }
    return textures[0];
  }, [textures, frameIndex, mode]);

  const centerX = viewport.width / 2;
  const centerY = viewport.height / 3;

  const tileWidthPx =
    mode === "sheet" ? frameSize * sheetScale : Math.max(1, tileWidth);
  const tileHeightPx =
    mode === "sheet" ? (frameSize * sheetScale) / 2 : Math.max(1, tileHeight);

  let scaleX = 1;
  let scaleY = 1;
  let anchor: { x: number; y: number } = { x: 0.5, y: 0.5 };
  let baseYOffset = 0;

  if (mode === "sheet") {
    scaleX = sheetScale;
    scaleY = sheetScale;
    anchor = { x: 0, y: 0 };
  } else if (mode === "tile") {
    anchor = { x: 0.5, y: 0.5 };
    if (fitFlatTile && activeTexture) {
      scaleX = tileWidth / activeTexture.width;
      scaleY = tileHeight / activeTexture.height;
    }
  } else if (mode === "cuboid") {
    anchor = { x: 0.5, y: 1 };
    baseYOffset = tileHeightPx / 2;
    if (uniformCuboid && activeTexture) {
      const uniform = tileWidth / activeTexture.width;
      scaleX = scaleY = uniform;
    }
  }

  const scaledWidth = activeTexture ? activeTexture.width * scaleX : 0;
  const scaledHeight = activeTexture ? activeTexture.height * scaleY : 0;

  const infoLines = useMemo(() => {
    const lines: string[] = [];
    if (mode === "sheet" && sheetInfo) {
      lines.push(
        `Sheet ${sheetInfo.width}×${sheetInfo.height} -> ${sheetInfo.cols}×${sheetInfo.rows} frames of ${frameSize}px`
      );
    }
    if (activeTexture) {
      lines.push(
        `Texture ${activeTexture.width}×${
          activeTexture.height
        } → displayed ${scaledWidth.toFixed(1)}×${scaledHeight.toFixed(1)} px`
      );
    }
    return lines;
  }, [mode, sheetInfo, frameSize, activeTexture, scaledWidth, scaledHeight]);

  return (
    <div
      ref={containerRef}
      style={{ width: "100vw", height: "100vh", overflow: "hidden" }}
    >
      <Application resizeTo={containerRef}>
        {activeTexture ? (
          <pixiContainer sortableChildren={mode === "cuboid"}>
            {grid.map(({ row, col }) => {
              const [cx, cy] = isoPosition(col, row, tileWidthPx, tileHeightPx);
              let x = cx + centerX;
              let y = cy + centerY;

              if (mode === "sheet") {
                x -= scaledWidth / 2;
                y -= scaledHeight / 2;
              } else if (mode === "cuboid") {
                y += baseYOffset;
              }

              return (
                <pixiSprite
                  key={`${row}-${col}`}
                  texture={activeTexture}
                  x={x}
                  y={y}
                  anchor={anchor}
                  scale={{ x: scaleX, y: scaleY }}
                  zIndex={mode === "cuboid" ? y : undefined}
                />
              );
            })}
          </pixiContainer>
        ) : null}
      </Application>

      <div style={panelStyle}>
        <h2 style={{ fontSize: 16, margin: "0 0 12px" }}>
          Isometric Floor Lab
        </h2>
        <label style={labelStyle}>
          <span>Mode</span>
          <select
            value={mode}
            onChange={(event) => {
              const value = event.target.value as Mode;
              setMode(value);
              if (value === "sheet") {
                setImagePath(defaults.sheetPath);
              } else if (value === "tile") {
                setImagePath(defaults.tilePath);
              } else {
                setImagePath(defaults.cuboidPath);
              }
            }}
            style={inputStyle}
          >
            <option value="sheet">Spritesheet cubes (GameRoom logic)</option>
            <option value="tile">Flat diamond tile (128×64)</option>
            <option value="cuboid">
              Cuboid with thickness (bottom anchored)
            </option>
          </select>
        </label>

        <label style={labelStyle}>
          <span>Image path (under /public)</span>
          <input
            type="text"
            value={imagePath}
            onChange={(event) => setImagePath(event.target.value)}
            style={inputStyle}
            placeholder="/assets/..."
          />
        </label>

        {mode === "sheet" ? (
          <>
            <div style={rowStyle}>
              <label style={{ ...labelStyle, flex: 1 }}>
                <span>Frame size (px)</span>
                <input
                  type="number"
                  min={1}
                  value={frameSize}
                  onChange={(event) =>
                    setFrameSize(Number(event.target.value) || 1)
                  }
                  style={inputStyle}
                />
              </label>
              <label style={{ ...labelStyle, flex: 1 }}>
                <span>Display scale</span>
                <input
                  type="number"
                  min={0.5}
                  step={0.5}
                  value={sheetScale}
                  onChange={(event) =>
                    setSheetScale(Number(event.target.value) || 1)
                  }
                  style={inputStyle}
                />
              </label>
            </div>
            <label style={labelStyle}>
              <span>Frame index (0-based)</span>
              <input
                type="number"
                min={0}
                value={frameIndex}
                onChange={(event) =>
                  setFrameIndex(Number(event.target.value) || 0)
                }
                style={inputStyle}
              />
            </label>
            {sheetInfo ? (
              <p style={{ marginTop: -4, marginBottom: 12 }}>
                Frames available: {sheetInfo.cols * sheetInfo.rows} (
                {sheetInfo.cols}×{sheetInfo.rows})
              </p>
            ) : null}
          </>
        ) : null}

        {mode === "tile" ? (
          <>
            <div style={rowStyle}>
              <label style={{ ...labelStyle, flex: 1 }}>
                <span>Tile width (px)</span>
                <input
                  type="number"
                  min={1}
                  value={tileWidth}
                  onChange={(event) =>
                    setTileWidth(Number(event.target.value) || 1)
                  }
                  style={inputStyle}
                />
              </label>
              <label style={{ ...labelStyle, flex: 1 }}>
                <span>Tile height (px)</span>
                <input
                  type="number"
                  min={1}
                  value={tileHeight}
                  onChange={(event) =>
                    setTileHeight(Number(event.target.value) || 1)
                  }
                  style={inputStyle}
                />
              </label>
            </div>
            <label
              style={{
                ...labelStyle,
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
              }}
            >
              <input
                type="checkbox"
                checked={fitFlatTile}
                onChange={(event) => setFitFlatTile(event.target.checked)}
              />
              <span>
                Scale sprite to exactly {tileWidth}×{tileHeight}
              </span>
            </label>
          </>
        ) : null}

        {mode === "cuboid" ? (
          <>
            <div style={rowStyle}>
              <label style={{ ...labelStyle, flex: 1 }}>
                <span>Footprint width (px)</span>
                <input
                  type="number"
                  min={1}
                  value={tileWidth}
                  onChange={(event) =>
                    setTileWidth(Number(event.target.value) || 1)
                  }
                  style={inputStyle}
                />
              </label>
              <label style={{ ...labelStyle, flex: 1 }}>
                <span>Footprint height (px)</span>
                <input
                  type="number"
                  min={1}
                  value={tileHeight}
                  onChange={(event) =>
                    setTileHeight(Number(event.target.value) || 1)
                  }
                  style={inputStyle}
                />
              </label>
            </div>
            <label
              style={{
                ...labelStyle,
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
              }}
            >
              <input
                type="checkbox"
                checked={uniformCuboid}
                onChange={(event) => setUniformCuboid(event.target.checked)}
              />
              <span>Uniform scale to match width ({tileWidth}px)</span>
            </label>
            <p style={{ marginTop: -4, marginBottom: 12 }}>
              Cuboids anchor bottom-center and seat on the tile base
              automatically.
            </p>
          </>
        ) : null}

        <div style={rowStyle}>
          <label style={{ ...labelStyle, flex: 1 }}>
            <span>Rows</span>
            <input
              type="number"
              min={1}
              value={rows}
              onChange={(event) => setRows(Number(event.target.value) || 1)}
              style={inputStyle}
            />
          </label>
          <label style={{ ...labelStyle, flex: 1 }}>
            <span>Columns</span>
            <input
              type="number"
              min={1}
              value={cols}
              onChange={(event) => setCols(Number(event.target.value) || 1)}
              style={inputStyle}
            />
          </label>
        </div>

        <button
          onClick={() => {
            if (mode === "sheet") {
              setImagePath(defaults.sheetPath);
              setFrameSize(18);
              setSheetScale(4);
              setFrameIndex(0);
            } else if (mode === "tile") {
              setImagePath(defaults.tilePath);
              setTileWidth(128);
              setTileHeight(64);
              setFitFlatTile(true);
            } else {
              setImagePath(defaults.cuboidPath);
              setTileWidth(128);
              setTileHeight(64);
              setUniformCuboid(true);
            }
          }}
          style={{
            ...inputStyle,
            cursor: "pointer",
            width: "100%",
            marginTop: 4,
            textAlign: "center",
          }}
        >
          Reset mode defaults
        </button>

        {infoLines.length ? (
          <ul style={{ marginTop: 12, paddingLeft: 18 }}>
            {infoLines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        ) : null}

        {error ? (
          <div
            style={{
              marginTop: 12,
              padding: "6px 10px",
              background: "#e11",
              borderRadius: 4,
              color: "#fff",
            }}
          >
            {error}
          </div>
        ) : null}
      </div>
    </div>
  );
}
