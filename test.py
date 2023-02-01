import asyncio
import time
import aiohttp
from local_api import BungieAPI

BREEKY_DISPLAY_NAME = "Breeky"
BREEKY_DISPLAY_NAME_CODE = "8283"
BREEKY_MEMBERSHIP_ID = "4611686018476641937"
BREEKY_MEMBERSHIP_TYPE = "3"
BREEKY_CHARACTER_ID = "2305843009403261815"  # Titan

sync_responses = []
async_responses = []


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
    headers = {"X-API-Key": "d1afcba184f644bdb4a4bb4a09e51e50"}

    async with await session.get(url, headers=headers, params=query_params) as resp:
        r = await resp.json()
        return r


async def main():
    global sync_responses, async_responses

    async with aiohttp.ClientSession() as session:
        # Synchronous
        start = time.time()
        for i in range(10):
            r = await fetch_activity_history(session, BREEKY_MEMBERSHIP_ID, BREEKY_MEMBERSHIP_TYPE, BREEKY_CHARACTER_ID,
                                             page=i)
            sync_responses.append(r)
        print(f'10 sync calls took {time.time() - start} seconds.')

        # Asynchronous
        start = time.time()
        tasks = []
        for i in range(10):
            tasks.append(
                fetch_activity_history(session, BREEKY_MEMBERSHIP_ID, BREEKY_MEMBERSHIP_TYPE, BREEKY_CHARACTER_ID,
                                       page=i))
        async_responses = await asyncio.gather(*tasks, return_exceptions=True)
        print(f'10 async calls took {time.time() - start} seconds.')


asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
asyncio.run(main())
