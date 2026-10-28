#!/usr/bin/env python3
"""
Generate Realistic Architectural Renders for VIBGYOR Residential Building.
Produces four high-resolution (2560x1440) views:
1. Street View (Day)
2. Front Corner View (Dusk)
3. Aerial View (45 deg)
4. Entrance View (Approach)
"""

import math
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

WIDTH, HEIGHT = 2560, 1440

def draw_gradient_vertical(draw, box, color1, color2):
    x0, y0, x1, y1 = box
    h = y1 - y0
    for i in range(h):
        ratio = i / float(h)
        r = int(color1[0] * (1 - ratio) + color2[0] * ratio)
        g = int(color1[1] * (1 - ratio) + color2[1] * ratio)
        b = int(color1[2] * (1 - ratio) + color2[2] * ratio)
        draw.line([(x0, y0 + i), (x1, y0 + i)], fill=(r, g, b))

def draw_window_grid(draw, facade_poly, rows=7, cols=5, glass_color=(120, 180, 225), frame_color=(45, 50, 60)):
    # Facade corners: TL, TR, BR, BL
    p0, p1, p2, p3 = facade_poly
    for r in range(rows):
        yr0 = (r + 0.2) / rows
        yr1 = (r + 0.8) / rows
        for c in range(cols):
            xc0 = (c + 0.15) / cols
            xc1 = (c + 0.85) / cols

            # Bilinear interpolation
            def get_pt(u, v):
                top_x = p0[0] * (1 - u) + p1[0] * u
                top_y = p0[1] * (1 - u) + p1[1] * u
                bot_x = p3[0] * (1 - u) + p2[0] * u
                bot_y = p3[1] * (1 - u) + p2[1] * u
                return (top_x * (1 - v) + bot_x * v, top_y * (1 - v) + bot_y * v)

            w_tl = get_pt(xc0, yr0)
            w_tr = get_pt(xc1, yr0)
            w_br = get_pt(xc1, yr1)
            w_bl = get_pt(xc0, yr1)

            draw.polygon([w_tl, w_tr, w_br, w_bl], fill=glass_color, outline=frame_color, width=4)
            # Window mullion divider
            mid_t = ((w_tl[0] + w_tr[0]) / 2, (w_tl[1] + w_tr[1]) / 2)
            mid_b = ((w_bl[0] + w_br[0]) / 2, (w_bl[1] + w_br[1]) / 2)
            draw.line([mid_t, mid_b], fill=frame_color, width=3)

def draw_trees(draw, x_coords, ground_y, foliage_color=(55, 110, 45)):
    for x in x_coords:
        # Trunk
        draw.rectangle([x - 12, ground_y - 120, x + 12, ground_y], fill=(90, 60, 40))
        # Canopy clusters
        for dy, r in [(-120, 75), (-165, 65), (-205, 50)]:
            draw.ellipse([x - r, ground_y + dy - r, x + r, ground_y + dy + r], fill=foliage_color)

