"""
Generic particle system used by fountain, fire, and smoke effects.
"""

from __future__ import annotations
import math
import random
from dataclasses import dataclass, field
from typing import Tuple, List, Optional

import pygame

from utils.easing import lerp, lerp_color, clamp


# ─────────────────────────────────────────────────────────────
# Single particle
# ─────────────────────────────────────────────────────────────

@dataclass
class Particle:
    x: float
    y: float
    vx: float
    vy: float
    lifetime: float            # seconds remaining
    max_lifetime: float        # total lifetime (for ratio calc)
    size: float                # current radius
    start_size: float = 0.0
    end_size: float = 0.0
    color_start: Tuple = (255, 255, 255)
    color_end: Tuple = (255, 255, 255, 0)
    gravity: float = 0.0       # px/s²  (positive = downward)
    drag: float = 0.0          # velocity multiplier per second
    alive: bool = True

    def __post_init__(self):
        if self.start_size == 0.0:
            self.start_size = self.size
        if self.end_size == 0.0:
            self.end_size = self.size

    @property
    def life_ratio(self) -> float:
        """1.0 → just born, 0.0 → about to die."""
        if self.max_lifetime <= 0:
            return 0.0
        return clamp(self.lifetime / self.max_lifetime, 0.0, 1.0)

    def update(self, dt: float):
        self.lifetime -= dt
        if self.lifetime <= 0:
            self.alive = False
            return

        # Physics
        self.vy += self.gravity * dt
        if self.drag > 0:
            factor = max(0.0, 1.0 - self.drag * dt)
            self.vx *= factor
            self.vy *= factor

        self.x += self.vx * dt
        self.y += self.vy * dt

        # Interpolate size
        t = 1.0 - self.life_ratio
        self.size = lerp(self.start_size, self.end_size, t)

    def current_color(self) -> Tuple:
        t = 1.0 - self.life_ratio
        c = lerp_color(self.color_start[:3], self.color_end[:3], t)
        # Alpha
        a_start = self.color_start[3] if len(self.color_start) > 3 else 255
        a_end   = self.color_end[3]   if len(self.color_end) > 3   else 0
        alpha = int(lerp(a_start, a_end, t))
        return (*c, clamp(alpha, 0, 255))

    def draw(self, surface: pygame.Surface):
        if not self.alive or self.size < 0.5:
            return
        color = self.current_color()
        r = max(1, int(self.size))

        if len(color) == 4 and color[3] < 250:
            # Semi-transparent — draw on temp surface
            tmp = pygame.Surface((r * 2, r * 2), pygame.SRCALPHA)
            pygame.draw.circle(tmp, color, (r, r), r)
            surface.blit(tmp, (int(self.x) - r, int(self.y) - r))
        else:
            pygame.draw.circle(surface, color[:3],
                               (int(self.x), int(self.y)), r)


# ─────────────────────────────────────────────────────────────
# Particle Emitter
# ─────────────────────────────────────────────────────────────

class ParticleEmitter:
    """Continuously spawns particles from a point."""

    def __init__(
        self,
        x: float, y: float,
        rate: float = 30,               # particles per second
        speed_min: float = 40,
        speed_max: float = 100,
        angle_min: float = -90,          # degrees (0 = right)
        angle_max: float = -90,
        lifetime_min: float = 0.6,
        lifetime_max: float = 1.2,
        size_start: float = 4.0,
        size_end: float = 1.0,
        color_start: Tuple = (255, 255, 255, 255),
        color_end: Tuple = (255, 255, 255, 0),
        gravity: float = 0.0,
        drag: float = 0.0,
        spread_x: float = 0.0,          # random offset on spawn
        spread_y: float = 0.0,
    ):
        self.x = x
        self.y = y
        self.rate = rate
        self.speed_min = speed_min
        self.speed_max = speed_max
        self.angle_min = angle_min
        self.angle_max = angle_max
        self.lifetime_min = lifetime_min
        self.lifetime_max = lifetime_max
        self.size_start = size_start
        self.size_end = size_end
        self.color_start = color_start
        self.color_end = color_end
        self.gravity = gravity
        self.drag = drag
        self.spread_x = spread_x
        self.spread_y = spread_y

        self._particles: List[Particle] = []
        self._accumulator: float = 0.0
        self.active: bool = True

    # ── public ───────────────────────────────────────────────

    def set_position(self, x: float, y: float):
        self.x = x
        self.y = y

    def update(self, dt: float):
        # Spawn
        if self.active:
            self._accumulator += dt
            interval = 1.0 / self.rate if self.rate > 0 else 999
            while self._accumulator >= interval:
                self._accumulator -= interval
                self._spawn()

        # Update existing
        for p in self._particles:
            p.update(dt)

        # Remove dead
        self._particles = [p for p in self._particles if p.alive]

    def draw(self, surface: pygame.Surface):
        for p in self._particles:
            p.draw(surface)

    def clear(self):
        self._particles.clear()

    @property
    def count(self) -> int:
        return len(self._particles)

    # ── private ──────────────────────────────────────────────

    def _spawn(self):
        angle_deg = random.uniform(self.angle_min, self.angle_max)
        angle_rad = math.radians(angle_deg)
        speed = random.uniform(self.speed_min, self.speed_max)
        lt = random.uniform(self.lifetime_min, self.lifetime_max)

        vx = math.cos(angle_rad) * speed
        vy = math.sin(angle_rad) * speed

        px = self.x + random.uniform(-self.spread_x, self.spread_x)
        py = self.y + random.uniform(-self.spread_y, self.spread_y)

        p = Particle(
            x=px, y=py,
            vx=vx, vy=vy,
            lifetime=lt, max_lifetime=lt,
            size=self.size_start,
            start_size=self.size_start,
            end_size=self.size_end,
            color_start=self.color_start,
            color_end=self.color_end,
            gravity=self.gravity,
            drag=self.drag,
        )
        self._particles.append(p)
