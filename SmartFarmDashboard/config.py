"""
MQTT Broker Configuration for HiveMQ Cloud.
"""

# ── MQTT Broker ──────────────────────────────────────────────
MQTT_BROKER_HOST = "edd0cbbeefe44da582ebfb85f47f7d52.s1.eu.hivemq.cloud"
MQTT_BROKER_PORT = 8883          # TLS MQTT
MQTT_WS_PORT = 8884             # WebSocket (not used in desktop)
MQTT_USE_TLS = True

# ── Credentials (fill in your HiveMQ Cloud credentials) ─────
MQTT_USERNAME = "agussunardi"               # <-- your username
MQTT_PASSWORD = "Agussunardi2005"               # <-- your password

# ── Client ID ────────────────────────────────────────────────
MQTT_CLIENT_ID = "SmartFarmDashboard-Python"

# ── Topics ───────────────────────────────────────────────────
TOPIC_TEMPERATURE = "smartfarm/temperature"
TOPIC_HUMIDITY    = "smartfarm/humidity"
TOPIC_FIRE        = "smartfarm/fire"
TOPIC_RELAY1      = "smartfarm/relay1"
TOPIC_RELAY2      = "smartfarm/relay2"

ALL_TOPICS = [
    TOPIC_TEMPERATURE,
    TOPIC_HUMIDITY,
    TOPIC_FIRE,
    TOPIC_RELAY1,
    TOPIC_RELAY2,
]

# ── Reconnect ────────────────────────────────────────────────
MQTT_RECONNECT_DELAY_MIN = 1     # seconds
MQTT_RECONNECT_DELAY_MAX = 30    # seconds
