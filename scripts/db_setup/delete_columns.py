from pymongo import MongoClient


# Delete columns and it's values based on collections_to_fields
def delete_fields_from_collections(uri, db_name, collections_to_fields):

    client = MongoClient(uri)

    try:
        db = client[db_name]

        for collection_name, fields_to_delete in collections_to_fields.items():
            collection = db[collection_name]

            # Create an update operation to unset the specified fields
            update_operation = {"$unset": {field: "" for field in fields_to_delete}}

            result = collection.update_many({}, update_operation)
            print(f"Deleted fields from {collection_name}: {result.modified_count} document(s) updated.")

    except Exception as e:
        print(f"Error deleting fields: {e}")

    finally:
        client.close()


mongo_uri = 'mongodb+srv://avivx11:bMXnPTid6aXZx7I2@cluster0.bsjgubq.mongodb.net/?retryWrites=true&w=majority' \
            '&appName=Cluster0'
db_name = 'ruach_midbar_schools'


collections_to_fields = {
    'Program': ['PrevProgramid'],
    'Paymetns': ['PrevProgramid'],
    'Guide': ['PrevGuideid'],
    'Assigned_Guide': ['CellPhone', 'Days', 'ChosenDay', 'Weeks', 'ProgramLink', 'CellPhone1', 'CellPhone2',
                       'CellPhone3', 'CellPhone4', 'Guide1Name', 'Guide2Name', 'Guide3Name', 'Guide4Name'],
    'Guides_ToAssign': ['FullName', 'CellPhone'],
    'Colors': ['PrevColorid'],
    'ColorCandidate': ['PrevColorid', 'PrevGuideid', 'PrevProgramid', 'Colorid']
}

delete_fields_from_collections(mongo_uri, db_name, collections_to_fields)
