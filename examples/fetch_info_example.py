import asyncio
import aiohttp

from models.guardian import Guardian
from local_api import BungieAPI

ROOT_DATA_FOLDER = "D:/GameDev/D2FunnyStats/v2/data"

BREEKY_DISPLAY_NAME = "Breeky"
BREEKY_DISPLAY_NAME_CODE = "8283"

breeky = Guardian(display_name=BREEKY_DISPLAY_NAME,
                  display_name_code=BREEKY_DISPLAY_NAME_CODE)


async def main():
    async with aiohttp.ClientSession() as session:
        api = BungieAPI(session)
        info = await api.fetch_info(breeky.display_name, breeky.display_name_code)
        print(info)

asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
asyncio.run(main())
