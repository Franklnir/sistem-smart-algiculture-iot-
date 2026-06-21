"""
Rice field — layered sine-wave paddy with depth/parallax effect.
"""

from __future__ import annotations
import math
import pygame
import numpy as np

from utils.constants import (
    FIELD_GREEN_DARK, FIELD_GREEN_MID, FIELD_GREEN_LIGHT,
    FIELD_GREEN_FRONT, GROUND_COLOR, FIELD_WATER, WIND_SPEED,
)


class _FieldLayer:
    """One horizontal strip of swaying rice stalks."""

    def __init__(self, y_top: float, height: float, color: tuple,
                 density: int, stalk_h: int, sway_amp: float,
                 speed_mult: float, phase_offset: float):
        self.y_top = y_top
        self.height = height
        self.color = color
        self.density = density
        self.stalk_h = stalk_h
        self.sway_amp = sway_amp
        self.speed_mult = speed_mult
        self.phase_offset = phase_offset

    def draw(self, surface: pygame.Surface, time: float, width: int):
        # Ground strip
        rect = pygame.Rect(0, int(self.y_top), width, int(self.height))
        darker = tuple(max(0, c - 25) for c in self.color)
        pygame.draw.rect(surface, darker, rect)

        # Water shimmer
        water_surf = pygame.Surface((width, int(self.height)), pygame.SRCALPHA)
        water_alpha = int(30 + 15 * math.sin(time * 2 + self.phase_offset))
        water_surf.fill((*FIELD_WATER[:3], water_alpha))
        surface.blit(water_surf, (0, int(self.y_top)))

        # Stalks
        spacing = max(3, width // self.density)
        for i in range(0, width + spacing, spacing):
            phase = i * 0.08 + self.phase_offset
            sway = self.sway_amp * math.sin(
                time * WIND_SPEED * self.speed_mult + phase
            )
            base_x = i
            base_y = int(self.y_top + self.height * 0.8)
            top_x = int(base_x + sway)
            top_y = int(base_y - self.stalk_h)

            # Draw stalk (anti-aliased line)
            pygame.draw.aaline(surface, self.color,
                               (base_x, base_y), (top_x, top_y))

            # Small leaf at top
            leaf_sway = sway * 0.5
            lx = int(top_x + leaf_sway + 3)
            ly = int(top_y - 2)
            lighter = tuple(min(255, c + 30) for c in self.color)
            pygame.draw.aaline(surface, lighter, (top_x, top_y), (lx, ly))


class RiceField:
    """Multi-layered paddy field with sine-wave animation."""

    def __init__(self, width: int, height: int):
        self.width = width
        self.height = height
        self._time = 0.0
        self.layers: list[_FieldLayer] = []
        self._build_layers()

    def _build_layers(self):
        self.layers.clear()
        h = self.height
        w = self.width

        # Ground fills bottom 45 %
        ground_top = h * 0.55

        layer_specs = [
            # (y_frac, height_frac, color, density, stalk_h, sway, speed, phase)
            (0.55, 0.12, FIELD_GREEN_DARK,  80,  18, 4.0, 0.8, 0.0),
            (0.62, 0.12, FIELD_GREEN_MID,  100,  22, 5.0, 1.0, 1.5),
            (0.70, 0.12, FIELD_GREEN_LIGHT, 120,  26, 6.0, 1.2, 3.0),
            (0.78, 0.12, FIELD_GREEN_FRONT, 140,  30, 7.0, 1.4, 4.5),
            (0.86, 0.14, (110, 200, 80),    160,  34, 8.0, 1.0, 6.0),
        ]

        for y_frac, h_frac, color, dens, sh, sway, spd, ph in layer_specs:
            self.layers.append(_FieldLayer(
                y_top=h * y_frac,
                height=h * h_frac,
                color=color,
                density=dens,
                stalk_h=sh,
                sway_amp=sway,
                speed_mult=spd,
                phase_offset=ph,
            ))

    def resize(self, width: int, height: int):
        self.width = width
        self.height = height
        self._build_layers()

    def update(self, dt: float):
        self._time += dt

    def draw(self, surface: pygame.Surface):
        # Draw ground base
        ground_y = int(self.height * 0.55)
        pygame.draw.rect(surface, GROUND_COLOR,
                         (0, ground_y, self.width, self.height - ground_y))

        # Draw each layer
        for layer in self.layers:
            layer.draw(surface, self._time, self.width)

    def draw_back_layers(self, surface: pygame.Surface):
        """Draw only the back 2 layers (behind trees/hut)."""
        ground_y = int(self.height * 0.55)
        pygame.draw.rect(surface, GROUND_COLOR,
                         (0, ground_y, self.width, self.height - ground_y))
        for layer in self.layers[:2]:
            layer.draw(surface, self._time, self.width)

    def draw_front_layers(self, surface: pygame.Surface):
        """Draw only the front layers (in front of trees/hut)."""
        for layer in self.layers[2:]:
            layer.draw(surface, self._time, self.width)
