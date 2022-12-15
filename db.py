import os
import sys
import pandas as pd
import logging
import sqlite3

from models.activity import Activity
from models.guardian import Guardian


class PandasBufferDB:
    def __init__(self,
                 filename,
                 columns,
                 id_subset,
                 dtypes=None,
                 data_folder="D:/GameDev/D2FunnyStats/v2/data",
                 max_buffer_length=500,
                 max_db_length=50000):
        """
        
        :param filename:
        :param columns: name of the columns of the dataframe
        :param dtypes: dict of {'column_name': dtype}
        :param id_subset: list of columns representing the column id. For instance for a guardian it would be [membership_id, membership_type, character_id]. Used to drop duplicates.
        :param data_folder:
        :param max_buffer_length:
        :param max_db_length:
        """
        self.filename = filename
        self.columns = columns
        self.dtypes = dtypes
        self.id_subset = id_subset
        self.data_folder = data_folder
        self.max_buffer_length = max_buffer_length
        self.max_db_length = max_db_length

        self.buffer = []

        # Init filename with last in data_folder (or 00)
        self.filename = self._read_current_chunk_filename()
        
        if self.filename in os.listdir(self.data_folder):
            self.db = pd.read_parquet(os.path.join(self.data_folder, self.filename))
            self._ensure_dtypes()
            if list(self.db.columns) != columns:
                raise RuntimeError(f"{self.filename} columns do not correspond to model attributes.")
        else:
            self._create_new_df()

    def append(self, element):
        self.buffer.append(element)
        if len(self.buffer) > self.max_buffer_length:
            self._concat()

    def save(self):
        self._concat()
        self._export()
        
    def _ensure_dtypes(self):
        for dt in self.dtypes.keys():
            self.db[dt] = self.db[dt].astype(self.dtypes[dt])

    def _create_new_df(self):
        self.filename = self._get_next_chunck_filename()
        self.db = pd.DataFrame(columns=self.columns)
        self._ensure_dtypes()
        
    def _get_next_chunck_filename(self):
        basename, ext = os.path.splitext(self.filename)
        
        if basename[-3] == "-":
            basename = basename[:-3]  # prefer regexp
            
        n = 0
        for i in range(100):  # arbitrary limit
            number = str(n) if n >= 10 else "0" + str(n)
            name = basename + "-" + number
            if name + ext in os.listdir(self.data_folder):
                n += 1
                continue
            else:
                return name + ext
            
    def _read_current_chunk_filename(self):
        basename, ext = os.path.splitext(self.filename)

        if basename[-3] == "-":
            basename = basename[:-3]  # prefer regexp

        n = 0
        number = str(n) if n >= 10 else "0" + str(n)
        previous_name = basename + "-" + number
        for i in range(100):  # arbitrary limit
            number = str(n) if n >= 10 else "0" + str(n)
            name = basename + "-" + number
            if name + ext in os.listdir(self.data_folder):
                n += 1
                previous_name = name
                continue
            else:
                return previous_name + ext
                
    def _concat(self):
        # logging.info(f"Empty buffer {self.filename}.")
        df = pd.DataFrame([vars(g) for g in self.buffer])
        self.db = pd.concat([self.db, df], ignore_index=True)
        self._ensure_dtypes()
        self.db.drop_duplicates(subset=self.id_subset, keep="last", inplace=True, ignore_index=True)
        self.db.reset_index(drop=True, inplace=True)
        self.buffer = []
        # logging.info("Empty buffer finished.")
        if len(self.db) > self.max_db_length:
            self._split()

    def _split(self):
        logging.info(f"Split df {self.filename}.")
        self._export()
        self._create_new_df()
        self._concat()
        logging.info("Split finished.")

    def _export(self):
        logging.info(f"Export {self.filename}.")
        self.db.to_parquet(os.path.join(self.data_folder, self.filename), compression="brotli")
        logging.info("Export finished.")

    def __del__(self):
        self.save()


class PandasSourceDB:
    BREEKY_DISPLAY_NAME = "Breeky"
    BREEKY_DISPLAY_NAME_CODE = "8283"
    BREEKY_MEMBERSHIP_ID = "4611686018476641937"
    BREEKY_MEMBERSHIP_TYPE = "3"
    BREEKY_CHARACTER_ID = "2305843009403261815"  # Titan

    def __init__(self, filename, data_folder):
        self.filename = filename
        self.data_folder = data_folder
        
        if filename in os.listdir(data_folder):
            self.db = pd.read_csv(os.path.join(data_folder, filename))
        else:
            self.db = pd.DataFrame(columns=["membership_id", "membership_type", "character_id"])
        self._ensure_dtype()
        
        self._add_breeky()
        
    def _ensure_dtype(self):
        self.db["membership_id"] = self.db["membership_id"].astype(pd.StringDtype())
        self.db["membership_type"] = self.db["membership_type"].astype(pd.StringDtype())
        self.db["character_id"] = self.db["character_id"].astype(pd.StringDtype())

    def _add_breeky(self):
        breeky = Guardian(membership_id=PandasSourceDB.BREEKY_MEMBERSHIP_ID,
                          membership_type=PandasSourceDB.BREEKY_MEMBERSHIP_TYPE,
                          character_id=PandasSourceDB.BREEKY_CHARACTER_ID)
        self.add_source(breeky)

    def add_source(self, guardian: Guardian):
        if len(self.db.loc[(self.db["membership_id"] == guardian.membership_id)
                           & (self.db["membership_type"] == guardian.membership_type)
                           & (self.db["character_id"] == guardian.character_id)]) > 0:
            return

        self.db = pd.concat([self.db, pd.DataFrame(data={
            "membership_id": guardian.membership_id,
            "membership_type": guardian.membership_type,
            "character_id": guardian.character_id,
        }, index=[0])]).reset_index(drop=True)
        
        self._ensure_dtype()
        
        self.save()  # small db => small cost
        
    def save(self):
        self.db.to_csv(os.path.join(self.data_folder, self.filename), index=False)
        

