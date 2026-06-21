"""
Sky — gradient background, animated sun with glow, drifting clouds.
"""

from __future__ import annotations
import math
import random
import pygame
from utils.constants import (SKY_TOP, SKY_BOTTOM, SUN_COLOR, SUN_GLOW,
                              CLOUD_COLOR)
from utils.easing import lerp


class _Cloud:
    """A single drifting cloud made of overlapping ellipses."""

    def __init__(self, x, y, scale, speed):
        self.x = x
        self.y = y
        self.scale = scale
        self.speed = speed  # px/s
        # Generate random blob layout
        self.blobs = []
        count = random.randint(3, 6)
        for _ in range(count):
            ox = random.uniform(-30, 30) * scale
            oy = random.uniform(-10, 10) * scale
            rx = random.uniform(25, 50) * scale
            ry = random.uniform(15, 28) * scale
            self.blobs.append((ox, oy, rx, ry))

    def update(self, dt: float, screen_w: int):
        self.x += self.speed * dt
        # Wrap around
        rightmost = max(b[0] + b[2] for b in self.blobs)
        if self.x - rightmost > screen_w + 60:
            self.x = -rightmost - 80
        elif self.x + rightmost < -80:
            self.x = screen_w + rightmost + 80

    def draw(self, surface: pygame.Surface):
        for ox, oy, rx, ry in self.blobs:
            cx = int(self.x + ox)
            cy = int(self.y + oy)
            w = int(rx * 2)
            h = int(ry * 2)
            if w < 2 or h < 2:
                continue
            tmp = pygame.Surface((w, h), pygame.SRCALPHA)
            pygame.draw.ellipse(tmp, (*CLOUD_COLOR, 180), (0, 0, w, h))
            surface.blit(tmp, (cx - w // 2, cy - h // 2))


class Sky:
    """Renders the sky gradient, sun, and clouds."""

    def __init__(self, width: int, height: int):
        self.width = width
        self.height = height
        self._time = 0.0
        self._gradient_cache: pygame.Surface | None = None
        self._cache_size = (0, 0)

        # Sun position (relative)
        self._sun_rx = 0.82   # fraction of width
        self._sun_ry = 0.15   # fraction of height

        # Clouds
        self.clouds: list[_Cloud] = []
        self._init_clouds()

    def _init_clouds(self):
        self.clouds.clear()
        specs = [
            (0.10, 0.10, 0.8, 18),
            (0.35, 0.06, 1.0, 12),
            (0.55, 0.14, 0.6, 22),
            (0.75, 0.08, 0.9, 15),
            (1.00, 0.12, 0.7, 20),
        ]
        for rx, ry, scale, speed in specs:
            self.clouds.append(_Cloud(
                x=rx * self.width,
                y=ry * self.height,
                scale=scale,
                speed=speed,
            ))

    def resize(self, width: int, height: int):
        self.width = width
        self.height = height
        self._gradient_cache = None
        self._init_clouds()

    def _build_gradient(self):
        """Build a cached vertical gradient surface."""
        h = max(1, int(self.height * 0.6))  # sky occupies top 60 %
        surf = pygame.Surface((1, h))
        for y in range(h):
            t = y / max(1, h - 1)
            r = int(lerp(SKY_TOP[0], SKY_BOTTOM[0], t))
            g = int(lerp(SKY_TOP[1], SKY_BOTTOM[1], t))
            b = int(lerp(SKY_TOP[2], SKY_BOTTOM[2], t))
            surf.set_at((0, y), (r, g, b))
        self._gradient_cache = pygame.transform.scale(surf, (self.width, h))
        self._cache_size = (self.width, h)

    def update(self, dt: float):
        self._time += dt
        for c in self.clouds:
            c.update(dt, self.width)

    def draw(self, surface: pygame.Surface):
        # Gradient
        if self._gradient_cache is None or self._cache_size != (self.width, int(self.height * 0.6)):
            self._build_gradient()
        surface.blit(self._gradient_cache, (0, 0))

        # Sun
        sx = int(self._sun_rx * self.width)
        sy = int(self._sun_ry * self.height)
        pulse = 1.0 + 0.04 * math.sin(self._time * 1.5)

        # Glow layers
        for i in range(5, 0, -1):
            r = int((20 + i * 12) * pulse)
            alpha = max(5, 60 - i * 12)
            glow_surf = pygame.Surface((r * 2, r * 2), pygame.SRCALPHA)
            pygame.draw.circle(glow_surf, (*SUN_GLOW, alpha), (r, r), r)
            surface.blit(glow_surf, (sx - r, sy - r))

        # Sun disc
        pygame.draw.circle(surface, SUN_COLOR, (sx, sy), int(20 * pulse))

        # Clouds
        for c in self.clouds:
            c.draw(surface)
