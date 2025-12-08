from pymongo import MongoClient
import os

# Connect to MongoDB
client = MongoClient('mongodb+srv://avivx11:bMXnPTid6aXZx7I2@cluster0.bsjgubq.mongodb.net/?retryWrites=true&w=majority'
                     '&appName=Cluster0')  # Adjust the connection string as needed
db = client['ruach_midbar_schools']  # Replace with your database name
collection = db['Assigned_Guide']  # Replace with your original collection name

# Iterate through the documents in the original collection
for document in collection.find():
    program_link = document.get('ProgramLink')
    days = document.get('Days')
    chosen_day = document.get('ChosenDay')
    weeks = document.get('Weeks')

    # Create new documents for each cell phone
    cell_phones = [
        document.get('CellPhone1'),
        document.get('CellPhone2'),
        document.get('CellPhone3'),
        document.get('CellPhone4')
    ]

    inserted = False

    # Insert new documents into the current collection
    for cell_phone in cell_phones:
        # Only add documents with a valid cell phone
        if cell_phone != "":
            new_document = {
                'ProgramLink': program_link,
                'CellPhone': cell_phone,
                'Days': days,
                'ChosenDay': chosen_day,
                'Weeks': weeks
            }
            collection.insert_one(new_document)
            inserted = True  #

    # If at least one document was inserted, delete the original document
    if inserted:
        collection.delete_one({'_id': document['_id']})  # Remove the original document

print("Documents have been processed, inserted into the current collection, and original records have been deleted.")
