import os
import django
import csv
import sys

# Set up Django environment
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from users.models import MedicineMaster

def import_medicine_data():
    csv_file_path = os.path.join(os.path.dirname(__file__), 'backend', 'medicine_data.csv')
    
    if not os.path.exists(csv_file_path):
        print(f"Error: CSV file not found at {csv_file_path}")
        return

    print("Starting to import Medicine Data...")
    
    # Clear existing data just in case
    MedicineMaster.objects.all().delete()
    
    count = 0
    with open(csv_file_path, newline='', encoding='utf-8') as csvfile:
        reader = csv.DictReader(csvfile)
        for row in reader:
            try:
                MedicineMaster.objects.create(
                    brand_name=row.get('Brand Name', '').strip(),
                    generic_name=row.get('Generic Name', '').strip(),
                    category=row.get('Category', '').strip(),
                    # Adjust 'is_payable' logic if your CSV has a different column or format (e.g., Yes/No, True/False)
                    is_payable=str(row.get('Payable/Not Payable', '')).strip().lower() in ['yes', 'true', '1']
                )
                count += 1
                if count % 1000 == 0:
                    print(f"Imported {count} medicines...")
            except Exception as e:
                print(f"Error importing row {row}: {e}")
                
    print(f"Successfully imported {count} medicines into the database!")

if __name__ == '__main__':
    import_medicine_data()
