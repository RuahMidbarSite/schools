from pymongo import MongoClient

client = MongoClient(
    'mongodb+srv://avivx11:bMXnPTid6aXZx7I2@cluster0.bsjgubq.mongodb.net/?retryWrites=true&w=majority'
    '&appName=Cluster0')


db = client['ruach_midbar_schools']

program_schedule_collection = db['Program_Schedule']
roles_collection = db['Role']
school_status_collection = db['SchoolStatus']
religion_sector_collection = db['ReligionSector']
education_stage_collection = db['EducationStage']
areas_collection = db['Areas']
pricing_collection = db['ProgramPricing']
payment_collection = db['Payments']
school_types_collection = db['SchoolTypes']
years_collection = db['Years']

program_schedules = [
    {"program_id": 1, "sunday": True, "monday": False, "tuesday": True, "wednesday": True, "thursday": True,
     "friday": False, "saturday": False},
    {"program_id": 2, "sunday": False, "monday": True, "tuesday": False, "wednesday": False, "thursday": True,
     "friday": True, "saturday": False},
    {"program_id": 3, "sunday": True, "monday": True, "tuesday": True, "wednesday": False, "thursday": False,
     "friday": False, "saturday": True}
]

roles = [
    "מנהל/ת", "רכז/ת"
]

statuses = [
    "אוגוסט מתעניינים", "בית אבות", "גפן תשפה", "דואל", "הצעה", "הצעה לא", "יולי", "יולי מתעניינים", "יולי מתשפד",
    "יולי1", "יוני מתעניינים", "יוני מתעניינים משתפד", "יוני-יולי מתעניינים", "יוני-יולי משתפד", "יוני-יולי",
    "יוני1-יולי1", "יוני1-יולי", "לא", "לא לפנות", "לאתר", "להשיג", "לטלפן"
]

school_statuses = [
    "בהמתנה", "בוצע"
]

religion_sector = [
    "יהודי", "ערבי", "נוצרי", "אחר", "דרוזי", "בדואי"
]

education_stage = [
    "יסודי", "חטב", "חטב חטע", "יסודי חטב", "יסודי חטב חטע", "יסודי חטע", "כללי", "מועצה", "מתיא", "רשות מקומית",
    "תיכון"
]

areas = [
    "אצבע הגליל", "גליל מזרחי", "גליל מערבי", "גליל תחתון", "חיפה", "דרום", "מרכז", "שרון", "שפלה", "גוש עציון",
    "ירושלים", "עין גדי", "עמק חפר", "משולש", "קו ירוק", "תל אביב", "לא ידוע", "גולן"
]

school_types = [
    "אוטיסטי", "אנתרופוסופי", "אשפוז", "יסודי", "מונטסורי", "מיוחד"
]

years = [
    "תשפה", "תשפד", "תשפג", "תשפב", "תשפא", "תשפ", "תשעט", "תשעט", "תשעח", "תשעז", "תשעו", "תשעה", "תשעד",
    "תשעג", "תשעב", "תשעא", "תשע"

]

professions = ["Art", "Theater", "Chess", "Fighting", "Styling", "AdoptedLearning",
               "Sustainability", "NewMedia", "HighTech", "Yoga", "Writing",
               "Finance", "Sport", "Magic", "Dog", "Medicine", "Science",
               "Leadership", "Dance", "Communication", "Learning", "Psychometric",
               "Thinking", "Juggling", "SexEducation", "Therapy", "Music",
               "Instruction", "Cinema", "Carpentry", "Cooking", "Entrepreneurship",
               "English", "Math", "Coaching", "Telemarketing", "HolisticConcelling",
               "Judaism", "Flight", "Space"]


roles.sort()
statuses.sort()
school_statuses.sort()
religion_sector.sort()
education_stage.sort()
areas.sort()
school_types.sort()

for idx, role in enumerate(roles, start=1):
    roles_collection.insert_one({"RoleId": idx, "RoleName": role})


for idx, status in enumerate(school_statuses, start=1):
    school_status_collection.insert_one({"StatusId": idx, "StatusName": status})

for idx, sector in enumerate(religion_sector, start=1):
    religion_sector_collection.insert_one({"Religionid": idx, "ReligionName": sector})

for idx, stage in enumerate(education_stage, start=1):
    education_stage_collection.insert_one({"StageId": idx, "StageName": stage})

for idx, area in enumerate(areas, start=1):
    areas_collection.insert_one({"Areaid": idx, "AreaName": area})

for idx, type in enumerate(school_types, start=1):
    school_types_collection.insert_one({"TypeId": idx, "TypeName": type})

for idx, year in enumerate(years, start=1):
    years_collection.insert_one({"YearId": idx, "YearName": year})


program_schedule_collection.insert_many(program_schedules)
db.create_collection("ContactsInProgram")
db.create_collection("ProgramPricing")
db.create_collection("PendingPayments")
