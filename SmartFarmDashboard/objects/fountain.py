"""
Fountain — particle-based water fountain in the rice field.
"""

from __future__ import annotations
import math
import random
import pygame
from models.app_state import AppState
from utils.particles import ParticleEmitter
from utils.constants import (WATER_BLUE, WATER_WHITE, WATER_SPLASH,
                              POND_COLOR, POND_RIM, GRAVITY)


class Fountain:
    """Interactive fountain that activates when Relay1 is ON."""

    def __init__(self, x: float, y: float, scale: float = 1.0):
        self.x = x
        self.y = y
        self.scale = scale
        self.state = AppState()
        self._time = 0.0

        # Main upward jet
        self._jet = ParticleEmitter(
            x=x, y=y - 10 * scale,
            rate=50,
            speed_min=80 * scale,
            speed_max=140 * scale,
            angle_min=-100,
            angle_max=-80,
            lifetime_min=0.6,
            lifetime_max=1.0,
            size_start=3.0 * scale,
            size_end=1.5 * scale,
            color_start=(180, 220, 255, 220),
            color_end=(200, 235, 255, 60),
            gravity=GRAVITY * 0.6,
            spread_x=3 * scale,
        )

        # Splash particles (shorter, wider)
        self._splash = ParticleEmitter(
            x=x, y=y,
            rate=25,
            speed_min=20 * scale,
            speed_max=60 * scale,
            angle_min=-150,
            angle_max=-30,
            lifetime_min=0.3,
            lifetime_max=0.5,
            size_start=2.0 * scale,
            size_end=0.5 * scale,
            color_start=(220, 240, 255, 200),
            color_end=(220, 240, 255, 0),
            gravity=GRAVITY * 0.4,
            spread_x=8 * scale,
        )

    def set_position(self, x: float, y: float):
        self.x = x
        self.y = y
        self._jet.set_position(x, y - 10 * self.scale)
        self._splash.set_position(x, y)

    def update(self, dt: float):
        self._time += dt
        active = self.state.relay1
        self._jet.active = active
        self._splash.active = active
        self._jet.update(dt)
        self._splash.update(dt)

    def draw(self, surface: pygame.Surface):
        s = self.scale
        x, y = int(self.x), int(self.y)

        # ── Pond base ────────────────────────────────────────
        # Rim
        rim_w = int(40 * s)
        rim_h = int(14 * s)
        pygame.draw.ellipse(surface, POND_RIM,
                            (x - rim_w, y - rim_h // 2,
                             rim_w * 2, rim_h))
        # Water surface
        water_w = int(35 * s)
        water_h = int(10 * s)
        water_surf = pygame.Surface((water_w * 2, water_h), pygame.SRCALPHA)
        alpha = int(180 + 30 * math.sin(self._time * 3))
        pygame.draw.ellipse(water_surf, (*POND_COLOR, alpha),
                            (0, 0, water_w * 2, water_h))
        surface.blit(water_surf, (x - water_w, y - water_h // 2))

        # ── Fountain pillar ──────────────────────────────────
        pillar_w = int(6 * s)
        pillar_h = int(15 * s)
        pygame.draw.rect(surface, (140, 130, 115),
                         (x - pillar_w // 2, y - pillar_h,
                          pillar_w, pillar_h))
        # Bowl on top
        bowl_w = int(12 * s)
        bowl_h = int(5 * s)
        pygame.draw.ellipse(surface, (160, 150, 135),
                            (x - bowl_w, y - pillar_h - bowl_h // 2,
                             bowl_w * 2, bowl_h))

        # ── Particles ────────────────────────────────────────
        self._jet.draw(surface)
        self._splash.draw(surface)

        # ── Water ripples when active ────────────────────────
        if self.state.relay1:
            for i in range(3):
                ripple_t = (self._time * 1.5 + i * 0.3) % 1.0
                rr = int((15 + 20 * ripple_t) * s)
                alpha = int(80 * (1 - ripple_t))
                ripple_surf = pygame.Surface((rr * 2, rr), pygame.SRCALPHA)
                pygame.draw.ellipse(ripple_surf,
                                    (*WATER_SPLASH, alpha),
                                    (0, 0, rr * 2, rr), 1)
                surface.blit(ripple_surf,
                             (x - rr, y - rr // 2))
