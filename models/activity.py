import json
import pandas as pd

from models.guardian import Guardian


class Activity:
    def __init__(self, instance_id=""):
        self.instance_id = instance_id  # new for activity_id
        
        # carnage report
        self.period = ""
        self.mode = 0
        self.is_private = False
        self.win_score = 0
        self.loss_score = 0
        self.players = []
        
    def set_carnage_report(self, report):
        self.period = report["period"]
        self.mode = report["activityDetails"]["mode"]
        self.is_private = report["activityDetails"]["isPrivate"]
        self.win_score = report["teams"][0]["score"]["basic"]["value"]
        self.loss_score = report["teams"][1]["score"]["basic"]["value"]
        if self.win_score < self.loss_score:
            self.win_score, self.loss_score = (self.loss_score, self.win_score)
        
        if report["teams"][0]["standing"]["basic"]["value"] < 0.5:
            winning_team_id = report["teams"][0]["teamId"]
        else:
            winning_team_id = report["teams"][1]["teamId"]
        for entry in report["entries"]:
            membership_id = entry["player"]["destinyUserInfo"]["membershipId"]
            membership_type = entry["player"]["destinyUserInfo"]["membershipType"]
            character_id = entry["characterId"]
            is_winner = entry["values"]["team"]["basic"]["value"] == winning_team_id
            self.players.append({"membership_id": membership_id,
                                 "membership_type": membership_type,
                                 "character_id": character_id,
                                 "is_winner": is_winner})
            
    @staticmethod
    def get_dtypes_dict():
        return {
            "instance_id": pd.StringDtype(),
            "period": pd.StringDtype(),
            "mode": int,
            "is_private": bool,
            "win_score": int,
            "loss_score": int,
            "players": pd.StringDtype()
        }
    
    @property
    def data(self):
        return {
            "instance_id": self.instance_id,
            "period": self.period,
            "mode": self.mode,
            "is_private": self.is_private,
            "win_score": self.win_score,
            "loss_score": self.loss_score,
            "players": json.dumps(self.players)
        }
        
    def __str__(self):
        return f"Activity ({self.instance_id})"
        
    
            
