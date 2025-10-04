# Sprites Folder

Place your isometric sprite sheet image here.

- Expected path: `public/sprites/structural_blocks.png`
- Expected size: 180x180 (10x10 grid of 18x18 tiles), matching Tiny Blocks assets
- Each tile frame: 18x18 pixels
- The app scales tiles by 4x for crisp pixel-art

Where to get assets:

- You can use the Tiny Blocks isometric pack (e.g. from itch.io).
- Rename a sprite sheet to `structural_blocks.png` and copy it into this folder.

After adding the file:

- Start dev server: `npm run dev`
- Navigate to `/game`
- You should see a 16x16 grass isometric plane with a wave animation.

Troubleshooting:

- If you see a red error banner, check the file exists at `/public/sprites/structural_blocks.png` and reload.
- Clear browser cache or hard-reload if the image was replaced.
