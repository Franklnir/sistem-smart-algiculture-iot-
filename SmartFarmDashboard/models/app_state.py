"""
Shared application state — thread-safe singleton.

MQTT callbacks write to this; all visual objects read from it.
"""

from __future__ import annotations
import threading


class AppState:
    """Thread-safe global state container."""

    _instance: AppState | None = None
    _lock = threading.Lock()

    def __new__(cls) -> AppState:
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._init_defaults()
        return cls._instance

    def _init_defaults(self):
        self._data_lock = threading.Lock()
        self._temperature: float = 0.0
        self._humidity: float = 0.0
        self._relay1: bool = False
        self._relay2: bool = False
        self._fire: bool = False

    # ── Temperature ──────────────────────────────────────────
    @property
    def temperature(self) -> float:
        with self._data_lock:
            return self._temperature

    @temperature.setter
    def temperature(self, value: float):
        with self._data_lock:
            self._temperature = value

    # ── Humidity ─────────────────────────────────────────────
    @property
    def humidity(self) -> float:
        with self._data_lock:
            return self._humidity

    @humidity.setter
    def humidity(self, value: float):
        with self._data_lock:
            self._humidity = value

    # ── Relay 1 (Fountain) ───────────────────────────────────
    @property
    def relay1(self) -> bool:
        with self._data_lock:
            return self._relay1

    @relay1.setter
    def relay1(self, value: bool):
        with self._data_lock:
            self._relay1 = value

    # ── Relay 2 (Hut Lamp) ──────────────────────────────────
    @property
    def relay2(self) -> bool:
        with self._data_lock:
            return self._relay2

    @relay2.setter
    def relay2(self, value: bool):
        with self._data_lock:
            self._relay2 = value

    # ── Fire ─────────────────────────────────────────────────
    @property
    def fire(self) -> bool:
        with self._data_lock:
            return self._fire

    @fire.setter
    def fire(self, value: bool):
        with self._data_lock:
            self._fire = value

    # ── Utility ──────────────────────────────────────────────
    def snapshot(self) -> dict:
        """Return a plain dict copy of the current state (lock-free read)."""
        with self._data_lock:
            return {
                "temperature": self._temperature,
                "humidity": self._humidity,
                "relay1": self._relay1,
                "relay2": self._relay2,
                "fire": self._fire,
            }
