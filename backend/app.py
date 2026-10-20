from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import json
import datetime

app = Flask(__name__, static_folder='../frontend', static_url_path='')
CORS(app)

# Explicitly enforce Indian Standard Time (+05:30)
IST = datetime.timezone(datetime.timedelta(hours=5, minutes=30))

# Load Timetable Data
try:
    with open('data.json', 'r') as file:
        timetable_data = json.load(file)
except Exception as e:
    timetable_data = {}

# Section Aliases strictly mapped to PDF documents
SECTION_ALIASES = {
    "3D": "3B1", "3B1": "3B1", "D": "3B1",
    "3G": "3B2", "3B2": "3B2", "G": "3B2",
    "3N": "3B3", "3B3": "3B3", "N": "3B3",
    "3Q": "3B4", "3B4": "3B4", "Q": "3B4",
    "3V": "3B5", "3B5": "3B5", "V": "3B5",

    "5D": "5B1", "5B1": "5B1",
    "5G": "5B2", "5B2": "5B2",
    "5N": "5B3", "5B3": "5B3",
    "5O": "5B4", "5B4": "5B4", "O": "5B4",
    "5V": "5B5", "5B5": "5B5"
}

def resolve_section_key(sec_name):
    clean_name = sec_name.strip().upper()
    return SECTION_ALIASES.get(clean_name, clean_name)

def time_to_minutes(time_str):
    h, m = map(int, time_str.split(':'))
    return h * 60 + m

SLOT_DURATIONS = {
    "08:00": 55, "08:55": 55, "09:50": 55, "10:20": 55,
    "10:45": 30, "11:15": 55, "12:10": 55, "13:05": 55,
    "14:00": 110, "14:55": 55, "15:50": 55, "16:45": 55
}

def get_active_class_for_section(section_name, day, current_mins):
    section_key = resolve_section_key(section_name)
    day_schedule = timetable_data.get(section_key, {}).get(day, {})
    
    if day == "Sunday":
        return "Holiday / No Class Scheduled"

    for start_time_str, subject in day_schedule.items():
        start_mins = time_to_minutes(start_time_str)
        duration = SLOT_DURATIONS.get(start_time_str, 55)
        
        if "LAB" in subject.upper():
            duration = 110

        if start_mins <= current_mins < (start_mins + duration):
            return subject

    return "Free / No Scheduled Class"

@app.route('/')
def serve_ui():
    return send_from_directory('../frontend', 'index.html')

@app.route('/api/section/<section_name>/current', methods=['GET'])
def get_current_class(section_name):
    section_key = resolve_section_key(section_name)
    if section_key not in timetable_data:
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
    if section_key not in timetable_data:
        return jsonify({"success": False, "error": f"Section '{section_name}' not found"}), 404
        
    requested_day = request.args.get('day')
    section_dict = timetable_data.get(section_key, {})

    if requested_day:
        day_schedule = section_dict.get(requested_day, {})
        return jsonify({
            "success": True, 
            "section": section_key, 
            "day": requested_day, 
            "schedule": day_schedule
        })
    
    return jsonify({
        "success": True, 
        "section": section_key, 
        "full_timetable": section_dict
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
    for sec_name in sorted(timetable_data.keys()):
        live_dashboard[sec_name] = get_active_class_for_section(sec_name, day, current_mins)

    return jsonify({
        "success": True,
        "day": day,
        "time": now.strftime("%I:%M %p"),
        "live_data": live_dashboard
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', debug=True, port=5000)