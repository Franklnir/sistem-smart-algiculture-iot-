"""
MQTT Manager — background-threaded MQTT client with auto-reconnect.

Uses paho-mqtt v2 API to connect to HiveMQ Cloud over TLS.
All incoming messages are routed to AppState.
"""

from __future__ import annotations

import ssl
import time
import threading
import certifi

import paho.mqtt.client as mqtt

import config
from models.app_state import AppState


def _log(msg: str):
    print(f"[MQTT] {msg}")


class MQTTManager:
    """Manages the MQTT connection lifecycle."""

    def __init__(self):
        self.state = AppState()
        self._connected = False
        self._client: mqtt.Client | None = None
        self._stop_event = threading.Event()

    # ── public API ───────────────────────────────────────────

    def start(self):
        """Create the client and start the network loop in a daemon thread."""
        self._client = mqtt.Client(
            callback_api_version=mqtt.CallbackAPIVersion.VERSION2,
            client_id=config.MQTT_CLIENT_ID,
            protocol=mqtt.MQTTv5,
        )

        # TLS
        if config.MQTT_USE_TLS:
            self._client.tls_set(
                ca_certs=certifi.where(),
                tls_version=ssl.PROTOCOL_TLS_CLIENT,
            )

        # Credentials
        if config.MQTT_USERNAME:
            self._client.username_pw_set(
                config.MQTT_USERNAME,
                config.MQTT_PASSWORD,
            )

        # Callbacks
        self._client.on_connect    = self._on_connect
        self._client.on_disconnect = self._on_disconnect
        self._client.on_message    = self._on_message

        # Auto-reconnect settings
        self._client.reconnect_delay_set(
            min_delay=config.MQTT_RECONNECT_DELAY_MIN,
            max_delay=config.MQTT_RECONNECT_DELAY_MAX,
        )

        # Connect (non-blocking)
        try:
            _log(f"Connecting to {config.MQTT_BROKER_HOST}:{config.MQTT_BROKER_PORT} ...")
            self._client.connect_async(
                config.MQTT_BROKER_HOST,
                config.MQTT_BROKER_PORT,
                keepalive=60,
            )
            self._client.loop_start()
        except Exception as exc:
            _log(f"Connection error: {exc}")

    def stop(self):
        """Gracefully shut down."""
        self._stop_event.set()
        if self._client:
            self._client.loop_stop()
            self._client.disconnect()
            _log("Disconnected (clean)")

    @property
    def connected(self) -> bool:
        return self._connected

    # ── callbacks ────────────────────────────────────────────

    def _on_connect(self, client, userdata, flags, reason_code, properties):
        if reason_code == 0 or str(reason_code) == "Success":
            self._connected = True
            _log("Connected ✓")
            # Subscribe to all topics
            for topic in config.ALL_TOPICS:
                client.subscribe(topic, qos=1)
                _log(f"Subscribed → {topic}")
        else:
            _log(f"Connect failed: {reason_code}")

    def _on_disconnect(self, client, userdata, flags, reason_code, properties):
        self._connected = False
        if reason_code == 0:
            _log("Disconnected (normal)")
        else:
            _log(f"Disconnected unexpectedly (rc={reason_code}). Reconnecting...")

    def _on_message(self, client, userdata, msg: mqtt.MQTTMessage):
        topic = msg.topic
        try:
            payload = msg.payload.decode("utf-8").strip()
        except Exception:
            return

        try:
            if topic == config.TOPIC_TEMPERATURE:
                val = float(payload)
                self.state.temperature = val
                _log(f"Temperature = {val} °C")

            elif topic == config.TOPIC_HUMIDITY:
                val = float(payload)
                self.state.humidity = val
                _log(f"Humidity = {val} %")

            elif topic == config.TOPIC_RELAY1:
                val = payload.upper() == "ON"
                self.state.relay1 = val
                _log(f"Relay1 = {'ON' if val else 'OFF'}")

            elif topic == config.TOPIC_RELAY2:
                val = payload.upper() == "ON"
                self.state.relay2 = val
                _log(f"Relay2 = {'ON' if val else 'OFF'}")

            elif topic == config.TOPIC_FIRE:
                val = payload.upper() == "ON"
                self.state.fire = val
                _log(f"Fire = {'ON' if val else 'OFF'}")

        except ValueError as exc:
            _log(f"Bad payload on {topic}: {payload!r} ({exc})")
