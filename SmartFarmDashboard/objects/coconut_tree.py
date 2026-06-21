"""
Coconut tree — procedurally drawn palm with swaying fronds.
"""

from __future__ import annotations
import math
import random
import pygame
from utils.constants import (TRUNK_COLOR, TRUNK_DARK, LEAF_GREEN,
                              LEAF_GREEN_LIGHT, COCONUT_COLOR, WIND_SPEED)


class _Frond:
    """A single palm frond (leaf)."""

    def __init__(self, angle: float, length: float, droop: float,
                 phase: float, sway_amp: float):
        self.base_angle = angle   # degrees from vertical
        self.length = length
        self.droop = droop        # how much the tip droops
        self.phase = phase
        self.sway_amp = sway_amp

    def draw(self, surface: pygame.Surface, bx: float, by: float,
             time: float, scale: float):
        sway = self.sway_amp * math.sin(time * WIND_SPEED * 0.7 + self.phase)
        angle = math.radians(self.base_angle + sway)

        length = self.length * scale
        segments = 8
        points = [(int(bx), int(by))]

        cx, cy = bx, by
        for i in range(1, segments + 1):
            t = i / segments
            seg_angle = angle + self.droop * t * t  # increasing droop
            seg_len = length / segments
            cx += math.sin(seg_angle) * seg_len
            cy -= math.cos(seg_angle) * seg_len * (1.0 - 0.3 * t)
            points.append((int(cx), int(cy)))

        # Draw leaflets along the frond
        if len(points) >= 3:
            for i in range(1, len(points)):
                # Main stem
                pygame.draw.aaline(surface, LEAF_GREEN,
                                   points[i - 1], points[i])

                # Leaflets (small lines branching off)
                if i >= 2:
                    dx = points[i][0] - points[i - 1][0]
                    dy = points[i][1] - points[i - 1][1]
                    perp_x = -dy * 0.4
                    perp_y = dx * 0.4
                    t_val = i / len(points)
                    leaf_len = (1.0 - t_val * 0.5)

                    # Left leaflet
                    lx = int(points[i][0] + perp_x * leaf_len)
                    ly = int(points[i][1] + perp_y * leaf_len)
                    pygame.draw.aaline(surface, LEAF_GREEN_LIGHT,
                                       points[i], (lx, ly))
                    # Right leaflet
                    rx = int(points[i][0] - perp_x * leaf_len)
                    ry = int(points[i][1] - perp_y * leaf_len)
                    pygame.draw.aaline(surface, LEAF_GREEN_LIGHT,
                                       points[i], (rx, ry))


class CoconutTree:
    """A single coconut palm tree with animated fronds."""

    def __init__(self, base_x: float, base_y: float, height: float = 160,
                 scale: float = 1.0, lean: float = 0.0):
        self.base_x = base_x
        self.base_y = base_y
        self.height = height
        self.scale = scale
        self.lean = lean          # lean angle in degrees
        self._time = 0.0

        # Generate fronds
        self.fronds: list[_Frond] = []
        frond_angles = [-70, -45, -20, 0, 20, 45, 70]
        for a in frond_angles:
            self.fronds.append(_Frond(
                angle=a,
                length=random.uniform(55, 80),
                droop=random.uniform(0.6, 1.2),
                phase=random.uniform(0, math.pi * 2),
                sway_amp=random.uniform(3, 7),
            ))

        # Coconuts
        self.coconuts = []
        for _ in range(random.randint(2, 4)):
            cx_off = random.uniform(-8, 8)
            cy_off = random.uniform(0, 12)
            self.coconuts.append((cx_off, cy_off))

    def set_position(self, x: float, y: float):
        self.base_x = x
        self.base_y = y

    def update(self, dt: float):
        self._time += dt

    def draw(self, surface: pygame.Surface):
        s = self.scale
        trunk_sway = 3 * math.sin(self._time * WIND_SPEED * 0.3) * s

        # Trunk — draw as curved thick line using segments
        segments = 12
        trunk_points = []
        for i in range(segments + 1):
            t = i / segments
            # Curve: slight lean + sway at top
            bend = trunk_sway * t * t
            lean_off = math.sin(math.radians(self.lean)) * self.height * t * s
            x = self.base_x + lean_off + bend
            y = self.base_y - self.height * t * s
            trunk_points.append((x, y))

        # Draw trunk with decreasing thickness
        for i in range(1, len(trunk_points)):
            t = i / len(trunk_points)
            thickness = max(1, int((6 - 3 * t) * s))
            color = TRUNK_COLOR if i % 2 == 0 else TRUNK_DARK
            pygame.draw.line(surface, color,
                             (int(trunk_points[i - 1][0]),
                              int(trunk_points[i - 1][1])),
                             (int(trunk_points[i][0]),
                              int(trunk_points[i][1])),
                             thickness)

        # Crown position (top of trunk)
        crown_x, crown_y = trunk_points[-1]

        # Coconuts
        for cx_off, cy_off in self.coconuts:
            cx = int(crown_x + cx_off * s)
            cy = int(crown_y + cy_off * s)
            pygame.draw.circle(surface, COCONUT_COLOR, (cx, cy),
                               int(4 * s))
            # Highlight
            pygame.draw.circle(surface, (110, 80, 45), (cx - 1, cy - 1),
                               int(2 * s))

        # Fronds
        for frond in self.fronds:
            frond.draw(surface, crown_x, crown_y, self._time, s)
