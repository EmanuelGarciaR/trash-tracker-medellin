import machine
import time
import network
import ujson
import urequests

WIFI_SSID = "TU_RED_WIFI"
WIFI_PASSWORD = "TU_CONTRASEÑA"

API_BASE_URL = "http://192.168.1.100:3000"
CONTAINER_ID = "TU_CONTAINER_ID"
INTERVAL_S = 30
CONTAINER_DEPTH_CM = 50

TRIG_PIN = 5
ECHO_PIN = 18
LED_PIN = 2

trig = machine.Pin(TRIG_PIN, machine.Pin.OUT)
echo = machine.Pin(ECHO_PIN, machine.Pin.IN)
led = machine.Pin(LED_PIN, machine.Pin.OUT)

trig.value(0)


def blink_led(times=1, on_ms=100, off_ms=100):
    for _ in range(times):
        led.value(1)
        time.sleep_ms(on_ms)
        led.value(0)
        time.sleep_ms(off_ms)


def connect_wifi():
    wlan = network.WLAN(network.STA_IF)
    wlan.active(True)

    if wlan.isconnected():
        print("[WiFi] Ya conectado:", wlan.ifconfig())
        blink_led(times=3, on_ms=50, off_ms=50)
        return wlan

    print("[WiFi] Conectando a '{}'...".format(WIFI_SSID))
    wlan.connect(WIFI_SSID, WIFI_PASSWORD)

    attempts = 0
    while not wlan.isconnected():
        attempts += 1
        led.value(not led.value())
        time.sleep_ms(500)

        if attempts % 20 == 0:
            print("[WiFi] Aún intentando... ({}s)".format(attempts // 2))

        if attempts > 120:
            print("[WiFi] Timeout. Reintentando conexión...")
            wlan.disconnect()
            time.sleep(2)
            wlan.connect(WIFI_SSID, WIFI_PASSWORD)
            attempts = 0

    led.value(0)
    ip_config = wlan.ifconfig()
    print("[WiFi] Conectado exitosamente!")
    print("  IP:      {}".format(ip_config[0]))
    print("  Máscara: {}".format(ip_config[1]))
    print("  Gateway: {}".format(ip_config[2]))
    print("  DNS:     {}".format(ip_config[3]))

    blink_led(times=3, on_ms=50, off_ms=50)
    return wlan


def read_distance_cm():
    readings = []

    for _ in range(5):
        trig.value(0)
        time.sleep_us(2)
        trig.value(1)
        time.sleep_us(10)
        trig.value(0)

        timeout_start = time.ticks_us()
        while echo.value() == 0:
            if time.ticks_diff(time.ticks_us(), timeout_start) > 30000:
                break

        pulse_start = time.ticks_us()
        while echo.value() == 1:
            if time.ticks_diff(time.ticks_us(), pulse_start) > 30000:
                break
        pulse_end = time.ticks_us()

        pulse_duration = time.ticks_diff(pulse_end, pulse_start)
        distance = (pulse_duration * 0.0343) / 2

        if 2 <= distance <= 400:
            readings.append(distance)

        time.sleep_ms(60)

    if not readings:
        print("[Sensor] Error: No se obtuvieron lecturas válidas")
        return -1

    readings.sort()
    mid = len(readings) // 2
    median = readings[mid] if len(readings) % 2 != 0 else (readings[mid - 1] + readings[mid]) / 2

    return round(median, 1)


def send_sensor_data(distance_cm):
    url = "{}/api/containers/{}/sensor".format(API_BASE_URL, CONTAINER_ID)
    headers = {"Content-Type": "application/json"}
    payload = ujson.dumps({"distance_cm": distance_cm})

    fill_pct = max(0, min(100, round(((CONTAINER_DEPTH_CM - distance_cm) / CONTAINER_DEPTH_CM) * 100)))

    print("[API] Enviando → distancia: {}cm | llenado: ~{}%".format(distance_cm, fill_pct))

    try:
        response = urequests.post(url, data=payload, headers=headers)
        status = response.status_code

        if status == 200:
            data = response.json()
            print("[API] ✓ Respuesta OK — fill_level: {}%, status: '{}'".format(
                data.get("fill_level", "?"),
                data.get("status", "?")
            ))
            response.close()
            blink_led(times=2, on_ms=50, off_ms=50)
            return True
        else:
            print("[API] ✗ Error HTTP {} — {}".format(status, response.text))
            response.close()
            blink_led(times=5, on_ms=200, off_ms=200)
            return False

    except Exception as e:
        print("[API] ✗ Error de conexión: {}".format(e))
        blink_led(times=5, on_ms=200, off_ms=200)
        return False


def check_wifi(wlan):
    if not wlan.isconnected():
        print("[WiFi] Conexión perdida. Reconectando...")
        wlan = connect_wifi()
    return wlan


def main():
    print("=" * 50)
    print(" TrashTracker Medellín — ESP32 Sensor")
    print(" Contenedor: {}".format(CONTAINER_ID))
    print(" Profundidad: {} cm".format(CONTAINER_DEPTH_CM))
    print(" Intervalo: {} s".format(INTERVAL_S))
    print("=" * 50)

    wlan = connect_wifi()

    consecutive_errors = 0
    MAX_CONSECUTIVE_ERRORS = 10

    while True:
        try:
            wlan = check_wifi(wlan)

            distance = read_distance_cm()

            if distance < 0:
                print("[Loop] Lectura de sensor inválida, reintentando en {}s...".format(INTERVAL_S))
                consecutive_errors += 1
            else:
                distance_clamped = min(distance, CONTAINER_DEPTH_CM)
                success = send_sensor_data(distance_clamped)

                if success:
                    consecutive_errors = 0
                else:
                    consecutive_errors += 1

            if consecutive_errors >= MAX_CONSECUTIVE_ERRORS:
                print("[Loop] {} errores consecutivos. Reiniciando ESP32...".format(consecutive_errors))
                time.sleep(2)
                machine.reset()

            print("[Loop] Próxima lectura en {}s\n".format(INTERVAL_S))
            time.sleep(INTERVAL_S)

        except KeyboardInterrupt:
            print("\n[Loop] Detenido por el usuario.")
            led.value(0)
            break

        except Exception as e:
            print("[Loop] Error inesperado: {}".format(e))
            consecutive_errors += 1
            time.sleep(5)


if __name__ == "__main__":
    main()
