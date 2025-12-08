from pymongo import MongoClient
import pandas as pd

field_copy_rules = [

    # {
    #     'source_table': 'School',
    #     'target_table': 'SchoolsContact',
    #     'fields': ['Schoolid'],
    #     'target_fields': ['Schoolid'],
    #     'source_key': ['SchoolName'],
    #     'target_key': ['SchoolName']
    # },
    # {
    #     'source_table': 'SchoolsContact',
    #     'target_table': 'School',
    #     'fields': ['Contactid'],
    #     'target_fields': ['RepresentiveId'],
    #     'source_key': ['Schoolid'],
    #     'target_key': ['Schoolid']
    # },
    # {
    #     'source_table': 'SchoolsContact',
    #     'target_table': 'Recommender',
    #     'fields': ['Contactid'],
    #     'target_fields': ['Contactid'],
    #     'source_key': ['Cellphone'],
    #     'target_key': ['Cellphone']
    # },
    # {
    #     'source_table': 'School',
    #     'target_table': 'Recommender',
    #     'fields': ['Schoolid'],
    #     'target_fields': ['Schoolid'],
    #     'source_key': ['SchoolName'],
    #     'target_key': ['SchoolName']
    # },
    #
    # {
    #     'source_table': 'Program',
    #     'target_table': 'ColorCandidate',
    #     'fields': ['Programid'],
    #     'target_fields': ['Programid'],
    #     'source_key': ['PrevProgramid'],
    #     'target_key': ['PrevProgramid']
    # },
    # {
    #     'source_table': 'Guide',
    #     'target_table': 'ColorCandidate',
    #     'fields': ['Guideid'],
    #     'target_fields': ['Guideid'],
    #     'source_key': ['PrevGuideid'],
    #     'target_key': ['PrevGuideid']
    # },
    # {
    #     'source_table': 'Colors',
    #     'target_table': 'ColorCandidate',
    #     'fields': ['Colorid'],
    #     'target_fields': ['Colorid'],
    #     'source_key': ['PrevColorid'],
    #     'target_key': ['PrevColorid']
    # },
    # {
    #     'source_table': 'Colors',
    #     'target_table': 'ColorCandidate',
    #     'fields': ['ColorHexCode'],
    #     'target_fields': ['ColorHexCode'],
    #     'source_key': ['Colorid'],
    #     'target_key': ['Colorid']
    # },
    # {
    #     'source_table': 'School',
    #     'target_table': 'Program',
    #     'fields': ['Schoolid'],
    #     'target_fields': ['Schoolid'],
    #     'source_key': ['SchoolName', 'City'],
    #     'target_key': ['SchoolName', 'City']
    # },
    # {
    #     'source_table': 'Program',
    #     'target_table': 'Payments',
    #     'fields': ['Programid'],
    #     'target_fields': ['Programid'],
    #     'source_key': ['PrevProgramid'],
    #     'target_key': ['PrevProgramid']
    # },
    # {
    #     'source_table': 'Program',
    #     'target_table': 'Payments',
    #     'fields': ['ProgramName'],
    #     'target_fields': ['ProgramName'],
    #     'source_key': ['Programid'],
    #     'target_key': ['Programid']
    # },
    {
        'source_table': 'Program',
        'target_table': 'Guides_ToAssign',
        'fields': ['Programid'],
        'target_fields': ['Programid'],
        'source_key': ['GuideCellphone'],
        'target_key': ['CellPhone']
    },
    # {
    #     'source_table': 'Program',
    #     'target_table': 'Assigned_Guide',
    #     'fields': ['Programid'],
    #     'target_fields': ['Programid'],
    #     'source_key': ['ProgramLink'],
    #     'target_key': ['ProgramLink']
    # },
    # {
    #     'source_table': 'Guide',
    #     'target_table': 'Guides_ToAssign',
    #     'fields': ['Guideid'],
    #     'target_fields': ['Guideid'],
    #     'source_key': ['CellPhone'],
    #     'target_key': ['CellPhone']
    # },

    # {
    #     'source_table': 'Guide',
    #     'target_table': 'Assigned_Guide',
    #     'fields': ['Guideid'],
    #     'target_fields': ['Guideid'],
    #     'source_key': ['CellPhone'],
    #     'target_key': ['CellPhone']
    # },
    # {
    #     'source_table': 'Assigned_Guide',
    #     'target_table': 'Program',
    #     'fields': ['Days', 'ChosenDay', 'Weeks'],
    #     'target_fields': ['Days', 'ChosenDay', 'Weeks'],
    #     'source_key': ['Programid'],
    #     'target_key': ['Programid']
    # },
    # Add more rules as needed
]


