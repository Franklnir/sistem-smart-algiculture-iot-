"""
Cloud Dashboard — glassmorphism HUD panel showing sensor data & relay status.
"""

from __future__ import annotations
import math
import pygame
from models.app_state import AppState
from utils.constants import (
    DASH_BG, DASH_BORDER, DASH_TEXT, DASH_LABEL,
    DASH_VALUE_NORMAL, DASH_VALUE_WARNING, DASH_VALUE_DANGER, DASH_VALUE_OFF,
)
from utils.easing import lerp


class CloudDashboard:
    """Transparent floating HUD at the top of the screen."""

    def __init__(self, width: int, height: int):
        self.width = width
        self.height = height
        self.state = AppState()
        self._time = 0.0

        # Smoothed display values (for animation)
        self._disp_temp = 0.0
        self._disp_hum = 0.0

        self._font_title: pygame.font.Font | None = None
        self._font_label: pygame.font.Font | None = None
        self._font_value: pygame.font.Font | None = None
        self._build_fonts()

    def _build_fonts(self):
        base = max(10, int(self.height * 0.018))
        self._font_title = pygame.font.SysFont("Segoe UI", int(base * 1.3), bold=True)
        self._font_label = pygame.font.SysFont("Segoe UI", base)
        self._font_value = pygame.font.SysFont("Consolas", int(base * 1.1), bold=True)

    def resize(self, width: int, height: int):
        self.width = width
        self.height = height
        self._build_fonts()

    def update(self, dt: float):
        self._time += dt
        # Smooth-lerp towards actual values
        speed = 5.0 * dt
        self._disp_temp = lerp(self._disp_temp, self.state.temperature, speed)
        self._disp_hum = lerp(self._disp_hum, self.state.humidity, speed)

    def draw(self, surface: pygame.Surface):
        snap = self.state.snapshot()
        pad = int(self.width * 0.02)
        panel_w = min(700, int(self.width * 0.55))
        panel_h = int(self.height * 0.14)
        panel_x = (self.width - panel_w) // 2
        panel_y = pad

        # ── Glassmorphism panel ──────────────────────────────
        panel = pygame.Surface((panel_w, panel_h), pygame.SRCALPHA)
        # Background fill
        panel.fill(DASH_BG)
        # Border
        pygame.draw.rect(panel, DASH_BORDER, (0, 0, panel_w, panel_h), 1,
                         border_radius=12)
        # Inner subtle gradient
        for i in range(panel_h):
            alpha = max(0, 15 - int(15 * i / panel_h))
            pygame.draw.line(panel, (255, 255, 255, alpha),
                             (1, i), (panel_w - 1, i))

        surface.blit(panel, (panel_x, panel_y))

        # ── Title ────────────────────────────────────────────
        title = self._font_title.render("☁  Smart Farm Cloud Monitor", True,
                                        DASH_TEXT)
        surface.blit(title, (panel_x + 15, panel_y + 8))

        # ── Data rows ────────────────────────────────────────
        items = self._build_items(snap)
        item_y = panel_y + 35
        col_width = (panel_w - 30) // len(items)

        for idx, (icon, label, value_str, color) in enumerate(items):
            ix = panel_x + 15 + idx * col_width

            # Icon + Label
            lbl_text = f"{icon} {label}"
            lbl_surf = self._font_label.render(lbl_text, True, DASH_LABEL)
            surface.blit(lbl_surf, (ix, item_y))

            # Value
            val_surf = self._font_value.render(value_str, True, color)
            surface.blit(val_surf, (ix, item_y + 22))

        # ── Connection indicator ─────────────────────────────
        dot_x = panel_x + panel_w - 18
        dot_y = panel_y + 12
        # Pulse animation
        pulse = 0.5 + 0.5 * math.sin(self._time * 3)
        dot_color = (int(80 + 80 * pulse), int(200 + 55 * pulse), 120)
        pygame.draw.circle(surface, dot_color, (dot_x, dot_y), 4)

    def _build_items(self, snap: dict) -> list:
        """Return list of (icon, label, value_str, color)."""
        # Temperature
        temp = self._disp_temp
        temp_str = f"{temp:.1f} °C" if temp != 0 else "-- °C"
        temp_color = DASH_VALUE_DANGER if temp > 40 else (
            DASH_VALUE_WARNING if temp > 35 else DASH_VALUE_NORMAL)

        # Humidity
        hum = self._disp_hum
        hum_str = f"{hum:.0f} %" if hum != 0 else "-- %"
        hum_color = DASH_VALUE_NORMAL

        # Fire
        fire = snap["fire"]
        fire_str = "FIRE !" if fire else "Normal"
        fire_color = DASH_VALUE_DANGER if fire else DASH_VALUE_NORMAL

        # Relay 1
        r1 = snap["relay1"]
        r1_str = "ON" if r1 else "OFF"
        r1_color = DASH_VALUE_WARNING if r1 else DASH_VALUE_OFF

        # Relay 2
        r2 = snap["relay2"]
        r2_str = "ON" if r2 else "OFF"
        r2_color = DASH_VALUE_WARNING if r2 else DASH_VALUE_OFF

        return [
            ("🌡", "Suhu",        temp_str, temp_color),
            ("💧", "Kelembaban",  hum_str,  hum_color),
            ("🔥", "Fire",        fire_str, fire_color),
            ("⛲", "Relay 1",     r1_str,   r1_color),
            ("💡", "Relay 2",     r2_str,   r2_color),
        ]
