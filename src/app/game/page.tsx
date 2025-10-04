"use client";

import { useState } from "react";
import GameRoom from "@/components/GameRoom";

export default function GamePage() {
  const [animate, setAnimate] = useState(true);
  return (
    <div style={{ position: "relative" }}>
      <GameRoom animate={animate} />
      <button
        onClick={() => setAnimate((a) => !a)}
        style={{
          position: "absolute",
          top: 12,
          left: 12,
          zIndex: 10,
          padding: "6px 10px",
          background: animate ? "#e11" : "#111",
          color: "#fff",
          border: "1px solid #444",
          borderRadius: 4,
          cursor: "pointer",
        }}
      >
        {animate ? "Stop animation" : "Start animation"}
      </button>
    </div>
  );
}
