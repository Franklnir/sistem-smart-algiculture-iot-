"""
SmartFarmDashboard — main entry point.

A pygame-ce desktop application that renders an animated isometric smart farm
and subscribes to MQTT topics for real-time sensor & relay data.

Controls:
    F11        — Toggle fullscreen
    ESC        — Quit
    1          — Toggle Relay1 (debug)
    2          — Toggle Relay2 (debug)
    F          — Toggle Fire   (debug)
"""

from __future__ import annotations
import sys
import pygame
from utils.constants import DEFAULT_WIDTH, DEFAULT_HEIGHT, FPS, TITLE
from models.app_state import AppState
from mqtt.mqtt_manager import MQTTManager
from scenes.farm_scene import FarmScene


def main():
    pygame.init()

    # ── Window ───────────────────────────────────────────────
    flags = pygame.RESIZABLE
    screen = pygame.display.set_mode((DEFAULT_WIDTH, DEFAULT_HEIGHT), flags)
    pygame.display.set_caption(TITLE)
    clock = pygame.time.Clock()

    fullscreen = False
    windowed_size = (DEFAULT_WIDTH, DEFAULT_HEIGHT)

    # ── State & MQTT ─────────────────────────────────────────
    state = AppState()
    mqtt = MQTTManager()
    mqtt.start()

    # ── Scene ────────────────────────────────────────────────
    w, h = screen.get_size()
    scene = FarmScene(w, h)

    # ── Main loop ────────────────────────────────────────────
    running = True
    while running:
        dt = clock.tick(FPS) / 1000.0  # seconds

        # ── Events ───────────────────────────────────────────
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False

            elif event.type == pygame.KEYDOWN:
                if event.key == pygame.K_ESCAPE:
                    running = False

                elif event.key == pygame.K_F11:
                    fullscreen = not fullscreen
                    if fullscreen:
                        windowed_size = screen.get_size()
                        screen = pygame.display.set_mode(
                            (0, 0), pygame.FULLSCREEN)
                    else:
                        screen = pygame.display.set_mode(
                            windowed_size, pygame.RESIZABLE)
                    w, h = screen.get_size()
                    scene.resize(w, h)

                # Debug toggles
                elif event.key == pygame.K_1:
                    state.relay1 = not state.relay1
                    print(f"[DEBUG] Relay1 = {'ON' if state.relay1 else 'OFF'}")
                elif event.key == pygame.K_2:
                    state.relay2 = not state.relay2
                    print(f"[DEBUG] Relay2 = {'ON' if state.relay2 else 'OFF'}")
                elif event.key == pygame.K_f:
                    state.fire = not state.fire
                    print(f"[DEBUG] Fire = {'ON' if state.fire else 'OFF'}")
                elif event.key == pygame.K_t:
                    state.temperature = state.temperature + 5
                    print(f"[DEBUG] Temperature = {state.temperature}")
                elif event.key == pygame.K_h:
                    state.humidity = min(100, state.humidity + 10)
                    print(f"[DEBUG] Humidity = {state.humidity}")

            elif event.type == pygame.VIDEORESIZE:
                if not fullscreen:
                    w, h = event.w, event.h
                    screen = pygame.display.set_mode((w, h), pygame.RESIZABLE)
                    scene.resize(w, h)

        # ── Update ───────────────────────────────────────────
        scene.update(dt)

        # ── Draw ─────────────────────────────────────────────
        screen.fill((0, 0, 0))
        scene.draw(screen)

        pygame.display.flip()

    # ── Shutdown ─────────────────────────────────────────────
    mqtt.stop()
    pygame.quit()
    sys.exit(0)


if __name__ == "__main__":
    main()
