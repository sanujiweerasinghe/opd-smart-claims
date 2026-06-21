import os
import django
import pandas as pd
import random
from decimal import Decimal
from datetime import datetime

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from users.models import GroupInsurance, GroupRider


def generate_valid_nic(birth_year=None, gender='M'):
    """
    Generate a valid Sri Lankan NIC number
    Old format: 9 digits + V (e.g., 912345678V)
    New format: 12 digits (e.g., 199123456789)
    """
    if birth_year is None:
        birth_year = random.randint(1950, 2005)
    
    if birth_year < 2000:
        # Old NIC format (9 digits + V)
        year = str(birth_year)[2:]  # Last 2 digits of year
        day_of_year = random.randint(1, 366)
        
        # Add 500 for females
        if gender == 'F':
            day_of_year += 500
        
        day_of_year_str = str(day_of_year).zfill(3)
        serial = str(random.randint(0, 9999)).zfill(4)
        
        return f"{year}{day_of_year_str}{serial}V"
    else:
        # New NIC format (12 digits)
        year = str(birth_year)
        day_of_year = random.randint(1, 366)
        
        # Add 500 for females
        if gender == 'F':
            day_of_year += 500
        
        day_of_year_str = str(day_of_year).zfill(3)
        serial = str(random.randint(0, 99999)).zfill(5)
        
        return f"{year}{day_of_year_str}{serial}"


def generate_employee_number(prefix='EMP', number=None):
    """Generate employee number"""
    if number is None:
        number = random.randint(1000, 9999)
    return f"{prefix}{number:04d}"


def clean_numeric(value):
    """Clean numeric values by removing commas"""
    if pd.isna(value):
        return None
    if isinstance(value, str):
        return value.replace(',', '')
    return value


def parse_date(date_str):
    """Parse date from string"""
    if pd.isna(date_str):
        return None
    
    try:
        # Try different date formats
        for fmt in ['%d/%m/%Y', '%Y-%m-%d', '%d-%m-%Y']:
            try:
                return datetime.strptime(str(date_str).strip(), fmt).date()
            except:
                continue
        return None
    except:
        return None





def import_group_insurance(file_path):
    """Import group insurance data from Excel"""
    print(f"\n{'='*60}")
    print(f"IMPORTING GROUP INSURANCE FROM: {file_path}")
    print(f"{'='*60}")
    
    try:
        # Read Excel file
        df = pd.read_excel(file_path)
        
        print(f"Columns found: {df.columns.tolist()}")
        print(f"Total rows: {len(df)}")
        
        imported = 0
        skipped = 0
        employee_counter = 1000
        
        for index, row in df.iterrows():
            try:
                # Generate employee number and NIC if not present
                emp_number = row.get('EMPLOYEENUMBER')
                if pd.isna(emp_number) or str(emp_number).strip() == '':
                    emp_number = generate_employee_number('EMP', employee_counter)
                    employee_counter += 1
                
                # Generate NIC based on gender
                gender = str(row['SEX']).strip().upper()
                emp_nic = generate_valid_nic(
                    birth_year=random.randint(1970, 2000),
                    gender=gender
                )
                
                # Parse commence date
                commence_date = parse_date(row['COMMENCEDATE'])
                if not commence_date:
                    commence_date = datetime(2024, 1, 1).date()
                
                # Read generated holder name if present in the Excel
                holder_name_val = row.get('HOLDERNAME')
                if pd.isna(holder_name_val) or str(holder_name_val).strip() in ('', 'nan'):
                    holder_name_val = None
                else:
                    holder_name_val = str(holder_name_val).strip()

                GroupInsurance.objects.create(
                    document_no=str(row['DOCUMENTNO']).strip(),
                    main_class=str(row['MAINCLASS']).strip(),
                    commence_date=commence_date,
                    sum_insured=Decimal(clean_numeric(row['SUMINSURED']) or 0),
                    fund_type=str(row['FUNDTYPE']).strip(),
                    item_name=str(row['ITEMNAME']).strip(),
                    holder_name=holder_name_val,
                    employee_number=emp_number,
                    employee_nic=emp_nic,
                    premium_amount=Decimal(clean_numeric(row['PREMIUMAMOUNT']) or 0),
                    sex=gender,
                    link_id=str(row['LINKID']).strip(),
                )
                imported += 1
                
                if (imported % 50) == 0:
                    print(f"  Imported {imported} records...")
                    
            except Exception as e:
                print(f"  Error on row {index}: {e}")
                skipped += 1
                continue
        
        print(f"\n✓ Successfully imported: {imported} group insurance records")
        print(f"✗ Skipped: {skipped} rows")
        return imported
        
    except Exception as e:
        print(f"✗ Error reading file: {e}")
        return 0


