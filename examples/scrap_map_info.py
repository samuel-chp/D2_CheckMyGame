import asyncio
import time
import aiohttp
import json
from local_api import BungieAPI


IFROSTBOLT_DISPLAY_NAME = "IFrostBolt"
IFROSTBOLT_DISPLAY_NAME_CODE = "3385"
IFROSTBOLT_MEMBERSHIP_ID = "4611686018467294270"
IFROSTBOLT_MEMBERSHIP_TYPE = "3"
IFROSTBOLT_CHARACTER_ID = "2305843009299607234"  # Titan

API_KEY = "d1afcba184f644bdb4a4bb4a09e51e50"


async def fetch_activity_history(session, membership_id, membership_type, character_id, page=0, mode=5):
    url = BungieAPI.ENDPOINT + "/Destiny2/{membershipType}/Account/{destinyMembershipId}/Character/{characterId}/Stats/Activities/"
    url = url.format(
        membershipType=membership_type,
        destinyMembershipId=membership_id,
        characterId=character_id)
    query_params = {
        "count": 250,  # Max
        "mode": mode,
        "page": page}
    headers = {"X-API-Key": API_KEY}

    async with await session.get(url, headers=headers, params=query_params) as resp:
        r = await resp.json()
        return r


async def fetch_map_definition(session, reference_id):
    url = BungieAPI.ENDPOINT + "/Destiny2/Manifest/{entityType}/{hashIdentifier}/"
    url = url.format(
        entityType="DestinyActivityDefinition",
        hashIdentifier=reference_id)
    headers = {"X-API-Key": API_KEY}

    async with await session.get(url, headers=headers) as resp:
        r = await resp.json()
        return r


async def main():
    global maps

    async with aiohttp.ClientSession() as session:
        activity_history = await fetch_activity_history(session, IFROSTBOLT_MEMBERSHIP_ID, IFROSTBOLT_MEMBERSHIP_TYPE,
                                         IFROSTBOLT_CHARACTER_ID, page=0)
        reference_ids = []
        for activity in activity_history["Response"]["activities"]:
            reference_ids.append(activity["activityDetails"]["referenceId"])

        for reference_id in reference_ids:
            if reference_id not in maps:
                r = await fetch_map_definition(session, reference_id)
                map_info = {
                    "name": r["Response"]["displayProperties"]["name"],
                    "description": r["Response"]["displayProperties"]["description"],
                    "pgcrImage": r["Response"]["pgcrImage"]
                }
                maps[reference_id] = map_info

        print(json.dumps(maps))


maps = {}

asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
asyncio.run(main())

# PROBLEM: multiple referenceId for the same map!
