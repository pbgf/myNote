### TCP连接建立

首先有客户端和服务端，服务端要进入监听状态(listen)，由客户端发起连接请求。

1. 客户端发起连接请求会发送TCP报文：SYN置为1、seq为x，同时客户端的状态变为SYN_SENT。
2. 服务端接收到请求，服务端状态变为SYN_RECEIVED，返回 SYN seq = y 和 ACK ack = x + 1。
3. 客服端接收到服务端的确认请求，状态变为ESTABLISHED，同时发送ACK seq = x + 1, ack = y + 1给服务端，告知服务端已建立连接。
4. 服务端收到请求后，也进入ESTABLISHED状态，连接建立成功。

### TCP连接断开

首先，服务端和客户端都是连接建立状态，然后一般都是由客户端发起连接断开

1. 客户端发送报文：FIN = 1，客户端进入FIN-WAIT-1
2. 服务端接收到报文，返回ACK = 1，服务端进入CLOSE-WAIT
3. 客户端接收到了ACK，进入FIN-WAIT-2，此时客户端不会再发送报文给服务端，但仍会接收消息
4. 服务端发送报文：FIN = 1，ACK = 1，服务端进入 LAST-ACK
5. 客户端接收到报文，进入TIME-WAIT，这里会等待2MSL时间(防止服务端没有收到最后的报文)，同时返回ACK = 1。
6. 服务端收到报文后，进入CLOSED状态。
7. 2MSL时间后，客户端没有再收到FIN + ACK ，也进入CLOSED状态
