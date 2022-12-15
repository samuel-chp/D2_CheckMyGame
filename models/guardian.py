import pandas as pd


class Guardian:
    def __init__(self,
                 display_name="",
                 display_name_code="",
                 membership_id="",
                 membership_type="",
                 character_id="",
                 is_private=False):
        self.display_name = str(display_name)
        self.display_name_code = str(display_name_code)
        
        self.membership_id = str(membership_id)
        self.membership_type = str(membership_type)
        self.character_id = str(character_id)
        
        self.is_private = is_private
        
        # All-time stats
        self.activities_entered = 0
        self.activities_won = 0
        self.assists = 0
        self.kills = 0
        self.seconds_played = 0
        self.deaths = 0
        self.average_lifespan = 0
        self.score = 0
        self.opponents_defeated = 0
        self.precision_kills = 0
        self.combat_rating = 0
    
    def set_pvp_stats(self, stats):
        v = stats["allPvP"]["allTime"]
        self.activities_entered = v["activitiesEntered"]["basic"]["value"]
        self.activities_won =     v["activitiesWon"]["basic"]["value"]
        self.assists =            v["assists"]["basic"]["value"]
        self.kills =              v["kills"]["basic"]["value"]
        self.seconds_played =     v["secondsPlayed"]["basic"]["value"]
        self.deaths =             v["deaths"]["basic"]["value"]
        self.average_lifespan =   v["averageLifespan"]["basic"]["value"]
        self.score =              v["score"]["basic"]["value"]
        self.opponents_defeated = v["opponentsDefeated"]["basic"]["value"]
        self.precision_kills =    v["precisionKills"]["basic"]["value"]
        self.combat_rating =      v["combatRating"]["basic"]["value"]
        
    @staticmethod
    def get_dtypes_dict():
        return {
            "display_name": pd.StringDtype(),
            "display_name_code": pd.StringDtype(),
            "membership_id": int,
            "membership_type": int,
            "character_id": int,
            "is_private": bool,
            "activities_entered": int,
            "activities_won": int,
            "assists": int,
            "kills": int,
            "seconds_played": int,
            "deaths": int,
            "average_lifespan": float,
            "score": int,
            "opponents_defeated": int,
            "precision_kills": int,
            "combat_rating": float
        }
    
    @property
    def data(self):
        return {
            # "id": int(str(self.membership_id) + str(self.membership_type) + str(self.character_id)),
            "membership_id": self.membership_id,
            "membership_type": self.membership_type,
            "character_id": self.character_id,
            "display_name": self.display_name,
            "display_name_code": self.display_name_code,
            "is_private": self.is_private,
            "activities_entered": self.activities_entered,
            "activities_won": self.activities_won,
            "assists": self.assists,
            "kills": self.kills,
            "seconds_played": self.seconds_played,
            "deaths": self.deaths,
            "average_lifespan": self.average_lifespan,
            "score": self.score,
            "opponents_defeated": self.opponents_defeated,
            "precision_kills": self.precision_kills,
            "combat_rating": self.combat_rating
        }
        
    def __str__(self):
        if self.display_name:
            return f"Guardian ({self.display_name})"
        else:
            return f"Guardian {self.membership_id}-{self.membership_type}-{self.character_id}"
    
    def __repr__(self):
        return str(vars(self))
    
