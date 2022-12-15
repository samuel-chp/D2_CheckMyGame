import aiohttp
import catboost
import asyncio
import numpy as np
import pandas as pd

from local_api import BungieAPI
from models.activity import Activity
from models.guardian import Guardian


def pad(l: list, n: int, value=None):
    return l + [value] * (n - len(l))


class MatchPredictor:
    def __init__(self, api: BungieAPI, model_file: str):
        self.api = api
        
        self.classifier = catboost.CatBoostClassifier(verbose=False)
        self.classifier.load_model(model_file, "json")
        
    async def _fetch_guardian_stats(self, guardian: Guardian) -> bool:
        if guardian.is_private:
            return False
            
        try:
            guardian.set_pvp_stats(
                await self.api.fetch_stats(guardian.membership_id, guardian.membership_type, guardian.character_id))
        except Exception as err:
            return False
        
        return True

    def _extract_guardians_from_carnage_report(self, carnage_report) -> list[list[Guardian], list[Guardian]]:
        guardians = [[], []]
        
        team_a = carnage_report["teams"][0]["teamId"]
        # team_b = carnage_report["teams"][1]["teamId"]
        
        for entry in carnage_report["entries"]:
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
            guardian = Guardian(display_name=display_name,
                                display_name_code=display_name_code,
                                membership_id=membership_id,
                                membership_type=membership_type,
                                character_id=character_id,
                                is_private=is_private)
            
            if entry["values"]["team"]["basic"]["value"] == team_a:
                guardians[0].append(guardian)
            else:
                guardians[1].append(guardian)
        return guardians
    
    def _preprocess_inputs(self, guardians: list[list[Guardian], list[Guardian]]):
        STATS_NAME = ["combat_rating", "kills_pga", "assists_pga", "deaths_pga", "score_pga", "win_ratio", "kd", "kda"]
        N_STATS = len(STATS_NAME)
        PLAYERS_COLUMNS = np.array([[f"player_{i}_{stat}" for stat in STATS_NAME] for i in range(1, 13)]).flatten()
        
        row = []
        for team in range(len(guardians)):
            players = pad(guardians[team], 6, None)[:6]
            for player in players:
                if player is None:
                    row += pad([], N_STATS, 0)
                    continue
                    
                n = player.activities_entered
                
                # Ensure valid operations
                if n < 1:
                    n = 1
                    player.deaths = 1
                    
                row += [player.combat_rating,
                        player.kills / n,
                        player.assists / n,
                        player.deaths / n,
                        player.score / n,
                        player.activities_won / n,
                        player.kills / player.deaths,
                        (player.kills + player.assists) / player.deaths]
        
        return pd.DataFrame([row], columns=PLAYERS_COLUMNS)
    
    async def predict_winner_from_guardians(self, guardians: list[list[Guardian], list[Guardian]]):
        # Get guardians stats
        tasks = []
        for guardian in guardians[0]+guardians[1]:
            tasks.append(self._fetch_guardian_stats(guardian))
        r = await asyncio.gather(*tasks, return_exceptions=True)
        if not all(fetch_stat_success == True for fetch_stat_success in r):
            print("Results may be inaccurate, not all guardians stats are accessible.")
        
        # Preprocess data like training (with random winner)
        model_input = self._preprocess_inputs(guardians)
        
        # Predict
        pred = self.classifier.predict_proba(model_input)[0]
        
        # Return winning team
        return pred
    
    async def predict_winner_from_activity(self, activity: Activity):
        # Fetch carnage report
        carnage_report = await self.api.fetch_carnage_report(activity.instance_id)
        if 70 not in carnage_report["activityDetails"]["modes"]:  # Quickplay
            raise Exception("Trying to predict a match that is not quickplay.")
        
        # Extract guardians in teams
        guardians = self._extract_guardians_from_carnage_report(carnage_report)
        
        pred = await self.predict_winner_from_guardians(guardians)
        pred_team = carnage_report["teams"][np.argmax(pred)]["teamId"]
        print(f"Team {pred_team} has {max(pred)}% chance of winning.")
        
        if carnage_report["teams"][0]["standing"]["basic"]["value"] > 0.5:
            winning_team = carnage_report["teams"][0]["teamId"]
        else:
            winning_team = carnage_report["teams"][1]["teamId"]
        print(f"Team {winning_team} won the game.")
        
        return pred

async def main():
    global r
    async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=3600)) as session:
        api = BungieAPI(session)
        predictor = MatchPredictor(api, "api/model_quickplay.json")
        r = await predictor.predict_winner_from_activity(Activity(instance_id=11980817783))
        print(r)


asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
asyncio.run(main())

# 11983979189 - Bravo won - tracker 62% for bravo
# 11984029213 - Bravo won - tracker 93% for bravo
# 11984009303 - Bravo won - tracker 68%
# 11983013635 - Bravo won - tracker 69%
# 11980889588 - alpha won - tracker 14%
# 11980817783 - bravo won - tracker 77%
