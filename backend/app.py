from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import json
import datetime

app = Flask(__name__, static_folder='../frontend', static_url_path='')
CORS(app)

# Explicitly enforce Indian Standard Time (+05:30)
IST = datetime.timezone(datetime.timedelta(hours=5, minutes=30))

# Load JSON Data with support for nested 'classes' root key
try:
    with open('data.json', 'r') as file:
        raw_data = json.load(file)
        classes_data = raw_data.get("classes", raw_data)
except Exception as e:
    classes_data = {}

# Section Aliases mapped to document designations
SECTION_ALIASES = {
    "3D": "3B1", "3B1": "3B1", "D": "3B1",
    "3G": "3B2", "3B2": "3B2", "G": "3B2",
    "3N": "3B3", "3B3": "3B3", "N": "3B3",
    "3Q": "3B4", "3B4": "3B4", "Q": "3B4",
    "3V": "3B5", "3B5": "3B5", "V": "3B5",

    "5D": "5B1", "5B1": "5B1",
    "5G": "5B2", "5B2": "5B2",
    "5N": "5B3", "5B3": "5B3", "N": "5B3",
    "5O": "5B4", "5B4": "5B4", "O": "5B4",
    "5V": "5B5", "5B5": "5B5"
}

DAY_MAP = {
    "Monday": "MON",
    "Tuesday": "TUE",
    "Wednesday": "WED",
    "Thursday": "THU",
    "Friday": "FRI",
    "Saturday": "SAT",
    "Sunday": "SUN"
}

DAY_REVERSE_MAP = {v: k for k, v in DAY_MAP.items()}

def resolve_section_key(sec_name):
    clean_name = sec_name.strip().upper()
    return SECTION_ALIASES.get(clean_name, clean_name)

def time_to_minutes(time_str):
    h, m = map(int, time_str.split(':'))
    return h * 60 + m

def format_subject_display(slot):
    sub = slot.get('subject', 'Class')
    room = slot.get('room')
    if room:
        return f"{sub} [{room}]"
    return sub

def get_active_class_for_section(section_name, day_full_name, current_mins):
    section_key = resolve_section_key(section_name)
    sec_info = classes_data.get(section_key, {})
    timetable = sec_info.get("timetable", {})
    
    day_code = DAY_MAP.get(day_full_name, day_full_name[:3].upper())
    day_slots = timetable.get(day_code, [])

    if day_full_name == "Sunday" or not day_slots:
        return "Free / No Scheduled Class"

    for slot in day_slots:
        start_mins = time_to_minutes(slot['start'])
        end_mins = time_to_minutes(slot['end'])
        
        if start_mins <= current_mins < end_mins:
            return format_subject_display(slot)

    return "Free / No Scheduled Class"

@app.route('/')
def serve_ui():
    return send_from_directory('../frontend', 'index.html')

@app.route('/api/section/<section_name>/current', methods=['GET'])
def get_current_class(section_name):
    section_key = resolve_section_key(section_name)
    if section_key not in classes_data:
        return jsonify({"success": False, "error": f"Section '{section_name}' not found"}), 404
        
    now = datetime.datetime.now(IST)
    day = now.strftime("%A")
    current_mins = now.hour * 60 + now.minute

    current_class = get_active_class_for_section(section_key, day, current_mins)
    
    return jsonify({
        "success": True, 
        "day": day, 
        "section": section_key, 
        "time": now.strftime("%I:%M %p"),
        "current_class": current_class
    })

@app.route('/api/section/<section_name>/schedule', methods=['GET'])
def get_section_schedule(section_name):
    section_key = resolve_section_key(section_name)
    if section_key not in classes_data:
        return jsonify({"success": False, "error": f"Section '{section_name}' not found"}), 404
        
    requested_day = request.args.get('day')
    sec_info = classes_data.get(section_key, {})
    timetable = sec_info.get("timetable", {})

    full_formatted_timetable = {}
    for day_code, slots in timetable.items():
        full_day_name = DAY_REVERSE_MAP.get(day_code, day_code)
        day_dict = {}
        for slot in slots:
            time_range = f"{slot['start']} - {slot['end']}"
            day_dict[time_range] = format_subject_display(slot)
        full_formatted_timetable[full_day_name] = day_dict

    if requested_day:
        day_schedule = full_formatted_timetable.get(requested_day, {})
        return jsonify({
            "success": True, 
            "section": section_key, 
            "day": requested_day, 
            "schedule": day_schedule
        })
    
    return jsonify({
        "success": True, 
        "section": section_key, 
        "full_timetable": full_formatted_timetable
    })

@app.route('/api/all_sections/current', methods=['POST'])
def get_all_sections_live():
    data = request.json
    if not data or data.get("password") != "Admin123":
        return jsonify({"success": False, "error": "Incorrect password"}), 401

    now = datetime.datetime.now(IST)
    day = now.strftime("%A")
    current_mins = now.hour * 60 + now.minute

    live_dashboard = {}
    for sec_name in sorted(classes_data.keys()):
        live_dashboard[sec_name] = get_active_class_for_section(sec_name, day, current_mins)

    return jsonify({
        "success": True,
        "day": day,
        "time": now.strftime("%I:%M %p"),
        "live_data": live_dashboard
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', debug=True, port=5000)