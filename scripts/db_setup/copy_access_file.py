import pyodbc
import shutil
import os

# list tables to copy
tables = ['color_guides_scheduling', 'colors', 'guides_scheduling',
          'payments', 'recommend', 'scheduling_buttons', 'school_details',
          'templates', 'invited_programs', 'scheduling', 'guides', 'schools_contacts']


# Copy tables and data from the old Access database to the new one
def copy_tables_to_new_db(old_db_path, new_db_path):

    if os.path.exists(new_db_path):
        os.remove(new_db_path)
    shutil.copy(old_db_path, new_db_path)

    old_conn_str = r"DRIVER={Microsoft Access Driver (*.mdb, *.accdb)};DBQ=" + old_db_path
    new_conn_str = r"DRIVER={Microsoft Access Driver (*.mdb, *.accdb)};DBQ=" + new_db_path

    old_conn = pyodbc.connect(old_conn_str)
    old_cursor = old_conn.cursor()

    new_conn = pyodbc.connect(new_conn_str)
    new_cursor = new_conn.cursor()

    tables = ['color_guides_scheduling', 'colors', 'guides_scheduling',
              'payments', 'recommend', 'scheduling_buttons', 'school_details',
              'templates', 'invited_programs', 'scheduling', 'guides', 'schools_contacts']

    for table_name in tables:
        print(f"Copying table: {table_name}")

        old_cursor.execute(f"SELECT * FROM {table_name}")
        columns = [column[0] for column in old_cursor.description]

        column_definitions = ", ".join([f"{col} TEXT" for col in columns])  # Adjust data types as needed
        create_table_query = f"CREATE TABLE {table_name} ({column_definitions})"

        try:
            new_cursor.execute(create_table_query)
            new_conn.commit()
        except pyodbc.Error as e:
            print(f"Error creating table {table_name}: {e}")
            continue

        insert_query = f"INSERT INTO {table_name} ({', '.join(columns)}) VALUES ({', '.join(['?' for _ in columns])})"

        for row in old_cursor.fetchall():
            new_cursor.execute(insert_query, row)

        new_conn.commit()

    old_conn.close()
    new_conn.close()
    print(f"Data copied to new database: {new_db_path}")


script_folder = os.path.dirname(os.path.abspath(__file__))


old_db_path = os.path.join(script_folder, 'ruach_midbar_db.accdb')
new_db_path = os.path.join(script_folder, 'ruach_midbar.accdb')


copy_tables_to_new_db(old_db_path, new_db_path)

print("All tables and data have been copied successfully!")
