import asyncio


async def test(i):
    if i == 2:
        raise Exception("Test")
    
    await asyncio.sleep(1)
    return True

async def main():
    global r
    tasks = []
    for i in range(5):
        tasks.append(test(i))
    r = await asyncio.gather(*tasks, return_exceptions=True)
        


asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
asyncio.run(main())