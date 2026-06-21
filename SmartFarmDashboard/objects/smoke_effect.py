"""
Smoke effect — rising smoke particles that accompany the fire.
"""

from __future__ import annotations
import pygame
from models.app_state import AppState
from utils.particles import ParticleEmitter
from utils.constants import SMOKE_COLOR, SMOKE_LIGHT


class SmokeEffect:
    """Smoke rising from the hut during a fire event."""

    def __init__(self, x: float, y: float, scale: float = 1.0):
        self.x = x
        self.y = y
        self.scale = scale
        self.state = AppState()

        self._emitter = ParticleEmitter(
            x=x, y=y,
            rate=15,
            speed_min=15 * scale,
            speed_max=40 * scale,
            angle_min=-110,
            angle_max=-70,
            lifetime_min=1.5,
            lifetime_max=3.0,
            size_start=5.0 * scale,
            size_end=18.0 * scale,       # smoke expands
            color_start=(*SMOKE_COLOR, 160),
            color_end=(*SMOKE_LIGHT, 0),
            gravity=-10,                 # rises slowly
            drag=0.15,
            spread_x=12 * scale,
        )

    def set_position(self, x: float, y: float):
        self.x = x
        self.y = y
        self._emitter.set_position(x, y)

    def update(self, dt: float):
        self._emitter.active = self.state.fire
        self._emitter.update(dt)

    def draw(self, surface: pygame.Surface):
        if not self.state.fire and self._emitter.count == 0:
            return
        self._emitter.draw(surface)
