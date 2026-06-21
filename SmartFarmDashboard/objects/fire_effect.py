"""
Fire effect — particle system for the fire animation on the hut.
"""

from __future__ import annotations
import math
import random
import pygame
from models.app_state import AppState
from utils.particles import ParticleEmitter
from utils.constants import FIRE_CORE, FIRE_MID, FIRE_OUTER, FIRE_TIP


class FireEffect:
    """Particle-based fire that appears on the hut when fire=True."""

    def __init__(self, x: float, y: float, scale: float = 1.0):
        self.x = x
        self.y = y
        self.scale = scale
        self.state = AppState()
        self._time = 0.0

        # Core flame — bright, fast
        self._core = ParticleEmitter(
            x=x, y=y,
            rate=45,
            speed_min=40 * scale,
            speed_max=90 * scale,
            angle_min=-110,
            angle_max=-70,
            lifetime_min=0.4,
            lifetime_max=0.8,
            size_start=6.0 * scale,
            size_end=1.5 * scale,
            color_start=(*FIRE_CORE, 255),
            color_end=(*FIRE_OUTER, 0),
            gravity=-30,           # fire rises
            spread_x=10 * scale,
            spread_y=3 * scale,
            drag=0.5,
        )

        # Outer glow — larger, slower, more orange/red
        self._outer = ParticleEmitter(
            x=x, y=y,
            rate=25,
            speed_min=20 * scale,
            speed_max=60 * scale,
            angle_min=-120,
            angle_max=-60,
            lifetime_min=0.6,
            lifetime_max=1.2,
            size_start=8.0 * scale,
            size_end=3.0 * scale,
            color_start=(*FIRE_MID, 200),
            color_end=(*FIRE_TIP, 0),
            gravity=-20,
            spread_x=15 * scale,
            spread_y=5 * scale,
            drag=0.3,
        )

        # Embers — small sparks flying up
        self._embers = ParticleEmitter(
            x=x, y=y,
            rate=12,
            speed_min=50 * scale,
            speed_max=120 * scale,
            angle_min=-130,
            angle_max=-50,
            lifetime_min=0.8,
            lifetime_max=1.8,
            size_start=2.5 * scale,
            size_end=0.5 * scale,
            color_start=(255, 200, 50, 255),
            color_end=(255, 80, 20, 0),
            gravity=-15,
            spread_x=20 * scale,
            drag=0.2,
        )

    def set_position(self, x: float, y: float):
        self.x = x
        self.y = y
        self._core.set_position(x, y)
        self._outer.set_position(x, y)
        self._embers.set_position(x, y)

    def update(self, dt: float):
        self._time += dt
        active = self.state.fire
        self._core.active = active
        self._outer.active = active
        self._embers.active = active

        self._core.update(dt)
        self._outer.update(dt)
        self._embers.update(dt)

    def draw(self, surface: pygame.Surface):
        if not self.state.fire and self._core.count == 0:
            return

        # Fire glow underneath
        if self.state.fire:
            pulse = 0.7 + 0.3 * math.sin(self._time * 6)
            glow_r = int(50 * self.scale * pulse)
            glow_surf = pygame.Surface((glow_r * 2, glow_r * 2),
                                       pygame.SRCALPHA)
            pygame.draw.circle(glow_surf, (255, 120, 30, int(40 * pulse)),
                               (glow_r, glow_r), glow_r)
            surface.blit(glow_surf,
                         (int(self.x) - glow_r, int(self.y) - glow_r))

        self._outer.draw(surface)
        self._core.draw(surface)
        self._embers.draw(surface)