def import_group_riders(file_path):
    """Import group riders data from Excel"""
    print(f"\n{'='*60}")
    print(f"IMPORTING GROUP RIDERS FROM: {file_path}")
    print(f"{'='*60}")
    
    try:
        # Read Excel file
        df = pd.read_excel(file_path)
        
        print(f"Columns found: {df.columns.tolist()}")
        print(f"Total rows: {len(df)}")
        
        imported = 0
        skipped = 0
        
        for index, row in df.iterrows():
            try:
                # Parse commence date
                commence_date = parse_date(row['COMMENCEDATE'])
                if not commence_date:
                    commence_date = datetime(2024, 1, 1).date()
                
                GroupRider.objects.create(
                    document_no=str(row['DOCUMENTNO']).strip(),
                    type=str(row['TYPE']).strip(),
                    sum_insured=Decimal(clean_numeric(row['SUMINSURED']) or 0),
                    foreign_sum_insured=Decimal(clean_numeric(row['FOREIGNSUMINSURED']) or 0),
                    premium_amount=Decimal(clean_numeric(row['PREMIUMAMOUNT']) or 0),
                    foreign_premium_amount=Decimal(clean_numeric(row['FOREIGNPREMIUMAMOUNT']) or 0),
                    annual_premium_amount=Decimal(clean_numeric(row['ANNUALPREMIUMAMOUNT']) or 0),
                    foreign_annual_premium_amount=Decimal(clean_numeric(row['FOREIGNANNUALPREMIUMAMOUNT']) or 0),
                    category=str(row['CATEGORY']).strip(),
                    commence_date=commence_date,
                    link_id=str(row['LINKID']).strip(),
                )
                imported += 1
                
                if (imported % 100) == 0:
                    print(f"  Imported {imported} riders...")
                    
            except Exception as e:
                print(f"  Error on row {index}: {e}")
                skipped += 1
                continue
        
        print(f"\n✓ Successfully imported: {imported} group riders")
        print(f"✗ Skipped: {skipped} rows")
        return imported
        
    except Exception as e:
        print(f"✗ Error reading file: {e}")
        return 0


if __name__ == '__main__':
    print("\n" + "="*60)
    print(" OPD INSURANCE DATA IMPORT TOOL")
    print("="*60)
    
    total_imported = 0
    
    
    
    # Import group insurance
    group_file = '2024group.xlsx'
    if os.path.exists(group_file):
        total_imported += import_group_insurance(group_file)
    else:
        print(f"\n✗ File not found: {group_file}")
    
    # Import group riders
    riders_file = '2024group-riders.xls'
    if os.path.exists(riders_file):
        total_imported += import_group_riders(riders_file)
    else:
        print(f"\n✗ File not found: {riders_file}")
    
    print("\n" + "="*60)
    print(f" IMPORT COMPLETE! Total Records: {total_imported}")
    print("="*60)
    
    # Show summary
    print("\n📊 DATABASE SUMMARY:")
  
    print(f"  • Group Insurance: {GroupInsurance.objects.count()}")
    print(f"  • Group Riders: {GroupRider.objects.count()}")
    print("\n✓ You can now view the data in Django Admin!")
  