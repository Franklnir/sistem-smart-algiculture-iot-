"""
Hut — semi-3D isometric hut with door, window, and interior lamp.
"""

from __future__ import annotations
import math
import pygame
from models.app_state import AppState
from utils.constants import (
    HUT_WALL_FRONT, HUT_WALL_SIDE, HUT_ROOF, HUT_ROOF_HIGHLIGHT,
    HUT_DOOR, HUT_WINDOW, HUT_WINDOW_LIT, HUT_LAMP_GLOW,
)


class Hut:
    """Isometric-style hut that responds to Relay2 (lamp) and Fire state."""

    def __init__(self, x: float, y: float, scale: float = 1.0):
        """
        *x, y* = bottom-center of the front wall.
        """
        self.x = x
        self.y = y
        self.scale = scale
        self.state = AppState()
        self._time = 0.0

    def set_position(self, x: float, y: float):
        self.x = x
        self.y = y

    def update(self, dt: float):
        self._time += dt

    def draw(self, surface: pygame.Surface):
        s = self.scale
        x, y = self.x, self.y

        # Dimensions
        fw = int(120 * s)   # front wall width
        fh = int(80 * s)    # front wall height
        sw = int(50 * s)    # side wall depth (isometric)
        sh = int(30 * s)    # side wall vertical shift
        rh = int(55 * s)    # roof peak height above wall top

        # ── Front wall ──────────────────────────────────────
        front_tl = (int(x - fw // 2), int(y - fh))
        front_tr = (int(x + fw // 2), int(y - fh))
        front_br = (int(x + fw // 2), int(y))
        front_bl = (int(x - fw // 2), int(y))
        front_poly = [front_tl, front_tr, front_br, front_bl]
        pygame.draw.polygon(surface, HUT_WALL_FRONT, front_poly)
        pygame.draw.polygon(surface, (0, 0, 0), front_poly, 2)

        # ── Side wall (right, isometric) ─────────────────────
        side_tl = front_tr
        side_tr = (front_tr[0] + sw, front_tr[1] - sh)
        side_br = (front_br[0] + sw, front_br[1] - sh)
        side_bl = front_br
        side_poly = [side_tl, side_tr, side_br, side_bl]
        pygame.draw.polygon(surface, HUT_WALL_SIDE, side_poly)
        pygame.draw.polygon(surface, (0, 0, 0), side_poly, 2)

        # ── Thatched texture lines on walls ──────────────────
        for i in range(3, fh, int(8 * s)):
            y_line = int(y - fh + i)
            x_start = int(x - fw // 2 + 2)
            x_end = int(x + fw // 2 - 2)
            darker = tuple(max(0, c - 15) for c in HUT_WALL_FRONT)
            pygame.draw.line(surface, darker,
                             (x_start, y_line), (x_end, y_line), 1)

        # ── Door ─────────────────────────────────────────────
        dw = int(22 * s)
        dh = int(40 * s)
        door_x = int(x - fw // 4 - dw // 2)
        door_y = int(y - dh)
        pygame.draw.rect(surface, HUT_DOOR,
                         (door_x, door_y, dw, dh))
        pygame.draw.rect(surface, (0, 0, 0),
                         (door_x, door_y, dw, dh), 1)
        # Door handle
        pygame.draw.circle(surface, (180, 140, 80),
                           (door_x + dw - int(5 * s),
                            door_y + dh // 2), int(2 * s))

        # ── Window ───────────────────────────────────────────
        ww = int(20 * s)
        wh = int(18 * s)
        win_x = int(x + fw // 4 - ww // 2)
        win_y = int(y - fh // 2 - wh // 2)

        relay2 = self.state.relay2
        if relay2:
            # Lit window — warm yellow
            pygame.draw.rect(surface, HUT_WINDOW_LIT,
                             (win_x, win_y, ww, wh))
            # Window glow
            glow_r = int(40 * s)
            glow_surf = pygame.Surface((glow_r * 2, glow_r * 2),
                                       pygame.SRCALPHA)
            pulse = 0.85 + 0.15 * math.sin(self._time * 3)
            alpha = int(60 * pulse)
            pygame.draw.circle(glow_surf, (255, 240, 150, alpha),
                               (glow_r, glow_r), glow_r)
            glow_cx = win_x + ww // 2 - glow_r
            glow_cy = win_y + wh // 2 - glow_r
            surface.blit(glow_surf, (glow_cx, glow_cy))

            # Light spilling from door
            door_glow = pygame.Surface((dw + 20, dh + 10), pygame.SRCALPHA)
            door_glow.fill((255, 230, 120, int(30 * pulse)))
            surface.blit(door_glow,
                         (door_x - 10, door_y - 5))
        else:
            # Dark window
            pygame.draw.rect(surface, HUT_WINDOW,
                             (win_x, win_y, ww, wh))

        # Window cross
        pygame.draw.line(surface, (0, 0, 0),
                         (win_x + ww // 2, win_y),
                         (win_x + ww // 2, win_y + wh), 1)
        pygame.draw.line(surface, (0, 0, 0),
                         (win_x, win_y + wh // 2),
                         (win_x + ww, win_y + wh // 2), 1)
        pygame.draw.rect(surface, (0, 0, 0),
                         (win_x, win_y, ww, wh), 1)

        # ── Roof (front face — triangle) ────────────────────
        roof_peak = (int(x), int(y - fh - rh))
        roof_left = (int(x - fw // 2 - 10 * s), int(y - fh + 5 * s))
        roof_right = (int(x + fw // 2 + 10 * s), int(y - fh + 5 * s))
        pygame.draw.polygon(surface, HUT_ROOF,
                            [roof_peak, roof_left, roof_right])
        pygame.draw.polygon(surface, (0, 0, 0),
                            [roof_peak, roof_left, roof_right], 2)

        # ── Roof (side face — parallelogram) ─────────────────
        side_roof_top = (roof_peak[0] + sw, roof_peak[1] - sh)
        side_roof_bot = (roof_right[0] + sw, roof_right[1] - sh)
        roof_side_poly = [roof_peak, side_roof_top,
                          side_roof_bot, roof_right]
        pygame.draw.polygon(surface, HUT_ROOF_HIGHLIGHT, roof_side_poly)
        pygame.draw.polygon(surface, (0, 0, 0), roof_side_poly, 2)

        # Thatch lines on roof
        for i in range(0, rh, int(7 * s)):
            t = i / max(1, rh)
            lx = int(roof_left[0] + (roof_peak[0] - roof_left[0]) * t)
            rx = int(roof_right[0] + (roof_peak[0] - roof_right[0]) * t)
            ly = ry = int(roof_left[1] + (roof_peak[1] - roof_left[1]) * t)
            darker = tuple(max(0, c - 20) for c in HUT_ROOF)
            pygame.draw.line(surface, darker, (lx, ly), (rx, ry), 1)

        # ── Alarm light on roof ──────────────────────────────
        if self.state.fire:
            blink = math.sin(self._time * 8) > 0
            alarm_color = (255, 30, 30) if blink else (150, 20, 20)
            alarm_pos = (int(roof_peak[0]), int(roof_peak[1] - 5 * s))
            pygame.draw.circle(surface, alarm_color, alarm_pos, int(5 * s))
            if blink:
                glow_r = int(15 * s)
                glow = pygame.Surface((glow_r * 2, glow_r * 2),
                                      pygame.SRCALPHA)
                pygame.draw.circle(glow, (255, 50, 50, 80),
                                   (glow_r, glow_r), glow_r)
                surface.blit(glow, (alarm_pos[0] - glow_r,
                                    alarm_pos[1] - glow_r))

    @property
    def roof_top(self) -> tuple:
        """Return approximate roof peak position for fire placement."""
        s = self.scale
        fh = int(80 * s)
        rh = int(55 * s)
        return (self.x, self.y - fh - rh)
