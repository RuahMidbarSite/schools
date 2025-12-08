import pandas as pd
import pyodbc
import os
import re
import csv

schools_statuses = list()
contacts_statuses = list()
guides_statuses = list()
programs_statuses = list()


# Get data from Access database
def get_data_from_access(access_db_path, table_name):
    connection_string = r'DRIVER={Microsoft Access Driver (*.mdb, *.accdb)};DBQ=' + access_db_path + ';'
    conn = pyodbc.connect(connection_string)
    query = f'SELECT * FROM {table_name};'
    df = pd.read_sql(query, conn)
    conn.close()
    return df


# Export a single table to CSV
def export_table_to_csv(df, csv_file_path):
    df.to_csv(csv_file_path, index=False)
    print(f"Exported {len(df)} records to {csv_file_path}.")


def process_longchar_columns(df, longchar_columns):
    new_columns = {}
    for col, (text_name, link_name) in longchar_columns.items():
        if col in df.columns:

            df[text_name] = df[col].apply(lambda x: x.split('#')[0] if isinstance(x, str) else x)  # Extract text
            df[link_name] = df[col].apply(
                lambda x: x.split('#')[1] if isinstance(x, str) and '#' in x else None)  # Extract link

            def extract_phone_number(link):
                if isinstance(link, str) and 'phone=' in link:

                    phone_number = link.split('phone=')[1]
                    phone_number = str(phone_number)

                    phone_number = re.sub(r'^972', '', phone_number)
                    return phone_number
                return None

            if link_name in ["CellPhone", "CellPhone1", "CellPhone2", "CellPhone3", "CellPhone4", "GuideCellphone"]:
                df[link_name] = df[link_name].apply(extract_phone_number)
            df.drop(columns=[col], inplace=True)  # Drop the original LONGCHAR column
            new_columns[text_name] = text_name  # Add new columns to the mapping
            new_columns[link_name] = link_name
            print(f"{text_name}: {df[text_name]}")
            print(f"{link_name}: {df[link_name]}")
    return df, new_columns


def print_columns_and_values(df):
    for col in df.columns:
        print(f"Column: {col}")
        print(df[col].tolist())


def generate_yes_no_summary(df, yes_no_columns):
    def summarize_row(row):
        return ', '.join([col for col in yes_no_columns if row[col]])

    df['Profession'] = df.apply(summarize_row, axis=1)
    return df


# Export all tables in the mapping to CSV
def export_tables_to_csv(access_db_path, output_dir, table_mappings, yes_no_columns):
    schools_statuses = list()
    contacts_statuses = list()
    guides_statuses = list()
    programs_statuses = list()

    for table_name, mapping in table_mappings.items():
        try:

            # Get data from Access database
            df = get_data_from_access(access_db_path, table_name)

            longchar_columns = mapping.get('longchar_columns', {})
            df, new_longchar_columns = process_longchar_columns(df, longchar_columns)

            # Select and rename columns based on mapping
            columns = mapping['columns']
            columns.update(new_longchar_columns)

            df_export = df[list(columns.keys())].rename(columns=columns)

            print(f"\nTable: {table_name}")

            tables_with_status_field = ['school_details', 'schools_contacts', 'guides', 'invited_programs']

            # Get all statuses from tables
            if table_name in tables_with_status_field:
                for original_col, renamed_col in columns.items():

                    if original_col == 'status':
                        values = [value for value in df_export[renamed_col] if value is not None]
                        if table_name == 'school_details':
                            schools_statuses = values
                        elif table_name == 'schools_contacts':
                            contacts_statuses = values
                        elif table_name == 'guides':
                            guides_statuses = values
                        elif table_name == 'invited_programs':
                            programs_statuses = values

            columns_to_cast = ['CellPhone', 'Cellphone', 'cellphone']  # Add other columns here

            for col in columns_to_cast:
                if col in df_export.columns:
                    df_export[col] = df_export[col].astype(str)

            # Handle new columns
            new_columns = mapping.get('new_columns', {})
            for col_name, col_value in new_columns.items():
                df_export[col_name] = col_value  # Add new co

            print(f"\nTable: {table_name}")
            print("df_export columns:", df_export.columns.tolist())

            print("Yes/No Columns:", yes_no_columns)
            print("Exported Columns:", df_export.columns.tolist())

            # Check if any Yes/No columns exist in the dataframe
            if set(yes_no_columns).intersection(df_export.columns):
                df_export = generate_yes_no_summary(df_export, yes_no_columns)
                # Exclude Yes/No columns from the export
                df_export = df_export.drop(columns=yes_no_columns, errors='ignore')

            df_export = df_export.fillna("")

            # Define the output CSV file path using the custom name
            custom_name = mapping.get('output_name', table_name)
            csv_file_path = os.path.join(output_dir, f"{custom_name}.csv")

            export_table_to_csv(df_export, csv_file_path)

        except Exception as e:
            print(f"Error exporting {table_name}: {e}")
    return list(set(schools_statuses)), list(set(contacts_statuses)), list(set(guides_statuses)), list(
        set(programs_statuses))