class DBHelper:
    def __init__(self, name: str, folder: str):
        if name not in os.listdir(folder):
            raise Exception(f"DB {name} not found in {folder}")

        self.name = name
        self.folder = folder
        self.connexion = sqlite3.connect(os.path.join(self.folder, self.name))

    def commit(self):
        self.connexion.commit()

    def close(self):
        self.connexion.close()
        
    def execute(self, request: str, data: list):
        cursor = self.connexion.execute(request, data)
        return cursor.fetchall()
        
    def __del__(self):
        self.connexion.close()
        
    def __str__(self):
        return f"DB {self.name} in {self.folder}."
        

class MainDBHelper(DBHelper):
    def __init__(self, name: str, folder: str):
        super().__init__(name, folder)
        self.connexion.row_factory = sqlite3.Row  # return dict from db instead of list of values

    def insert_guardian(self, guardian: Guardian):
        data = guardian.data
        columns = ", ".join([f"{value}" for value in data])
        empty_values = ", ".join([f"?" for v in data])
        request = f"INSERT OR IGNORE INTO guardian ({columns}) VALUES ({empty_values})"
        self.connexion.execute(request, list(data.values()))
        # self.connexion.commit()

    def get_guardian_from_ids(self, guardian: Guardian):
        cursor = self.connexion.execute(
            "SELECT * FROM guardian WHERE guardian.membership_id=? AND guardian.membership_type=? AND guardian.character_id=?",
            [guardian.membership_id, guardian.membership_type, guardian.character_id])
        data = cursor.fetchall()
        
        if len(data) == 0:
            return None
        
        if len(data) > 1:
            raise Exception("Multiple corresponding guardians.")
        
        r = dict(data[0])
        g = Guardian()
        for k in r:
            g.__dict__[k] = r[k]
        return g
    
    def get_guardian_from_row_id(self, row_id: int):
        cursor = self.connexion.execute(
            "SELECT * FROM guardian WHERE ROWID=?",
            [row_id])
        data = cursor.fetchall()

        if len(data) == 0:
            return None

        if len(data) > 1:
            raise Exception("Multiple corresponding guardians.")

        r = dict(data[0])
        g = Guardian()
        for k in r:
            g.__dict__[k] = r[k]
        return g
    
    def is_guardian_in_db_from_ids(self, guardian: Guardian):
        cursor = self.connexion.execute(
            "SELECT COUNT(guardian.membership_id) FROM guardian "
            "WHERE guardian.membership_id=? AND guardian.membership_type=? AND guardian.character_id=?",
            [guardian.membership_id, guardian.membership_type, guardian.character_id])
        return cursor.fetchall()[0][0] > 0

    def insert_activity(self, activity: Activity):
        data = activity.data
        columns = ", ".join([f"{value}" for value in data])
        empty_values = ", ".join([f"?" for v in data])
        request = f"INSERT OR IGNORE INTO activity ({columns}) VALUES ({empty_values})"
        self.connexion.execute(request, list(data.values()))
        # self.connexion.commit()
    
    def get_activity_from_id(self, activity: Activity):
        cursor = self.connexion.execute("SELECT * FROM main.activity WHERE activity.instance_id=?", [activity.instance_id])
        data = cursor.fetchall()

        if len(data) == 0:
            return None

        if len(data) > 1:
            raise Exception("Multiple corresponding activities.")

        r = dict(data[0])
        a = Activity()
        for k in r:
            a.__dict__[k] = r[k]
        return a
    
    def is_activity_in_db_from_id(self, activity: Activity):
        cursor = self.connexion.execute(
            "SELECT COUNT(activity.instance_id) FROM activity WHERE activity.instance_id=?",
            [activity.instance_id])
        return cursor.fetchall()[0][0] > 0
    
    
class SourceDBHelper(DBHelper):
    def __init__(self, name: str, folder: str):
        super().__init__(name, folder)
    
    def insert_source(self, membership_id: int):
        request = f"INSERT OR IGNORE INTO guardian (membership_id) VALUES (?)"
        self.connexion.execute(request, [int(membership_id)])

    def is_source_already_used(self, membership_id):
        request = f"SELECT COUNT(membership_id) FROM guardian WHERE guardian.membership_id=?"
        cursor = self.connexion.execute(request, [membership_id])
        return cursor.fetchall()[0][0] > 0
    
    