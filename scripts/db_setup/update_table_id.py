import os
import pyodbc


def create_cellphone_column_recommend(table_name, new_phone_field, connection):
    cursor = connection.cursor()

    try:
        cursor.execute(f"SELECT {new_phone_field} FROM {table_name} WHERE 1=0")
        print(f"Column '{new_phone_field}' already exists in table '{table_name}'.")
    except pyodbc.Error:
        # Column does not exist, create it
        alter_query = f"ALTER TABLE {table_name} ADD COLUMN {new_phone_field} TEXT(255)"
        cursor.execute(alter_query)
        print(f"Created column '{new_phone_field}' in table '{table_name}'.")


def update_cellphone_column_recommend(table_name, old_phone_field, new_phone_field, connection):
    cursor = connection.cursor()

    select_query = f"SELECT {old_phone_field}, * FROM {table_name}"
    cursor.execute(select_query)
    rows = cursor.fetchall()

    for row in rows:
        old_phone_value = getattr(row, old_phone_field)

        if old_phone_value is not None:

            # Remove all leading/trailing spaces
            new_phone_value = old_phone_value.toString()
            new_phone_value = new_phone_value.strip()
            new_phone_value = new_phone_value.replace("-", "")

            # Remove the leading '0' if it exists
            if new_phone_value.startswith('0'):
                new_phone_value = new_phone_value[1:]

        else:
            new_phone_value = old_phone_value

            # Update the new field in the database
        update_query = f"UPDATE {table_name} SET {new_phone_field} = ? WHERE {old_phone_field} = ?"
        cursor.execute(update_query, (new_phone_value, old_phone_value))

    connection.commit()
    print(f"Updated '{new_phone_field}' in table '{table_name}' with values from '{old_phone_field}'.")


def create_cellphone_column_contacts(table_name, new_phone_field, connection):
    cursor = connection.cursor()

    try:
        cursor.execute(f"SELECT {new_phone_field} FROM {table_name} WHERE 1=0")
        print(f"Column '{new_phone_field}' already exists in table '{table_name}'.")
    except pyodbc.Error:
        # Column does not exist, create it
        alter_query = f"ALTER TABLE {table_name} ADD COLUMN {new_phone_field} TEXT(255)"
        cursor.execute(alter_query)
        print(f"Created column '{new_phone_field}' in table '{table_name}'.")


def update_cellphone_column_contacts(table_name, old_phone_field, new_phone_field, connection):
    cursor = connection.cursor()

    # Fetch all rows from the table
    select_query = f"SELECT {old_phone_field}, * FROM {table_name}"
    cursor.execute(select_query)
    rows = cursor.fetchall()

    # Update the new phone field with values from old phone field, removing leading '0'
    for row in rows:
        old_phone_value = getattr(row, old_phone_field)

        new_phone_value = old_phone_value

        if old_phone_value is not None:

            new_phone_value = old_phone_value.toString()

            new_phone_value = new_phone_value.strip()

            new_phone_value = new_phone_value.replace("-", "")

            if old_phone_value.startswith('0'):
                new_phone_value = new_phone_value[1:]

        else:
            new_phone_value = old_phone_value

        update_query = f"UPDATE {table_name} SET {new_phone_field} = ? WHERE {old_phone_field} = ?"
        cursor.execute(update_query, (new_phone_value, old_phone_value))

    connection.commit()
    print(f"Updated '{new_phone_field}' in table '{table_name}' with values from '{old_phone_field}'.")


def create_manual_id_column(table_name, new_id_field, connection):
    cursor = connection.cursor()

    try:
        cursor.execute(f"SELECT {new_id_field} FROM {table_name} WHERE 1=0")
        print(f"Column '{new_id_field}' already exists in table '{table_name}'.")
    except pyodbc.Error:

        # Column does not exist, create it as an integer field
        alter_query = f"ALTER TABLE {table_name} ADD COLUMN {new_id_field} LONG"
        cursor.execute(alter_query)
        print(f"Created column '{new_id_field}' in table '{table_name}'.")


def update_id_column(table_name, old_id_field, new_id_field, connection):
    cursor = connection.cursor()

    # Fetch all rows, ordered by the old ID (which could be AutoNumber)
    select_query = f"SELECT {old_id_field}, * FROM {table_name} ORDER BY {old_id_field}"
    cursor.execute(select_query)
    rows = cursor.fetchall()

    # Update the new ID field with sequential values (starting from 1)
    for index, row in enumerate(rows):
        update_query = f"UPDATE {table_name} SET {new_id_field} = ? WHERE {old_id_field} = ?"
        cursor.execute(update_query, (index + 1, getattr(row, old_id_field)))

    connection.commit()
    print(f"Updated {new_id_field} in table {table_name}")


script_folder = os.path.dirname(os.path.abspath(__file__))

db_path = os.path.join(script_folder, 'ruach_midbar.accdb')

# Table and new manual ID fields
table_id_fields = {
    'school_details': ('school_id', 'manual_school_id'),
    'schools_contacts': ('contact_id', 'manual_contact_id'),
    'guides': ('guide_id', 'manual_guide_id'),
    'invited_programs': ('invitation_id', 'manual_invitation_id'),
    'colors': ('id', 'manual_id'),
    'templates': ('מזהה', 'pattern_id'),
    'payments': ('payment_id', 'manual_payment_id')
}

contacts_table_name = 'schools_contacts'
contacts_old_phone_field = 'cellular'
contacs_new_phone_field = 'cellphone'


recommend_table_name = 'recommend'
recommend_old_phone_field = 'cellular'
recommend_new_phone_field = 'cellphone'

# Establish the connection to the Access database
connection_string = r'DRIVER={Microsoft Access Driver (*.mdb, *.accdb)};DBQ=' + db_path
connection = pyodbc.connect(connection_string)

# Loop through each table and update the new manual ID field
for table, (old_id_field, new_id_field) in table_id_fields.items():
    print(f"Updating {new_id_field} in table {table}")

    create_manual_id_column(table, new_id_field, connection)
    update_id_column(table, old_id_field, new_id_field, connection)


create_cellphone_column_contacts(contacts_table_name, contacs_new_phone_field, connection)
update_cellphone_column_contacts(contacts_table_name, contacts_old_phone_field, contacs_new_phone_field, connection)

create_cellphone_column_recommend(recommend_table_name, recommend_new_phone_field, connection)
update_cellphone_column_recommend(recommend_table_name, recommend_old_phone_field, recommend_new_phone_field,
                                  connection)

connection.close()
