import asyncio
import logging
import time
import json
from datetime import datetime

import aiohttp.client_exceptions


class BungieAPI:
    
    RATE = 20  # Max number of calls per second, Bungie tells us it's 25 but to be sure...
    MAX_TOKENS = 20
    
    API_KEY_FILE = "secret_tokens.json"
    ENDPOINT = "https://www.bungie.net/Platform"
    HEADERS = {"X-API-Key": None}
    API_DATE_FORMAT = "%Y-%m-%dT%H:%M:%SZ"
    
    def __init__(self, session):
        self.session = session
        self.tokens = BungieAPI.MAX_TOKENS
        self.last_token_update = time.monotonic()
        self._read_api_key()
        
    def _read_api_key(self):
        with open(BungieAPI.API_KEY_FILE) as fp:
            secrets = json.load(fp)
            BungieAPI.HEADERS["X-API-Key"] = secrets["X-API-Key"]

    async def wait_for_token(self):
        while self.tokens < 1:
            self.add_new_tokens()
            await asyncio.sleep(0.1)
        self.tokens -= 1

    def add_new_tokens(self):
        now = time.monotonic()
        time_since_update = now - self.last_token_update
        new_tokens = int(time_since_update * self.RATE)
        if self.tokens + new_tokens >= 1:
            self.tokens = min(self.tokens + new_tokens, self.MAX_TOKENS)
            self.last_token_update = now

    async def get(self, *args, **kwargs):
        await self.wait_for_token()
        try:
            return self.session.get(*args, **kwargs)
        except (aiohttp.client_exceptions.ServerDisconnectedError,
                aiohttp.client_exceptions.ClientPayloadError) as error:
            logging.warning(f"BungieAPI get error: {error}")
            await asyncio.sleep(1)
            return self.get(*args, **kwargs)   # recursive strategy
    
    async def post(self, *args, **kwargs):
        await self.wait_for_token()
        try:
            return self.session.post(*args, **kwargs)
        except (aiohttp.client_exceptions.ServerDisconnectedError,
                aiohttp.client_exceptions.ClientPayloadError) as error:
            logging.warning(f"BungieAPI post error: {error}")
            await asyncio.sleep(1)
            return self.post(*args, **kwargs)   # recursive strategy

    async def fetch_info(self, display_name: str, display_name_code: str):
        if len(display_name) == 0 or len(display_name_code) == 0:
            print("Missing display information to fetch guardian info.")
            return None

        url = BungieAPI.ENDPOINT + "/Destiny2/SearchDestinyPlayerByBungieName/all/"
        body = {
            "displayName": display_name,
            "displayNameCode": display_name_code
        }
        
        async with await self.post(url, headers=BungieAPI.HEADERS, json=body) as resp:
            r = await resp.json()

            if len(r["Response"]) == 0:
                logging.error("Empty response when fetching guardian info.")
                return None

            return r["Response"]

    async def fetch_profile(self, membership_id: int, membership_type: int):
        url = BungieAPI.ENDPOINT + "/Destiny2/{membershipType}/Profile/{destinyMembershipId}/"
        url = url.format(
            membershipType=membership_type,
            destinyMembershipId=membership_id)
        query_params = {
            "components": "Characters"
        }

        async with await self.get(url, headers=BungieAPI.HEADERS, params=query_params) as resp:
            r = await resp.json()
            return r

    async def fetch_stats(self, membership_id: int, membership_type: int, character_id: int):
        url = BungieAPI.ENDPOINT + "/Destiny2/{membershipType}/Account/{destinyMembershipId}/Character/{characterId}/Stats/"
        url = url.format(
            membershipType=membership_type,
            destinyMembershipId=membership_id,
            characterId=character_id)

        async with await self.get(url, headers=BungieAPI.HEADERS) as resp:
            r = await resp.json()
            if r["ErrorCode"] == 1:
                return r["Response"]
            else:
                raise BungieAPIError(r, f"Fetch player stats error (membership_id-{membership_id} membership_type-{membership_type} character_id-{character_id})")

    async def fetch_activity_history(self, membership_id: int, membership_type: int, character_id: int, from_date="", to_date="", gamemode="PvPQuickplay"):
        """
        :param membership_id: 
        :param membership_type: 
        :param character_id: 
        :param from_date: datetime object or string formatted like BUNGIEAPI_DATE_FORMAT
        :param to_date: 
        :param gamemode: see https://bungie-net.github.io/multi/schema_Destiny-HistoricalStats-Definitions-DestinyActivityModeType.html#schema_Destiny-HistoricalStats-Definitions-DestinyActivityModeType
        :return: 
        """
        # Init date interval
        try:
            if from_date == "":
                from_date = datetime(2015, 1, 1, 0, 0, 0)   # oldest
            if to_date == "":
                to_date = datetime.now()   # newest

            if not isinstance(from_date, datetime):
                from_date = datetime.strptime(from_date, BungieAPI.API_DATE_FORMAT)
            if not isinstance(to_date, datetime):
                to_date = datetime.strptime(to_date, BungieAPI.API_DATE_FORMAT)
        except ValueError as err:
            print("Error while parsing dates to fetch activity history.")
            return None

        if from_date > to_date:
            from_date, to_date = (to_date, from_date)

        url = BungieAPI.ENDPOINT + "/Destiny2/{membershipType}/Account/{destinyMembershipId}/Character/{characterId}/Stats/Activities/"
        url = url.format(
            membershipType=membership_type,
            destinyMembershipId=membership_id,
            characterId=character_id)

        activities = []
        current_page = 0
        while True:
            current_page += 1
            query_params = {
                "count": 250,  # Max
                "mode": gamemode,
                "page": current_page}

            async with await self.get(url, headers=BungieAPI.HEADERS, params=query_params) as resp:
                r = await resp.json()

                if r["ErrorCode"] != 1:
                    raise BungieAPIError(r, "Fetch activity history error.")
                
                if len(r["Response"]) == 0:
                    break

                for activity in r["Response"]["activities"]:
                    activity_date = datetime.strptime(activity["period"], BungieAPI.API_DATE_FORMAT)
                    if to_date > activity_date > from_date:
                        # strip "values" attribute from the history to save space (not needed, it is in carnage report)
                        activity.pop("values", None)
                        activities.append(activity)

                start_date = datetime.strptime(r["Response"]["activities"][0]["period"], BungieAPI.API_DATE_FORMAT)
                end_date = datetime.strptime(r["Response"]["activities"][-1]["period"], BungieAPI.API_DATE_FORMAT)
                if start_date > from_date > end_date:
                    break

        return activities
    
    async def fetch_carnage_report(self, instance_id: int):
        url = BungieAPI.ENDPOINT + "/Destiny2/Stats/PostGameCarnageReport/{instanceId}/"
        url = url.format(
            instanceId=instance_id
        )

        async with await self.get(url, headers=BungieAPI.HEADERS) as resp:
            r = await resp.json()
            if r["ErrorCode"] == 1:
                return r["Response"]
            else:
                raise BungieAPIError(r, f"Fetch carnage_report error (instance_id-{instance_id})")
    
            
class BungieAPIError(Exception):
    def __init__(self, response, message="API error"):
        self.response = response
        self.message = message
        super().__init__(message)
        
    def __str__(self):
        return f"{self.message} with API response: {self.response}"
        