# Create Professions CSV from list
def create_professions_csv(output_file, output_folder, professions_names, num_rows=1):
    if not os.path.exists(output_folder):
        os.makedirs(output_folder)

    csv_path = os.path.join(output_folder, output_file)

    # Create a CSV file with the profession names as the columns and False as the data
    with open(csv_path, mode='w', newline='', encoding='utf-8') as file:
        writer = csv.writer(file)
        writer.writerow(professions_names)
        for _ in range(num_rows):
            writer.writerow([False] * len(professions_names))

    print(f"CSV file '{output_file}' created successfully in folder '{output_folder}'.")


# Create statuses CSVs for the relevant tables
def create_statuses_csv_files(schools_statuses, contacts_statuses, guides_statuses, programs_statuses, output_folder):
    if not os.path.exists(output_folder):
        os.makedirs(output_folder)

    schools_statuses.sort()
    contacts_statuses.sort()
    guides_statuses.sort()
    programs_statuses.sort()

    def write_csv(output_folder, file_name, statuses):
        csv_path = os.path.join(output_folder, file_name)
        with open(csv_path, mode='w', newline='', encoding='utf-8') as file:
            writer = csv.writer(file)
            writer.writerow(['StatusId', 'StatusName'])
            for index, status_name in enumerate(statuses):
                writer.writerow([index+1, status_name])


    write_csv(output_folder, 'StatusSchools.csv', schools_statuses)
    write_csv(output_folder, 'StatusContacts.csv', contacts_statuses)
    write_csv(output_folder, 'StatusGuides.csv', guides_statuses)
    write_csv(output_folder, 'StatusPrograms.csv', programs_statuses)


