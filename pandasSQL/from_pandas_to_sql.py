import os
import time
import warnings
import pandas as pd

from db import MainDBHelper, SourceDBHelper
from models.activity import Activity
from models.guardian import Guardian

ROOT_DATA_FOLDER = "D:/GameDev/D2FunnyStats/data"

db_helper = MainDBHelper("main.db", ROOT_DATA_FOLDER)

# Transfer guardians from df to sql
n = 0
df_name = "guardians-" + f"{n:02}" + ".parquet"
while df_name in os.listdir(ROOT_DATA_FOLDER):
    df = pd.read_parquet(os.path.join(ROOT_DATA_FOLDER, df_name))

    start_time = time.monotonic()
    with warnings.catch_warnings():
        warnings.simplefilter(action='ignore', category=FutureWarning)
        
        for i, g in df.iterrows():
            guardian = Guardian()
            for attr in guardian.data:
                guardian.__dict__[attr] = g[attr]
            db_helper.insert_guardian(guardian)
    db_helper.commit()
    print(f"Inserting guardians from {df_name} took {time.monotonic() - start_time}s.")
                
    n += 1
    df_name = "guardians-" + f"{n:02}" + ".parquet"


# Transfer activities from df to sql
n = 0
df_name = "activities-" + f"{n:02}" + ".parquet"
while df_name in os.listdir(ROOT_DATA_FOLDER):
    df = pd.read_parquet(os.path.join(ROOT_DATA_FOLDER, df_name))

    start_time = time.monotonic()
    
    for i, a in df.iterrows():
        activity = Activity()
        for attr in activity.data:
            activity.__dict__[attr] = a[attr]
        db_helper.insert_activity(activity)
    db_helper.commit()
    
    print(f"Inserting activities from {df_name} took {time.monotonic() - start_time}s.")

    n += 1
    df_name = "activities-" + f"{n:02}" + ".parquet"
    
    
# Transfer sources from df to sql
source_db_helper = SourceDBHelper(name="sources.db", folder=ROOT_DATA_FOLDER)
df = pd.read_csv(os.path.join(ROOT_DATA_FOLDER, "guardian_source.csv"))

start_time = time.monotonic()

for i, g in df.iterrows():
    source_db_helper.insert_source(g.membership_id)
source_db_helper.commit()

print(f"Inserting sources from guardian_source.csv took {time.monotonic() - start_time}s.")
