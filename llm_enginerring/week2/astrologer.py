import os
import json
import sqlite3
import gradio as gr
from openai import OpenAI
from dotenv import load_dotenv
from kerykeion import AstrologicalSubject
from geopy.geocoders import Nominatim
from geopy.exc import GeocoderTimedOut

load_dotenv(override=True)

DB = "astrologer.db"

def init_db():
    with sqlite3.connect(DB) as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                name TEXT PRIMARY KEY,
                birth_day INTEGER, birth_month INTEGER, birth_year INTEGER,
                birth_hour INTEGER, birth_minute INTEGER,
                birth_place TEXT, lat REAL, lon REAL,
                chart_json TEXT
            )
        """)
        conn.commit()

def save_user(name, day, month, year, hour=None, minute=None, place=None, lat=None, lon=None, chart_json=None):
    with sqlite3.connect(DB) as conn:
        conn.execute("""
            INSERT INTO users (name, birth_day, birth_month, birth_year, birth_hour, birth_minute, birth_place, lat, lon, chart_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(name) DO UPDATE SET
                birth_day=excluded.birth_day, birth_month=excluded.birth_month, birth_year=excluded.birth_year,
                birth_hour=COALESCE(excluded.birth_hour, birth_hour),
                birth_minute=COALESCE(excluded.birth_minute, birth_minute),
                birth_place=COALESCE(excluded.birth_place, birth_place),
                lat=COALESCE(excluded.lat, lat), lon=COALESCE(excluded.lon, lon),
                chart_json=COALESCE(excluded.chart_json, chart_json)
        """, (name, day, month, year, hour, minute, place, lat, lon, chart_json))
        conn.commit()

def load_user(name):
    with sqlite3.connect(DB) as conn:
        row = conn.execute("SELECT * FROM users WHERE name=?", (name,)).fetchone()
    if row:
        keys = ["name","birth_day","birth_month","birth_year","birth_hour","birth_minute","birth_place","lat","lon","chart_json"]
        return dict(zip(keys, row))
    return None

init_db()

# --- Gemini setup ---
MODEL = "gemma-4-31b-it"
client = OpenAI(
    api_key=os.getenv("GEMINI_API_KEY"),
    base_url="https://generativelanguage.googleapis.com/v1beta/openai/"
)

# --- System prompt ---
system_message = """
You are Celeste, a wise and mystical astrologer with decades of experience reading the stars.

RULES YOU MUST FOLLOW:
1. Before answering ANY astrology question, you MUST collect the user's name and date of birth (day, month, year).
   Ask for these upfront if not yet provided. Do not give any reading without them.
2. Always gently nudge the user: "Providing your birth time and place will reveal your rising sign and a much deeper reading."
3. If the user asks about compatibility, you MUST also collect the other person's birth date before answering.
4. Only answer astrology-related questions. For anything else say: "The stars guide me only in matters of astrology. Perhaps I can help you explore your chart instead?"
5. If birth time is not provided, use noon (12:00) as default but mention: "Without your birth time, your rising sign remains a mystery to me."
6. Always call the appropriate tool before giving a reading — never guess planetary positions or chart data.
7. Speak in a warm, mystical tone. Use phrases like "The stars reveal...", "Your chart speaks of...", "The cosmos whispers..."

TOOL USAGE:
- Use lookup_returning_user as soon as the user gives their name — they may have visited before
- If found in DB with a saved chart, greet them warmly and use saved data — no need to ask again
- Use resolve_location when user provides a birth place
- Use calculate_chart when you have name + date (and optionally time + coordinates)
- Use get_compatibility when user asks about compatibility with another sign or person
"""

# --- Tool functions ---

def resolve_location(place: str) -> str:
    print(f"Tool: resolve_location({place})")
    geolocator = Nominatim(user_agent="astrologer_bot")
    try:
        location = geolocator.geocode(place, timeout=10)
        if location:
            return json.dumps({"lat": location.latitude, "lon": location.longitude, "resolved_name": location.address})
        # fallback: try just the city (last part of place string)
        city = place.split(",")[-1].strip()
        location = geolocator.geocode(city, timeout=10)
        if location:
            return json.dumps({"lat": location.latitude, "lon": location.longitude, "resolved_name": f"{location.address} (approximate — used city fallback)"})
        return "Location not found. Please ask the user to provide just their city name."
    except GeocoderTimedOut:
        return "Location lookup timed out. Please ask the user to try again."


def lookup_returning_user(name: str) -> str:
    print(f"Tool: lookup_returning_user({name})")
    user = load_user(name)
    if user:
        return json.dumps({"found": True, "user": user})
    return json.dumps({"found": False})


def calculate_chart(name: str, day: int, month: int, year: int,
                    hour: int = 12, minute: int = 0,
                    lat: float = None, lon: float = None) -> str:
    print(f"Tool: calculate_chart({name}, {day}/{month}/{year}, {hour}:{minute}, lat={lat}, lon={lon})")
    approximate = (hour == 12 and minute == 0)
    try:
        if lat and lon:
            subject = AstrologicalSubject(
                name=name, year=year, month=month, day=day,
                hour=hour, minute=minute,
                lat=lat, lng=lon, tz_str="UTC"
            )
        else:
            subject = AstrologicalSubject(
                name=name, year=year, month=month, day=day,
                hour=hour, minute=minute,
                city="London", tz_str="UTC"
            )

        result = {
            "name": name,
            "sun_sign": subject.sun.sign,
            "moon_sign": subject.moon.sign,
            "rising_sign": subject.first_house.sign if not approximate else "Unknown (no birth time provided)",
            "mercury": subject.mercury.sign,
            "venus": subject.venus.sign,
            "mars": subject.mars.sign,
            "approximate_time": approximate,
        }
        chart_json = json.dumps(result)

        # Save to DB — updates if already exists
        save_user(name, day, month, year,
                  hour=None if approximate else hour,
                  minute=None if approximate else minute,
                  lat=lat, lon=lon,
                  chart_json=chart_json)

        return chart_json
    except Exception as e:
        return f"Chart calculation error: {str(e)}"


COMPATIBILITY = {
    ("fire", "fire"): (85, "Passionate and dynamic — two flames that burn bright together."),
    ("fire", "air"): (90, "Air feeds fire — an exciting, intellectually stimulating match."),
    ("fire", "earth"): (55, "Earth steadies fire, but tension arises between impulse and caution."),
    ("fire", "water"): (50, "Water can extinguish fire — emotional clashes are likely."),
    ("earth", "earth"): (80, "Stable, loyal, and deeply grounded — a relationship built to last."),
    ("earth", "water"): (88, "Water nourishes earth — a deeply nurturing and supportive bond."),
    ("earth", "air"): (55, "Practicality meets ideas — can work, but requires patience."),
    ("air", "air"): (78, "Minds in harmony — witty, communicative, and intellectually alive."),
    ("air", "water"): (60, "Thought meets feeling — beautiful but often misunderstood."),
    ("water", "water"): (82, "Deeply intuitive and emotionally connected — a soulful union."),
}

ELEMENTS = {
    "Aries": "fire", "Leo": "fire", "Sagittarius": "fire",
    "Taurus": "earth", "Virgo": "earth", "Capricorn": "earth",
    "Gemini": "air", "Libra": "air", "Aquarius": "air",
    "Cancer": "water", "Scorpio": "water", "Pisces": "water",
}

def get_compatibility(sign1: str, sign2: str) -> str:
    print(f"Tool: get_compatibility({sign1}, {sign2})")
    e1 = ELEMENTS.get(sign1.capitalize())
    e2 = ELEMENTS.get(sign2.capitalize())
    if not e1 or not e2:
        return f"Unknown sign(s): {sign1}, {sign2}. Please use standard zodiac sign names."
    key = tuple(sorted([e1, e2]))
    score, reading = COMPATIBILITY.get(key, (65, "An interesting combination — the stars see potential with effort."))
    return json.dumps({"sign1": sign1, "sign2": sign2, "score": score, "reading": reading})


# --- Tool definitions for LLM ---
tools = [
    {
        "type": "function",
        "function": {
            "name": "lookup_returning_user",
            "description": "Check if a user has visited before and retrieve their saved birth details and chart. Call this as soon as the user gives their name.",
            "parameters": {
                "type": "object",
                "properties": {
                    "name": {"type": "string", "description": "The user's name"}
                },
                "required": ["name"],
                "additionalProperties": False,
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "resolve_location",
            "description": "Convert a place name (city, hospital, landmark) to latitude and longitude for chart calculation.",
            "parameters": {
                "type": "object",
                "properties": {
                    "place": {"type": "string", "description": "Place name e.g. 'Apollo Hospital Delhi' or 'Mumbai'"}
                },
                "required": ["place"],
                "additionalProperties": False,
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "calculate_chart",
            "description": "Calculate the astrological birth chart for a person. Call resolve_location first if place is provided.",
            "parameters": {
                "type": "object",
                "properties": {
                    "name":   {"type": "string",  "description": "Person's name"},
                    "day":    {"type": "integer", "description": "Birth day (1-31)"},
                    "month":  {"type": "integer", "description": "Birth month (1-12)"},
                    "year":   {"type": "integer", "description": "Birth year"},
                    "hour":   {"type": "integer", "description": "Birth hour in 24hr format (default 12 if unknown)"},
                    "minute": {"type": "integer", "description": "Birth minute (default 0 if unknown)"},
                    "lat":    {"type": "number",  "description": "Latitude from resolve_location (optional)"},
                    "lon":    {"type": "number",  "description": "Longitude from resolve_location (optional)"},
                },
                "required": ["name", "day", "month", "year"],
                "additionalProperties": False,
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_compatibility",
            "description": "Get astrological compatibility between two zodiac signs.",
            "parameters": {
                "type": "object",
                "properties": {
                    "sign1": {"type": "string", "description": "First zodiac sign e.g. 'Aries'"},
                    "sign2": {"type": "string", "description": "Second zodiac sign e.g. 'Scorpio'"},
                },
                "required": ["sign1", "sign2"],
                "additionalProperties": False,
            },
        },
    },
]

# --- Tool dispatch ---
tool_functions = {
    "lookup_returning_user": lookup_returning_user,
    "resolve_location": resolve_location,
    "calculate_chart": calculate_chart,
    "get_compatibility": get_compatibility,
}

def handle_tool_calls(message):
    responses = []
    if not message.tool_calls:
        return responses
    for tool_call in message.tool_calls:
        func = tool_functions.get(tool_call.function.name)
        if func:
            try:
                arguments = json.loads(tool_call.function.arguments)
                result = func(**arguments)
            except Exception as e:
                result = f"Tool error: {str(e)}"
        else:
            result = f"Unknown tool: {tool_call.function.name}"
        responses.append({
            "role": "tool",
            "content": result,
            "tool_call_id": tool_call.id,
        })
    return responses

# --- Chat function ---
def chat(message, history):
    print(f"\n=== New chat turn ===\nUser message: {message}")

    # Keep only last 3 turns (6 messages) for small model context
    recent_history = history[-6:] if len(history) > 6 else history
    recent_history = [{"role": h["role"], "content": h["content"]} for h in recent_history]

    messages = [{"role": "system", "content": system_message}] + recent_history + [{"role": "user", "content": message}]

    response = client.chat.completions.create(model=MODEL, messages=messages, tools=tools)
    print(f"Finish reason: {response.choices[0].finish_reason}")

    while response.choices[0].finish_reason == "tool_calls":
        assistant_msg = response.choices[0].message
        print(f"Assistant requested tool calls: {[(tc.function.name, tc.function.arguments) for tc in assistant_msg.tool_calls]}")

        tool_responses = handle_tool_calls(assistant_msg)
        for tr in tool_responses:
            print(f"Tool result: {tr['content']}")

        messages.append(assistant_msg)
        messages.extend(tool_responses)
        response = client.chat.completions.create(model=MODEL, messages=messages, tools=tools)
        print(f"Finish reason: {response.choices[0].finish_reason}")

    final_content = response.choices[0].message.content or "The stars are quiet for now. Please try again."
    print(f"Final response: {final_content}\n=== End chat turn ===")
    return final_content

# --- Launch ---
gr.ChatInterface(
    fn=chat,
    type="messages",
    title="✨ Celeste — Your Personal Astrologer",
    description="Share your birth details and let the stars guide you.",
).launch()
