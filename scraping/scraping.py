import asyncio
import time
import logging
import json
from datetime import datetime

import aiohttp
import os
import pandas as pd

from db import PandasBufferDB, PandasSourceDB, MainDBHelper, SourceDBHelper
from models.activity import Activity
from models.guardian import Guardian
from local_api import BungieAPI

# Logging configuration
logging.basicConfig(format="[%(asctime)s] [%(levelname)-8s] %(message)s",
                    datefmt="%Y/%m/%d %I:%M:%S",
                    filename="scraping.log",
                    encoding="utf-8",
                    level=logging.DEBUG)
console_handler = logging.StreamHandler()
console_handler.setLevel(logging.DEBUG)
console_handler.setFormatter(logging.Formatter("[%(asctime)s] [%(levelname)-8s] %(message)s", "%Y/%m/%d %I:%M:%S"))
logging.getLogger().addHandler(console_handler)

logging.info("New run.")

# Async LOCK
ONE_SOURCE_LOCK = asyncio.Lock()
GUARDIAN_DB_LOCK = asyncio.Lock()  # not used atm
ACTIVITY_DB_LOCK = asyncio.Lock()  # not used atm
TIMEOUT = aiohttp.ClientTimeout(total=10800)   # 3 hours

# Folder config
ROOT_DATA_FOLDER = "data"

# Scraping parameters
GAMEMODE = 5  # AllPvP https://bungie-net.github.io/multi/schema_Destiny-HistoricalStats-Definitions-DestinyActivityModeType.html#schema_Destiny-HistoricalStats-Definitions-DestinyActivityModeType
START_DATE = datetime(year=2022, month=1, day=1)  # minimum date for activities fetched
END_DATE = datetime(year=2025, month=1, day=1)  # maximum date for activities fetched

# Example for debug
BREEKY_DISPLAY_NAME = "Breeky"
BREEKY_DISPLAY_NAME_CODE = "8283"
BREEKY_MEMBERSHIP_ID = "4611686018476641937"
BREEKY_MEMBERSHIP_TYPE = "3"
BREEKY_CHARACTER_ID = "2305843009403261815"  # Titan

# DB connexions
db_helper = MainDBHelper(name="main.db", folder=ROOT_DATA_FOLDER)
source_db_helper = SourceDBHelper(name="sources.db", folder=ROOT_DATA_FOLDER)

current_row_id = 1


def select_next_guardian() -> Guardian:
    """
    Select a guardian from the main.db that is not already in the source.db.
    Run through ROWID from current_row_id defined above.
    :return: 
    """
    global current_row_id
    
    current_row_id += 1
    guardian = db_helper.get_guardian_from_row_id(current_row_id)
    
    if guardian is None:
        raise Exception("Error while trying to fetch a guardian from db.")
    
    if source_db_helper.is_source_already_used(guardian.membership_id):
        return select_next_guardian()
    
    return guardian


def extract_guardians_from_carnage_report(carnage_report) -> list[Guardian]:
    guardians = []
    for entry in carnage_report["entries"]:
        try:
            # Not always available (old or private profile)
            display_name = ""
            display_name_code = ""
            try:
                display_name = entry["player"]["destinyUserInfo"]["bungieGlobalDisplayName"]
                display_name_code = entry["player"]["destinyUserInfo"]["bungieGlobalDisplayNameCode"]
            except:
                pass

            membership_id = entry["player"]["destinyUserInfo"]["membershipId"]
            membership_type = entry["player"]["destinyUserInfo"]["membershipType"]
            character_id = entry["characterId"]
            is_private = not entry["player"]["destinyUserInfo"]["isPublic"]
            guardians.append(Guardian(display_name=display_name,
                                      display_name_code=display_name_code,
                                      membership_id=membership_id,
                                      membership_type=membership_type,
                                      character_id=character_id,
                                      is_private=is_private))
        except:
            print(entry)
            raise RuntimeError("Parsing error ICI.")
    return guardians


async def fetch_guardian_stats(api, guardian: Guardian):
    # print(f"Fetching {guardian} stats.")
    # Check for existence (maybe slower than a request)
    if db_helper.is_guardian_in_db_from_ids(guardian):
        return

    if guardian.is_private:
        return
        
    try:
        guardian.set_pvp_stats(await api.fetch_stats(guardian.membership_id, guardian.membership_type, guardian.character_id))
    except Exception as err:
        logging.warning(f"Error fetching Guardian stats "
                        f"(membership_id={guardian.membership_id}, "
                        f"membership_type={guardian.membership_type}, "
                        f"character_id={guardian.character_id}). "
                        f"Error : {err}")
        return
            
    # async with GUARDIAN_DB_LOCK:
    db_helper.insert_guardian(guardian)


async def fetch_activity_details(api, activity: Activity):
    # Check for existence (maybe slower than a request)
    if db_helper.is_activity_in_db_from_id(activity):
        return

    try:
        carnage_report = await api.fetch_carnage_report(activity.instance_id)
        if carnage_report["activityDetails"]["mode"] == 48:  # Rumble
            return
        activity.set_carnage_report(carnage_report)
    except Exception as err:
        logging.warning(f"Error fetching Activity (instanceId={activity.instance_id}). Error : {err}.")
        return
        
    # async with ACTIVITY_DB_LOCK:
    db_helper.insert_activity(activity)

    guardians = extract_guardians_from_carnage_report(carnage_report)

    tasks = []
    for guardian in guardians:
        tasks.append(fetch_guardian_stats(api, guardian))
    await asyncio.gather(*tasks, return_exceptions=True)


async def fetch_source_activities(api, source: Guardian):
    async with ONE_SOURCE_LOCK:
        if source_db_helper.is_source_already_used(source.membership_id):
            logging.info(f"Source ({source}) is already in source db. Skipping.")
            return
        
        logging.info(f"Fetching activity history of {source}.")
        try:
            activity_history = await api.fetch_activity_history(source.membership_id,
                                                                source.membership_type,
                                                                source.character_id,
                                                                gamemode=GAMEMODE,
                                                                from_date=START_DATE,
                                                                to_date=END_DATE)
        except Exception as err:
            logging.warning(f"Cannot fetch history of Guardian ({source}). Error : {err}")
            return
        
        tasks = []
        for activity_json in activity_history:
            instance_id = activity_json["activityDetails"]["instanceId"]
            activity = Activity(instance_id=instance_id)
            tasks.append(fetch_activity_details(api, activity))
        await asyncio.gather(*tasks, return_exceptions=True)


async def main():
    async with aiohttp.ClientSession(timeout=TIMEOUT) as session:
        api = BungieAPI(session)
        for i in range(500):
            source = select_next_guardian()
            await fetch_source_activities(api, source)
            db_helper.commit()
            source_db_helper.insert_source(source.membership_id)
            source_db_helper.commit()


asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
asyncio.run(main())

db_helper.close()
source_db_helper.close()

logging.info("Run finished.")

# TODO: dynamic progress bar per guardian
