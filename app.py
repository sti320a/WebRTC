from SimpleWebSocketServer import SimpleWebSocketServer, WebSocket

clients = []


class SimpleEcho(WebSocket):

    def handleMessage(self):
        for client in clients:
            if client != self:  # judge
                print('-----on----')
                print(self.data)
                client.sendMessage(self.data)
            else:
                print('----skip-----')

    def handleConnected(self):
        print(self.address, 'connected')
        clients.append(self)  # add client

    def handleClose(self):
        print(self.address, 'closed')


server = SimpleWebSocketServer('', 8765, SimpleEcho)
server.serveforever()


# import asyncio
# import websockets

# clients = set()


# async def register_client(websocket):
#     clients.add(websocket)


# async def echo(websocket, path):
#     # TODO: client情報によって処理を分ける
#     # 1. 初回接続時にclientを一意に識別できるように記録する
#     # 2. clientが既に登録済みの場合、メッセージを返さない
#     async for message in websocket:
#         if websocket not in clients:
#             await websocket.send(message)
#             await register_client(websocket)
#             # print(message)

# start_server = websockets.serve(echo, 'localhost', 8765)

# asyncio.get_event_loop().run_until_complete(start_server)
# asyncio.get_event_loop().run_forever()
