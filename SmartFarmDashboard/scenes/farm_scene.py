"""
Farm Scene — orchestrates all visual objects with correct z-ordering.
"""

from __future__ import annotations
import pygame
from models.app_state import AppState
from objects.sky import Sky
from objects.cloud_dashboard import CloudDashboard
from objects.rice_field import RiceField
from objects.coconut_tree import CoconutTree
from objects.hut import Hut
from objects.fountain import Fountain
from objects.fire_effect import FireEffect
from objects.smoke_effect import SmokeEffect
from objects.alarm import Alarm


class FarmScene:
    """Creates and manages all drawable objects in the scene."""

    def __init__(self, width: int, height: int):
        self.width = width
        self.height = height
        self.state = AppState()

        # ── Create objects ───────────────────────────────────
        self.sky = Sky(width, height)
        self.dashboard = CloudDashboard(width, height)
        self.rice_field = RiceField(width, height)
        self.alarm = Alarm(width, height)

        # Hut — positioned in right-center area
        hut_x = width * 0.68
        hut_y = height * 0.72
        self.hut = Hut(hut_x, hut_y, scale=self._scale())

        # Coconut trees
        self.trees: list[CoconutTree] = []
        self._create_trees()

        # Fountain — in the paddy area, left of center
        fountain_x = width * 0.35
        fountain_y = height * 0.74
        self.fountain = Fountain(fountain_x, fountain_y,
                                 scale=self._scale())

        # Fire & Smoke — anchored to hut roof
        roof_x, roof_y = self.hut.roof_top
        self.fire = FireEffect(roof_x, roof_y + 10, scale=self._scale())
        self.smoke = SmokeEffect(roof_x, roof_y - 10, scale=self._scale())

    def _scale(self) -> float:
        return min(self.width / 1280, self.height / 720)

    def _create_trees(self):
        self.trees.clear()
        s = self._scale()
        tree_specs = [
            (self.width * 0.15, self.height * 0.68, 150, 1.0 * s, -8),
            (self.width * 0.88, self.height * 0.70, 140, 0.9 * s,  6),
            (self.width * 0.50, self.height * 0.65, 120, 0.75 * s, -4),
        ]
        for bx, by, h, sc, lean in tree_specs:
            self.trees.append(CoconutTree(bx, by, height=h, scale=sc, lean=lean))

    def resize(self, width: int, height: int):
        self.width = width
        self.height = height
        s = self._scale()

        self.sky.resize(width, height)
        self.dashboard.resize(width, height)
        self.rice_field.resize(width, height)
        self.alarm.resize(width, height)

        # Reposition objects
        self.hut.set_position(width * 0.68, height * 0.72)
        self.hut.scale = s
        self.fountain.set_position(width * 0.35, height * 0.74)
        self.fountain.scale = s

        roof_x, roof_y = self.hut.roof_top
        self.fire.set_position(roof_x, roof_y + 10)
        self.fire.scale = s
        self.smoke.set_position(roof_x, roof_y - 10)
        self.smoke.scale = s

        self._create_trees()

    def update(self, dt: float):
        self.sky.update(dt)
        self.dashboard.update(dt)
        self.rice_field.update(dt)
        for tree in self.trees:
            tree.update(dt)
        self.hut.update(dt)
        self.fountain.update(dt)
        self.fire.update(dt)
        self.smoke.update(dt)
        self.alarm.update(dt)

    def draw(self, surface: pygame.Surface):
        """Draw everything in correct z-order (back → front)."""
        # 1 — Sky (background + sun + clouds)
        self.sky.draw(surface)

        # 2 — Rice field back layers
        self.rice_field.draw_back_layers(surface)

        # 3 — Back tree
        if len(self.trees) >= 3:
            self.trees[2].draw(surface)

        # 4 — Fountain (in the paddy)
        self.fountain.draw(surface)

        # 5 — Hut
        self.hut.draw(surface)

        # 6 — Fire & smoke (on hut)
        self.smoke.draw(surface)
        self.fire.draw(surface)

        # 7 — Side trees
        if len(self.trees) >= 1:
            self.trees[0].draw(surface)
        if len(self.trees) >= 2:
            self.trees[1].draw(surface)

        # 8 — Rice field front layers (overlaps base of trees/hut)
        self.rice_field.draw_front_layers(surface)

        # 9 — Cloud Dashboard (HUD — always on top)
        self.dashboard.draw(surface)

        # 10 — Alarm overlay (topmost)
        self.alarm.draw(surface)