if __name__ == '__main__':
    # Database configuration
    current_dir = os.path.dirname(os.path.abspath(__file__))
    access_db_path = os.path.join(current_dir,
                                  'ruach_midbar.accdb')

    output_dir = 'output_files'


    os.makedirs(output_dir, exist_ok=True)

    #  Table mappings for export
    table_mappings = {
        # 'school_details': {
        #     'columns': {
        #         'manual_school_id': 'Schoolid',
        #         'schools': 'SchoolName',
        #         'education_stage': 'EducationStage',
        #         'sector': 'ReligiousSector',
        #         'type': 'SchoolType',
        #         'symbol': 'SymbolNumber',
        #         'date': 'Date',
        #         'status': 'Status',
        #
        #     },
        #     'output_name': 'School',
        #     'longchar_columns': {
        #         'elementary_junior': ('Representive', 'RepresentiveLink')
        #     }
        # },
        # 'schools_contacts': {
        #     'columns': {
        #         'school': 'SchoolName',
        #         'first_name': 'FirstName',
        #         'last_name': 'LastName',
        #         'cellular': 'Cellphone',
        #         'whatsapp': 'WhatsppLink',
        #         'status': 'Status',
        #         'email': 'Email',
        #         'manual_contact_id': 'Contactid',
        #         'google_contacts_resource_name': 'GoogleContactLink',
        #         'symbol': 'EstablishmentNumber',
        #         'city': 'City',
        #         'role': 'Role',
        #         'phone': 'Phone',
        #     },
        #     'output_name': 'SchoolsContact',
        # },
        # 'invited_programs': {
        #     'columns': {
        #         'invitation_id': 'PrevProgramid',
        #         'manual_invitation_id': 'Programid',
        #         'symbol': 'EstablishmentNumber',
        #         'amount_of_classes': 'PaidLessonNumbers',
        #         'lesson_cost': 'PricingPerPaidLesson',
        #         'inclusive_pricing': 'FinalPrice',
        #         'remaining_amount': 'PendingMoney',
        #         'remarks': 'Notes',
        #         'date_of_producing': 'IssuingDate',
        #         'producer': 'Issuer',
        #         'expected_expenses': 'EstimatedExpenses',
        #         'check_date': 'CheckDate',
        #         'after_expenses_including': 'TotalAmountIncludingTaxes',
        #         'school_name': 'SchoolName'
        #     },
        #     'output_name': 'Program',
        #     'longchar_columns': {
        #         'program_name': ('ProgramName', 'ProgramLink'),
        #         'guides': ('GuideName', 'GuideCellphone')
        #     }
        # },
        # 'guides': {
        #     'columns': {
        #         'guide_id': 'PrevGuideid',
        #         'manual_guide_id': 'Guideid',
        #         'last_name': 'LastName',
        #         'status': 'Status',
        #         'city': 'City',
        #         'area': 'Area',
        #         'cv': 'CV',
        #         'sector': 'ReligiousSector',
        #         'remarks': 'Notes',
        #         'police_clearance': 'PoliceApproval',
        #         'agreement': 'Aggrement',
        #         'insurance': 'Insurance',
        #         'certificates': 'Documents',
        #         'pricing': 'PriceRequirement',
        #         "art": "אמנות",
        #         "theater": "תיאטרון",
        #         "chess": "שחמט",
        #         "fighting": "לחימה",
        #         "styling": "סטיילינג",
        #         "adopted_learning": "מותאמת",
        #         "Sustainability": "קיימות",
        #         "new_media": "ניו מדיה",
        #         "high_tech": "הייטק",
        #         "yoga": "יוגה",
        #         "writing": "כתיבה",
        #         "finance": "פיננסים",
        #         "sport": "ספורט",
        #         "magic": "קוסמות",
        #         "dog": "כלבנות",
        #         "medicine": "רפואה",
        #         "science": "מדע",
        #         "leadership": "מנהיגות",
        #         "dance": "מחול",
        #         "communication": "תקשורת",
        #         "learning": "למידה",
        #         "psychometric": "פסיכומטרי",
        #         "thinking": "חשיבה",
        #         "juggling": "להטוטנות",
        #         "sex_education": "חינוך מיני",
        #         "therapy": "טיפול",
        #         "music": "מוזיקה",
        #         "instruction": "ליווי",
        #         "cinema": "קולנוע",
        #         "carpentry": "נגרות",
        #         "cooking": "בישול",
        #         "Entrepreneurship": "יזמות",
        #         "english": "אנגלית",
        #         "math": "מתמטיקה",
        #         "coaching": "קואצינג",
        #         "telemarketing": "טלמרקטינג",
        #         "holistic_concelling": "ייעוץ הוליסטי",
        #         "judaism": "יהדות",
        #         "flight": "טיסה",
        #         "space": "חלל"
        #     },
        #     'output_name': 'Guide',
        #     'longchar_columns': {
        #         'first_name': ('FirstName', 'CellPhone')
        #     },
        #     'new_columns': {
        #         'isAssigned': False,  # You can specify static values
        #     }
        # },
        'guides_scheduling': {
            'columns': {

            },
            'output_name': 'Guides_ToAssign',
            'longchar_columns': {
                'ful_name': ('FullName', 'CellPhone'),

            }
        },
        # 'scheduling': {
        #     'columns': {
        #         'days': 'Days',
        #         'chosen_day': 'ChosenDay',
        #         'weeks': 'Weeks'
        #     },
        #     'output_name': 'Assigned_Guide',
        #     'longchar_columns': {
        #         'program': ('ProgramName', 'ProgramLink'),
        #         'guide1': ('Guide1Name', 'CellPhone1'),
        #         'guide2': ('Guide2Name', 'CellPhone2'),
        #         'guide3': ('Guide3Name', 'CellPhone3'),
        #         'guide4': ('Guide4Name', 'CellPhone4'),
        #     }
        # },
        #
        # 'recommend': {
        #     'columns': {
        #         'city': 'City',
        #         'area': 'Area',
        #         'institution': 'SchoolName',
        #         'sector': 'ReligiousSector',
        #         'education_type': 'EducationStage',
        #         'programs': 'ProgramsInSchool',
        #         'role': 'Role',
        #         'cellphone': 'Cellphone',
        #     },
        #     'output_name': 'Recommender',
        # },
        # 'colors': {
        #     'columns': {
        #         'id': 'PrevColorid',
        #         'manual_id': 'Colorid',
        #         'color': 'ColorHexCode',
        #     },
        #     'output_name': 'Colors',
        # },
        # 'color_guides_scheduling': {
        #     'columns': {
        #         'guides_id': 'PrevGuideid',
        #         'id_scheduling': 'PrevProgramid',
        #         'color_id': 'PrevColorid',
        #     },
        #     'output_name': 'ColorCandidate',
        # },
        # 'templates': {
        #     'columns': {
        #         'pattern_id': 'PatternId',
        #         'title': 'Caption',
        #         'message1': 'Message1',
        #         'message2': 'File',
        #         'message3': 'Message2',
        #     },
        #     'output_name': 'MessagePattern',
        # },
        #
        # 'payments': {
        #     'columns': {
        #         'manual_payment_id': 'Id',
        #         'school_name': 'SchoolName',
        #         'producer': 'Issuer',
        #         'paid_sum': 'Amount',
        #         'invitation_id': 'PrevProgramid',
        #     },
        #     'output_name': 'Payments',
        # },

    }

    professions_dict = {
        "Art": "אמנות",
        "Theater": "תיאטרון",
        "Chess": "שחמט",
        "Fighting": "לחימה",
        "Styling": "סטיילינג",
        "AdoptedLearning": "מותאמת",
        "Sustainability": "קיימות",
        "NewMedia": "ניו מדיה",
        "Hightech": "הייטק",
        "Yoga": "יוגה",
        "Writing": "כתיבה",
        "Finance": "פיננסים",
        "Sport": "ספורט",
        "Magic": "קוסמות",
        "Dog": "כלבנות",
        "Medicine": "רפואה",
        "Science": "מדע",
        "Leadership": "מנהיגות",
        "Dance": "מחול",
        "Communication": "תקשורת",
        "Learning": "למידה",
        "Psychometric": "פסיכומטרי",
        "Thinking": "חשיבה",
        "Juggling": "להטוטנות",
        "SexEducation": "חינוך מיני",
        "Therapy": "טיפול",
        "Music": "מוזיקה",
        "Instruction": "ליווי",
        "Cinema": "קולנוע",
        "Carpentry": "נגרות",
        "Cooking": "בישול",
        "Entrepreneurship": "יזמות",
        "English": "אנגלית",
        "Math": "מתמטיקה",
        "Coaching": "קואצינג",
        "Telemarketing": "טלמרקטינג",
        "HolisticConcelling": "ייעוץ הוליסטי",
        "Judaism": "יהדות",
        "Flight": "טיסה",
        "Space": "חלל"
    }

    professions_columns = list(professions_dict.keys())

    yes_no_columns = []

    profession_file = 'Profession.csv'

    print(f'yes_no_columns: {yes_no_columns}\n')
    print(f'professions_columns: {professions_columns}\n')

    # Export all tables
    schools_statuses, contacts_statuses, guides_statuses, programs_statuses = \
        export_tables_to_csv(access_db_path, output_dir, table_mappings, yes_no_columns)
    #
    # print(f"schools_statuses: {schools_statuses}")
    # print(f"contacts_statuses: {contacts_statuses}")
    # print(f"guides_statuses: {guides_statuses}")
    # print(f"programs_statuses: {programs_statuses}")

    # create_statuses_csv_files(schools_statuses, contacts_statuses, guides_statuses, programs_statuses, output_dir)
    #
    # create_professions_csv(profession_file, output_dir, professions_columns)
