import os
import pandas as pd
from pymongo import MongoClient


#  Import a CSV file into MongoDB
def import_csv_to_mongodb(csv_file, db, collection_name):
    df = pd.read_csv(csv_file)

    # Replace NaN values with empty strings
    df = df.fillna("")

    # Convert DataFrame to list of dictionaries
    data = df.to_dict(orient='records')

    # Insert data into MongoDB collection
    if len(data) > 0:
        db[collection_name].insert_many(data)
    print(f"Imported {csv_file} into collection {collection_name}")


# Main function to import all CSV files in a folder into MongoDB
def import_all_csv_to_mongodb(folder_path, mongo_uri, db_name):
    # Connect to MongoDB
    client = MongoClient(mongo_uri)
    db = client[db_name]

    # Loop through all files in the folder
    for filename in os.listdir(folder_path):
        if filename.endswith('.csv'):
            collection_name = os.path.splitext(filename)[0]
            csv_file = os.path.join(folder_path, filename)
            import_csv_to_mongodb(csv_file, db, collection_name)

    client.close()


if __name__ == "__main__":
    current_dir = os.path.dirname(os.path.abspath(__file__))

    folder_path = os.path.join(current_dir, 'output_files')

    # MongoDB URI and database name
    mongo_uri = 'mongodb+srv://avivx11:X3DiZLIIUjYh0ub8@cluster0.bsjgubq.mongodb.net/?retryWrites=true&w=majority' \
                '&appName=Cluster0 '
    db_name = 'ruach_midbar_schools'

    import_all_csv_to_mongodb(folder_path, mongo_uri, db_name)