def safe_compare(source_value, target_value):
    # Check if one value is int and the other is float (double)
    if (isinstance(source_value, int) and isinstance(target_value, float)) or \
            (isinstance(source_value, float) and isinstance(target_value, int)):
        # Compare both as floats (doubles)
        return float(source_value) == float(target_value)

    # Otherwise, compare as is (string comparison or others)
    return source_value == target_value


# Copy fields between collections, based on copy rules
def copy_fields_between_collections(mongo_uri, db_name, field_copy_rules):
    # Connect to MongoDB
    client = MongoClient(mongo_uri)
    db = client[db_name]

    source_keys_list = []
    target_keys_list = []

    for rule in field_copy_rules:
        source_keys_list = []
        target_keys_list = []
        source_collection = rule['source_table']
        target_collection = rule['target_table']
        source_fields = rule['fields']
        target_fields = rule['target_fields']
        source_key = rule['source_key']
        target_key = rule['target_key']

        print(
            f"Copying fields {source_fields} from {source_collection} to {target_fields} in {target_collection} "
            f"based on key {source_key} -> {target_key}")

        # Retrieve all source data from MongoDB
        try:
            source_data = db[source_collection].find()
            # print(f"Source data from collection {source_collection}:")
            # for doc in source_data:
            #     print(doc)
        except Exception as e:
            # print(f"Error querying source collection {source_collection}: {e}")
            continue

        for source_doc in db[source_collection].find():
            source_values = [source_doc.get(key) for key in source_key]

            # Ensure all source key values are not None
            if any(value is None for value in source_values):
                continue

            # Create a query based on multiple target keys
            query = {target_key[i]: source_values[i] for i in range(len(source_key))}

            update = {'$set': {target_fields[i]: source_doc.get(source_fields[i]) for i in range(len(source_fields))}}

            print(f"Executing update for {target_collection} with query: {query}")
            result = db[target_collection].update_many(query, update)

            target_docs = db[target_collection].find(query)

            for target_doc in target_docs:
                if source_collection == 'Guide' and target_collection == 'Assigned_Guide' \
                        and 'CellPhone' in source_key and 'CellPhone' in target_key:
                    db[source_collection].update_one(
                        {'_id': source_doc['_id']},
                        {'$set': {'isAssigned': True}}
                    )
                # print(f"Found matching document in {target_collection} : {target_doc}")
                target_values = [target_doc.get(key) for key in target_key]

                if safe_compare(source_values, target_values):
                    # Append to target keys list if matched
                    target_keys_list.append(target_values)
            else:
                print(
                    f"No matching document found in {target_collection} for key {target_key} with value {source_values}")

        print("Source Keys:", source_keys_list)
        print("Target Keys:", target_keys_list)

    client.close()

    return source_keys_list, target_keys_list


if __name__ == "__main__":
    mongo_uri = 'mongodb+srv://avivx11:bMXnPTid6aXZx7I2@cluster0.bsjgubq.mongodb.net/?retryWrites=true&w=majority' \
                '&appName=Cluster0'
    db_name = 'ruach_midbar_schools'
    copy_fields_between_collections(mongo_uri, db_name, field_copy_rules)
