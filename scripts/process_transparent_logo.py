import os
from PIL import Image

src_path = "/Users/mr_baten/.gemini/antigravity-ide/scratch/baten-creative-portfolio/src/assets/baten/ChatGPT Image Aug 28, 2026, 11_41_16 PM.png"
dst_dir = "/Users/mr_baten/.gemini/antigravity-ide/scratch/baten-creative-portfolio"
assets_dir = os.path.join(dst_dir, "src/assets/baten")

img = Image.open(src_path).convert("RGBA")
w, h = img.size
print(f"Original size: {w}x{h}, Mode: {img.mode}")

# Get alpha bounding box to trim any excess transparent padding if needed
bbox = img.getbbox()
print(f"Bounding box: {bbox}")

# Square crop centered on character
min_dim = min(w, h)
left = (w - min_dim) // 2
top = 0
right = left + min_dim
bottom = min_dim

cropped = img.crop((left, top, right, bottom))

# Save 512x512 with transparent background
avatar_512 = cropped.resize((512, 512), Image.Resampling.LANCZOS)
avatar_512.save(os.path.join(assets_dir, "baten-avatar.png"), format="PNG")
avatar_512.save(os.path.join(dst_dir, "icon-512.png"), format="PNG")

# 192x192
avatar_192 = cropped.resize((192, 192), Image.Resampling.LANCZOS)
avatar_192.save(os.path.join(dst_dir, "icon-192.png"), format="PNG")
avatar_192.save(os.path.join(assets_dir, "icon-192.png"), format="PNG")

# 180x180 Apple Touch Icon (Apple touch icons look best with solid warm paper background or transparent)
# Let's create apple touch icon with warm background #fdfdfb or transparent
avatar_180 = cropped.resize((180, 180), Image.Resampling.LANCZOS)
apple_bg = Image.new("RGBA", (180, 180), (253, 253, 251, 255))
apple_bg.alpha_composite(avatar_180)
apple_bg.convert("RGB").save(os.path.join(dst_dir, "apple-touch-icon.png"), format="PNG")
apple_bg.convert("RGB").save(os.path.join(assets_dir, "apple-touch-icon.png"), format="PNG")

# 32x32 Favicon PNG
avatar_32 = cropped.resize((32, 32), Image.Resampling.LANCZOS)
avatar_32.save(os.path.join(dst_dir, "favicon.png"), format="PNG")
avatar_32.save(os.path.join(dst_dir, "favicon-32x32.png"), format="PNG")
avatar_32.save(os.path.join(assets_dir, "favicon.png"), format="PNG")

# 16x16 Favicon PNG
avatar_16 = cropped.resize((16, 16), Image.Resampling.LANCZOS)
avatar_16.save(os.path.join(dst_dir, "favicon-16x16.png"), format="PNG")

# Multi-resolution ICO (16, 32, 48, 64) with alpha transparency support
avatar_512.save(
    os.path.join(dst_dir, "favicon.ico"),
    format="ICO",
    sizes=[(16, 16), (32, 32), (48, 48), (64, 64)]
)
avatar_512.save(
    os.path.join(assets_dir, "favicon.ico"),
    format="ICO",
    sizes=[(16, 16), (32, 32), (48, 48), (64, 64)]
)

print("Generated all transparent favicon and logo icons successfully!")
