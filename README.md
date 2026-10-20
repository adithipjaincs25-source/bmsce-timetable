BMSCE Live Timetable Tracker

A web app that shows which class is happening right now, and in which room, for every CSE section at BMS College of Engineering. Pick your section and see your current class instantly, or view the whole department's live status at once.
Live demo: https://bmsce-timetable.onrender.com
<img width="738" height="1600" alt="WhatsApp Image 2026-10-20 at 11 32 45 PM" src="https://github.com/user-attachments/assets/2a864a52-d4d3-4ff1-8c6a-00c33a9e928c" />
<img width="738" height="1600" alt="WhatsApp Image 2026-10-20 at 11 32 45 PM (1)" src="https://github.com/user-attachments/assets/a1c36f73-1aab-4539-a145-9b2f91f6e8e2" />

Features
Student view: choose your section and see the current class and room, plus the full timetable for each day (Mon to Sat)
Live status: the current class is worked out from the day and time, with a refresh button for updates
Teacher / Admin view: password-protected department overview showing what every section is doing right now
Section coverage: 10 sections across 3rd and 5th semester
Personalised greeting: enter your name once to customise the tracker

Tech Stack
Layer	:  Technology
Backend: Python (Flask)
Data:   	JSON (data.json)
Frontend :	HTML, CSS, JavaScript
Hosting : 	Render

How It Works
Timetable data for every section is stored in data.json, organised by section, day and time slot.
When a section is selected, the frontend asks the backend for that section's status.
The backend checks the current day and time, finds the matching slot in the data, and returns the class and room.
The admin view repeats this for all sections and shows them together in one table.

Run Locally

Prerequisites: Python 3.8 or newer
# 1. Clone the repository
git clone https://github.com/adithipjaincs25-source/bmsce-timetable.git
cd bmsce-timetable

# 2. Install dependencies
pip install flask

# 3. Start the server
cd backend
python app.py

Then open the address shown in your terminal

Future Improvements
Move timetable data from JSON to a database
Add more semesters and departments
Add a "next class" countdown
Let admins edit the timetable from the browser

Author

Adithi P Jain Computer Science Engineering, BMS College of Engineering .
