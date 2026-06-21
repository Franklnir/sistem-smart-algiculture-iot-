"""
Alarm — flashing red overlay and "FIRE DETECTED" text.
"""

from __future__ import annotations
import math
import pygame
from models.app_state import AppState
from utils.constants import ALARM_RED, ALARM_FLASH


class Alarm:
    """Full-screen alarm overlay when fire is detected."""

    def __init__(self, width: int, height: int):
        self.width = width
        self.height = height
        self.state = AppState()
        self._time = 0.0
        self._font_big: pygame.font.Font | None = None
        self._font_small: pygame.font.Font | None = None
        self._build_fonts()

    def _build_fonts(self):
        size_big = max(18, int(self.height * 0.055))
        size_small = max(12, int(self.height * 0.025))
        self._font_big = pygame.font.SysFont("Arial", size_big, bold=True)
        self._font_small = pygame.font.SysFont("Arial", size_small)

    def resize(self, width: int, height: int):
        self.width = width
        self.height = height
        self._build_fonts()

    def update(self, dt: float):
        self._time += dt

    def draw(self, surface: pygame.Surface):
        if not self.state.fire:
            return

        # ── Red border flash ─────────────────────────────────
        blink = math.sin(self._time * 6) > 0
        if blink:
            border = pygame.Surface((self.width, self.height), pygame.SRCALPHA)
            border.fill((0, 0, 0, 0))
            thickness = max(4, int(self.height * 0.012))
            pygame.draw.rect(border, (*ALARM_RED, 120),
                             (0, 0, self.width, self.height), thickness)
            surface.blit(border, (0, 0))

        # ── Pulsing overlay ──────────────────────────────────
        pulse = abs(math.sin(self._time * 4))
        overlay = pygame.Surface((self.width, self.height), pygame.SRCALPHA)
        overlay.fill((*ALARM_FLASH[:3], int(20 * pulse)))
        surface.blit(overlay, (0, 0))

        # ── "FIRE DETECTED" text ─────────────────────────────
        if blink and self._font_big:
            # Shadow
            shadow = self._font_big.render("FIRE DETECTED !", True, (80, 0, 0))
            sr = shadow.get_rect(center=(self.width // 2 + 2,
                                         self.height // 2 + 2))
            surface.blit(shadow, sr)

            # Main text
            text = self._font_big.render("FIRE DETECTED !", True,
                                         (255, 255, 60))
            tr = text.get_rect(center=(self.width // 2, self.height // 2))
            surface.blit(text, tr)

            # Sub-text
            sub = self._font_small.render(
                "Alarm aktif — Segera periksa area kebun", True,
                (255, 200, 200))
            sr2 = sub.get_rect(center=(self.width // 2,
                                       self.height // 2 + int(self.height * 0.05)))
            surface.blit(sub, sr2)

        # ── Corner warning triangles ─────────────────────────
        if blink:
            tri_size = int(20 * (self.height / 720))
            for cx, cy in [(60, 50), (self.width - 60, 50)]:
                pts = [
                    (cx, cy - tri_size),
                    (cx - tri_size, cy + tri_size),
                    (cx + tri_size, cy + tri_size),
                ]
                pygame.draw.polygon(surface, (255, 220, 30), pts)
                pygame.draw.polygon(surface, (0, 0, 0), pts, 2)
                # Exclamation
                ex_font = pygame.font.SysFont("Arial",
                                              int(tri_size * 1.2), bold=True)
                ex = ex_font.render("!", True, (0, 0, 0))
                er = ex.get_rect(center=(cx, cy + 2))
                surface.blit(ex, er)
