import asyncio
import websockets

clients = []


async def echo(websocket, path):
    # TODO: client情報によって処理を分ける
    async for message in websocket:
        await websocket.send(message)
        print(message)

start_server = websockets.serve(echo, 'localhost', 8765)

asyncio.get_event_loop().run_until_complete(start_server)
asyncio.get_event_loop().run_forever()