# 1. STREET VIEW (DAY)
def render_street_day():
    img = Image.new('RGB', (WIDTH, HEIGHT), (220, 235, 250))
    draw = ImageDraw.Draw(img)

    # Sky
    draw_gradient_vertical(draw, (0, 0, WIDTH, int(HEIGHT * 0.65)), (135, 185, 240), (225, 240, 255))

    ground_y = int(HEIGHT * 0.72)
    # Background distant skyline silhouettes
    for bx in range(0, WIDTH, 160):
        bh = 180 + (bx * 37) % 220
        draw.rectangle([bx, ground_y - bh - 100, bx + 140, ground_y - 80], fill=(195, 215, 230))

    # Site Lawn
    draw.rectangle([0, ground_y - 90, WIDTH, ground_y], fill=(110, 165, 80))

    # Main Building - Street View
    b_left = 680
    b_right = 1880
    b_top = 180
    b_width = b_right - b_left
    b_height = ground_y - b_top

    # Stilt Parking Level (Open bays & columns)
    stilt_h = 130
    stilt_top = ground_y - stilt_h
    # Shadowed stilt interior
    draw.rectangle([b_left + 15, stilt_top, b_right - 15, ground_y], fill=(70, 75, 82))
    # Stilt floor slab base
    draw.rectangle([b_left - 30, ground_y - 15, b_right + 30, ground_y], fill=(160, 165, 172), outline=(120, 125, 130), width=3)
    # Stilt Columns
    for cx in range(b_left + 70, b_right, 190):
        draw.rectangle([cx - 18, stilt_top, cx + 18, ground_y - 15], fill=(185, 190, 195), outline=(130, 135, 140), width=3)

    # 7 Residential Floors
    floor_h = (stilt_top - (b_top + 40)) / 7.0
    for f in range(7):
        fy0 = stilt_top - (f + 1) * floor_h
        fy1 = stilt_top - f * floor_h

        # Main wall facade
        draw.rectangle([b_left, fy0, b_right, fy1], fill=(245, 240, 232), outline=(215, 208, 198), width=2)
        # Windows across floor
        win_facade = [(b_left + 40, fy0 + 15), (b_right - 40, fy0 + 15), (b_right - 40, fy1 - 35), (b_left + 40, fy1 - 35)]
        draw_window_grid(draw, win_facade, rows=1, cols=6, glass_color=(105, 165, 215))

        # Horizontal Floor Slab separation
        draw.rectangle([b_left - 25, fy1 - 12, b_right + 25, fy1], fill=(210, 214, 220), outline=(170, 175, 182), width=3)

        # Balcony Cantilever Slabs & Railings
        balc_w = b_width - 80
        bx0 = b_left + 40
        bx1 = bx0 + balc_w
        # Balcony floor slab
        draw.rectangle([bx0, fy1 - 8, bx1, fy1 + 8], fill=(200, 205, 212), outline=(150, 155, 162), width=2)
        # Glass balcony railing
        draw.rectangle([bx0, fy1 - 45, bx1, fy1 - 8], fill=(130, 190, 235, 180), outline=(40, 45, 52), width=4)
        # Vertical railing posts
        for rx in range(int(bx0), int(bx1), 160):
            draw.line([(rx, fy1 - 45), (rx, fy1 - 8)], fill=(40, 45, 52), width=3)

    # Rooftop / Terrace & Parapet
    draw.rectangle([b_left - 30, b_top + 40 - 20, b_right + 30, b_top + 40], fill=(200, 205, 212), outline=(160, 165, 172), width=3)
    # Parapet safety wall
    draw.rectangle([b_left - 15, b_top + 40 - 55, b_right + 15, b_top + 40 - 20], fill=(240, 235, 228), outline=(180, 175, 168), width=3)
    # Lift core & overhead structure
    draw.rectangle([b_left + b_width // 2 - 140, b_top - 50, b_left + b_width // 2 + 140, b_top + 40 - 55], fill=(225, 220, 212), outline=(160, 155, 148), width=3)

    # Perimeter Trees & Landscaping
    draw_trees(draw, [180, 360, 520, 2040, 2220, 2380], ground_y - 20, foliage_color=(50, 120, 40))

    # Front Boundary Wall & Entrance Gates
    draw.rectangle([0, ground_y - 45, WIDTH, ground_y], fill=(235, 230, 222), outline=(190, 185, 178), width=3)
    # Main Gate
    gate_x0, gate_x1 = b_left + 180, b_left + 540
    draw.rectangle([gate_x0, ground_y - 65, gate_x1, ground_y], fill=(45, 50, 58), outline=(20, 22, 26), width=4)
    # Gate vertical louvers
    for gx in range(gate_x0 + 15, gate_x1, 22):
        draw.line([(gx, ground_y - 65), (gx, ground_y)], fill=(120, 130, 145), width=3)

    # 18m Main Road (Foreground)
    draw.rectangle([0, ground_y, WIDTH, HEIGHT], fill=(50, 54, 60))
    # Concrete Sidewalk
    draw.rectangle([0, ground_y, WIDTH, ground_y + 35], fill=(205, 210, 218), outline=(160, 165, 172), width=2)
    # White road lane stripes
    stripe_y = ground_y + 160
    for sx in range(40, WIDTH, 160):
        draw.rectangle([sx, stripe_y, sx + 90, stripe_y + 14], fill=(245, 245, 250))

    return img

# 2. FRONT CORNER VIEW (DUSK)
def render_dusk_corner():
    img = Image.new('RGB', (WIDTH, HEIGHT), (220, 130, 80))
    draw = ImageDraw.Draw(img)

    # Golden Hour Sunset Sky
    draw_gradient_vertical(draw, (0, 0, WIDTH, int(HEIGHT * 0.7)), (120, 60, 120), (255, 145, 65))

    ground_y = int(HEIGHT * 0.72)
    draw.rectangle([0, ground_y - 40, WIDTH, ground_y], fill=(65, 85, 50))

    # Corner 3D Perspective (Front + Side Facade)
    corner_x = 1350
    left_x = 420
    right_x = 2150
    top_y = 190

    # Side Wall (Shadow side in dusk)
    side_poly = [(left_x, top_y + 110), (corner_x, top_y), (corner_x, ground_y), (left_x, ground_y - 20)]
    draw.polygon(side_poly, fill=(155, 105, 90), outline=(110, 70, 60), width=3)

    # Front Wall (Warm lit face)
    front_poly = [(corner_x, top_y), (right_x, top_y + 100), (right_x, ground_y - 20), (corner_x, ground_y)]
    draw.polygon(front_poly, fill=(245, 185, 145), outline=(180, 120, 85), width=3)

    # Illuminated Warm Interior Windows
    draw_window_grid(draw, [(corner_x + 30, top_y + 40), (right_x - 30, top_y + 130), (right_x - 30, ground_y - 140), (corner_x + 30, ground_y - 120)], rows=7, cols=5, glass_color=(255, 220, 120), frame_color=(60, 45, 40))
    draw_window_grid(draw, [(left_x + 30, top_y + 140), (corner_x - 30, top_y + 35), (corner_x - 30, ground_y - 120), (left_x + 30, ground_y - 50)], rows=7, cols=3, glass_color=(220, 175, 110), frame_color=(50, 35, 30))

    # Stilt Parking Level
    draw.polygon([(left_x + 10, ground_y - 110), (corner_x, ground_y - 100), (corner_x, ground_y), (left_x + 10, ground_y - 20)], fill=(45, 40, 48))
    draw.polygon([(corner_x, ground_y - 100), (right_x - 10, ground_y - 110), (right_x - 10, ground_y - 20), (corner_x, ground_y)], fill=(75, 60, 65))

    # Corner Balcony Cantilevers & Golden Glow Glass
    for f in range(1, 8):
        fy = top_y + (f * 65)
        draw.line([(left_x - 20, fy + 80), (corner_x, fy), (right_x + 20, fy + 70)], fill=(230, 160, 120), width=8)
        draw.line([(left_x - 15, fy + 55), (corner_x, fy - 25), (right_x + 15, fy + 45)], fill=(255, 210, 120), width=6)

    # Dusk Ground & Warm Street Lights
    draw.rectangle([0, ground_y, WIDTH, HEIGHT], fill=(35, 32, 40))
    draw.rectangle([0, ground_y, WIDTH, ground_y + 30], fill=(130, 110, 105))
    # Street lane
    for sx in range(60, WIDTH, 180):
        draw.rectangle([sx, ground_y + 140, sx + 90, ground_y + 152], fill=(220, 180, 120))

    # Warm Light Beacons
    for lx in [380, 1350, 2200]:
        draw.ellipse([lx - 12, ground_y - 120, lx + 12, ground_y - 96], fill=(255, 235, 160))
        draw.line([(lx, ground_y - 96), (lx, ground_y)], fill=(50, 45, 55), width=6)

    return img

# 3. AERIAL 45-DEG VIEW
def render_aerial_45deg():
    img = Image.new('RGB', (WIDTH, HEIGHT), (210, 230, 245))
    draw = ImageDraw.Draw(img)

    # Clear High Sky
    draw_gradient_vertical(draw, (0, 0, WIDTH, int(HEIGHT * 0.4)), (120, 175, 235), (205, 230, 250))

    # Site Plan Topography (Green Plot & Roadways)
    ground_poly = [(0, 360), (WIDTH, 360), (WIDTH, HEIGHT), (0, HEIGHT)]
    draw.polygon(ground_poly, fill=(100, 155, 75))

    # Surrounding Road Grid
    draw.polygon([(0, 880), (WIDTH, 780), (WIDTH, 960), (0, 1060)], fill=(55, 60, 68))
    draw.polygon([(180, 360), (320, 360), (450, HEIGHT), (280, HEIGHT)], fill=(60, 65, 72))

    # Building Isometric Block (Aerial 45 deg)
    # Rooftop Terrace
    roof_tl = (920, 360)
    roof_tr = (1680, 420)
    roof_br = (1520, 640)
    roof_bl = (760, 580)

    # Ground footprint corners
    g_bl = (760, 1020)
    g_br = (1520, 1080)
    g_tr = (1680, 860)

    # Left Facade
    draw.polygon([roof_bl, roof_tl, (roof_tl[0], 760), g_bl], fill=(210, 205, 195), outline=(160, 155, 145), width=2)
    # Front Facade (Southern main elevation)
    draw.polygon([roof_bl, roof_br, g_br, g_bl], fill=(248, 244, 236), outline=(190, 185, 175), width=3)
    # Right Facade
    draw.polygon([roof_br, roof_tr, g_tr, g_br], fill=(185, 180, 172), outline=(140, 135, 128), width=2)

    # Windows on Front Elevation
    draw_window_grid(draw, [roof_bl, roof_br, (g_br[0], g_br[1] - 110), (g_bl[0], g_bl[1] - 110)], rows=7, cols=6, glass_color=(95, 160, 215))

    # Open Rooftop Terrace Surface
    draw.polygon([roof_tl, roof_tr, roof_br, roof_bl], fill=(180, 188, 195), outline=(80, 85, 92), width=4)
    # Terrace Parapet Wall
    parapet_in = [
        (roof_tl[0] + 15, roof_tl[1] + 15),
        (roof_tr[0] - 15, roof_tr[1] + 15),
        (roof_br[0] - 15, roof_br[1] - 15),
        (roof_bl[0] + 15, roof_bl[1] - 15)
    ]
    draw.polygon(parapet_in, fill=(215, 222, 228), outline=(140, 145, 152), width=3)

    # Lift Core Machine Room on Roof
    core_tl = (1120, 460)
    core_tr = (1360, 480)
    core_br = (1310, 560)
    core_bl = (1070, 540)
    draw.polygon([core_bl, core_tl, (core_tl[0], core_tl[1] - 60), (core_bl[0], core_bl[1] - 60)], fill=(200, 195, 185))
    draw.polygon([core_bl, core_br, (core_br[0], core_br[1] - 60), (core_bl[0], core_bl[1] - 60)], fill=(240, 235, 225))
    draw.polygon([(core_tl[0], core_tl[1] - 60), (core_tr[0], core_tr[1] - 60), (core_br[0], core_br[1] - 60), (core_bl[0], core_bl[1] - 60)], fill=(160, 168, 175), outline=(80, 85, 92), width=3)

    # Landscape Trees in Grounds
    tree_coords = [(480, 560), (540, 720), (620, 880), (1760, 620), (1850, 780), (1920, 940), (1140, 1160), (1350, 1180)]
    for tx, ty in tree_coords:
        draw.ellipse([tx - 40, ty - 40, tx + 40, ty + 40], fill=(45, 115, 35), outline=(30, 80, 25), width=2)

    return img

# 4. ENTRANCE VIEW (APPROACH)
def render_entrance_closeup():
    img = Image.new('RGB', (WIDTH, HEIGHT), (225, 240, 255))
    draw = ImageDraw.Draw(img)

    # Sky
    draw_gradient_vertical(draw, (0, 0, WIDTH, int(HEIGHT * 0.45)), (140, 190, 245), (230, 245, 255))

    ground_y = int(HEIGHT * 0.74)
    stilt_roof_y = int(HEIGHT * 0.28)

    # Stilt Parking Clearance & Rear Core
    draw.rectangle([0, stilt_roof_y, WIDTH, ground_y], fill=(70, 74, 82))
    # Interior elevator lobby glass enclosure
    lobby_x0, lobby_x1 = 1000, 1560
    draw.rectangle([lobby_x0, stilt_roof_y + 120, lobby_x1, ground_y], fill=(120, 175, 220), outline=(40, 45, 52), width=4)
    # Lobby doors
    draw.rectangle([lobby_x0 + 160, ground_y - 240, lobby_x1 - 160, ground_y], fill=(225, 235, 245), outline=(30, 35, 40), width=4)
    draw.line([(lobby_x0 + 280, ground_y - 240), (lobby_x0 + 280, ground_y)], fill=(30, 35, 40), width=4)

    # Stilt Concrete Massive Columns
    col_w = 70
    for cx in [280, 720, 1840, 2280]:
        # Drop shadow
        draw.rectangle([cx + col_w, ground_y - 20, cx + col_w + 50, ground_y + 30], fill=(40, 42, 48))
        draw.rectangle([cx, stilt_roof_y, cx + col_w, ground_y], fill=(195, 200, 205), outline=(140, 145, 150), width=4)

    # First Floor Underside / Cantilever Ceiling
    draw.rectangle([0, stilt_roof_y - 45, WIDTH, stilt_roof_y], fill=(220, 225, 232), outline=(170, 175, 182), width=4)
    # Upper residential balcony of Floor 1
    draw.rectangle([120, stilt_roof_y - 180, WIDTH - 120, stilt_roof_y - 45], fill=(245, 240, 232), outline=(200, 195, 188), width=3)
    # Floor 1 Glass Railings
    draw.rectangle([120, stilt_roof_y - 120, WIDTH - 120, stilt_roof_y - 45], fill=(120, 180, 230), outline=(45, 50, 60), width=4)

    # Ground Level Paving & Drop-off Porch
    draw.rectangle([0, ground_y, WIDTH, HEIGHT], fill=(190, 195, 202))
    # Paver stone tile joints
    for px in range(0, WIDTH, 120):
        draw.line([(px, ground_y), (px, HEIGHT)], fill=(160, 165, 172), width=2)
    for py in range(ground_y, HEIGHT, 80):
        draw.line([(0, py), (WIDTH, py)], fill=(160, 165, 172), width=2)

    # Planter Boxes with Green Shrubs
    for plx0 in [160, 1980]:
        plx1 = plx0 + 420
        draw.rectangle([plx0, ground_y - 70, plx1, ground_y + 10], fill=(235, 230, 220), outline=(180, 175, 168), width=3)
        for sx in range(plx0 + 30, plx1 - 20, 60):
            draw.ellipse([sx - 35, ground_y - 120, sx + 35, ground_y - 50], fill=(45, 125, 38))

    return img

def main():
    dest_dirs = [
        Path('vibgyor-task/frontend/public/renders'),
        Path('vibgyor-task/frontend/dist/renders'),
        Path('vibgyor-task/outputs/renders')
    ]
    for d in dest_dirs:
        d.mkdir(parents=True, exist_ok=True)

    renders = [
        ('01_street_day.png', render_street_day()),
        ('02_dusk_corner.png', render_dusk_corner()),
        ('03_aerial_45deg.png', render_aerial_45deg()),
        ('04_entrance_closeup.png', render_entrance_closeup())
    ]

    for fname, img in renders:
        for d in dest_dirs:
            target_path = d / fname
            img.save(str(target_path), 'PNG', quality=95)
        print(f"[OK] Saved architectural render: {fname} (2560x1440)")

if __name__ == '__main__':
    main()
