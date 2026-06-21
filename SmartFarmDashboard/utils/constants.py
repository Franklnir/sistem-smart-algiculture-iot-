"""
Global constants — colour palette, default sizes, physics values.
"""

import pygame

# ── Window ───────────────────────────────────────────────────
DEFAULT_WIDTH  = 1280
DEFAULT_HEIGHT = 720
FPS            = 60
TITLE          = "🌾 SmartFarm Dashboard"

# ── Sky Palette ──────────────────────────────────────────────
SKY_TOP        = (25,  60, 140)
SKY_BOTTOM     = (135, 195, 235)
SUN_COLOR      = (255, 220, 80)
SUN_GLOW       = (255, 240, 150)
CLOUD_COLOR    = (240, 245, 255)

# ── Ground / Field ───────────────────────────────────────────
GROUND_COLOR       = (100, 75, 50)
FIELD_GREEN_DARK   = (40, 100, 30)
FIELD_GREEN_MID    = (60, 140, 45)
FIELD_GREEN_LIGHT  = (85, 175, 60)
FIELD_GREEN_FRONT  = (100, 195, 70)
FIELD_WATER        = (70, 140, 180, 120)

# ── Hut ──────────────────────────────────────────────────────
HUT_WALL_FRONT     = (160, 120, 75)
HUT_WALL_SIDE      = (130, 95, 60)
HUT_ROOF           = (90, 60, 30)
HUT_ROOF_HIGHLIGHT = (120, 85, 50)
HUT_DOOR           = (60, 40, 20)
HUT_WINDOW         = (50, 45, 40)
HUT_WINDOW_LIT     = (255, 230, 120)
HUT_LAMP_GLOW      = (255, 240, 150, 80)

# ── Tree ─────────────────────────────────────────────────────
TRUNK_COLOR        = (100, 70, 40)
TRUNK_DARK         = (75, 50, 30)
LEAF_GREEN         = (35, 120, 30)
LEAF_GREEN_LIGHT   = (60, 160, 45)
COCONUT_COLOR      = (80, 55, 30)

# ── Fountain / Water ─────────────────────────────────────────
WATER_BLUE         = (80, 160, 230)
WATER_WHITE        = (220, 240, 255)
WATER_SPLASH       = (180, 215, 245)
POND_COLOR         = (60, 120, 170)
POND_RIM           = (90, 80, 65)

# ── Fire ─────────────────────────────────────────────────────
FIRE_CORE          = (255, 240, 60)
FIRE_MID           = (255, 160, 20)
FIRE_OUTER         = (220, 60, 20)
FIRE_TIP           = (180, 30, 10)

# ── Smoke ────────────────────────────────────────────────────
SMOKE_COLOR        = (100, 100, 110)
SMOKE_LIGHT        = (160, 160, 170)

# ── Alarm ────────────────────────────────────────────────────
ALARM_RED          = (220, 30, 30)
ALARM_FLASH        = (255, 50, 50, 60)

# ── Dashboard / HUD ─────────────────────────────────────────
DASH_BG            = (20, 30, 60, 160)
DASH_BORDER        = (80, 130, 200, 180)
DASH_TEXT           = (230, 240, 255)
DASH_LABEL          = (160, 190, 230)
DASH_VALUE_NORMAL   = (100, 230, 130)
DASH_VALUE_WARNING  = (255, 200, 60)
DASH_VALUE_DANGER   = (255, 70, 70)
DASH_VALUE_OFF      = (140, 140, 150)

# ── Physics ──────────────────────────────────────────────────
GRAVITY            = 400.0       # pixels / s²
WIND_SPEED         = 1.5         # base oscillation speed
